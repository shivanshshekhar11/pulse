import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { hashPassword, verifyPassword, sha256, generateRefreshToken } from '../lib/crypto';
import { CreateUserSchema, LoginSchema } from '@pulse/types';

export default async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const body = CreateUserSchema.parse(request.body);

    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (existing) {
      return reply.code(400).send({
        error: 'USER_EXISTS',
        message: 'User with this email already exists',
      });
    }

    // Create user
    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(users)
      .values({
        email: body.email,
        name: body.name ?? null,
        passwordHash,
      })
      .returning();

    if (!user) {
      return reply.code(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create user',
      });
    }

    // Generate tokens
    const accessToken = fastify.jwt.sign({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken();
    const tokenHash = sha256(refreshToken);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return reply.code(201).send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
      },
    });
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!user || !user.passwordHash) {
      return reply.code(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const accessToken = fastify.jwt.sign({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken();
    const tokenHash = sha256(refreshToken);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
      },
    });
  });

  // Refresh token
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    if (!refreshToken) {
      return reply.code(400).send({
        error: 'MISSING_TOKEN',
        message: 'Refresh token is required',
      });
    }

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
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, token.userId),
    });

    if (!user) {
      return reply.code(401).send({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Generate new access token
    const accessToken = fastify.jwt.sign({
      userId: user.id,
      email: user.email,
    });

    return reply.send({
      data: {
        accessToken,
      },
    });
  });

  // Logout
  fastify.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    if (refreshToken) {
      const tokenHash = sha256(refreshToken);
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }

    return reply.send({
      data: { message: 'Logged out successfully' },
    });
  });

  // Get current user
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const payload = request.user as { userId: string; email: string };

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      return reply.code(404).send({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return reply.send({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  });
}
