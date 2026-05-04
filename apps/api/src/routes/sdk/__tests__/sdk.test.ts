import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../db';
import { apiKeys } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { GetRulesetRouteSchema } from '@pulse-flags/types';
import {
  buildApp,
  createTestUser,
  createTestOrg,
  createTestProject,
  createTestEnvironment,
  createTestApiKey,
  createTestFlag,
  createTestRule,
  createTestSegment,
  cleanup,
  parseResponse,
  uid,
} from '../../../test/helpers';

describe('SDK Routes — GET /sdk/v1/ruleset', () => {
  let app: FastifyInstance;
  let userId: string;
  let orgId: string;
  let orgSlug: string;
  let projectId: string;
  let environmentId: string;
  let rawKey: string;

  beforeAll(async () => {
    app = await buildApp();

    const user = await createTestUser(app);
    userId = user.id;

    const org = await createTestOrg(userId);
    orgId = org.id;
    orgSlug = org.slug;

    const project = await createTestProject(orgId);
    projectId = project.id;

    const env = await createTestEnvironment(projectId, { name: 'development' });
    environmentId = env.id;

    const apiKey = await createTestApiKey(orgId, environmentId, userId);
    rawKey = apiKey.rawKey;
  });

  afterAll(async () => {
    await cleanup([orgId], [userId]);
    await app.close();
  });

  // ── Authentication ──────────────────────────────────────────────────────────

  describe('API key authentication', () => {
    it('returns 401 when X-Api-Key header is missing', async () => {
      const res = await app.inject({ method: 'GET', url: '/sdk/v1/ruleset' });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for a completely invalid key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': 'ps_test_totally_invalid_key_that_does_not_exist' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for a revoked key', async () => {
      const revoked = await createTestApiKey(orgId, environmentId, userId, { revoked: true });
      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': revoked.rawKey },
      });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for an expired key', async () => {
      const expired = await createTestApiKey(orgId, environmentId, userId, { expired: true });
      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': expired.rawKey },
      });
      expect(res.statusCode).toBe(401);
    });

    it('accepts a valid key and returns 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': rawKey },
      });
      expect(res.statusCode).toBe(200);
    });

    it('sets X-Cache: MISS header on successful response', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': rawKey },
      });
      expect(res.headers['x-cache']).toBe('MISS');
    });

    it('updates last_used_at asynchronously (does not block response)', async () => {
      // Create a dedicated key for this test so we can track it precisely
      const dedicatedKey = await createTestApiKey(orgId, environmentId, userId);

      await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': dedicatedKey.rawKey },
      });

      // Poll for up to 1 second — the update is fire-and-forget
      let after = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.id, dedicatedKey.id),
      });
      for (let i = 0; i < 20 && !after?.lastUsedAt; i++) {
        await new Promise(r => setTimeout(r, 50));
        after = await db.query.apiKeys.findFirst({
          where: eq(apiKeys.id, dedicatedKey.id),
        });
      }

      expect(after?.lastUsedAt).not.toBeNull();
    });
  });

  // ── Ruleset payload ─────────────────────────────────────────────────────────

  describe('ruleset payload', () => {
    it('returns empty flags and segments for a fresh environment', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': rawKey },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(GetRulesetRouteSchema.response[200], res.body);
      expect(Array.isArray(body.data.flags)).toBe(true);
      expect(Array.isArray(body.data.segments)).toBe(true);
    });

    it('returns flags scoped to the API key environment only', async () => {
      // Create a flag in this environment
      const flag = await createTestFlag(environmentId, userId, { key: `sdk_flag_${uid().replace(/-/g, '_')}` });

      // Create a second environment with its own flag
      const otherEnv = await createTestEnvironment(projectId, { name: `other-${uid()}` });
      await createTestFlag(otherEnv.id, userId, { key: `other_flag_${uid().replace(/-/g, '_')}` });

      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': rawKey },
      });

      const body = parseResponse(GetRulesetRouteSchema.response[200], res.body);
      const keys = body.data.flags.map(f => f.key);
      expect(keys).toContain(flag.key);
      // The other environment's flag must NOT appear
      expect(keys.every(k => !k.startsWith('other_flag'))).toBe(true);
    });

    it('returns rules nested inside their flag, ordered by priority', async () => {
      const flag = await createTestFlag(environmentId, userId, { key: `rules_flag_${uid().replace(/-/g, '_')}` });
      const rule1 = await createTestRule(flag.id, { priority: 2 });
      const rule2 = await createTestRule(flag.id, { priority: 0 });
      const rule3 = await createTestRule(flag.id, { priority: 1 });

      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': rawKey },
      });

      const body = parseResponse(GetRulesetRouteSchema.response[200], res.body);
      const flagData = body.data.flags.find(f => f.key === flag.key);
      expect(flagData).toBeDefined();
      expect(flagData!.rules).toHaveLength(3);
      // Must be sorted ascending by priority
      expect(flagData!.rules[0]!.priority).toBe(0);
      expect(flagData!.rules[1]!.priority).toBe(1);
      expect(flagData!.rules[2]!.priority).toBe(2);
    });

    it('returns segments scoped to the org (shared across projects)', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': rawKey },
      });

      const body = parseResponse(GetRulesetRouteSchema.response[200], res.body);
      const segmentIds = body.data.segments.map(s => s.id);
      expect(segmentIds).toContain(segment.id);
    });

    it('flag shape includes all required fields for local evaluation', async () => {
      const flag = await createTestFlag(environmentId, userId, {
        key: `shape_flag_${uid().replace(/-/g, '_')}`,
        type: 'string',
        enabled: true,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': rawKey },
      });

      const body = parseResponse(GetRulesetRouteSchema.response[200], res.body);
      const flagData = body.data.flags.find(f => f.key === flag.key);
      expect(flagData).toBeDefined();
      expect(flagData).toHaveProperty('id');
      expect(flagData).toHaveProperty('key');
      expect(flagData).toHaveProperty('name');
      expect(flagData).toHaveProperty('type');
      expect(flagData).toHaveProperty('defaultValue');
      expect(flagData).toHaveProperty('enabled');
      expect(flagData).toHaveProperty('rules');
      // keyHash must never appear in the ruleset
      expect(JSON.stringify(flagData)).not.toContain('keyHash');
      expect(JSON.stringify(flagData)).not.toContain('key_hash');
    });

    it('returns 400 for an API key not associated with an environment', async () => {
      const noEnvKey = await createTestApiKey(orgId, environmentId, userId);
      // Manually null out the environmentId
      await db
        .update(apiKeys)
        .set({ environmentId: null })
        .where(eq(apiKeys.id, noEnvKey.id));

      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': noEnvKey.rawKey },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_KEY');
    });
  });

  // ── Environment isolation ───────────────────────────────────────────────────

  describe('environment isolation', () => {
    it('a key for environment A cannot see flags from environment B', async () => {
      const envA = await createTestEnvironment(projectId, { name: `env-a-${uid()}` });
      const envB = await createTestEnvironment(projectId, { name: `env-b-${uid()}` });

      const keyA = await createTestApiKey(orgId, envA.id, userId);
      const flagB = await createTestFlag(envB.id, userId, { key: `env_b_flag_${uid().replace(/-/g, '_')}` });

      const res = await app.inject({
        method: 'GET',
        url: '/sdk/v1/ruleset',
        headers: { 'x-api-key': keyA.rawKey },
      });

      const body = parseResponse(GetRulesetRouteSchema.response[200], res.body);
      const keys = body.data.flags.map(f => f.key);
      expect(keys).not.toContain(flagB.key);
    });
  });
});
