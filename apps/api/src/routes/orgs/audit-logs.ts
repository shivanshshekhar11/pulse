import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ListAuditLogsRouteSchema } from '@pulse-flags/types';
import { assertPermission } from '../../lib/rbac';
import { findOrgBySlug } from '../../services/organizations';
import { listAuditLogs } from '../../services/audit';

export default async function auditLogRoutes(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/orgs/:orgSlug/audit-logs
  // Paginated, filterable by action, resourceType, and actorId.
  // Only org members can read audit logs — viewer role is sufficient.
  f.get('/:orgSlug/audit-logs', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Audit Logs'],
      summary: 'List Audit Logs',
      params: ListAuditLogsRouteSchema.params,
      querystring: ListAuditLogsRouteSchema.querystring,
      response: ListAuditLogsRouteSchema.response,
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

    // Any org member can read audit logs
    if (!(await assertPermission(request, reply, 'audit:read', org.id))) return;

    const result = await listAuditLogs(org.id, request.query);

    return reply.send({ data: result });
  });
}
