import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../../../db';
import { orgMembers } from '../../../../../db/schema';
import {
  ListFlagsRouteSchema,
  CreateFlagRouteSchema,
  GetFlagRouteSchema,
  UpdateFlagRouteSchema,
} from '@pulse-flags/types';
import {
  buildApp,
  createTestUser,
  createTestOrg,
  createTestProject,
  createTestEnvironment,
  createTestFlag,
  cleanup,
  parseResponse,
  flagsUrl,
  flagUrl,
  uid,
} from '../../../../../test/helpers';

describe('Flag Routes', () => {
  let app: FastifyInstance;
  let owner: { id: string; email: string; token: string };
  let memberUser: { id: string; email: string; token: string };
  let viewerUser: { id: string; email: string; token: string };
  let outsiderUser: { id: string; email: string; token: string };
  let orgId: string;
  let orgSlug: string;
  let projectSlug: string;
  let environmentId: string;
  const envName = 'development';

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
    projectSlug = project.slug;

    const env = await createTestEnvironment(project.id, { name: envName });
    environmentId = env.id;
  });

  afterAll(async () => {
    await cleanup([orgId], [owner.id, memberUser.id, viewerUser.id, outsiderUser.id]);
    await app.close();
  });

  const base = () => flagsUrl(orgSlug, projectSlug, envName);
  const byKey = (key: string) => flagUrl(orgSlug, projectSlug, envName, key);

  // ── GET /flags ──────────────────────────────────────────────────────────────

  describe('GET /flags', () => {
    it('returns all flags for the environment', async () => {
      await createTestFlag(environmentId, owner.id, { key: `list_a_${uid().replace(/-/g, '_')}` });
      await createTestFlag(environmentId, owner.id, { key: `list_b_${uid().replace(/-/g, '_')}` });

      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListFlagsRouteSchema.response[200], res.body);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('viewer can list flags', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('outsider cannot list flags (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${outsiderUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for a non-existent environment', async () => {
      const res = await app.inject({
        method: 'GET',
        url: flagsUrl(orgSlug, projectSlug, 'nonexistent'),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 401 without auth', async () => {
      const res = await app.inject({ method: 'GET', url: base() });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── POST /flags ─────────────────────────────────────────────────────────────

  describe('POST /flags', () => {
    it('creates a boolean flag with all fields', async () => {
      const key = `bool_flag_${uid().replace(/-/g, '_')}`;
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          key,
          name: 'Boolean Flag',
          description: 'A test flag',
          type: 'boolean',
          defaultValue: false,
          enabled: true,
          tags: ['beta', 'test'],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateFlagRouteSchema.response[201], res.body);
      expect(body.data.key).toBe(key);
      expect(body.data.type).toBe('boolean');
      expect(body.data.version).toBe(1);
      expect(body.data.enabled).toBe(true);
      expect(body.data.tags).toEqual(['beta', 'test']);
    });

    it('creates a string flag', async () => {
      const key = `str_flag_${uid().replace(/-/g, '_')}`;
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { key, name: 'String Flag', type: 'string', defaultValue: 'control' },
      });
      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateFlagRouteSchema.response[201], res.body);
      expect(body.data.type).toBe('string');
      expect(body.data.defaultValue).toBe('control');
    });

    it('creates a number flag', async () => {
      const key = `num_flag_${uid().replace(/-/g, '_')}`;
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { key, name: 'Number Flag', type: 'number', defaultValue: 5000 },
      });
      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateFlagRouteSchema.response[201], res.body);
      expect(body.data.type).toBe('number');
    });

    it('creates a json flag', async () => {
      const key = `json_flag_${uid().replace(/-/g, '_')}`;
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { key, name: 'JSON Flag', type: 'json', defaultValue: { theme: 'dark' } },
      });
      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateFlagRouteSchema.response[201], res.body);
      expect(body.data.type).toBe('json');
    });

    it('defaults type to boolean and enabled to false', async () => {
      const key = `defaults_${uid().replace(/-/g, '_')}`;
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { key, name: 'Defaults Flag' },
      });
      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateFlagRouteSchema.response[201], res.body);
      expect(body.data.type).toBe('boolean');
      expect(body.data.enabled).toBe(false);
    });

    it('returns 400 if key already exists in this environment', async () => {
      const key = `dup_key_${uid().replace(/-/g, '_')}`;
      await createTestFlag(environmentId, owner.id, { key });

      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { key, name: 'Duplicate' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('KEY_TAKEN');
    });

    it('rejects key starting with a digit', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { key: '1invalid', name: 'Bad Key' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects key with uppercase letters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { key: 'InvalidKey', name: 'Bad Key' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects key with hyphens', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { key: 'invalid-key', name: 'Bad Key' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('accepts key with underscores and digits', async () => {
      const key = `valid_key_123_${uid().replace(/-/g, '_')}`;
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { key, name: 'Valid Key' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('viewer cannot create flags (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: { key: `viewer_flag_${uid().replace(/-/g, '_')}`, name: 'Viewer Flag' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('member can create flags', async () => {
      const key = `member_flag_${uid().replace(/-/g, '_')}`;
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { key, name: 'Member Flag' },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  // ── GET /flags/:flagKey ─────────────────────────────────────────────────────

  describe('GET /flags/:flagKey', () => {
    it('returns a specific flag by key', async () => {
      const flag = await createTestFlag(environmentId, owner.id);

      const res = await app.inject({
        method: 'GET',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(GetFlagRouteSchema.response[200], res.body);
      expect(body.data.key).toBe(flag.key);
    });

    it('returns 404 for a non-existent flag key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: byKey('does_not_exist'),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('viewer can read a flag', async () => {
      const flag = await createTestFlag(environmentId, owner.id);
      const res = await app.inject({
        method: 'GET',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── PATCH /flags/:flagKey ───────────────────────────────────────────────────

  describe('PATCH /flags/:flagKey (optimistic locking)', () => {
    it('updates a flag with the correct version', async () => {
      const flag = await createTestFlag(environmentId, owner.id, { version: 1 });

      const res = await app.inject({
        method: 'PATCH',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Updated Name', enabled: true, version: 1 },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(UpdateFlagRouteSchema.response[200], res.body);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.enabled).toBe(true);
      expect(body.data.version).toBe(2); // incremented
    });

    it('returns 409 on version conflict (stale version)', async () => {
      const flag = await createTestFlag(environmentId, owner.id, { version: 1 });

      const res = await app.inject({
        method: 'PATCH',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Stale Update', version: 999 },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toContain('modified by another user');
    });

    it('simulates concurrent update — second writer loses', async () => {
      const flag = await createTestFlag(environmentId, owner.id, { version: 1 });

      // First update succeeds
      const first = await app.inject({
        method: 'PATCH',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'First Writer', version: 1 },
      });
      expect(first.statusCode).toBe(200);

      // Second update with the same original version fails
      const second = await app.inject({
        method: 'PATCH',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { name: 'Second Writer', version: 1 },
      });
      expect(second.statusCode).toBe(409);
    });

    it('returns 400 if version is missing', async () => {
      const flag = await createTestFlag(environmentId, owner.id);

      const res = await app.inject({
        method: 'PATCH',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'No Version' }, // version required
      });
      expect(res.statusCode).toBe(400);
    });

    it('viewer cannot update flags (403)', async () => {
      const flag = await createTestFlag(environmentId, owner.id, { version: 1 });

      const res = await app.inject({
        method: 'PATCH',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: { enabled: true, version: 1 },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for a non-existent flag', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: byKey('does_not_exist'),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { enabled: true, version: 1 },
      });
      expect(res.statusCode).toBe(404);
    });

    it('can update only enabled without touching other fields', async () => {
      const flag = await createTestFlag(environmentId, owner.id, { version: 1 });

      const res = await app.inject({
        method: 'PATCH',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { enabled: true, version: 1 },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(UpdateFlagRouteSchema.response[200], res.body);
      expect(body.data.enabled).toBe(true);
      expect(body.data.name).toBe('Test Flag'); // unchanged
    });
  });

  // ── DELETE /flags/:flagKey ──────────────────────────────────────────────────

  describe('DELETE /flags/:flagKey', () => {
    it('deletes a flag', async () => {
      const flag = await createTestFlag(environmentId, owner.id);

      const res = await app.inject({
        method: 'DELETE',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(204);

      // Verify it's gone
      const check = await app.inject({
        method: 'GET',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(check.statusCode).toBe(404);
    });

    it('viewer cannot delete flags (403)', async () => {
      const flag = await createTestFlag(environmentId, owner.id);

      const res = await app.inject({
        method: 'DELETE',
        url: byKey(flag.key),
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for a non-existent flag', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: byKey('does_not_exist'),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
