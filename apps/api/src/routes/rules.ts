import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { rules, flags, environments, projects, organizations } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { CreateRuleSchema, UpdateRuleSchema, ReorderRulesSchema } from '@pulse/types';
import { assertPermission } from '../lib/rbac';
import { writeAuditLog } from '../lib/audit';

export default async function ruleRoutes(fastify: FastifyInstance) {
  // List rules for a flag
  fastify.get('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules', {
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

    const hasAccess = await assertPermission(request, reply, 'rules:read', org.id);
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

    const ruleList = await db.query.rules.findMany({
      where: eq(rules.flagId, flag.id),
      orderBy: (rules, { asc }) => [asc(rules.priority)],
    });

    return reply.send({
      data: ruleList,
    });
  });

  // Create rule
  fastify.post('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, projectSlug, envName, flagKey } = request.params as {
      orgSlug: string;
      projectSlug: string;
      envName: string;
      flagKey: string;
    };
    const body = CreateRuleSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'rules:write', org.id);
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

    const [rule] = await db
      .insert(rules)
      .values({
        flagId: flag.id,
        name: body.name ?? null,
        priority: body.priority ?? 0,
        conditions: body.conditions,
        percentage: body.percentage ?? 100,
        value: body.value,
        enabled: body.enabled ?? true,
      })
      .returning();

    if (!rule) {
      return reply.code(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create rule',
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'rule.created',
      resourceType: 'rule',
      resourceId: rule.id,
      newValue: rule,
      ip: request.ip,
    });

    return reply.code(201).send({
      data: rule,
    });
  });

  // Update rule
  fastify.patch('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules/:ruleId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, projectSlug, envName, flagKey, ruleId } = request.params as {
      orgSlug: string;
      projectSlug: string;
      envName: string;
      flagKey: string;
      ruleId: string;
    };
    const body = UpdateRuleSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'rules:write', org.id);
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

    const rule = await db.query.rules.findFirst({
      where: and(
        eq(rules.flagId, flag.id),
        eq(rules.id, ruleId)
      ),
    });

    if (!rule) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Rule not found',
      });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.conditions !== undefined) updateData.conditions = body.conditions;
    if (body.percentage !== undefined) updateData.percentage = body.percentage;
    if (body.value !== undefined) updateData.value = body.value;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;

    const [updated] = await db
      .update(rules)
      .set(updateData)
      .where(eq(rules.id, rule.id))
      .returning();

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'rule.updated',
      resourceType: 'rule',
      resourceId: rule.id,
      oldValue: rule,
      newValue: updated,
      ip: request.ip,
    });

    return reply.send({
      data: updated,
    });
  });

  // Delete rule
  fastify.delete('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules/:ruleId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, projectSlug, envName, flagKey, ruleId } = request.params as {
      orgSlug: string;
      projectSlug: string;
      envName: string;
      flagKey: string;
      ruleId: string;
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

    const hasAccess = await assertPermission(request, reply, 'rules:write', org.id);
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

    const rule = await db.query.rules.findFirst({
      where: and(
        eq(rules.flagId, flag.id),
        eq(rules.id, ruleId)
      ),
    });

    if (!rule) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Rule not found',
      });
    }

    await db.delete(rules).where(eq(rules.id, rule.id));

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'rule.deleted',
      resourceType: 'rule',
      resourceId: rule.id,
      oldValue: rule,
      ip: request.ip,
    });

    return reply.code(204).send();
  });

  // Reorder rules
  fastify.post('/:orgSlug/projects/:projectSlug/envs/:envName/flags/:flagKey/rules/reorder', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, projectSlug, envName, flagKey } = request.params as {
      orgSlug: string;
      projectSlug: string;
      envName: string;
      flagKey: string;
    };
    const body = ReorderRulesSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'rules:write', org.id);
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

    // Verify all rule IDs belong to this flag
    const existingRules = await db.query.rules.findMany({
      where: and(
        eq(rules.flagId, flag.id),
        inArray(rules.id, body.orderedIds)
      ),
    });

    if (existingRules.length !== body.orderedIds.length) {
      return reply.code(400).send({
        error: 'INVALID_RULES',
        message: 'One or more rule IDs are invalid',
      });
    }

    // Update priorities based on order
    await Promise.all(
      body.orderedIds.map((ruleId, index) =>
        db
          .update(rules)
          .set({ priority: index })
          .where(eq(rules.id, ruleId))
      )
    );

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'rule.reordered',
      resourceType: 'rule',
      resourceId: flag.id,
      newValue: { orderedIds: body.orderedIds },
      ip: request.ip,
    });

    return reply.send({
      data: { success: true },
    });
  });
}
