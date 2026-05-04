import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { db } from '../../db';
import { users, refreshTokens } from '../../db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { hashPassword, verifyPassword, sha256, generateRefreshToken } from '../../lib/crypto';
import {
  RegisterRouteSchema,
  LoginRouteSchema,
  RefreshRouteSchema,
  LogoutRouteSchema,
  MeRouteSchema,
} from '@pulse-flags/types';

export default async function authRoutes(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/auth/register
  f.post('/register', {
    schema: {
      body: RegisterRouteSchema.body,
      response: RegisterRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    // request.body is fully typed by fastify-type-provider-zod — no manual parse needed
    const { email, name, password } = request.body;

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return reply.code(400).send({
        error: { code: 'USER_EXISTS', message: 'A user with this email already exists', requestId },
      });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email, name: name ?? null, passwordHash })
      .returning();

    if (!user) {
      return reply.code(500).send({
        error: { code: 'CREATE_FAILED', message: 'Failed to create user', requestId },
      });
    }

    const accessToken = fastify.jwt.sign({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken();

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return reply.code(201).send({
      data: {
        user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
        accessToken,
        refreshToken,
      },
    });
  });

  // POST /api/v1/auth/login
  f.post('/login', {
    schema: {
      body: LoginRouteSchema.body,
      response: LoginRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { email, password } = request.body;

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.passwordHash) {
      return reply.code(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', requestId },
      });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password', requestId },
      });
    }

    const accessToken = fastify.jwt.sign({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken();

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return reply.send({
      data: {
        user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
        accessToken,
        refreshToken,
      },
    });
  });

  // POST /api/v1/auth/refresh
  f.post('/refresh', {
    schema: {
      body: RefreshRouteSchema.body,
      response: RefreshRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { refreshToken } = request.body;

    const tokenHash = sha256(refreshToken);
    const token = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date())
      ),
    });

    if (!token) {
      return reply.code(401).send({
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token', requestId },
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, token.userId),
    });

    if (!user) {
      return reply.code(401).send({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', requestId },
      });
    }

    // Rotate: revoke old token, issue new one
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, token.id));

    const newRefreshToken = generateRefreshToken();
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: sha256(newRefreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const accessToken = fastify.jwt.sign({ userId: user.id, email: user.email });

    return reply.send({
      data: { accessToken, refreshToken: newRefreshToken },
    });
  });

  // POST /api/v1/auth/logout
  f.post('/logout', {
    schema: {
      body: LogoutRouteSchema.body,
      response: LogoutRouteSchema.response,
    },
  }, async (request, reply) => {
    const { refreshToken } = request.body;

    if (refreshToken) {
      const tokenHash = sha256(refreshToken);
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }

    return reply.send({ data: { message: 'Logged out successfully' } });
  });

  // GET /api/v1/auth/me
  f.get('/me', {
    onRequest: [fastify.authenticate],
    schema: {
      response: MeRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return reply.code(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', requestId },
      });
    }

    return reply.send({
      data: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    });
  });
}
