import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { config } from './env';

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
  },
  genReqId: () => crypto.randomUUID(),
});

// ── Type provider ─────────────────────────────────────────────────────────────
// Tells Fastify to use Zod for both request validation and response serialization.
// Routes call fastify.withTypeProvider<ZodTypeProvider>() to get typed request/reply.
fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

// ── Plugins ───────────────────────────────────────────────────────────────────

await fastify.register(cors, {
  origin: config.nodeEnv === 'production' ? false : true,
  credentials: true,
});

await fastify.register(jwt, {
  secret: config.jwt.secret,
  sign: { expiresIn: config.jwt.accessTokenExpiry },
});

// ── Hooks ─────────────────────────────────────────────────────────────────────

fastify.addHook('onRequest', async (request, reply) => {
  reply.header('X-Request-ID', request.id);
});

// ── Decorators ────────────────────────────────────────────────────────────────

fastify.decorate(
  'authenticate',
  async function (
    request: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply
  ) {
    try {
      // Extract token from query string (fallback if fastify drops it)
      const tokenMatch = request.url.match(/[?&]token=([^&]+)/);
      const token = (request.query as { token?: string })?.token || (tokenMatch ? tokenMatch[1] : undefined);
      
      if (token) {
        request.headers.authorization = `Bearer ${token}`;
      }
      await request.jwtVerify();
    } catch {
      reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or missing authentication token',
          requestId: request.id,
        },
      });
    }
  }
);

// ── Error handler ─────────────────────────────────────────────────────────────

fastify.setErrorHandler(
  (
    error: Error & { validation?: unknown; statusCode?: number; code?: string },
    request,
    reply
  ) => {
    const requestId = request.id;

    request.log.error(
      { err: error, requestId, url: request.url, method: request.method },
      'Request error'
    );

    if (reply.sent) return;

    // Zod validation errors from fastify-type-provider-zod have statusCode 400
    // and either error.validation (ajv compat) or error.name === 'ZodError'
    if (error.validation || (error as unknown as { name?: string }).name === 'ZodError') {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', requestId },
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: { code: error.code ?? 'CLIENT_ERROR', message: error.message, requestId },
      });
    }

    return reply.code(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          config.nodeEnv === 'production' ? 'An unexpected error occurred' : error.message,
        requestId,
      },
    });
  }
);

// ── Health check ──────────────────────────────────────────────────────────────

fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────────────────

const { default: authRoutes } = await import('./routes/auth/index');
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

const { default: orgRoutes } = await import('./routes/orgs/index');
await fastify.register(orgRoutes, { prefix: '/api/v1/orgs' });

const { default: apiKeyRoutes } = await import('./routes/orgs/api-keys');
await fastify.register(apiKeyRoutes, { prefix: '/api/v1/orgs' });

const { default: projectRoutes } = await import('./routes/orgs/projects/index');
await fastify.register(projectRoutes, { prefix: '/api/v1/orgs' });

const { default: flagRoutes } = await import('./routes/orgs/projects/flags/index');
await fastify.register(flagRoutes, { prefix: '/api/v1/orgs' });

const { default: ruleRoutes } = await import('./routes/orgs/projects/flags/rules');
await fastify.register(ruleRoutes, { prefix: '/api/v1/orgs' });

const { default: segmentRoutes } = await import('./routes/segments/index');
await fastify.register(segmentRoutes, { prefix: '/api/v1/orgs' });

const { default: auditLogRoutes } = await import('./routes/orgs/audit-logs');
await fastify.register(auditLogRoutes, { prefix: '/api/v1/orgs' });

const { default: sdkRoutes } = await import('./routes/sdk/index');
await fastify.register(sdkRoutes, { prefix: '/sdk/v1' });

// ── Start ─────────────────────────────────────────────────────────────────────

try {
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`🚀 API server running on http://localhost:${config.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
