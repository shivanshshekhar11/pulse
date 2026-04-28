import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { organizations, orgMembers, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateOrganizationSchema, UpdateOrganizationSchema, InviteMemberSchema, UpdateMemberRoleSchema } from '@pulse/types';
import { assertPermission } from '../lib/rbac';
import { writeAuditLog } from '../lib/audit';

export default async function organizationRoutes(fastify: FastifyInstance) {
  // Create organization
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const body = CreateOrganizationSchema.parse(request.body);

    // Check if slug is taken
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, body.slug),
    });

    if (existing) {
      return reply.code(400).send({
        error: 'SLUG_TAKEN',
        message: 'Organization slug is already taken',
      });
    }

    // Create org
    const [org] = await db
      .insert(organizations)
      .values({
        slug: body.slug,
        name: body.name,
      })
      .returning();

    if (!org) {
      return reply.code(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create organization',
      });
    }

    // Add creator as owner
    await db.insert(orgMembers).values({
      orgId: org.id,
      userId: user.userId,
      role: 'owner',
    });

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'org.updated',
      resourceType: 'org',
      resourceId: org.id,
      newValue: org,
      ip: request.ip,
    });

    return reply.code(201).send({
      data: org,
    });
  });

  // Get organization
  fastify.get('/:orgSlug', {
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

    const hasAccess = await assertPermission(request, reply, 'flags:read', org.id);
    if (!hasAccess) return;

    return reply.send({
      data: org,
    });
  });

  // Update organization
  fastify.patch('/:orgSlug', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug } = request.params as { orgSlug: string };
    const body = UpdateOrganizationSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'org:update', org.id);
    if (!hasAccess) return;

    const [updated] = await db
      .update(organizations)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id))
      .returning();

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'org.updated',
      resourceType: 'org',
      resourceId: org.id,
      oldValue: org,
      newValue: updated,
      ip: request.ip,
    });

    return reply.send({
      data: updated,
    });
  });

  // List members
  fastify.get('/:orgSlug/members', {
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

    const hasAccess = await assertPermission(request, reply, 'members:read', org.id);
    if (!hasAccess) return;

    const members = await db
      .select({
        id: orgMembers.id,
        role: orgMembers.role,
        joinedAt: orgMembers.joinedAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.orgId, org.id));

    return reply.send({
      data: members,
    });
  });

  // Invite member
  fastify.post('/:orgSlug/members', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug } = request.params as { orgSlug: string };
    const body = InviteMemberSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'members:invite', org.id);
    if (!hasAccess) return;

    // Find user by email
    const invitedUser = await db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!invitedUser) {
      return reply.code(404).send({
        error: 'USER_NOT_FOUND',
        message: 'User with this email does not exist',
      });
    }

    // Check if already a member
    const existing = await db.query.orgMembers.findFirst({
      where: and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.userId, invitedUser.id)
      ),
    });

    if (existing) {
      return reply.code(400).send({
        error: 'ALREADY_MEMBER',
        message: 'User is already a member of this organization',
      });
    }

    const [member] = await db
      .insert(orgMembers)
      .values({
        orgId: org.id,
        userId: invitedUser.id,
        role: body.role,
        invitedBy: user.userId,
      })
      .returning();

    if (!member) {
      return reply.code(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to add member',
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'member.invited',
      resourceType: 'member',
      resourceId: member.id,
      newValue: { email: body.email, role: body.role },
      ip: request.ip,
    });

    return reply.code(201).send({
      data: member,
    });
  });

  // Update member role
  fastify.patch('/:orgSlug/members/:userId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const actor = request.user as { userId: string; email: string };
    const { orgSlug, userId } = request.params as { orgSlug: string; userId: string };
    const body = UpdateMemberRoleSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'members:update', org.id);
    if (!hasAccess) return;

    const member = await db.query.orgMembers.findFirst({
      where: and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.userId, userId)
      ),
    });

    if (!member) {
      return reply.code(404).send({
        error: 'MEMBER_NOT_FOUND',
        message: 'Member not found',
      });
    }

    const [updated] = await db
      .update(orgMembers)
      .set({ role: body.role })
      .where(eq(orgMembers.id, member.id))
      .returning();

    await writeAuditLog({
      orgId: org.id,
      actorId: actor.userId,
      action: 'member.updated',
      resourceType: 'member',
      resourceId: member.id,
      oldValue: { role: member.role },
      newValue: { role: body.role },
      ip: request.ip,
    });

    return reply.send({
      data: updated,
    });
  });

  // Remove member
  fastify.delete('/:orgSlug/members/:userId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const actor = request.user as { userId: string; email: string };
    const { orgSlug, userId } = request.params as { orgSlug: string; userId: string };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'members:remove', org.id);
    if (!hasAccess) return;

    const member = await db.query.orgMembers.findFirst({
      where: and(
        eq(orgMembers.orgId, org.id),
        eq(orgMembers.userId, userId)
      ),
    });

    if (!member) {
      return reply.code(404).send({
        error: 'MEMBER_NOT_FOUND',
        message: 'Member not found',
      });
    }

    await db.delete(orgMembers).where(eq(orgMembers.id, member.id));

    await writeAuditLog({
      orgId: org.id,
      actorId: actor.userId,
      action: 'member.removed',
      resourceType: 'member',
      resourceId: member.id,
      oldValue: member,
      ip: request.ip,
    });

    return reply.code(204).send();
  });
}
