import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../db';
import { orgMembers } from '../../../db/schema';
import {
  ListApiKeysRouteSchema,
  CreateApiKeyRouteSchema,
} from '@pulse-flags/types';
import {
  buildApp,
  createTestUser,
  createTestOrg,
  createTestProject,
  createTestEnvironment,
  createTestApiKey,
  cleanup,
  parseResponse,
  uid,
} from '../../../test/helpers';

describe('API Key Routes', () => {
  let app: FastifyInstance;
  let owner: { id: string; email: string; token: string };
  let memberUser: { id: string; email: string; token: string };
  let viewerUser: { id: string; email: string; token: string };
  let outsiderUser: { id: string; email: string; token: string };
  let orgId: string;
  let orgSlug: string;
  let environmentId: string;

  beforeAll(async () => {
    app = await buildApp();

    owner = await createTestUser(app);
    memberUser = await createTestUser(app);
    viewerUser = await createTestUser(app);
    outsiderUser = await createTestUser(app);

    const org = await createTestOrg(owner.id);
    orgId = org.id;
    orgSlug = org.slug;

    await db.insert(orgMembers).values([
      { orgId, userId: memberUser.id, role: 'member' },
      { orgId, userId: viewerUser.id, role: 'viewer' },
    ]);

    const project = await createTestProject(orgId);
    const env = await createTestEnvironment(project.id, { name: 'production' });
    environmentId = env.id;
  });

  afterAll(async () => {
    await cleanup([orgId], [owner.id, memberUser.id, viewerUser.id, outsiderUser.id]);
    await app.close();
  });

  // ── GET /api/v1/orgs/:orgSlug/api-keys ─────────────────────────────────────

  describe('GET /api/v1/orgs/:orgSlug/api-keys', () => {
    it('owner can list API keys', async () => {
      await createTestApiKey(orgId, environmentId, owner.id);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListApiKeysRouteSchema.response[200], res.body);
      expect(Array.isArray(body.data)).toBe(true);
      // keyHash must never appear in the list response
      for (const key of body.data) {
        expect(key).not.toHaveProperty('keyHash');
        expect(key).not.toHaveProperty('key_hash');
        expect(key).toHaveProperty('keyPrefix');
        expect(key).toHaveProperty('id');
        expect(key).toHaveProperty('name');
      }
    });

    it('does not include revoked keys in the list', async () => {
      const revoked = await createTestApiKey(orgId, environmentId, owner.id, { revoked: true });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      const body = parseResponse(ListApiKeysRouteSchema.response[200], res.body);
      const ids = body.data.map(k => k.id);
      expect(ids).not.toContain(revoked.id);
    });

    it('member cannot list API keys (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${memberUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('viewer cannot list API keys (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('outsider cannot list API keys (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${outsiderUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /api/v1/orgs/:orgSlug/api-keys ────────────────────────────────────

  describe('POST /api/v1/orgs/:orgSlug/api-keys', () => {
    it('creates a key and returns the rawKey exactly once', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: `key-${uid()}`, environmentId, scopes: ['read'] },
      });

      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateApiKeyRouteSchema.response[201], res.body);
      expect(body.data.rawKey).toBeTruthy();
      expect(body.data.rawKey.startsWith('ps_live_')).toBe(true); // production env
      expect(body.data.keyPrefix).toBe(body.data.rawKey.slice(0, 12));
      // keyHash must never appear
      expect(res.body).not.toContain('keyHash');
      expect(res.body).not.toContain('key_hash');
    });

    it('generates ps_test_ prefix for non-production environments', async () => {
      const project = await createTestProject(orgId);
      const devEnv = await createTestEnvironment(project.id, { name: 'development' });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: `dev-key-${uid()}`, environmentId: devEnv.id, scopes: ['read'] },
      });

      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateApiKeyRouteSchema.response[201], res.body);
      expect(body.data.rawKey.startsWith('ps_test_')).toBe(true);
    });

    it('member cannot create API keys (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { name: `key-${uid()}`, environmentId, scopes: ['read'] },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 if name is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { environmentId, scopes: ['read'] },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if environmentId is not a valid UUID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/api-keys`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: `key-${uid()}`, environmentId: 'not-a-uuid', scopes: ['read'] },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── DELETE /api/v1/orgs/:orgSlug/api-keys/:keyId ───────────────────────────

  describe('DELETE /api/v1/orgs/:orgSlug/api-keys/:keyId (revoke)', () => {
    it('owner can revoke a key', async () => {
      const key = await createTestApiKey(orgId, environmentId, owner.id);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/api-keys/${key.id}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(204);

      // Revoked key should no longer authenticate
      const rulesetRes = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': key.rawKey },
      });
      expect(rulesetRes.statusCode).toBe(401);
    });

    it('returns 400 if key is already revoked', async () => {
      const key = await createTestApiKey(orgId, environmentId, owner.id, { revoked: true });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/api-keys/${key.id}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('ALREADY_REVOKED');
    });

    it('returns 404 for a key that does not belong to this org', async () => {
      // Create a key in a different org
      const otherUser = await createTestUser(app);
      const otherOrg = await createTestOrg(otherUser.id);
      const otherProject = await createTestProject(otherOrg.id);
      const otherEnv = await createTestEnvironment(otherProject.id);
      const otherKey = await createTestApiKey(otherOrg.id, otherEnv.id, otherUser.id);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/api-keys/${otherKey.id}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);

      await cleanup([otherOrg.id], [otherUser.id]);
    });

    it('member cannot revoke keys (403)', async () => {
      const key = await createTestApiKey(orgId, environmentId, owner.id);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/api-keys/${key.id}`,
        headers: { authorization: `Bearer ${memberUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 if keyId is not a valid UUID', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/api-keys/not-a-uuid`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
