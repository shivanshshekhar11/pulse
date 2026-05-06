import { db } from '../db';
import { organizations, orgMembers, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { CreateOrganization, UpdateOrganization, InviteMember, UpdateMemberRole } from '@pulse-flags/types';

// ── Orgs ──────────────────────────────────────────────────────────────────────

export async function findOrgBySlug(slug: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
}

export async function listUserOrgs(userId: string) {
  return db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      plan: organizations.plan,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, userId))
    .orderBy(orgMembers.joinedAt);
}

export async function isSlugTaken(slug: string) {
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  return !!existing;
}

export async function createOrg(data: CreateOrganization) {
  const [org] = await db
    .insert(organizations)
    .values({ slug: data.slug, name: data.name })
    .returning();
  return org;
}

export async function updateOrg(orgId: string, data: UpdateOrganization) {
  const [updated] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();
  return updated;
}

export async function deleteOrg(orgId: string) {
  await db.delete(organizations).where(eq(organizations.id, orgId));
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function addOwner(orgId: string, userId: string) {
  await db.insert(orgMembers).values({ orgId, userId, role: 'owner' });
}

export async function listMembers(orgId: string) {
  return db
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
    .where(eq(orgMembers.orgId, orgId));
}

export async function findMemberByUserId(orgId: string, userId: string) {
  return db.query.orgMembers.findFirst({
    where: and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)),
  });
}

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function findUserById(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function inviteMember(
  orgId: string,
  userId: string,
  role: InviteMember['role'],
  invitedBy: string
) {
  const [member] = await db
    .insert(orgMembers)
    .values({ orgId, userId, role, invitedBy })
    .returning();
  return member;
}

export async function updateMemberRole(memberId: string, role: UpdateMemberRole['role']) {
  const [updated] = await db
    .update(orgMembers)
    .set({ role })
    .where(eq(orgMembers.id, memberId))
    .returning();
  return updated!;
}

export async function removeMember(memberId: string) {
  await db.delete(orgMembers).where(eq(orgMembers.id, memberId));
}
