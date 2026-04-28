import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { apiKeys, environments, flags, segments } from '../db/schema';
import { eq, and, isNull, or, gt } from 'drizzle-orm';
import { createHash } from 'crypto';

export default async function sdkRoutes(fastify: FastifyInstance) {
  // API key authentication middleware
  fastify.addHook('preHandler', async (request, reply) => {
    const rawKey = request.headers['x-api-key'] as string | undefined;

    if (!rawKey) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Missing API key',
      });
    }

    // Hash the key
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    // Find the key
    const key = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.keyHash, keyHash),
        isNull(apiKeys.revokedAt),
        or(
          isNull(apiKeys.expiresAt),
          gt(apiKeys.expiresAt, new Date())
        )
      ),
    });

    if (!key) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired API key',
      });
    }

    // Update last_used_at asynchronously (don't await)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id))
      .then(() => {})
      .catch(() => {});

    // Attach key to request
    request.apiKey = key;
  });

  // Get full ruleset for SDK initialization
  fastify.get('/ruleset', async (request, reply) => {
    const key = request.apiKey!;

    if (!key.environmentId) {
      return reply.code(400).send({
        error: 'INVALID_KEY',
        message: 'API key is not associated with an environment',
      });
    }

    // Get environment with project
    const environment = await db.query.environments.findFirst({
      where: eq(environments.id, key.environmentId),
      with: {
        project: true,
      },
    });

    if (!environment) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Environment not found',
      });
    }

    // Get all flags for this environment with their rules
    const flagList = await db.query.flags.findMany({
      where: eq(flags.environmentId, environment.id),
      with: {
        rules: {
          orderBy: (rules, { asc }) => [asc(rules.priority)],
        },
      },
    });

    // Get all segments for the org
    const segmentList = await db.query.segments.findMany({
      where: eq(segments.orgId, environment.project.orgId),
    });

    // Build ruleset response
    const ruleset = {
      flags: flagList.map(flag => ({
        id: flag.id,
        key: flag.key,
        name: flag.name,
        type: flag.type,
        defaultValue: flag.defaultValue,
        enabled: flag.enabled,
        rules: flag.rules.map(rule => ({
          id: rule.id,
          name: rule.name,
          priority: rule.priority,
          conditions: rule.conditions,
          percentage: rule.percentage,
          value: rule.value,
          enabled: rule.enabled,
        })),
      })),
      segments: segmentList.map(segment => ({
        id: segment.id,
        name: segment.name,
        conditions: segment.conditions,
      })),
    };

    return reply.send({
      data: ruleset,
    });
  });
}
