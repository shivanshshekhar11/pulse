import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { GetRulesetRouteSchema } from '@pulse/types';
import { redis } from '../../lib/redis';
import type { Redis as RedisClient } from 'ioredis';
import apiKeyPlugin from '../../plugins/api-key';
import { getRuleset } from '../../services/ruleset';

export default async function sdkRoutes(fastify: FastifyInstance) {
  // Add API key authentication directly to this scope (not via register,
  // which would create a new encapsulation context and scope the hook away
  // from routes registered on this fastify instance).
  await apiKeyPlugin(fastify);

  // Track all open subscriber connections so we can clean them up on server
  // shutdown. Without this, open SSE connections leave dangling Redis clients
  // when the server closes (e.g. during tests or graceful restarts).
  const openSubscribers = new Set<RedisClient>();

  fastify.addHook('onClose', async () => {
    for (const sub of openSubscribers) {
      await sub.unsubscribe().catch(() => undefined);
      await sub.quit().catch(() => undefined);
    }
    openSubscribers.clear();
  });

  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // ── GET /sdk/v1/ruleset ────────────────────────────────────────────────────
  // Returns the full flag + rule + segment payload for the API key's environment.
  // The SDK calls this once on startup to populate its in-memory ruleset.
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

    const ruleset = await getRuleset(key.environmentId).catch(() => null);

    if (!ruleset) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Environment not found', requestId },
      });
    }

    // X-Cache: MISS — Redis caching layer is a future optimisation
    reply.header('X-Cache', 'MISS');

    return reply.send({ data: ruleset });
  });

  // ── GET /sdk/v1/stream ─────────────────────────────────────────────────────
  // Server-Sent Events endpoint. The SDK connects here after calling /ruleset
  // to receive real-time flag change notifications.
  //
  // Protocol:
  //   - On connect: sends a `retry:` hint, then an `init` event with the
  //     current ruleset so the SDK can skip the separate GET /ruleset call.
  //   - On flag/rule mutation: the API publishes to `pulse:env:{envId}` via
  //     Redis. This endpoint subscribes and forwards the message as a
  //     `ruleset:updated` event.
  //   - Every 30s: sends a `: heartbeat` comment frame to keep the connection
  //     alive through proxies and load balancers.
  //   - On disconnect: unsubscribes from Redis and clears the heartbeat timer.
  //
  // The subscriber uses a dedicated Redis connection (redis.duplicate()) because
  // ioredis cannot use the same connection for both commands and subscriptions.
  fastify.get('/stream', async (request, reply) => {
    const key = request.apiKey!;
    const requestId = request.id;

    if (!key.environmentId) {
      return reply.code(400).send({
        error: { code: 'INVALID_KEY', message: 'API key is not associated with an environment', requestId },
      });
    }

    const envId = key.environmentId;

    // Fetch the current ruleset to send as the init event
    const ruleset = await getRuleset(envId).catch(() => null);
    if (!ruleset) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Environment not found', requestId },
      });
    }

    // Set SSE headers — must be done before any write
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // Critical for nginx: prevents response buffering which would delay events
      'X-Accel-Buffering': 'no',
      'X-Request-ID': requestId,
    });

    // Tell the client to wait 5 seconds before reconnecting if the connection
    // drops. The SDK implements its own exponential backoff on top of this.
    reply.raw.write('retry: 5000\n\n');

    // Send the current ruleset immediately so the SDK doesn't need a separate
    // GET /ruleset call when it connects to the stream first.
    reply.raw.write(
      `event: init\ndata: ${JSON.stringify({ type: 'init', ruleset })}\n\n`
    );

    // Dedicated subscriber connection — ioredis cannot subscribe and issue
    // commands on the same connection simultaneously.
    const sub = redis.duplicate();
    openSubscribers.add(sub);
    await sub.subscribe(`pulse:env:${envId}`);

    // Forward every Redis message to the SSE stream
    sub.on('message', (_channel: string, message: string) => {
      reply.raw.write(`event: ruleset:updated\ndata: ${message}\n\n`);
    });

    // Heartbeat every 30s — keeps the connection alive through proxies
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30_000);

    // Cleanup on client disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      openSubscribers.delete(sub);
      sub.unsubscribe().catch(() => undefined);
      sub.quit().catch(() => undefined);
    });

    // Return a promise that never resolves — Fastify must not close the response
    return new Promise<void>(() => undefined);
  });
}
