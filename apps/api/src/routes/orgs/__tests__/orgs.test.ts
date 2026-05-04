import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../db';
import { orgMembers } from '../../../db/schema';
import { and, eq } from 'drizzle-orm';
import {
  CreateOrgRouteSchema,
  GetOrgRouteSchema,
  UpdateOrgRouteSchema,
  ListMembersRouteSchema,
  InviteMemberRouteSchema,
  UpdateMemberRoleRouteSchema,
} from '@pulse-flags/types';
import {
  buildApp,
  createTestUser,
  createTestOrg,
  cleanup,
  uid,
  parseResponse,
} from '../../../test/helpers';

describe('Org Routes', () => {
  let app: FastifyInstance;
  let owner: { id: string; email: string; token: string };
  let adminUser: { id: string; email: string; token: string };
  let memberUser: { id: string; email: string; token: string };
  let viewerUser: { id: string; email: string; token: string };
  let outsiderUser: { id: string; email: string; token: string };
  let orgId: string;
  let orgSlug: string;

  beforeAll(async () => {
    app = await buildApp();

    owner = await createTestUser(app);
    adminUser = await createTestUser(app);
    memberUser = await createTestUser(app);
    viewerUser = await createTestUser(app);
    outsiderUser = await createTestUser(app);

    const org = await createTestOrg(owner.id);
    orgId = org.id;
    orgSlug = org.slug;

    await db.insert(orgMembers).values([
      { orgId, userId: adminUser.id, role: 'admin' },
      { orgId, userId: memberUser.id, role: 'member' },
      { orgId, userId: viewerUser.id, role: 'viewer' },
    ]);
  });

  afterAll(async () => {
    await cleanup(
      [orgId],
      [owner.id, adminUser.id, memberUser.id, viewerUser.id, outsiderUser.id]
    );
    await app.close();
  });

  // ── POST /api/v1/orgs ───────────────────────────────────────────────────────

  describe('POST /api/v1/orgs', () => {
    const createdOrgIds: string[] = [];

    afterAll(async () => {
      for (const id of createdOrgIds) {
        await cleanup([id], []);
      }
    });

    it('creates an org and makes the creator the owner', async () => {
      const slug = `new-org-${uid()}`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orgs',
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { slug, name: 'New Org' },
      });

      expect(res.statusCode).toBe(201);
      const body = parseResponse(CreateOrgRouteSchema.response[201], res.body);
      expect(body.data.slug).toBe(slug);
      expect(body.data.plan).toBe('free');
      createdOrgIds.push(body.data.id);

      const membership = await db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, body.data.id), eq(orgMembers.userId, owner.id)),
      });
      expect(membership?.role).toBe('owner');
    });

    it('returns 400 if slug is already taken', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orgs',
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { slug: orgSlug, name: 'Duplicate' },
      });
      expect(res.statusCode).toBe(400);
      const body = parseResponse(CreateOrgRouteSchema.response[400], res.body);
      expect(body.error.code).toBe('SLUG_TAKEN');
    });

    it('returns 400 if slug contains uppercase letters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orgs',
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { slug: 'Invalid-Slug', name: 'Bad Slug' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if slug contains underscores', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orgs',
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { slug: 'invalid_slug', name: 'Bad Slug' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/orgs',
        payload: { slug: `unauth-${uid()}`, name: 'Unauth' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /api/v1/orgs/:orgSlug ───────────────────────────────────────────────

  describe('GET /api/v1/orgs/:orgSlug', () => {
    it('returns org details for a member', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}`,
        headers: { authorization: `Bearer ${memberUser.token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = parseResponse(GetOrgRouteSchema.response[200], res.body);
      expect(body.data.id).toBe(orgId);
      expect(body.data.slug).toBe(orgSlug);
    });

    it('returns 403 for a user not in the org', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}`,
        headers: { authorization: `Bearer ${outsiderUser.token}` },
      });
      expect(res.statusCode).toBe(403);
      parseResponse(GetOrgRouteSchema.response[403], res.body);
    });

    it('returns 404 for a non-existent org', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/orgs/does-not-exist',
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
      parseResponse(GetOrgRouteSchema.response[404], res.body);
    });

    it('returns 401 without authentication', async () => {
      const res = await app.inject({ method: 'GET', url: `/api/v1/orgs/${orgSlug}` });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── PATCH /api/v1/orgs/:orgSlug ─────────────────────────────────────────────

  describe('PATCH /api/v1/orgs/:orgSlug', () => {
    it('owner can update org name', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Updated Name' },
      });
      expect(res.statusCode).toBe(200);
      const body = parseResponse(UpdateOrgRouteSchema.response[200], res.body);
      expect(body.data.name).toBe('Updated Name');
    });

    it('admin can update org name', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}`,
        headers: { authorization: `Bearer ${adminUser.token}` },
        payload: { name: 'Admin Updated' },
      });
      expect(res.statusCode).toBe(200);
      parseResponse(UpdateOrgRouteSchema.response[200], res.body);
    });

    it('member cannot update org (403)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}`,
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { name: 'Member Attempt' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('viewer cannot update org (403)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: { name: 'Viewer Attempt' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('outsider cannot update org (403)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}`,
        headers: { authorization: `Bearer ${outsiderUser.token}` },
        payload: { name: 'Outsider Attempt' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── GET /api/v1/orgs/:orgSlug/members ──────────────────────────────────────

  describe('GET /api/v1/orgs/:orgSlug/members', () => {
    it('returns all members with user details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = parseResponse(ListMembersRouteSchema.response[200], res.body);
      expect(body.data.length).toBeGreaterThanOrEqual(4);
      const roles = body.data.map(m => m.role);
      expect(roles).toContain('owner');
      expect(roles).toContain('admin');
      expect(roles).toContain('member');
      expect(roles).toContain('viewer');
    });

    it('viewer can list members', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
      parseResponse(ListMembersRouteSchema.response[200], res.body);
    });

    it('outsider cannot list members (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${outsiderUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /api/v1/orgs/:orgSlug/members ─────────────────────────────────────

  describe('POST /api/v1/orgs/:orgSlug/members (invite)', () => {
    it('owner can invite a new user', async () => {
      const newUser = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { email: newUser.email, role: 'member' },
      });

      expect(res.statusCode).toBe(201);
      const body = parseResponse(InviteMemberRouteSchema.response[201], res.body);
      expect(body.data.role).toBe('member');
      expect(body.data.user.email).toBe(newUser.email);

      await db.delete(orgMembers).where(
        and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, newUser.id))
      );
      await cleanup([], [newUser.id]);
    });

    it('admin can invite a new user', async () => {
      const newUser = await createTestUser(app);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${adminUser.token}` },
        payload: { email: newUser.email, role: 'viewer' },
      });

      expect(res.statusCode).toBe(201);
      parseResponse(InviteMemberRouteSchema.response[201], res.body);

      await db.delete(orgMembers).where(
        and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, newUser.id))
      );
      await cleanup([], [newUser.id]);
    });

    it('member cannot invite (403)', async () => {
      const newUser = await createTestUser(app);
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { email: newUser.email, role: 'viewer' },
      });
      expect(res.statusCode).toBe(403);
      await cleanup([], [newUser.id]);
    });

    it('viewer cannot invite (403)', async () => {
      const newUser = await createTestUser(app);
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: { email: newUser.email, role: 'viewer' },
      });
      expect(res.statusCode).toBe(403);
      await cleanup([], [newUser.id]);
    });

    it('returns 404 if invited email does not exist', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { email: `ghost-${uid()}@test.com`, role: 'member' },
      });
      expect(res.statusCode).toBe(404);
      const body = parseResponse(InviteMemberRouteSchema.response[404], res.body);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns 400 if user is already a member', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { email: memberUser.email, role: 'viewer' },
      });
      expect(res.statusCode).toBe(400);
      const body = parseResponse(InviteMemberRouteSchema.response[400], res.body);
      expect(body.error.code).toBe('ALREADY_MEMBER');
    });

    it('returns 400 if role is invalid', async () => {
      const newUser = await createTestUser(app);
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/members`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { email: newUser.email, role: 'superadmin' },
      });
      expect(res.statusCode).toBe(400);
      await cleanup([], [newUser.id]);
    });
  });

  // ── PATCH /api/v1/orgs/:orgSlug/members/:userId ─────────────────────────────

  describe('PATCH /api/v1/orgs/:orgSlug/members/:userId (update role)', () => {
    it('owner can change a member role', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}/members/${viewerUser.id}`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { role: 'member' },
      });
      expect(res.statusCode).toBe(200);
      const body = parseResponse(UpdateMemberRoleRouteSchema.response[200], res.body);
      expect(body.data.role).toBe('member');

      await db.update(orgMembers)
        .set({ role: 'viewer' })
        .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, viewerUser.id)));
    });

    it('member cannot change roles (403)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}/members/${viewerUser.id}`,
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { role: 'admin' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 if target user is not a member', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}/members/${outsiderUser.id}`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { role: 'viewer' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /api/v1/orgs/:orgSlug/members/:userId ────────────────────────────

  describe('DELETE /api/v1/orgs/:orgSlug/members/:userId (remove)', () => {
    it('owner can remove a member', async () => {
      const toRemove = await createTestUser(app);
      await db.insert(orgMembers).values({ orgId, userId: toRemove.id, role: 'viewer' });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/members/${toRemove.id}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(204);

      const membership = await db.query.orgMembers.findFirst({
        where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, toRemove.id)),
      });
      expect(membership).toBeUndefined();

      await cleanup([], [toRemove.id]);
    });

    it('member cannot remove members (403)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/members/${viewerUser.id}`,
        headers: { authorization: `Bearer ${memberUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 if target user is not a member', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/members/${outsiderUser.id}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
