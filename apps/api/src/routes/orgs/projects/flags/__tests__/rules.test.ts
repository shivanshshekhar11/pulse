import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../../../db';
import { orgMembers, rules } from '../../../../../db/schema';
import { eq } from 'drizzle-orm';
import {
  ListRulesRouteSchema,
  CreateRuleRouteSchema,
  UpdateRuleRouteSchema,
  ReorderRulesRouteSchema,
} from '@pulse-flags/types';
import {
  buildApp,
  createTestUser,
  createTestOrg,
  createTestProject,
  createTestEnvironment,
  createTestFlag,
  createTestRule,
  cleanup,
  parseResponse,
  rulesUrl,
  ruleUrl,
  uid,
} from '../../../../../test/helpers';

describe('Rule Routes', () => {
  let app: FastifyInstance;
  let owner: { id: string; email: string; token: string };
  let memberUser: { id: string; email: string; token: string };
  let viewerUser: { id: string; email: string; token: string };
  let outsiderUser: { id: string; email: string; token: string };
  let orgId: string;
  let orgSlug: string;
  let projectSlug: string;
  let environmentId: string;
  let flagKey: string;
  let flagId: string;
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

    const flag = await createTestFlag(environmentId, owner.id);
    flagKey = flag.key;
    flagId = flag.id;
  });

  afterAll(async () => {
    await cleanup([orgId], [owner.id, memberUser.id, viewerUser.id, outsiderUser.id]);
    await app.close();
  });

  const base = () => rulesUrl(orgSlug, projectSlug, envName, flagKey);
  const byId = (ruleId: string) => ruleUrl(orgSlug, projectSlug, envName, flagKey, ruleId);
  const reorderUrl = () => `${base()}/reorder`;

  // ── GET /rules ──────────────────────────────────────────────────────────────

  describe('GET /rules', () => {
    it('returns rules ordered by priority ascending', async () => {
      await createTestRule(flagId, { priority: 2 });
      await createTestRule(flagId, { priority: 0 });
      await createTestRule(flagId, { priority: 1 });

      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListRulesRouteSchema.response[200], res.body);
      const priorities = body.data.map(r => r.priority);
      // Must be sorted ascending
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]!).toBeGreaterThanOrEqual(priorities[i - 1]!);
      }
    });

    it('viewer can list rules', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('outsider cannot list rules (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${outsiderUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for a non-existent flag', async () => {
      const res = await app.inject({
        method: 'GET',
        url: rulesUrl(orgSlug, projectSlug, envName, 'does_not_exist'),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── POST /rules ─────────────────────────────────────────────────────────────

  describe('POST /rules', () => {
    it('creates a rule with a leaf condition', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          name: 'Pro Users',
          priority: 0,
          conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
          percentage: 100,
          value: true,
          enabled: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateRuleRouteSchema.response[201], res.body);
      expect(body.data.name).toBe('Pro Users');
      expect(body.data.priority).toBe(0);
      expect(body.data.percentage).toBe(100);
      expect(body.data.enabled).toBe(true);
    });

    it('creates a rule with an AND condition tree', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          conditions: {
            operator: 'AND',
            conditions: [
              { attribute: 'plan', op: 'eq', value: 'pro' },
              { attribute: 'country', op: 'in', value: ['US', 'CA'] },
            ],
          },
          value: true,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateRuleRouteSchema.response[201], res.body);
      expect(body.data.id).toBeTruthy();
    });

    it('creates a rule with an OR condition tree', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          conditions: {
            operator: 'OR',
            conditions: [
              { attribute: 'plan', op: 'eq', value: 'pro' },
              { attribute: 'plan', op: 'eq', value: 'enterprise' },
            ],
          },
          value: true,
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('creates a rule with a NOT condition', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          conditions: {
            operator: 'NOT',
            condition: { attribute: 'plan', op: 'eq', value: 'free' },
          },
          value: true,
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('creates a rule with a segment operator', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          conditions: { attribute: 'segment', op: 'segment', value: 'some-segment-id' },
          value: true,
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('defaults priority to 0 and percentage to 100', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          conditions: { attribute: 'userId', op: 'eq', value: 'test' },
          value: true,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateRuleRouteSchema.response[201], res.body);
      expect(body.data.priority).toBe(0);
      expect(body.data.percentage).toBe(100);
    });

    it('returns 400 if conditions is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { value: true },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if percentage is out of range (> 100)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
          percentage: 101,
          value: true,
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if percentage is negative', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
          percentage: -1,
          value: true,
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('viewer cannot create rules (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: {
          conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
          value: true,
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('member can create rules', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: {
          conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
          value: true,
        },
      });
      expect(res.statusCode).toBe(201);
    });
  });

  // ── PATCH /rules/:ruleId ────────────────────────────────────────────────────

  describe('PATCH /rules/:ruleId', () => {
    it('updates a rule', async () => {
      const rule = await createTestRule(flagId, { priority: 5, percentage: 50 });

      const res = await app.inject({
        method: 'PATCH',
        url: byId(rule.id),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Updated Rule', percentage: 75, enabled: false },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(UpdateRuleRouteSchema.response[200], res.body);
      expect(body.data.name).toBe('Updated Rule');
      expect(body.data.percentage).toBe(75);
      expect(body.data.enabled).toBe(false);
    });

    it('can update conditions to a new tree', async () => {
      const rule = await createTestRule(flagId);

      const res = await app.inject({
        method: 'PATCH',
        url: byId(rule.id),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          conditions: {
            operator: 'AND',
            conditions: [
              { attribute: 'plan', op: 'eq', value: 'enterprise' },
              { attribute: 'country', op: 'eq', value: 'US' },
            ],
          },
        },
      });
      expect(res.statusCode).toBe(200);
      const body = parseResponse(UpdateRuleRouteSchema.response[200], res.body);
      expect(body.data.id).toBe(rule.id);
    });

    it('returns 404 for a rule that does not belong to this flag', async () => {
      // Create a rule on a different flag
      const otherFlag = await createTestFlag(environmentId, owner.id);
      const otherRule = await createTestRule(otherFlag.id);

      const res = await app.inject({
        method: 'PATCH',
        url: byId(otherRule.id), // URL uses flagKey, not otherFlag.key
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Cross-flag update' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('viewer cannot update rules (403)', async () => {
      const rule = await createTestRule(flagId);

      const res = await app.inject({
        method: 'PATCH',
        url: byId(rule.id),
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: { name: 'Viewer Update' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 if ruleId is not a valid UUID', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: ruleUrl(orgSlug, projectSlug, envName, flagKey, 'not-a-uuid'),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Bad ID' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── DELETE /rules/:ruleId ───────────────────────────────────────────────────

  describe('DELETE /rules/:ruleId', () => {
    it('deletes a rule', async () => {
      const rule = await createTestRule(flagId);

      const res = await app.inject({
        method: 'DELETE',
        url: byId(rule.id),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(204);

      // Verify it's gone
      const deleted = await db.query.rules.findFirst({
        where: eq(rules.id, rule.id),
      });
      expect(deleted).toBeUndefined();
    });

    it('returns 404 for a non-existent rule', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: byId('00000000-0000-0000-0000-000000000000'),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('viewer cannot delete rules (403)', async () => {
      const rule = await createTestRule(flagId);

      const res = await app.inject({
        method: 'DELETE',
        url: byId(rule.id),
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /rules/reorder ─────────────────────────────────────────────────────

  describe('POST /rules/reorder', () => {
    it('reorders rules and updates priorities', async () => {
      // Create a fresh flag for this test to avoid interference
      const reorderFlag = await createTestFlag(environmentId, owner.id);
      const r1 = await createTestRule(reorderFlag.id, { priority: 0 });
      const r2 = await createTestRule(reorderFlag.id, { priority: 1 });
      const r3 = await createTestRule(reorderFlag.id, { priority: 2 });

      const reorder = rulesUrl(orgSlug, projectSlug, envName, reorderFlag.key) + '/reorder';

      // Reverse the order
      const res = await app.inject({
        method: 'POST',
        url: reorder,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { orderedIds: [r3.id, r2.id, r1.id] },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ReorderRulesRouteSchema.response[200], res.body);
      expect(body.data.success).toBe(true);

      // Verify priorities were updated
      const updatedRules = await db.query.rules.findMany({
        where: eq(rules.flagId, reorderFlag.id),
        orderBy: (r, { asc }) => [asc(r.priority)],
      });
      expect(updatedRules[0]!.id).toBe(r3.id);
      expect(updatedRules[1]!.id).toBe(r2.id);
      expect(updatedRules[2]!.id).toBe(r1.id);
    });

    it('returns 400 if any rule ID does not belong to this flag', async () => {
      const reorderFlag = await createTestFlag(environmentId, owner.id);
      const r1 = await createTestRule(reorderFlag.id);

      // Use a rule from a different flag
      const otherFlag = await createTestFlag(environmentId, owner.id);
      const otherRule = await createTestRule(otherFlag.id);

      const reorder = rulesUrl(orgSlug, projectSlug, envName, reorderFlag.key) + '/reorder';

      const res = await app.inject({
        method: 'POST',
        url: reorder,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { orderedIds: [r1.id, otherRule.id] },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('INVALID_RULES');
    });

    it('returns 400 if orderedIds is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: reorderUrl(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { orderedIds: [] },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if orderedIds contains non-UUID values', async () => {
      const res = await app.inject({
        method: 'POST',
        url: reorderUrl(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { orderedIds: ['not-a-uuid'] },
      });
      expect(res.statusCode).toBe(400);
    });

    it('viewer cannot reorder rules (403)', async () => {
      const r1 = await createTestRule(flagId);

      const res = await app.inject({
        method: 'POST',
        url: reorderUrl(),
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: { orderedIds: [r1.id] },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
