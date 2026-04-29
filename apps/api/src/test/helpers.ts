/**
 * Shared test infrastructure for integration tests.
 *
 * Provides:
 * - buildApp(): creates a fully wired Fastify instance with all plugins and routes
 * - createTestUser(): inserts a user and returns their JWT token
 * - createTestOrg(): inserts an org and adds a user as owner
 * - createTestProject(): inserts a project under an org
 * - createTestEnvironment(): inserts an environment under a project
 * - cleanup(): deletes test data by org/user ID (cascade handles children)
 */

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import {
  users,
  organizations,
  orgMembers,
  projects,
  environments,
  apiKeys,
  flags,
  rules,
  segments,
} from '../db/schema';
import { hashPassword, sha256, generateApiKey } from '../lib/crypto';
import { config } from '../env';

// ── Fastify factory ───────────────────────────────────────────────────────────

/**
 * Builds a fully configured Fastify instance with all plugins, error handler,
 * and all route modules registered — identical to production bootstrap.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, genReqId: () => crypto.randomUUID() });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors);
  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.accessTokenExpiry },
  });

  app.addHook('onRequest', async (_request, reply) => {
    reply.header('X-Request-ID', _request.id);
  });

  app.decorate(
    'authenticate',
    async function (
      request: Parameters<typeof app.authenticate>[0],
      reply: Parameters<typeof app.authenticate>[1]
    ) {
      try {
        await request.jwtVerify();
      } catch {
        reply.code(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing authentication token',
            requestId: request.id,
          },
        });
      }
    }
  );

  app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number; code?: string }, request, reply) => {
    const requestId = request.id;
    if (
      (error as unknown as { validation?: unknown }).validation ||
      (error as unknown as { name?: string }).name === 'ZodError'
    ) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', requestId },
      });
    }
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code ?? 'CLIENT_ERROR',
          message: error.message,
          requestId,
        },
      });
    }
    return reply.code(500).send({
      error: { code: 'INTERNAL_SERVER_ERROR', message: error.message, requestId },
    });
  });

  const { default: authRoutes } = await import('../routes/auth/index');
  await app.register(authRoutes, { prefix: '/api/v1/auth' });

  const { default: orgRoutes } = await import('../routes/orgs/index');
  await app.register(orgRoutes, { prefix: '/api/v1/orgs' });

  const { default: apiKeyRoutes } = await import('../routes/orgs/api-keys');
  await app.register(apiKeyRoutes, { prefix: '/api/v1/orgs' });

  const { default: projectRoutes } = await import('../routes/orgs/projects/index');
  await app.register(projectRoutes, { prefix: '/api/v1/orgs' });

  const { default: flagRoutes } = await import('../routes/orgs/projects/flags/index');
  await app.register(flagRoutes, { prefix: '/api/v1/orgs' });

  const { default: ruleRoutes } = await import('../routes/orgs/projects/flags/rules');
  await app.register(ruleRoutes, { prefix: '/api/v1/orgs' });

  const { default: segmentRoutes } = await import('../routes/segments/index');
  await app.register(segmentRoutes, { prefix: '/api/v1/orgs' });

  const { default: auditLogRoutes } = await import('../routes/orgs/audit-logs');
  await app.register(auditLogRoutes, { prefix: '/api/v1/orgs' });

  const { default: sdkRoutes } = await import('../routes/sdk/index');
  await app.register(sdkRoutes, { prefix: '/sdk/v1' });

  // Wait for all plugins (including nested ones like apiKeyPlugin) to finish registering
  await app.ready();

  return app;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

/** Unique suffix for test isolation — avoids slug/email collisions between parallel tests. */
export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

/** Creates a user and returns their id, email, and a signed JWT. */
export async function createTestUser(
  app: FastifyInstance,
  overrides: { email?: string; name?: string; password?: string } = {}
): Promise<TestUser> {
  const email = overrides.email ?? `user-${uid()}@test.com`;
  const passwordHash = await hashPassword(overrides.password ?? 'password123');

  const [user] = await db
    .insert(users)
    .values({ email, name: overrides.name ?? 'Test User', passwordHash })
    .returning();

  if (!user) throw new Error('createTestUser: insert failed');

  const token = app.jwt.sign({ userId: user.id, email: user.email });
  return { id: user.id, email: user.email, token };
}

export interface TestOrg {
  id: string;
  slug: string;
}

/** Creates an org and adds the given user as owner. */
export async function createTestOrg(
  userId: string,
  overrides: { slug?: string; name?: string } = {}
): Promise<TestOrg> {
  const slug = overrides.slug ?? `org-${uid()}`;

  const [org] = await db
    .insert(organizations)
    .values({ slug, name: overrides.name ?? 'Test Org' })
    .returning();

  if (!org) throw new Error('createTestOrg: insert failed');

  await db.insert(orgMembers).values({ orgId: org.id, userId, role: 'owner' });

  return { id: org.id, slug: org.slug };
}

export interface TestProject {
  id: string;
  slug: string;
}

/** Creates a project under the given org. */
export async function createTestProject(
  orgId: string,
  overrides: { slug?: string; name?: string } = {}
): Promise<TestProject> {
  const slug = overrides.slug ?? `proj-${uid()}`;

  const [project] = await db
    .insert(projects)
    .values({ orgId, slug, name: overrides.name ?? 'Test Project' })
    .returning();

  if (!project) throw new Error('createTestProject: insert failed');

  return { id: project.id, slug: project.slug };
}

export interface TestEnvironment {
  id: string;
  name: string;
}

/** Creates an environment under the given project. */
export async function createTestEnvironment(
  projectId: string,
  overrides: { name?: string; color?: string } = {}
): Promise<TestEnvironment> {
  const name = overrides.name ?? 'development';

  const [env] = await db
    .insert(environments)
    .values({ projectId, name, color: overrides.color ?? '#6366f1', isDefault: false })
    .returning();

  if (!env) throw new Error('createTestEnvironment: insert failed');

  return { id: env.id, name: env.name };
}

export interface TestApiKey {
  id: string;
  rawKey: string;
  keyHash: string;
}

/** Creates an API key for the given org + environment. */
export async function createTestApiKey(
  orgId: string,
  environmentId: string,
  createdBy: string,
  overrides: { isProduction?: boolean; revoked?: boolean; expired?: boolean } = {}
): Promise<TestApiKey> {
  const rawKey = generateApiKey(overrides.isProduction ?? false);
  const keyHash = sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const [key] = await db
    .insert(apiKeys)
    .values({
      orgId,
      environmentId,
      name: `test-key-${uid()}`,
      keyPrefix,
      keyHash,
      scopes: ['read'],
      createdBy,
      revokedAt: overrides.revoked ? new Date() : null,
      expiresAt: overrides.expired ? new Date(Date.now() - 1000) : null,
    })
    .returning();

  if (!key) throw new Error('createTestApiKey: insert failed');

  return { id: key.id, rawKey, keyHash };
}

export interface TestFlag {
  id: string;
  key: string;
}

/** Creates a flag in the given environment. */
export async function createTestFlag(
  environmentId: string,
  createdBy: string,
  overrides: { key?: string; name?: string; type?: string; enabled?: boolean; version?: number } = {}
): Promise<TestFlag> {
  const key = overrides.key ?? `flag_${uid().replace(/-/g, '_')}`;

  const [flag] = await db
    .insert(flags)
    .values({
      environmentId,
      key,
      name: overrides.name ?? 'Test Flag',
      type: overrides.type ?? 'boolean',
      defaultValue: false,
      enabled: overrides.enabled ?? false,
      version: overrides.version ?? 1,
      createdBy,
    })
    .returning();

  if (!flag) throw new Error('createTestFlag: insert failed');

  return { id: flag.id, key: flag.key };
}

export interface TestRule {
  id: string;
}

/** Creates a rule attached to the given flag. */
export async function createTestRule(
  flagId: string,
  overrides: { priority?: number; percentage?: number; enabled?: boolean } = {}
): Promise<TestRule> {
  const [rule] = await db
    .insert(rules)
    .values({
      flagId,
      name: 'Test Rule',
      priority: overrides.priority ?? 0,
      conditions: { attribute: 'userId', op: 'eq', value: 'test-user' },
      percentage: overrides.percentage ?? 100,
      value: true,
      enabled: overrides.enabled ?? true,
    })
    .returning();

  if (!rule) throw new Error('createTestRule: insert failed');

  return { id: rule.id };
}

export interface TestSegment {
  id: string;
}

/** Creates a segment in the given org. */
export async function createTestSegment(
  orgId: string,
  overrides: { name?: string } = {}
): Promise<TestSegment> {
  const [segment] = await db
    .insert(segments)
    .values({
      orgId,
      name: overrides.name ?? `segment-${uid()}`,
      conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
    })
    .returning();

  if (!segment) throw new Error('createTestSegment: insert failed');

  return { id: segment.id };
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

/**
 * Deletes test data by org and user IDs.
 * Cascade constraints handle all child records (projects, flags, rules, etc.).
 */
export async function cleanup(orgIds: string[], userIds: string[]): Promise<void> {
  for (const orgId of orgIds) {
    await db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
  }
  for (const userId of userIds) {
    await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
  }
}

// ── URL builders ──────────────────────────────────────────────────────────────

export function flagsUrl(orgSlug: string, projectSlug: string, envName: string): string {
  return `/api/v1/orgs/${orgSlug}/projects/${projectSlug}/envs/${envName}/flags`;
}

export function flagUrl(orgSlug: string, projectSlug: string, envName: string, flagKey: string): string {
  return `${flagsUrl(orgSlug, projectSlug, envName)}/${flagKey}`;
}

export function rulesUrl(orgSlug: string, projectSlug: string, envName: string, flagKey: string): string {
  return `${flagUrl(orgSlug, projectSlug, envName, flagKey)}/rules`;
}

export function ruleUrl(orgSlug: string, projectSlug: string, envName: string, flagKey: string, ruleId: string): string {
  return `${rulesUrl(orgSlug, projectSlug, envName, flagKey)}/${ruleId}`;
}
