import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { flags, environments, projects, organizations } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { CreateFlagSchema, UpdateFlagSchema } from '@pulse/types';
import { assertPermission } from '../lib/rbac';
import { writeAuditLog } from '../lib/audit';

export default async function flagRoutes(fastify: FastifyInstance) {
  // List flags for an environment
  fastify.get('/:orgSlug/projects/:projectSlug/envs/:envName/flags', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { orgSlug, projectSlug, envName } = request.params as {
      orgSlug: string;
      projectSlug: string;
      envName: string;
    };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'flags:read', org.id);
    if (!hasAccess) return;

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

    const environment = await db.query.environments.findFirst({
      where: and(
        eq(environments.projectId, project.id),
        eq(environments.name, envName)
      ),
    });

    if (!environment) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Environment not found',
      });
    }

    const flagList = await db.query.flags.findMany({
      where: eq(flags.environmentId, environment.id),
      orderBy: (flags, { desc }) => [desc(flags.createdAt)],
    });

    return reply.send({
      data: flagList,
    });
  });

  // Create flag
  fastify.post('/:orgSlug/projects/:projectSlug/envs/:envName/flags', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, projectSlug, envName } = request.params as {
      orgSlug: string;
      projectSlug: string;
      envName: string;
    };
    const body = CreateFlagSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'flags:write', org.id);
    if (!hasAccess) return;

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

    const environment = await db.query.environments.findFirst({
      where: and(
        eq(environments.projectId, project.id),
        eq(environments.name, envName)
      ),
    });

    if (!environment) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Environment not found',
      });
    }

    // Check if flag key already exists in this environment
    const existing = await db.query.flags.findFirst({
      where: and(
        eq(flags.environmentId, environment.id),
        eq(flags.key, body.key)
      ),
    });

    if (existing) {
      return reply.code(400).send({
        error: 'KEY_TAKEN',
        message: 'Flag key already exists in this environment',
      });
    }

    const [flag] = await db
      .insert(flags)
      .values({
        environmentId: environment.id,
        key: body.key,
        name: body.name,
        description: body.description ?? null,
        type: (body.type ?? 'boolean') as string,
        defaultValue: body.defaultValue ?? false,
        enabled: body.enabled ?? false,
        tags: (body.tags ?? []) as string[],
        createdBy: user.userId,
      })
      .returning();

    if (!flag) {
      return reply.code(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create flag',
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'flag.created',
      resourceType: 'flag',
      resourceId: flag.id,
      newValue: flag,
      ip: request.ip,
    });

    return reply.code(201).send({
      data: flag,
    });
  });

  // Get flag by key
  fastify.get('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { orgSlug, projectSlug, envName, flagKey } = request.params as {
      orgSlug: string;
      projectSlug: string;
      envName: string;
      flagKey: string;
    };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'flags:read', org.id);
    if (!hasAccess) return;

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

    const environment = await db.query.environments.findFirst({
      where: and(
        eq(environments.projectId, project.id),
        eq(environments.name, envName)
      ),
    });

    if (!environment) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Environment not found',
      });
    }

    const flag = await db.query.flags.findFirst({
      where: and(
        eq(flags.environmentId, environment.id),
        eq(flags.key, flagKey)
      ),
    });

    if (!flag) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Flag not found',
      });
    }

    return reply.send({
      data: flag,
    });
  });

  // Update flag with optimistic locking
  fastify.patch('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, projectSlug, envName, flagKey } = request.params as {
      orgSlug: string;
      projectSlug: string;
      envName: string;
      flagKey: string;
    };
    const body = UpdateFlagSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'flags:write', org.id);
    if (!hasAccess) return;

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

    const environment = await db.query.environments.findFirst({
      where: and(
        eq(environments.projectId, project.id),
        eq(environments.name, envName)
      ),
    });

    if (!environment) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Environment not found',
      });
    }

    const flag = await db.query.flags.findFirst({
      where: and(
        eq(flags.environmentId, environment.id),
        eq(flags.key, flagKey)
      ),
    });

    if (!flag) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Flag not found',
      });
    }

    // Optimistic locking check
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.defaultValue !== undefined) updateData.defaultValue = body.defaultValue;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.tags !== undefined) updateData.tags = body.tags;

    const result = await db
      .update(flags)
      .set({
        ...updateData,
        version: sql`${flags.version} + 1`,
      })
      .where(and(
        eq(flags.id, flag.id),
        eq(flags.version, body.version)
      ))
      .returning();

    if (result.length === 0) {
      return reply.code(409).send({
        error: 'CONFLICT',
        message: 'Flag was modified by another user. Reload and retry.',
      });
    }

    const [updated] = result;

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'flag.updated',
      resourceType: 'flag',
      resourceId: flag.id,
      oldValue: flag,
      newValue: updated,
      ip: request.ip,
    });

    return reply.send({
      data: updated,
    });
  });

  // Delete flag
  fastify.delete('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, projectSlug, envName, flagKey } = request.params as {
      orgSlug: string;
      projectSlug: string;
      envName: string;
      flagKey: string;
    };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'flags:write', org.id);
    if (!hasAccess) return;

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

    const environment = await db.query.environments.findFirst({
      where: and(
        eq(environments.projectId, project.id),
        eq(environments.name, envName)
      ),
    });

    if (!environment) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Environment not found',
      });
    }

    const flag = await db.query.flags.findFirst({
      where: and(
        eq(flags.environmentId, environment.id),
        eq(flags.key, flagKey)
      ),
    });

    if (!flag) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Flag not found',
      });
    }

    await db.delete(flags).where(eq(flags.id, flag.id));

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'flag.deleted',
      resourceType: 'flag',
      resourceId: flag.id,
      oldValue: flag,
      ip: request.ip,
    });

    return reply.code(204).send();
  });
}
