import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../db';
import { users, refreshTokens } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { sha256 } from '../../../lib/crypto';
import { buildApp, createTestUser, cleanup, uid } from '../../../test/helpers';

describe('Auth Routes', () => {
  let app: FastifyInstance;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await cleanup([], createdUserIds);
    await app.close();
  });

  // ── POST /api/v1/auth/register ──────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('registers a new user and returns tokens', async () => {
      const email = `register-${uid()}@test.com`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'password123', name: 'Test User' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as { data: { user: { id: string; email: string }; accessToken: string; refreshToken: string } };
      expect(body.data.user.email).toBe(email);
      expect(body.data.accessToken).toBeTruthy();
      expect(body.data.refreshToken).toBeTruthy();
      // passwordHash must never appear in the response
      expect(res.body).not.toContain('passwordHash');
      expect(res.body).not.toContain('password_hash');

      createdUserIds.push(body.data.user.id);
    });

    it('registers without optional name field', async () => {
      const email = `noname-${uid()}@test.com`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'password123' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as { data: { user: { id: string; name: null } } };
      expect(body.data.user.name).toBeNull();
      createdUserIds.push(body.data.user.id);
    });

    it('returns 400 if email is already taken', async () => {
      const email = `dup-${uid()}@test.com`;
      const first = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'password123' },
      });
      expect(first.statusCode).toBe(201);
      const firstBody = JSON.parse(first.body) as { data: { user: { id: string } } };
      createdUserIds.push(firstBody.data.user.id);

      const second = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'password123' },
      });
      expect(second.statusCode).toBe(400);
      const body = JSON.parse(second.body) as { error: { code: string } };
      expect(body.error.code).toBe('USER_EXISTS');
    });

    it('returns 400 if password is too short (< 8 chars)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: `short-${uid()}@test.com`, password: 'abc' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if email is malformed', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'not-an-email', password: 'password123' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if body is missing required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: `missing-${uid()}@test.com` }, // no password
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns X-Request-ID header on error responses', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'bad', password: 'x' },
      });
      expect(res.headers['x-request-id']).toBeTruthy();
    });
  });

  // ── POST /api/v1/auth/login ─────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const user = await createTestUser(app);
      createdUserIds.push(user.id);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: user.email, password: 'password123' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { data: { user: { email: string }; accessToken: string; refreshToken: string } };
      expect(body.data.user.email).toBe(user.email);
      expect(body.data.accessToken).toBeTruthy();
      expect(body.data.refreshToken).toBeTruthy();
    });

    it('returns 401 for wrong password', async () => {
      const user = await createTestUser(app);
      createdUserIds.push(user.id);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: user.email, password: 'wrong-password' },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 for non-existent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: `ghost-${uid()}@test.com`, password: 'password123' },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 400 if email is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { password: 'password123' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if password is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: `test-${uid()}@test.com` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('does not leak timing info — same error code for wrong email vs wrong password', async () => {
      const user = await createTestUser(app);
      createdUserIds.push(user.id);

      const wrongEmail = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: `ghost-${uid()}@test.com`, password: 'password123' },
      });
      const wrongPassword = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: user.email, password: 'wrong' },
      });

      const b1 = JSON.parse(wrongEmail.body) as { error: { code: string } };
      const b2 = JSON.parse(wrongPassword.body) as { error: { code: string } };
      expect(b1.error.code).toBe('INVALID_CREDENTIALS');
      expect(b2.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  // ── POST /api/v1/auth/refresh ───────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('issues new tokens and rotates the refresh token', async () => {
      // Register to get initial tokens
      const email = `refresh-${uid()}@test.com`;
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'password123' },
      });
      const regBody = JSON.parse(regRes.body) as { data: { user: { id: string }; refreshToken: string } };
      createdUserIds.push(regBody.data.user.id);
      const originalRefreshToken = regBody.data.refreshToken;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: originalRefreshToken },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { data: { accessToken: string; refreshToken: string } };
      expect(body.data.accessToken).toBeTruthy();
      expect(body.data.refreshToken).toBeTruthy();
      // New refresh token must differ from the original
      expect(body.data.refreshToken).not.toBe(originalRefreshToken);
    });

    it('returns 401 if the refresh token is already revoked (rotation prevents reuse)', async () => {
      const email = `rotate-${uid()}@test.com`;
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'password123' },
      });
      const regBody = JSON.parse(regRes.body) as { data: { user: { id: string }; refreshToken: string } };
      createdUserIds.push(regBody.data.user.id);
      const originalToken = regBody.data.refreshToken;

      // First refresh — rotates the token
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: originalToken },
      });

      // Second refresh with the same (now revoked) token
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: originalToken },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('returns 401 for a completely fabricated refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for an expired refresh token', async () => {
      const user = await createTestUser(app);
      createdUserIds.push(user.id);

      // Insert an already-expired token directly
      const rawToken = 'b'.repeat(64);
      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: rawToken },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 400 if refreshToken field is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── POST /api/v1/auth/logout ────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('revokes the refresh token so it cannot be used again', async () => {
      const email = `logout-${uid()}@test.com`;
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email, password: 'password123' },
      });
      const regBody = JSON.parse(regRes.body) as { data: { user: { id: string }; refreshToken: string } };
      createdUserIds.push(regBody.data.user.id);
      const refreshToken = regBody.data.refreshToken;

      const logoutRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: { refreshToken },
      });
      expect(logoutRes.statusCode).toBe(200);

      // Attempting to refresh after logout should fail
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });
      expect(refreshRes.statusCode).toBe(401);
    });

    it('succeeds even without a refreshToken (graceful logout)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: {},
      });
      expect(res.statusCode).toBe(200);
    });

    it('succeeds with an unknown refreshToken (idempotent)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: { refreshToken: 'c'.repeat(64) },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── GET /api/v1/auth/me ─────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('returns the authenticated user', async () => {
      const user = await createTestUser(app);
      createdUserIds.push(user.id);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${user.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { data: { id: string; email: string } };
      expect(body.data.id).toBe(user.id);
      expect(body.data.email).toBe(user.email);
      expect(res.body).not.toContain('passwordHash');
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 with a malformed token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: 'Bearer not.a.jwt' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 with a token signed by a different secret', async () => {
      // Manually craft a token with a wrong secret
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlIiwiZW1haWwiOiJmYWtlQHRlc3QuY29tIn0.wrongsignature';
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${fakeToken}` },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 with Bearer prefix missing', async () => {
      const user = await createTestUser(app);
      createdUserIds.push(user.id);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: user.token }, // no "Bearer " prefix
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
