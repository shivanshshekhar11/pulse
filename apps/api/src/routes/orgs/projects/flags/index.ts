import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  ListFlagsRouteSchema,
  CreateFlagRouteSchema,
  GetFlagRouteSchema,
  UpdateFlagRouteSchema,
  DeleteFlagRouteSchema,
} from '@pulse-flags/types';
import { assertPermission } from '../../../../lib/rbac';
import { writeAuditLog } from '../../../../lib/audit';
import { resolveEnvironment } from '../../../../lib/resolvers';
import * as flagService from '../../../../services/flags';
import { redis } from '../../../../lib/redis';
import type { Redis as RedisClient } from 'ioredis';

export default async function flagRoutes(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  const openSubscribers = new Set<RedisClient>();

  fastify.addHook('onClose', async () => {
    for (const sub of openSubscribers) {
      await sub.unsubscribe().catch(() => undefined);
      await sub.quit().catch(() => undefined);
    }
    openSubscribers.clear();
  });

  // GET /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags
  f.get('/:orgSlug/projects/:projectSlug/envs/:envName/flags', {
    onRequest: [fastify.authenticate],
    schema: {
      params: ListFlagsRouteSchema.params,
      querystring: ListFlagsRouteSchema.querystring,
      response: ListFlagsRouteSchema.response,
    },
  }, async (request, reply) => {
    const { orgSlug, projectSlug, envName } = request.params;
    const { limit, offset } = request.query;

    const ctx = await resolveEnvironment(reply, request.id, orgSlug, projectSlug, envName);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'flags:read', ctx.org.id))) return;

    const flagList = await flagService.listFlags(ctx.environment.id, limit, offset);
    return reply.send({ data: flagList });
  });

  // POST /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags
  f.post('/:orgSlug/projects/:projectSlug/envs/:envName/flags', {
    onRequest: [fastify.authenticate],
    schema: {
      params: CreateFlagRouteSchema.params,
      body: CreateFlagRouteSchema.body,
      response: CreateFlagRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug, envName } = request.params;

    const ctx = await resolveEnvironment(reply, requestId, orgSlug, projectSlug, envName);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'flags:write', ctx.org.id))) return;

    if (await flagService.isFlagKeyTaken(ctx.environment.id, request.body.key)) {
      return reply.code(400).send({
        error: { code: 'KEY_TAKEN', message: 'Flag key already exists in this environment', requestId },
      });
    }

    const flag = await flagService.createFlag(ctx.environment.id, userId, request.body);

    await writeAuditLog({
      orgId: ctx.org.id,
      actorId: userId,
      action: 'flag.created',
      resourceType: 'flag',
      resourceId: flag.id,
      newValue: flag,
      ip: request.ip,
    });

    await flagService.publishFlagChange(ctx.environment.id, flag.id, 'created');

    return reply.code(201).send({ data: flag });
  });

  // GET /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey
  f.get('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey', {
    onRequest: [fastify.authenticate],
    schema: {
      params: GetFlagRouteSchema.params,
      response: GetFlagRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { orgSlug, projectSlug, envName, flagKey } = request.params;

    const ctx = await resolveEnvironment(reply, requestId, orgSlug, projectSlug, envName);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'flags:read', ctx.org.id))) return;

    const flag = await flagService.findFlagByKey(ctx.environment.id, flagKey);
    if (!flag) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Flag not found', requestId },
      });
    }

    return reply.send({ data: flag });
  });

  // PATCH /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey
  f.patch('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey', {
    onRequest: [fastify.authenticate],
    schema: {
      params: UpdateFlagRouteSchema.params,
      body: UpdateFlagRouteSchema.body,
      response: UpdateFlagRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug, envName, flagKey } = request.params;

    const ctx = await resolveEnvironment(reply, requestId, orgSlug, projectSlug, envName);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'flags:write', ctx.org.id))) return;

    const flag = await flagService.findFlagByKey(ctx.environment.id, flagKey);
    if (!flag) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Flag not found', requestId },
      });
    }

    // updateFlag returns null on version conflict
    const updated = await flagService.updateFlag(flag.id, request.body);
    if (!updated) {
      return reply.code(409).send({
        error: {
          code: 'CONFLICT',
          message: 'Flag was modified by another user. Reload and retry.',
          requestId,
        },
      });
    }

    await writeAuditLog({
      orgId: ctx.org.id,
      actorId: userId,
      action: 'flag.updated',
      resourceType: 'flag',
      resourceId: flag.id,
      oldValue: flag,
      newValue: updated,
      ip: request.ip,
    });

    await flagService.publishFlagChange(ctx.environment.id, flag.id, 'updated');

    return reply.send({ data: updated });
  });

  // DELETE /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey
  f.delete('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey', {
    onRequest: [fastify.authenticate],
    schema: {
      params: DeleteFlagRouteSchema.params,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug, envName, flagKey } = request.params;

    const ctx = await resolveEnvironment(reply, requestId, orgSlug, projectSlug, envName);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'flags:write', ctx.org.id))) return;

    const flag = await flagService.findFlagByKey(ctx.environment.id, flagKey);
    if (!flag) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Flag not found', requestId },
      });
    }

    await flagService.deleteFlag(flag.id);

    await writeAuditLog({
      orgId: ctx.org.id,
      actorId: userId,
      action: 'flag.deleted',
      resourceType: 'flag',
      resourceId: flag.id,
      oldValue: flag,
      ip: request.ip,
    });

    await flagService.publishFlagChange(ctx.environment.id, flag.id, 'deleted');

    return reply.code(204).send();
  });

  // GET /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/stream
  f.get('/:orgSlug/projects/:projectSlug/envs/:envName/flags/stream', {
    onRequest: [fastify.authenticate],
    schema: {
      params: ListFlagsRouteSchema.params,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { orgSlug, projectSlug, envName } = request.params;

    const ctx = await resolveEnvironment(reply, requestId, orgSlug, projectSlug, envName);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'flags:read', ctx.org.id))) return;

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*');
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    if (requestId) {
      reply.raw.setHeader('X-Request-ID', requestId);
    }
    reply.raw.flushHeaders();

    reply.raw.write('retry: 5000\n\n');

    const sub = redis.duplicate();
    openSubscribers.add(sub);
    await sub.subscribe(`pulse:env:${ctx.environment.id}`);

    sub.on('message', (_channel: string, message: string) => {
      reply.raw.write(`event: flag:updated\ndata: ${message}\n\n`);
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30_000);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      openSubscribers.delete(sub);
      sub.unsubscribe().catch(() => undefined);
      sub.quit().catch(() => undefined);
    });

    return new Promise<void>(() => undefined);
  });
}
