import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../db';
import { orgMembers } from '../../../db/schema';
import {
  ListSegmentsRouteSchema,
  CreateSegmentRouteSchema,
  GetSegmentRouteSchema,
  UpdateSegmentRouteSchema,
} from '@pulse-flags/types';
import {
  buildApp,
  createTestUser,
  createTestOrg,
  createTestSegment,
  cleanup,
  parseResponse,
  uid,
} from '../../../test/helpers';

describe('Segment Routes', () => {
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
  });

  afterAll(async () => {
    await cleanup([orgId], [owner.id, memberUser.id, viewerUser.id, outsiderUser.id]);
    await app.close();
  });

  const base = () => `/api/v1/orgs/${orgSlug}/segments`;
  const byId = (id: string) => `${base()}/${id}`;

  // ── GET /segments ───────────────────────────────────────────────────────────

  describe('GET /segments', () => {
    it('returns all segments for the org', async () => {
      await createTestSegment(orgId, { name: `seg-list-${uid()}` });
      await createTestSegment(orgId, { name: `seg-list-${uid()}` });

      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListSegmentsRouteSchema.response[200], res.body);
      expect(body.data.items.length).toBeGreaterThanOrEqual(2);
    });

    it('viewer can list segments', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('member can list segments', async () => {
      const res = await app.inject({
        method: 'GET',
        url: base(),
        headers: { authorization: `Bearer ${memberUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('outsider cannot list segments (403)', async () => {
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
  });

  // ── POST /segments ──────────────────────────────────────────────────────────

  describe('POST /segments', () => {
    it('creates a segment with a leaf condition', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          name: `Pro Users ${uid()}`,
          description: 'Users on the pro plan',
          conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateSegmentRouteSchema.response[201], res.body);
      expect(body.data.orgId).toBe(orgId);
      expect(body.data.description).toBe('Users on the pro plan');
    });

    it('creates a segment with an AND condition tree', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          name: `Complex ${uid()}`,
          conditions: {
            operator: 'AND',
            conditions: [
              { attribute: 'plan', op: 'in', value: ['pro', 'enterprise'] },
              { attribute: 'country', op: 'eq', value: 'US' },
            ],
          },
        },
      });
      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateSegmentRouteSchema.response[201], res.body);
      expect(body.data.id).toBeTruthy();
    });

    it('creates a segment with an OR condition tree', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          name: `OR Segment ${uid()}`,
          conditions: {
            operator: 'OR',
            conditions: [
              { attribute: 'email', op: 'ends_with', value: '@acme.com' },
              { attribute: 'role', op: 'eq', value: 'internal' },
            ],
          },
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('creates a segment with a NOT condition', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          name: `NOT Segment ${uid()}`,
          conditions: {
            operator: 'NOT',
            condition: { attribute: 'plan', op: 'eq', value: 'free' },
          },
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('creates a segment without description (optional)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          name: `No Desc ${uid()}`,
          conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
        },
      });
      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateSegmentRouteSchema.response[201], res.body);
      expect(body.data.description).toBeNull();
    });

    it('viewer cannot create segments (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: {
          name: `Viewer Seg ${uid()}`,
          conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('member cannot create segments (403) — segments:write required', async () => {
      // member has segments:read but NOT segments:write
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: {
          name: `Member Seg ${uid()}`,
          conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 if name is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { conditions: { attribute: 'plan', op: 'eq', value: 'pro' } },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if conditions is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: `No Conditions ${uid()}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if conditions has an invalid operator', async () => {
      const res = await app.inject({
        method: 'POST',
        url: base(),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          name: `Bad Op ${uid()}`,
          conditions: { attribute: 'plan', op: 'invalid_op', value: 'pro' },
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /segments/:segmentId ────────────────────────────────────────────────

  describe('GET /segments/:segmentId', () => {
    it('returns a specific segment', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'GET',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(GetSegmentRouteSchema.response[200], res.body);
      expect(body.data.id).toBe(segment.id);
      expect(body.data.orgId).toBe(orgId);
    });

    it('viewer can read a segment', async () => {
      const segment = await createTestSegment(orgId);
      const res = await app.inject({
        method: 'GET',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 for a non-existent segment', async () => {
      const res = await app.inject({
        method: 'GET',
        url: byId('00000000-0000-0000-0000-000000000000'),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 if segmentId is not a valid UUID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: byId('not-a-uuid'),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
    });

    it('cannot access a segment from a different org', async () => {
      // Create a segment in a different org
      const otherUser = await createTestUser(app);
      const otherOrg = await createTestOrg(otherUser.id);
      const otherSegment = await createTestSegment(otherOrg.id);

      const res = await app.inject({
        method: 'GET',
        url: byId(otherSegment.id), // URL uses orgSlug (our org)
        headers: { authorization: `Bearer ${owner.token}` },
      });
      // The segment exists but belongs to a different org — should 404
      expect(res.statusCode).toBe(404);

      await cleanup([otherOrg.id], [otherUser.id]);
    });
  });

  // ── PATCH /segments/:segmentId ──────────────────────────────────────────────

  describe('PATCH /segments/:segmentId', () => {
    it('owner can update a segment', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'PATCH',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: {
          name: 'Updated Segment Name',
          description: 'Updated description',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(UpdateSegmentRouteSchema.response[200], res.body);
      expect(body.data.name).toBe('Updated Segment Name');
      expect(body.data.description).toBe('Updated description');
    });

    it('can update conditions', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'PATCH',
        url: byId(segment.id),
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
      const body = parseResponse(UpdateSegmentRouteSchema.response[200], res.body);
      expect(body.data.id).toBe(segment.id);
    });

    it('partial update — only name changes, conditions preserved', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'PATCH',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Only Name Changed' },
      });

      expect(res.statusCode).toBe(200);
      const body = parseResponse(UpdateSegmentRouteSchema.response[200], res.body);
      expect(body.data.name).toBe('Only Name Changed');
      // conditions should still be present
      expect(body.data.conditions).toBeDefined();
    });

    it('viewer cannot update segments (403)', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'PATCH',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: { name: 'Viewer Update' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('member cannot update segments (403)', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'PATCH',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { name: 'Member Update' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for a non-existent segment', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: byId('00000000-0000-0000-0000-000000000000'),
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Ghost Update' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /segments/:segmentId ─────────────────────────────────────────────

  describe('DELETE /segments/:segmentId', () => {
    it('owner can delete a segment', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'DELETE',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(204);

      // Verify it's gone
      const check = await app.inject({
        method: 'GET',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(check.statusCode).toBe(404);
    });

    it('viewer cannot delete segments (403)', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'DELETE',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('member cannot delete segments (403)', async () => {
      const segment = await createTestSegment(orgId);

      const res = await app.inject({
        method: 'DELETE',
        url: byId(segment.id),
        headers: { authorization: `Bearer ${memberUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for a non-existent segment', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: byId('00000000-0000-0000-0000-000000000000'),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 if segmentId is not a valid UUID', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: byId('not-a-uuid'),
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
