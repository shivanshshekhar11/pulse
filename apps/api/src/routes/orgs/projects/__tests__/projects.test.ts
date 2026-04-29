import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../../../db';
import { orgMembers } from '../../../../db/schema';
import {
  buildApp,
  createTestUser,
  createTestOrg,
  createTestProject,
  createTestEnvironment,
  cleanup,
  uid,
} from '../../../../test/helpers';

describe('Project & Environment Routes', () => {
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
    await cleanup([orgId], [owner.id, adminUser.id, memberUser.id, viewerUser.id, outsiderUser.id]);
    await app.close();
  });

  // ── GET /projects ───────────────────────────────────────────────────────────

  describe('GET /orgs/:orgSlug/projects', () => {
    it('returns projects for org members', async () => {
      await createTestProject(orgId, { slug: `proj-list-${uid()}` });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects`,
        headers: { authorization: `Bearer ${memberUser.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { data: unknown[] };
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('viewer can list projects', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('outsider cannot list projects (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects`,
        headers: { authorization: `Bearer ${outsiderUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /projects ──────────────────────────────────────────────────────────

  describe('POST /orgs/:orgSlug/projects', () => {
    it('owner can create a project', async () => {
      const slug = `new-proj-${uid()}`;
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { slug, name: 'New Project' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as { data: { slug: string; orgId: string } };
      expect(body.data.slug).toBe(slug);
      expect(body.data.orgId).toBe(orgId);
    });

    it('admin can create a project', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects`,
        headers: { authorization: `Bearer ${adminUser.token}` },
        payload: { slug: `admin-proj-${uid()}`, name: 'Admin Project' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('returns 400 if project slug is already taken in this org', async () => {
      const slug = `dup-proj-${uid()}`;
      await createTestProject(orgId, { slug });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { slug, name: 'Duplicate' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body) as { error: { code: string } };
      expect(body.error.code).toBe('SLUG_TAKEN');
    });

    it('member cannot create projects (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects`,
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { slug: `member-proj-${uid()}`, name: 'Member Project' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('viewer cannot create projects (403)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: { slug: `viewer-proj-${uid()}`, name: 'Viewer Project' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 400 if slug contains uppercase', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { slug: 'BadSlug', name: 'Bad' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /projects/:projectSlug ──────────────────────────────────────────────

  describe('GET /orgs/:orgSlug/projects/:projectSlug', () => {
    it('returns a specific project by slug', async () => {
      const project = await createTestProject(orgId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { data: { id: string; slug: string } };
      expect(body.data.id).toBe(project.id);
      expect(body.data.slug).toBe(project.slug);
    });

    it('viewer can read a project', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 for a non-existent project slug', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects/does-not-exist`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('outsider cannot read a project (403)', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${outsiderUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── PATCH /projects/:projectSlug ────────────────────────────────────────────

  describe('PATCH /orgs/:orgSlug/projects/:projectSlug', () => {
    it('owner can update a project name', async () => {
      const project = await createTestProject(orgId);

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Updated Name' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { data: { name: string } };
      expect(body.data.name).toBe('Updated Name');
    });

    it('admin can update a project', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${adminUser.token}` },
        payload: { name: 'Admin Updated' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('member cannot update a project (403)', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { name: 'Member Update' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('viewer cannot update a project (403)', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
        payload: { name: 'Viewer Update' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for a non-existent project', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}/projects/does-not-exist`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'Ghost Update' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 400 if name is empty string', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: '' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── DELETE /projects/:projectSlug ───────────────────────────────────────────

  describe('DELETE /orgs/:orgSlug/projects/:projectSlug', () => {
    it('owner can delete a project', async () => {
      const project = await createTestProject(orgId);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(204);

      // Verify it's gone
      const check = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(check.statusCode).toBe(404);
    });

    it('admin can delete a project', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${adminUser.token}` },
      });
      expect(res.statusCode).toBe(204);
    });

    it('member cannot delete a project (403)', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${memberUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('viewer cannot delete a project (403)', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for a non-existent project', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/orgs/${orgSlug}/projects/does-not-exist`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── GET /projects/:projectSlug/environments ─────────────────────────────────

  describe('GET /orgs/:orgSlug/projects/:projectSlug/environments', () => {
    it('returns environments for a project', async () => {
      const project = await createTestProject(orgId);
      await createTestEnvironment(project.id, { name: 'production' });
      await createTestEnvironment(project.id, { name: 'staging' });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}/environments`,
        headers: { authorization: `Bearer ${owner.token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as { data: Array<{ name: string }> };
      expect(body.data).toHaveLength(2);
      const names = body.data.map(e => e.name);
      expect(names).toContain('production');
      expect(names).toContain('staging');
    });

    it('returns 404 for a non-existent project', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects/does-not-exist/environments`,
        headers: { authorization: `Bearer ${owner.token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('viewer can list environments', async () => {
      const project = await createTestProject(orgId);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}/environments`,
        headers: { authorization: `Bearer ${viewerUser.token}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── POST /projects/:projectSlug/environments ────────────────────────────────

  describe('POST /orgs/:orgSlug/projects/:projectSlug/environments', () => {
    it('owner can create an environment', async () => {
      const project = await createTestProject(orgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}/environments`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'production', color: '#ef4444' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as { data: { name: string; color: string } };
      expect(body.data.name).toBe('production');
      expect(body.data.color).toBe('#ef4444');
    });

    it('defaults color to #6366f1 if not provided', async () => {
      const project = await createTestProject(orgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}/environments`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'staging' },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as { data: { color: string } };
      expect(body.data.color).toBe('#6366f1');
    });

    it('returns 400 if color is not a valid hex', async () => {
      const project = await createTestProject(orgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}/environments`,
        headers: { authorization: `Bearer ${owner.token}` },
        payload: { name: 'dev', color: 'red' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('member cannot create environments (403)', async () => {
      const project = await createTestProject(orgId);

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/orgs/${orgSlug}/projects/${project.slug}/environments`,
        headers: { authorization: `Bearer ${memberUser.token}` },
        payload: { name: 'dev' },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
