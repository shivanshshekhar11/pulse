import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  ListRulesRouteSchema,
  CreateRuleRouteSchema,
  UpdateRuleRouteSchema,
  DeleteRuleRouteSchema,
  ReorderRulesRouteSchema,
} from '@pulse-flags/types';
import { assertPermission } from '../../../../lib/rbac';
import { writeAuditLog } from '../../../../lib/audit';
import { resolveFlag } from '../../../../lib/resolvers';
import * as ruleService from '../../../../services/rules';
import * as flagService from '../../../../services/flags';

export default async function ruleRoutes(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules
  f.get('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules', {
    onRequest: [fastify.authenticate],
    schema: {
      params: ListRulesRouteSchema.params,
      response: ListRulesRouteSchema.response,
    },
  }, async (request, reply) => {
    const { orgSlug, projectSlug, envName, flagKey } = request.params;

    const ctx = await resolveFlag(reply, request.id, orgSlug, projectSlug, envName, flagKey);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'rules:read', ctx.org.id))) return;

    const ruleList = await ruleService.listRules(ctx.flag.id);
    return reply.send({ data: ruleList });
  });

  // POST /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules
  f.post('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules', {
    onRequest: [fastify.authenticate],
    schema: {
      params: CreateRuleRouteSchema.params,
      body: CreateRuleRouteSchema.body,
      response: CreateRuleRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug, envName, flagKey } = request.params;

    const ctx = await resolveFlag(reply, requestId, orgSlug, projectSlug, envName, flagKey);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'rules:write', ctx.org.id))) return;

    const rule = await ruleService.createRule(ctx.flag.id, request.body);

    await writeAuditLog({
      orgId: ctx.org.id,
      actorId: userId,
      action: 'rule.created',
      resourceType: 'rule',
      resourceId: rule.id,
      newValue: rule,
      ip: request.ip,
    });

    await flagService.bumpFlagVersion(ctx.flag.id);

    await ruleService.publishRuleChange(ctx.environment.id, ctx.flag.id, rule.id, 'rule.created');

    return reply.code(201).send({ data: rule });
  });

  // PATCH /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules/:ruleId
  f.patch('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules/:ruleId', {
    onRequest: [fastify.authenticate],
    schema: {
      params: UpdateRuleRouteSchema.params,
      body: UpdateRuleRouteSchema.body,
      response: UpdateRuleRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug, envName, flagKey, ruleId } = request.params;

    const ctx = await resolveFlag(reply, requestId, orgSlug, projectSlug, envName, flagKey);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'rules:write', ctx.org.id))) return;

    const rule = await ruleService.findRule(ctx.flag.id, ruleId);
    if (!rule) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Rule not found', requestId },
      });
    }

    const updated = await ruleService.updateRule(rule.id, request.body);

    await writeAuditLog({
      orgId: ctx.org.id,
      actorId: userId,
      action: 'rule.updated',
      resourceType: 'rule',
      resourceId: rule.id,
      oldValue: rule,
      newValue: updated,
      ip: request.ip,
    });

    await flagService.bumpFlagVersion(ctx.flag.id);

    await ruleService.publishRuleChange(ctx.environment.id, ctx.flag.id, rule.id, 'rule.updated');

    return reply.send({ data: updated });
  });

  // DELETE /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules/:ruleId
  f.delete('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules/:ruleId', {
    onRequest: [fastify.authenticate],
    schema: {
      params: DeleteRuleRouteSchema.params,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug, envName, flagKey, ruleId } = request.params;

    const ctx = await resolveFlag(reply, requestId, orgSlug, projectSlug, envName, flagKey);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'rules:write', ctx.org.id))) return;

    const rule = await ruleService.findRule(ctx.flag.id, ruleId);
    if (!rule) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Rule not found', requestId },
      });
    }

    await ruleService.deleteRule(rule.id);

    await writeAuditLog({
      orgId: ctx.org.id,
      actorId: userId,
      action: 'rule.deleted',
      resourceType: 'rule',
      resourceId: rule.id,
      oldValue: rule,
      ip: request.ip,
    });

    await flagService.bumpFlagVersion(ctx.flag.id);

    await ruleService.publishRuleChange(ctx.environment.id, ctx.flag.id, rule.id, 'rule.deleted');

    return reply.code(204).send();
  });

  // POST /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules/reorder
  f.post('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules/reorder', {
    onRequest: [fastify.authenticate],
    schema: {
      params: ReorderRulesRouteSchema.params,
      body: ReorderRulesRouteSchema.body,
      response: ReorderRulesRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug, envName, flagKey } = request.params;
    const { orderedIds } = request.body;

    const ctx = await resolveFlag(reply, requestId, orgSlug, projectSlug, envName, flagKey);
    if (!ctx) return;

    if (!(await assertPermission(request, reply, 'rules:write', ctx.org.id))) return;

    const success = await ruleService.reorderRules(ctx.flag.id, orderedIds);
    if (!success) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_RULES',
          message: 'One or more rule IDs are invalid or do not belong to this flag',
          requestId,
        },
      });
    }

    await writeAuditLog({
      orgId: ctx.org.id,
      actorId: userId,
      action: 'rule.reordered',
      resourceType: 'rule',
      resourceId: ctx.flag.id,
      newValue: { orderedIds },
      ip: request.ip,
    });

    await flagService.bumpFlagVersion(ctx.flag.id);

    await ruleService.publishRuleChange(
      ctx.environment.id,
      ctx.flag.id,
      ctx.flag.id,
      'rules.reordered'
    );

    return reply.send({ data: { success: true } });
  });
}
