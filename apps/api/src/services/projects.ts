import { db } from '../db';
import { projects, environments } from '../db/schema';
import { eq, and, count } from 'drizzle-orm';
import type { CreateProject, UpdateProject, CreateEnvironment } from '@pulse-flags/types';

// ── Projects ──────────────────────────────────────────────────────────────────

export async function listProjects(orgId: string) {
  return db.query.projects.findMany({
    where: eq(projects.orgId, orgId),
  });
}

export async function findProjectBySlug(orgId: string, slug: string) {
  return db.query.projects.findFirst({
    where: and(eq(projects.orgId, orgId), eq(projects.slug, slug)),
  });
}

export async function isProjectSlugTaken(orgId: string, slug: string) {
  const existing = await db.query.projects.findFirst({
    where: and(eq(projects.orgId, orgId), eq(projects.slug, slug)),
  });
  return !!existing;
}

export async function createProject(orgId: string, data: CreateProject) {
  const [project] = await db
    .insert(projects)
    .values({ orgId, slug: data.slug, name: data.name })
    .returning();
  return project;
}

export async function updateProject(projectId: string, data: UpdateProject) {
  const [updated] = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();
  return updated;
}

export async function deleteProject(projectId: string) {
  await db.delete(projects).where(eq(projects.id, projectId));
}

// ── Environments ──────────────────────────────────────────────────────────────

export async function listEnvironments(projectId: string) {
  return db.query.environments.findMany({
    where: eq(environments.projectId, projectId),
  });
}

export async function countEnvironments(projectId: string) {
  const [totals] = await db
    .select({ total: count() })
    .from(environments)
    .where(eq(environments.projectId, projectId));
  return totals?.total ?? 0;
}

export async function findEnvironmentByName(projectId: string, name: string) {
  return db.query.environments.findFirst({
    where: and(eq(environments.projectId, projectId), eq(environments.name, name)),
  });
}

export async function findDefaultEnvironment(projectId: string) {
  return db.query.environments.findFirst({
    where: and(eq(environments.projectId, projectId), eq(environments.isDefault, true)),
  });
}

export async function createEnvironment(projectId: string, data: CreateEnvironment) {
  const [environment] = await db
    .insert(environments)
    .values({
      projectId,
      name: data.name,
      color: data.color ?? '#6366f1',
      isDefault: data.isDefault ?? false,
    })
    .returning();
  return environment;
}

export async function createEnvironments(projectId: string, envs: CreateEnvironment[]) {
  if (!envs.length) return [];

  const values = envs.map((env) => ({
    projectId,
    name: env.name,
    color: env.color ?? '#6366f1',
    isDefault: env.isDefault ?? false,
  }));

  return db.insert(environments).values(values).returning();
}

export async function clearDefaultEnvironments(projectId: string) {
  await db.update(environments).set({ isDefault: false }).where(eq(environments.projectId, projectId));
}
