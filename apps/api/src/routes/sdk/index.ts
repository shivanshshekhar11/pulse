import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '../../db';
import { environments, flags, segments } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { GetRulesetRouteSchema } from '@pulse/types';
import apiKeyPlugin from '../../plugins/api-key';

export default async function sdkRoutes(fastify: FastifyInstance) {
  // Add API key authentication directly to this scope (not via register,
  // which would create a new encapsulation context and scope the hook away
  // from routes registered on this fastify instance).
  await apiKeyPlugin(fastify);

  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /sdk/v1/ruleset
  f.get('/ruleset', {
    schema: {
      response: GetRulesetRouteSchema.response,
    },
  }, async (request, reply) => {
    const key = request.apiKey!;
    const requestId = request.id;

    if (!key.environmentId) {
      return reply.code(400).send({
        error: { code: 'INVALID_KEY', message: 'API key is not associated with an environment', requestId },
      });
    }

    const environment = await db.query.environments.findFirst({
      where: eq(environments.id, key.environmentId),
      with: { project: true },
    });

    if (!environment) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Environment not found', requestId },
      });
    }

    const flagList = await db.query.flags.findMany({
      where: eq(flags.environmentId, environment.id),
      with: {
        rules: {
          orderBy: (r, { asc }) => [asc(r.priority)],
        },
      },
    });

    const segmentList = await db.query.segments.findMany({
      where: eq(segments.orgId, environment.project.orgId),
    });

    const ruleset = {
      flags: flagList.map((flag) => ({
        id: flag.id,
        key: flag.key,
        name: flag.name,
        type: flag.type as 'boolean' | 'string' | 'number' | 'json',
        defaultValue: flag.defaultValue,
        enabled: flag.enabled,
        rules: flag.rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          priority: rule.priority,
          conditions: rule.conditions,
          percentage: rule.percentage,
          value: rule.value,
          enabled: rule.enabled,
        })),
      })),
      segments: segmentList.map((segment) => ({
        id: segment.id,
        name: segment.name,
        conditions: segment.conditions,
      })),
    };

    // X-Cache: MISS — Redis caching layer added in Phase 2
    reply.header('X-Cache', 'MISS');

    return reply.send({ data: ruleset });
  });
}
