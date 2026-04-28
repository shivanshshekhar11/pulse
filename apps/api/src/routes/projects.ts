import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { organizations, projects, environments } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateProjectSchema, CreateEnvironmentSchema } from '@pulse/types';
import { assertPermission } from '../lib/rbac';
import { writeAuditLog } from '../lib/audit';

export default async function projectRoutes(fastify: FastifyInstance) {
  // List projects
  fastify.get('/:orgSlug/projects', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { orgSlug } = request.params as { orgSlug: string };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'projects:read', org.id);
    if (!hasAccess) return;

    const projectList = await db.query.projects.findMany({
      where: eq(projects.orgId, org.id),
    });

    return reply.send({
      data: projectList,
    });
  });

  // Create project
  fastify.post('/:orgSlug/projects', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug } = request.params as { orgSlug: string };
    const body = CreateProjectSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'projects:write', org.id);
    if (!hasAccess) return;

    // Check if slug is taken
    const existing = await db.query.projects.findFirst({
      where: and(
        eq(projects.orgId, org.id),
        eq(projects.slug, body.slug)
      ),
    });

    if (existing) {
      return reply.code(400).send({
        error: 'SLUG_TAKEN',
        message: 'Project slug is already taken in this organization',
      });
    }

    const [project] = await db
      .insert(projects)
      .values({
        orgId: org.id,
        slug: body.slug,
        name: body.name,
      })
      .returning();

    if (!project) {
      return reply.code(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create project',
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'project.created',
      resourceType: 'project',
      resourceId: project.id,
      newValue: project,
      ip: request.ip,
    });

    return reply.code(201).send({
      data: project,
    });
  });

  // List environments
  fastify.get('/:orgSlug/projects/:projectSlug/environments', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { orgSlug, projectSlug } = request.params as { orgSlug: string; projectSlug: string };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.orgId, org.id),
        eq(projects.slug, projectSlug)
      ),
    });

    if (!project) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'environments:read', org.id, project.id);
    if (!hasAccess) return;

    const envList = await db.query.environments.findMany({
      where: eq(environments.projectId, project.id),
    });

    return reply.send({
      data: envList,
    });
  });

  // Create environment
  fastify.post('/:orgSlug/projects/:projectSlug/environments', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, projectSlug } = request.params as { orgSlug: string; projectSlug: string };
    const body = CreateEnvironmentSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.orgId, org.id),
        eq(projects.slug, projectSlug)
      ),
    });

    if (!project) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'environments:write', org.id, project.id);
    if (!hasAccess) return;

    const [environment] = await db
      .insert(environments)
      .values({
        projectId: project.id,
        name: body.name,
        color: body.color ?? '#6366f1',
        isDefault: body.isDefault ?? false,
      })
      .returning();

    if (!environment) {
      return reply.code(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create environment',
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'environment.created',
      resourceType: 'environment',
      resourceId: environment.id,
      newValue: environment,
      ip: request.ip,
    });

    return reply.code(201).send({
      data: environment,
    });
  });
}
