import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  ListProjectsRouteSchema,
  CreateProjectRouteSchema,
  GetProjectRouteSchema,
  UpdateProjectRouteSchema,
  DeleteProjectRouteSchema,
  ListEnvironmentsRouteSchema,
  CreateEnvironmentRouteSchema,
} from '@pulse/types';
import { assertPermission } from '../../../lib/rbac';
import { writeAuditLog } from '../../../lib/audit';
import { findOrgBySlug } from '../../../services/organizations';
import * as projectService from '../../../services/projects';

export default async function projectRoutes(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/orgs/:orgSlug/projects
  f.get('/:orgSlug/projects', {
    onRequest: [fastify.authenticate],
    schema: {
      params: ListProjectsRouteSchema.params,
      response: ListProjectsRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { orgSlug } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'projects:read', org.id))) return;

    const projectList = await projectService.listProjects(org.id);
    return reply.send({ data: projectList });
  });

  // POST /api/v1/orgs/:orgSlug/projects
  f.post('/:orgSlug/projects', {
    onRequest: [fastify.authenticate],
    schema: {
      params: CreateProjectRouteSchema.params,
      body: CreateProjectRouteSchema.body,
      response: CreateProjectRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug } = request.params;
    const { slug, name } = request.body;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'projects:write', org.id))) return;

    if (await projectService.isProjectSlugTaken(org.id, slug)) {
      return reply.code(400).send({
        error: { code: 'SLUG_TAKEN', message: 'Project slug is already taken in this organization', requestId },
      });
    }

    const project = await projectService.createProject(org.id, { slug, name });
    if (!project) {
      return reply.code(500).send({
        error: { code: 'CREATE_FAILED', message: 'Failed to create project', requestId },
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'project.created',
      resourceType: 'project',
      resourceId: project.id,
      newValue: project,
      ip: request.ip,
    });

    return reply.code(201).send({ data: project });
  });

  // GET /api/v1/orgs/:orgSlug/projects/:projectSlug
  f.get('/:orgSlug/projects/:projectSlug', {
    onRequest: [fastify.authenticate],
    schema: {
      params: GetProjectRouteSchema.params,
      response: GetProjectRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { orgSlug, projectSlug } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'projects:read', org.id))) return;

    const project = await projectService.findProjectBySlug(org.id, projectSlug);
    if (!project) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Project not found', requestId },
      });
    }

    return reply.send({ data: project });
  });

  // PATCH /api/v1/orgs/:orgSlug/projects/:projectSlug
  f.patch('/:orgSlug/projects/:projectSlug', {
    onRequest: [fastify.authenticate],
    schema: {
      params: UpdateProjectRouteSchema.params,
      body: UpdateProjectRouteSchema.body,
      response: UpdateProjectRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'projects:write', org.id))) return;

    const project = await projectService.findProjectBySlug(org.id, projectSlug);
    if (!project) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Project not found', requestId },
      });
    }

    const updated = await projectService.updateProject(project.id, request.body);
    if (!updated) {
      return reply.code(500).send({
        error: { code: 'UPDATE_FAILED', message: 'Failed to update project', requestId },
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'project.updated',
      resourceType: 'project',
      resourceId: project.id,
      oldValue: project,
      newValue: updated,
      ip: request.ip,
    });

    return reply.send({ data: updated });
  });

  // DELETE /api/v1/orgs/:orgSlug/projects/:projectSlug
  f.delete('/:orgSlug/projects/:projectSlug', {
    onRequest: [fastify.authenticate],
    schema: {
      params: DeleteProjectRouteSchema.params,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'projects:write', org.id))) return;

    const project = await projectService.findProjectBySlug(org.id, projectSlug);
    if (!project) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Project not found', requestId },
      });
    }

    await projectService.deleteProject(project.id);

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'project.deleted',
      resourceType: 'project',
      resourceId: project.id,
      oldValue: project,
      ip: request.ip,
    });

    return reply.code(204).send();
  });

  // GET /api/v1/orgs/:orgSlug/projects/:projectSlug/environments
  f.get('/:orgSlug/projects/:projectSlug/environments', {
    onRequest: [fastify.authenticate],
    schema: {
      params: ListEnvironmentsRouteSchema.params,
      response: ListEnvironmentsRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { orgSlug, projectSlug } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    const project = await projectService.findProjectBySlug(org.id, projectSlug);
    if (!project) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Project not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'environments:read', org.id, project.id))) return;

    const envList = await projectService.listEnvironments(project.id);
    return reply.send({ data: envList });
  });

  // POST /api/v1/orgs/:orgSlug/projects/:projectSlug/environments
  f.post('/:orgSlug/projects/:projectSlug/environments', {
    onRequest: [fastify.authenticate],
    schema: {
      params: CreateEnvironmentRouteSchema.params,
      body: CreateEnvironmentRouteSchema.body,
      response: CreateEnvironmentRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, projectSlug } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    const project = await projectService.findProjectBySlug(org.id, projectSlug);
    if (!project) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Project not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'environments:write', org.id, project.id))) return;

    const environment = await projectService.createEnvironment(project.id, request.body);
    if (!environment) {
      return reply.code(500).send({
        error: { code: 'CREATE_FAILED', message: 'Failed to create environment', requestId },
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'environment.created',
      resourceType: 'environment',
      resourceId: environment.id,
      newValue: environment,
      ip: request.ip,
    });

    return reply.code(201).send({ data: environment });
  });
}
