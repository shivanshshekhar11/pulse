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
  ListUserOrgsRouteSchema,
  UpdateUserRouteSchema,
  ChangePasswordRouteSchema,
} from '@pulse-flags/types';

export default async function authRoutes(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/auth/register
  f.post('/register', {
    schema: {
      tags: ['Authentication'],
      summary: 'Register a new user',
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
      tags: ['Authentication'],
      summary: 'Login',
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
      tags: ['Authentication'],
      summary: 'Refresh Access Token',
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
      tags: ['Authentication'],
      summary: 'Logout',
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
      tags: ['Authentication'],
      summary: 'Get Current User',
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

  // PATCH /api/v1/auth/me
  f.patch('/me', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Update Current User',
      body: UpdateUserRouteSchema.body,
      response: UpdateUserRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;

    const updates: Partial<typeof users.$inferInsert> = {};
    if (request.body.email !== undefined) updates.email = request.body.email;
    if (request.body.name !== undefined) updates.name = request.body.name ?? null;
    if (request.body.avatarUrl !== undefined) updates.avatarUrl = request.body.avatarUrl ?? null;

    if (!Object.keys(updates).length) {
      return reply.code(400).send({
        error: { code: 'NO_UPDATES', message: 'No profile fields provided', requestId },
      });
    }

    if (updates.email) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, updates.email),
      });
      if (existing && existing.id !== userId) {
        return reply.code(409).send({
          error: { code: 'EMAIL_TAKEN', message: 'Email is already in use', requestId },
        });
      }
    }

    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return reply.code(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', requestId },
      });
    }

    return reply.send({
      data: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        avatarUrl: updated.avatarUrl,
      },
    });
  });

  // POST /api/v1/auth/me/password
  f.post('/me/password', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'Change Password',
      body: ChangePasswordRouteSchema.body,
      response: ChangePasswordRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { currentPassword, newPassword } = request.body;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.passwordHash) {
      return reply.code(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', requestId },
      });
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({
        error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect', requestId },
      });
    }

    if (currentPassword === newPassword) {
      return reply.code(400).send({
        error: { code: 'PASSWORD_REUSED', message: 'New password must be different', requestId },
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.userId, userId));

    return reply.send({ data: { message: 'Password updated successfully' } });
  });

  // GET /api/v1/auth/me/orgs
  // Returns all organizations the authenticated user belongs to.
  // Used by the dashboard to redirect to the user's first org after login.
  f.get('/me/orgs', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Authentication'],
      summary: 'List User Organizations',
      response: ListUserOrgsRouteSchema.response,
    },
  }, async (request, reply) => {
    const { userId } = request.user;
    const { listUserOrgs } = await import('../../services/organizations');
    const orgs = await listUserOrgs(userId);
    return reply.send({ data: orgs });
  });
}
