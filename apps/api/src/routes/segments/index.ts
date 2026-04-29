import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  ListSegmentsRouteSchema,
  CreateSegmentRouteSchema,
  GetSegmentRouteSchema,
  UpdateSegmentRouteSchema,
  DeleteSegmentRouteSchema,
} from '@pulse/types';
import { assertPermission } from '../../lib/rbac';
import { writeAuditLog } from '../../lib/audit';
import { findOrgBySlug } from '../../services/organizations';
import * as segmentService from '../../services/segments';

export default async function segmentRoutes(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/orgs/:orgSlug/segments
  f.get('/:orgSlug/segments', {
    onRequest: [fastify.authenticate],
    schema: {
      params: ListSegmentsRouteSchema.params,
      response: ListSegmentsRouteSchema.response,
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

    if (!(await assertPermission(request, reply, 'segments:read', org.id))) return;

    const segmentList = await segmentService.listSegments(org.id);
    return reply.send({ data: segmentList });
  });

  // POST /api/v1/orgs/:orgSlug/segments
  f.post('/:orgSlug/segments', {
    onRequest: [fastify.authenticate],
    schema: {
      params: CreateSegmentRouteSchema.params,
      body: CreateSegmentRouteSchema.body,
      response: CreateSegmentRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'segments:write', org.id))) return;

    const segment = await segmentService.createSegment(org.id, request.body);

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'segment.created',
      resourceType: 'segment',
      resourceId: segment.id,
      newValue: segment,
      ip: request.ip,
    });

    return reply.code(201).send({ data: segment });
  });

  // GET /api/v1/orgs/:orgSlug/segments/:segmentId
  f.get('/:orgSlug/segments/:segmentId', {
    onRequest: [fastify.authenticate],
    schema: {
      params: GetSegmentRouteSchema.params,
      response: GetSegmentRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { orgSlug, segmentId } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'segments:read', org.id))) return;

    const segment = await segmentService.findSegment(org.id, segmentId);
    if (!segment) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Segment not found', requestId },
      });
    }

    return reply.send({ data: segment });
  });

  // PATCH /api/v1/orgs/:orgSlug/segments/:segmentId
  f.patch('/:orgSlug/segments/:segmentId', {
    onRequest: [fastify.authenticate],
    schema: {
      params: UpdateSegmentRouteSchema.params,
      body: UpdateSegmentRouteSchema.body,
      response: UpdateSegmentRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, segmentId } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'segments:write', org.id))) return;

    const segment = await segmentService.findSegment(org.id, segmentId);
    if (!segment) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Segment not found', requestId },
      });
    }

    const updated = await segmentService.updateSegment(segment.id, request.body);

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'segment.updated',
      resourceType: 'segment',
      resourceId: segment.id,
      oldValue: segment,
      newValue: updated,
      ip: request.ip,
    });

    return reply.send({ data: updated });
  });

  // DELETE /api/v1/orgs/:orgSlug/segments/:segmentId
  f.delete('/:orgSlug/segments/:segmentId', {
    onRequest: [fastify.authenticate],
    schema: {
      params: DeleteSegmentRouteSchema.params,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, segmentId } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'segments:write', org.id))) return;

    const segment = await segmentService.findSegment(org.id, segmentId);
    if (!segment) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Segment not found', requestId },
      });
    }

    await segmentService.deleteSegment(segment.id);

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'segment.deleted',
      resourceType: 'segment',
      resourceId: segment.id,
      oldValue: segment,
      ip: request.ip,
    });

    return reply.code(204).send();
  });
}
