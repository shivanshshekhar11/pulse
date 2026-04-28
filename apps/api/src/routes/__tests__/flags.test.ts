import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../db';
import { users, organizations, orgMembers, projects, environments, flags } from '../../db/schema';
import { hashPassword } from '../../lib/crypto';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import { config } from '../../env';
import flagRoutes from '../flags';
import { sql } from 'drizzle-orm';

describe('Flag Routes', () => {
  let fastify: any;
  let token: string;
  let userId: string;
  let environmentId: string;
  let orgId: string;
  let orgSlug: string;

  beforeEach(async () => {
    // Set up Fastify instance
    fastify = Fastify({ logger: false });
    
    await fastify.register(cors);
    await fastify.register(jwt, {
      secret: config.jwt.secret,
      sign: { expiresIn: config.jwt.accessTokenExpiry },
    });

    fastify.decorate('authenticate', async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ error: 'UNAUTHORIZED' });
      }
    });

    await fastify.register(flagRoutes, { prefix: '/api/v1/orgs' });

    // Create test user with unique email
    const [user] = await db
      .insert(users)
      .values({
        email: `test-${Date.now()}-${Math.random()}@example.com`,
        name: 'Test User',
        passwordHash: await hashPassword('password123'),
      })
      .returning();

    if (!user) throw new Error('Failed to create user');
    userId = user.id;

    // Create test org with unique slug
    orgSlug = `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const [org] = await db
      .insert(organizations)
      .values({
        slug: orgSlug,
        name: 'Test Organization',
      })
      .returning();

    if (!org) throw new Error('Failed to create org');
    orgId = org.id;

    // Add user as owner
    await db.insert(orgMembers).values({
      orgId: org.id,
      userId: user.id,
      role: 'owner',
    });

    // Create test project
    const [project] = await db
      .insert(projects)
      .values({
        orgId: org.id,
        slug: 'test-project',
        name: 'Test Project',
      })
      .returning();

    if (!project) throw new Error('Failed to create project');

    // Create test environment
    const [environment] = await db
      .insert(environments)
      .values({
        projectId: project.id,
        name: 'development',
        color: '#6366f1',
        isDefault: true,
      })
      .returning();

    if (!environment) throw new Error('Failed to create environment');
    environmentId = environment.id;

    // Generate JWT token
    token = fastify.jwt.sign({
      userId: user.id,
      email: user.email,
    });
  });

  afterEach(async () => {
    // Clean up: delete the org (cascade will delete everything else)
    if (orgId) {
      await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
    }
    // Clean up: delete the user
    if (userId) {
      await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
    }
    // Close Fastify instance
    if (fastify) {
      await fastify.close();
    }
  });

  describe('POST /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags', () => {
    it('creates a new flag', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/orgs/' + orgSlug + '/projects/test-project/envs/development/flags',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          key: 'new_feature',
          name: 'New Feature',
          description: 'A new feature flag',
          type: 'boolean',
          defaultValue: false,
          enabled: true,
          tags: ['beta'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data).toMatchObject({
        key: 'new_feature',
        name: 'New Feature',
        description: 'A new feature flag',
        type: 'boolean',
        defaultValue: false,
        enabled: true,
        tags: ['beta'],
        version: 1,
      });
    });

    it('returns 400 if flag key already exists', async () => {
      // Create first flag
      await db.insert(flags).values({
        environmentId,
        key: 'existing_flag',
        name: 'Existing Flag',
        type: 'boolean',
        defaultValue: false,
        enabled: false,
        createdBy: userId,
      });

      // Try to create duplicate
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/v1/orgs/' + orgSlug + '/projects/test-project/envs/development/flags',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          key: 'existing_flag',
          name: 'Duplicate Flag',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('KEY_TAKEN');
    });
  });

  describe('PATCH /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey', () => {
    it('updates a flag with correct version', async () => {
      // Create flag
      await db
        .insert(flags)
        .values({
          environmentId,
          key: 'test_flag',
          name: 'Test Flag',
          type: 'boolean',
          defaultValue: false,
          enabled: false,
          version: 1,
          createdBy: userId,
        })
        .returning();

      // Update flag
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/v1/orgs/' + orgSlug + '/projects/test-project/envs/development/flags/test_flag',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          name: 'Updated Flag',
          enabled: true,
          version: 1,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toMatchObject({
        name: 'Updated Flag',
        enabled: true,
        version: 2,
      });
    });

    it('returns 409 on version conflict (optimistic locking)', async () => {
      // Create flag
      await db
        .insert(flags)
        .values({
          environmentId,
          key: 'test_flag',
          name: 'Test Flag',
          type: 'boolean',
          defaultValue: false,
          enabled: false,
          version: 1,
          createdBy: userId,
        })
        .returning();

      // Try to update with stale version
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/v1/orgs/' + orgSlug + '/projects/test-project/envs/development/flags/test_flag',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: {
          name: 'Updated Flag',
          version: 999, // Wrong version
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('CONFLICT');
      expect(body.message).toContain('modified by another user');
    });
  });

  describe('GET /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags', () => {
    it('lists all flags for an environment', async () => {
      // Create multiple flags
      await db.insert(flags).values([
        {
          environmentId,
          key: 'flag_1',
          name: 'Flag 1',
          type: 'boolean',
          defaultValue: false,
          enabled: true,
          createdBy: userId,
        },
        {
          environmentId,
          key: 'flag_2',
          name: 'Flag 2',
          type: 'string',
          defaultValue: 'default',
          enabled: false,
          createdBy: userId,
        },
      ]);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/v1/orgs/' + orgSlug + '/projects/test-project/envs/development/flags',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].key).toBeDefined();
      expect(body.data[1].key).toBeDefined();
    });
  });

  describe('DELETE /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey', () => {
    it('deletes a flag', async () => {
      // Create flag
      await db.insert(flags).values({
        environmentId,
        key: 'test_flag',
        name: 'Test Flag',
        type: 'boolean',
        defaultValue: false,
        enabled: false,
        createdBy: userId,
      });

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/v1/orgs/' + orgSlug + '/projects/test-project/envs/development/flags/test_flag',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify deletion
      const deletedFlag = await db.query.flags.findFirst({
        where: (flags, { eq, and }) => and(
          eq(flags.environmentId, environmentId),
          eq(flags.key, 'test_flag')
        ),
      });

      expect(deletedFlag).toBeUndefined();
    });
  });
});

