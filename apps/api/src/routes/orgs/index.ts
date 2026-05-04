import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  CreateOrgRouteSchema,
  GetOrgRouteSchema,
  UpdateOrgRouteSchema,
  ListMembersRouteSchema,
  InviteMemberRouteSchema,
  UpdateMemberRoleRouteSchema,
  RemoveMemberRouteSchema,
} from '@pulse-flags/types';
import { assertPermission } from '../../lib/rbac';
import { writeAuditLog } from '../../lib/audit';
import * as orgService from '../../services/organizations';

export default async function orgRoutes(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /api/v1/orgs
  f.post('/', {
    onRequest: [fastify.authenticate],
    schema: {
      body: CreateOrgRouteSchema.body,
      response: CreateOrgRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { slug, name } = request.body;

    if (await orgService.isSlugTaken(slug)) {
      return reply.code(400).send({
        error: { code: 'SLUG_TAKEN', message: 'Organization slug is already taken', requestId },
      });
    }

    const org = await orgService.createOrg({ slug, name });
    if (!org) {
      return reply.code(500).send({
        error: { code: 'CREATE_FAILED', message: 'Failed to create organization', requestId },
      });
    }

    await orgService.addOwner(org.id, userId);

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'org.updated',
      resourceType: 'org',
      resourceId: org.id,
      newValue: org,
      ip: request.ip,
    });

    return reply.code(201).send({ data: org });
  });

  // GET /api/v1/orgs/:orgSlug
  f.get('/:orgSlug', {
    onRequest: [fastify.authenticate],
    schema: {
      params: GetOrgRouteSchema.params,
      response: GetOrgRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { orgSlug } = request.params;

    const org = await orgService.findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'org:read', org.id))) return;

    return reply.send({ data: org });
  });

  // PATCH /api/v1/orgs/:orgSlug
  f.patch('/:orgSlug', {
    onRequest: [fastify.authenticate],
    schema: {
      params: UpdateOrgRouteSchema.params,
      body: UpdateOrgRouteSchema.body,
      response: UpdateOrgRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug } = request.params;

    const org = await orgService.findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'org:update', org.id))) return;

    const updated = await orgService.updateOrg(org.id, request.body);
    if (!updated) {
      return reply.code(500).send({
        error: { code: 'UPDATE_FAILED', message: 'Failed to update organization', requestId },
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'org.updated',
      resourceType: 'org',
      resourceId: org.id,
      oldValue: org,
      newValue: updated,
      ip: request.ip,
    });

    return reply.send({ data: updated });
  });

  // GET /api/v1/orgs/:orgSlug/members
  f.get('/:orgSlug/members', {
    onRequest: [fastify.authenticate],
    schema: {
      params: ListMembersRouteSchema.params,
      response: ListMembersRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { orgSlug } = request.params;

    const org = await orgService.findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'members:read', org.id))) return;

    const members = await orgService.listMembers(org.id);
    return reply.send({ data: members });
  });

  // POST /api/v1/orgs/:orgSlug/members
  //
  // v1 invite model: adds the user directly to the org with no pending/accept step.
  // The org_members table has no `status` column — membership is immediate.
  //
  // A token-based invite-accept flow (where the invitee receives an email with a
  // signed link and explicitly accepts) requires either a `status` column on
  // org_members or a separate `invitations` table. That is a v2 concern.
  // For v1, the inviter is expected to know the invitee's registered email.
  f.post('/:orgSlug/members', {
    onRequest: [fastify.authenticate],
    schema: {
      params: InviteMemberRouteSchema.params,
      body: InviteMemberRouteSchema.body,
      response: InviteMemberRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId: actorId } = request.user;
    const { orgSlug } = request.params;
    const { email, role } = request.body;

    const org = await orgService.findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'members:invite', org.id))) return;

    const invitedUser = await orgService.findUserByEmail(email);
    if (!invitedUser) {
      return reply.code(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'No user found with that email address', requestId },
      });
    }

    const existing = await orgService.findMemberByUserId(org.id, invitedUser.id);
    if (existing) {
      return reply.code(400).send({
        error: { code: 'ALREADY_MEMBER', message: 'User is already a member of this organization', requestId },
      });
    }

    const member = await orgService.inviteMember(org.id, invitedUser.id, role, actorId);
    if (!member) {
      return reply.code(500).send({
        error: { code: 'CREATE_FAILED', message: 'Failed to add member', requestId },
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId,
      action: 'member.invited',
      resourceType: 'member',
      resourceId: member.id,
      newValue: { email, role },
      ip: request.ip,
    });

    // Return the member with the nested user shape the response schema expects
    return reply.code(201).send({
      data: {
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
        user: {
          id: invitedUser.id,
          email: invitedUser.email,
          name: invitedUser.name,
          avatarUrl: invitedUser.avatarUrl,
        },
      },
    });
  });

  // PATCH /api/v1/orgs/:orgSlug/members/:userId
  f.patch('/:orgSlug/members/:userId', {
    onRequest: [fastify.authenticate],
    schema: {
      params: UpdateMemberRoleRouteSchema.params,
      body: UpdateMemberRoleRouteSchema.body,
      response: UpdateMemberRoleRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId: actorId } = request.user;
    const { orgSlug, userId } = request.params;
    const { role } = request.body;

    const org = await orgService.findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'members:update', org.id))) return;

    const member = await orgService.findMemberByUserId(org.id, userId);
    if (!member) {
      return reply.code(404).send({
        error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found', requestId },
      });
    }

    const updated = await orgService.updateMemberRole(member.id, role);

    await writeAuditLog({
      orgId: org.id,
      actorId,
      action: 'member.updated',
      resourceType: 'member',
      resourceId: member.id,
      oldValue: { role: member.role },
      newValue: { role },
      ip: request.ip,
    });

    // Fetch the target user to build the nested response shape
    const targetUser = await orgService.findUserById(userId);

    return reply.send({
      data: {
        id: updated.id,
        role: updated.role,
        joinedAt: updated.joinedAt,
        user: {
          id: targetUser?.id ?? userId,
          email: targetUser?.email ?? '',
          name: targetUser?.name ?? null,
          avatarUrl: targetUser?.avatarUrl ?? null,
        },
      },
    });
  });

  // DELETE /api/v1/orgs/:orgSlug/members/:userId
  f.delete('/:orgSlug/members/:userId', {
    onRequest: [fastify.authenticate],
    schema: {
      params: RemoveMemberRouteSchema.params,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId: actorId } = request.user;
    const { orgSlug, userId } = request.params;

    const org = await orgService.findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'members:remove', org.id))) return;

    const member = await orgService.findMemberByUserId(org.id, userId);
    if (!member) {
      return reply.code(404).send({
        error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found', requestId },
      });
    }

    await orgService.removeMember(member.id);

    await writeAuditLog({
      orgId: org.id,
      actorId,
      action: 'member.removed',
      resourceType: 'member',
      resourceId: member.id,
      oldValue: member,
      ip: request.ip,
    });

    return reply.code(204).send();
  });
}
