import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import crypto from 'crypto';
import { config } from './env';
import authRoutes from './routes/auth';

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
  },
});

// Register plugins
await fastify.register(cors, {
  origin: config.nodeEnv === 'production' ? false : true,
  credentials: true,
});

await fastify.register(jwt, {
  secret: config.jwt.secret,
  sign: {
    expiresIn: config.jwt.accessTokenExpiry,
  },
});

// Request ID hook
fastify.addHook('onRequest', async (request, reply) => {
  const requestId = crypto.randomUUID();
  request.id = requestId;
  reply.header('X-Request-ID', requestId);
});

// Global error handler
fastify.setErrorHandler((error: Error & { validation?: any; statusCode?: number; code?: string }, request, reply) => {
  const requestId = request.id ?? 'unknown';
  
  // Log the error
  request.log.error({
    err: error,
    requestId,
    url: request.url,
    method: request.method,
  }, 'Request error');

  // Don't override if response was already sent
  if (reply.sent) {
    return;
  }

  // Handle validation errors (Zod/Fastify schema validation)
  if (error.validation) {
    return reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
        requestId,
      },
    });
  }

  // Handle known HTTP errors
  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({
      error: {
        code: error.code ?? 'CLIENT_ERROR',
        message: error.message,
        requestId,
      },
    });
  }

  // Handle unexpected server errors
  return reply.code(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.nodeEnv === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      requestId,
    },
  });
});

// JWT authentication decorator
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing authentication token',
        requestId: request.id,
      },
    });
  }
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });

const organizationRoutes = await import('./routes/organizations');
await fastify.register(organizationRoutes.default, { prefix: '/api/v1/orgs' });

const projectRoutes = await import('./routes/projects');
await fastify.register(projectRoutes.default, { prefix: '/api/v1/orgs' });

const flagRoutes = await import('./routes/flags');
await fastify.register(flagRoutes.default, { prefix: '/api/v1/orgs' });

const ruleRoutes = await import('./routes/rules');
await fastify.register(ruleRoutes.default, { prefix: '/api/v1/orgs' });

const segmentRoutes = await import('./routes/segments');
await fastify.register(segmentRoutes.default, { prefix: '/api/v1/orgs' });

const sdkRoutes = await import('./routes/sdk');
await fastify.register(sdkRoutes.default, { prefix: '/sdk/v1' });

// Start server
try {
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`🚀 API server running on http://localhost:${config.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
