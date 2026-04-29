import type { FastifyReply } from 'fastify';
import { findOrgBySlug } from '../services/organizations';
import { findProjectBySlug, findEnvironmentByName } from '../services/projects';
import { findFlagByKey } from '../services/flags';

function notFound(reply: FastifyReply, message: string, requestId: string) {
  reply.code(404).send({ error: { code: 'NOT_FOUND', message, requestId } });
}

/** Resolves org → project → environment. Returns null and sends 404 on any miss. */
export async function resolveEnvironment(
  reply: FastifyReply,
  requestId: string,
  orgSlug: string,
  projectSlug: string,
  envName: string
) {
  const org = await findOrgBySlug(orgSlug);
  if (!org) { notFound(reply, 'Organization not found', requestId); return null; }

  const project = await findProjectBySlug(org.id, projectSlug);
  if (!project) { notFound(reply, 'Project not found', requestId); return null; }

  const environment = await findEnvironmentByName(project.id, envName);
  if (!environment) { notFound(reply, 'Environment not found', requestId); return null; }

  return { org, project, environment };
}

/** Resolves org → project → environment → flag. Returns null and sends 404 on any miss. */
export async function resolveFlag(
  reply: FastifyReply,
  requestId: string,
  orgSlug: string,
  projectSlug: string,
  envName: string,
  flagKey: string
) {
  const resolved = await resolveEnvironment(reply, requestId, orgSlug, projectSlug, envName);
  if (!resolved) return null;

  const flag = await findFlagByKey(resolved.environment.id, flagKey);
  if (!flag) { notFound(reply, 'Flag not found', requestId); return null; }

  return { ...resolved, flag };
}
