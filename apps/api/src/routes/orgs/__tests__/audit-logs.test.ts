import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../db';
import { orgMembers, auditLogs } from '../../../db/schema';
import { ListAuditLogsRouteSchema } from '@pulse-flags/types';
import {
  buildApp,
  createTestUser,
  createTestOrg,
  createTestProject,
  createTestEnvironment,
  cleanup,
  parseResponse,
  uid,
} from '../../../test/helpers';

describe('Audit Log Routes', () => {
  let app: FastifyInstance;
  let owner: { id: string; email: string; token: string };
  let memberUser: { id: string; email: string; token: string };
  let viewerUser: { id: string; email: string; token: string };
  let outsiderUser: { id: string; email: string; token: string };
  let orgId: string;
  let orgSlug: string;

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

    // Seed some audit log entries by performing real mutations via the API
    const project = await createTestProject(orgId);
    await createTestEnvironment(project.id, { name: 'development' });

    // Create a flag (writes flag.created audit log)
    await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}/envs/development/flags`,
      headers: { authorization: `Bearer ${owner.token}` },
      payload: { key: `audit_flag_${uid().replace(/-/g, '_')}`, name: 'Audit Flag' },
    });

    // Create a segment (writes segment.created audit log)
    await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${orgSlug}/segments`,
      headers: { authorization: `Bearer ${owner.token}` },
      payload: {
        name: `Audit Segment ${uid()}`,
        conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
      },
    });
  });

  afterAll(async () => {
    await cleanup([orgId], [owner.id, memberUser.id, viewerUser.id, outsiderUser.id]);
    await app.close();
  });

  const base = () => `/api/v1/orgs/${orgSlug}/audit-logs`;

  // ── GET /audit-logs ─────────────────────────────────────────────────────────

  describe('GET /orgs/:orgSlug/audit-logs', () => {
    it('returns audit log entries for the org', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListAuditLogsRouteSchema.response[200], res.body);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items.length).toBeGreaterThanOrEqual(2);
      expect(typeof body.data.total).toBe('number');
      expect(body.data.limit).toBe(50); // default
      expect(body.data.offset).toBe(0); // default
    });

    it('viewer can read audit logs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('member can read audit logs', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${memberUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('outsider cannot read audit logs (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${outsiderUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 401 without auth', async () => {
      const res = await app.inject({ method: 'GET', url: base() });
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 for a non-existent org', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/orgs/does-not-exist/audit-logs',
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── Filtering ───────────────────────────────────────────────────────────────

  describe('filtering', () => {
    it('filters by action', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?action=flag.created`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListAuditLogsRouteSchema.response[200], res.body);
      // Every returned entry must have the requested action
      for (const item of body.data.items) {
        expect(item.action).toBe('flag.created');
      }
    });

    it('filters by resourceType', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?resourceType=segment`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListAuditLogsRouteSchema.response[200], res.body);
      for (const item of body.data.items) {
        expect(item.resourceType).toBe('segment');
      }
    });

    it('filters by actorId', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?actorId=${owner.id}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListAuditLogsRouteSchema.response[200], res.body);
      for (const item of body.data.items) {
        expect(item.actorId).toBe(owner.id);
      }
    });

    it('returns 400 for an invalid action value', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?action=not.a.valid.action`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for an invalid resourceType value', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?resourceType=invalid`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 for an invalid actorId (not a UUID)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?actorId=not-a-uuid`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('combined filters narrow results correctly', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?action=flag.created&actorId=${owner.id}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListAuditLogsRouteSchema.response[200], res.body);
      for (const item of body.data.items) {
        expect(item.action).toBe('flag.created');
        expect(item.actorId).toBe(owner.id);
      }
    });
  });

  // ── Pagination ──────────────────────────────────────────────────────────────

  describe('pagination', () => {
    it('respects limit parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?limit=1`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListAuditLogsRouteSchema.response[200], res.body);
      expect(body.data.items).toHaveLength(1);
      expect(body.data.limit).toBe(1);
    });

    it('respects offset parameter', async () => {
      const allRes = await app.inject({
        method: 'GET',
        url: `${base()}?limit=10&offset=0`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      const offsetRes = await app.inject({
        method: 'GET',
        url: `${base()}?limit=10&offset=1`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      const allBody = parseResponse(ListAuditLogsRouteSchema.response[200], allRes.body);
      const offsetBody = parseResponse(ListAuditLogsRouteSchema.response[200], offsetRes.body);

      // The first item in the offset=1 result should be the second item in offset=0
      if (allBody.data.items.length >= 2 && offsetBody.data.items.length >= 1) {
        expect(offsetBody.data.items[0]!.id).toBe(allBody.data.items[1]!.id);
      }
    });

    it('total reflects the unfiltered count for the org', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?limit=1`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      const body = parseResponse(ListAuditLogsRouteSchema.response[200], res.body);
      // total should be >= 2 (we created at least 2 entries in beforeAll)
      expect(body.data.total).toBeGreaterThanOrEqual(2);
    });

    it('returns 400 if limit exceeds 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?limit=201`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if limit is 0', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?limit=0`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if offset is negative', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `${base()}?offset=-1`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── Isolation ───────────────────────────────────────────────────────────────

  describe('tenant isolation', () => {
    it('does not return audit logs from a different org', async () => {
      // Create a second org with its own audit log entry
      const otherUser = await createTestUser(app);
      const otherOrg = await createTestOrg(otherUser.id);

      // Insert a log directly for the other org
      await db.insert(auditLogs).values({
        orgId: otherOrg.id,
        actorId: otherUser.id,
        action: 'org.updated',
        resourceType: 'org',
        resourceId: otherOrg.id,
        ip: '127.0.0.1',
      });

      const res = await app.inject({
        method: 'GET',
        url: base(), // our org's endpoint
        headers: { authorization: `Bearer ${owner.token}` },
      });

      const body = parseResponse(ListAuditLogsRouteSchema.response[200], res.body);
      // Every entry must belong to our org
      for (const item of body.data.items) {
        expect(item.orgId).toBe(orgId);
      }

      await cleanup([otherOrg.id], [otherUser.id]);
    });
  });
});
