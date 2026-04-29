import type { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';
import { orgMembers, projectMembers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { hasPermission, resolveRole, type OrgRole, type ProjectRole, type EffectiveRole } from '@pulse/types';

/**
 * Resolves the effective role for a user within an org, optionally scoped to a project.
 * Project-level membership overrides the org-level role.
 * Returns null if the user is not a member of the org.
 */
export async function getEffectiveRole(
  userId: string,
  orgId: string,
  projectId?: string
): Promise<EffectiveRole | null> {
  const orgMember = await db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
  });

  if (!orgMember) return null;

  if (!projectId) return orgMember.role as OrgRole;

  const projectMember = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId)
    ),
  });

  return resolveRole(
    orgMember.role as OrgRole,
    (projectMember?.role as ProjectRole | undefined) ?? null
  );
}

/**
 * Asserts that the authenticated user has the given permission.
 * Sends a 403 response and returns false if the check fails.
 * Returns true if the check passes — caller must guard on the return value.
 */
export async function assertPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  permission: string,
  orgId: string,
  projectId?: string
): Promise<boolean> {
  const user = request.user as { userId: string; email: string };
  const requestId = request.id;

  const role = await getEffectiveRole(user.userId, orgId, projectId);

  if (!role) {
    reply.code(403).send({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have access to this organization',
        requestId,
      },
    });
    return false;
  }

  if (!hasPermission(role, permission)) {
    reply.code(403).send({
      error: {
        code: 'FORBIDDEN',
        message: `Insufficient permissions: ${permission} required`,
        requestId,
      },
    });
    return false;
  }

  return true;
}
