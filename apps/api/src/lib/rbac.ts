import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';
import { orgMembers, projectMembers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { hasPermission, resolveRole, type OrgRole, type ProjectRole, type EffectiveRole } from '@pulse/types/rbac';

export async function getEffectiveRole(
  userId: string,
  orgId: string,
  projectId?: string
): Promise<EffectiveRole | null> {
  // Get org role
  const orgMember = await db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
  });

  if (!orgMember) return null;

  // If no project specified, return org role
  if (!projectId) return orgMember.role as OrgRole;

  // Check for project-level override
  const projectMember = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  return resolveRole(
    orgMember.role as OrgRole,
    projectMember?.role as ProjectRole | null ?? null
  );
}

export async function assertPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  permission: string,
  orgId: string,
  projectId?: string
): Promise<boolean> {
  const user = request.user as { userId: string; email: string };

  const role = await getEffectiveRole(user.userId, orgId, projectId);

  if (!role) {
    reply.code(403).send({
      error: 'FORBIDDEN',
      message: 'You do not have access to this organization',
    });
    return false;
  }

  if (!hasPermission(role, permission)) {
    reply.code(403).send({
      error: 'FORBIDDEN',
      message: `You do not have permission to ${permission}`,
    });
    return false;
  }

  return true;
}
