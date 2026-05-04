import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { apiKeys } from '../db/schema';
import { eq, and, isNull, or, gt } from 'drizzle-orm';
import { createHash } from 'crypto';

/**
 * Fastify plugin that authenticates SDK requests via the X-Api-Key header
 * or the `?apiKey=` query parameter.
 *
 * The query parameter fallback exists specifically for SSE connections:
 * the browser's native `EventSource` API does not support custom headers,
 * so the SDK passes the key as a query parameter for `/sdk/v1/stream`.
 * All other SDK calls use the `X-Api-Key` header.
 *
 * Validates the key against the SHA-256 hash stored in the database.
 * Attaches the resolved key record to `request.apiKey` for downstream handlers.
 * Updates `last_used_at` asynchronously — never blocks the request path.
 *
 * Register this plugin on any route scope that requires API key auth.
 */
export default async function apiKeyPlugin(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    // Header takes precedence; query param is the SSE fallback
    const rawKey =
      (request.headers['x-api-key'] as string | undefined) ??
      (request.query as Record<string, string>)['apiKey'];
    const requestId = request.id;

    if (!rawKey) {
      return reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Missing API key (X-Api-Key header or ?apiKey= query param)', requestId },
      });
    }

    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const key = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.keyHash, keyHash),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date()))
      ),
    });

    if (!key) {
      return reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired API key', requestId },
      });
    }

    // Fire-and-forget — do not await, do not slow down the request path
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id))
      .catch(() => undefined);

    request.apiKey = key;
  });
}
