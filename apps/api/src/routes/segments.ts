import type { FastifyInstance } from 'fastify';
import { db } from '../db';
import { segments, organizations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreateSegmentSchema, UpdateSegmentSchema } from '@pulse/types';
import { assertPermission } from '../lib/rbac';
import { writeAuditLog } from '../lib/audit';

export default async function segmentRoutes(fastify: FastifyInstance) {
  // List segments for an organization
  fastify.get('/:orgSlug/segments', {
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

    const hasAccess = await assertPermission(request, reply, 'segments:read', org.id);
    if (!hasAccess) return;

    const segmentList = await db.query.segments.findMany({
      where: eq(segments.orgId, org.id),
      orderBy: (segments, { desc }) => [desc(segments.createdAt)],
    });

    return reply.send({
      data: segmentList,
    });
  });

  // Create segment
  fastify.post('/:orgSlug/segments', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug } = request.params as { orgSlug: string };
    const body = CreateSegmentSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'segments:write', org.id);
    if (!hasAccess) return;

    const [segment] = await db
      .insert(segments)
      .values({
        orgId: org.id,
        name: body.name,
        description: body.description ?? null,
        conditions: body.conditions,
      })
      .returning();

    if (!segment) {
      return reply.code(500).send({
        error: 'CREATE_FAILED',
        message: 'Failed to create segment',
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'segment.created',
      resourceType: 'segment',
      resourceId: segment.id,
      newValue: segment,
      ip: request.ip,
    });

    return reply.code(201).send({
      data: segment,
    });
  });

  // Get segment by ID
  fastify.get('/:orgSlug/segments/:segmentId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const { orgSlug, segmentId } = request.params as {
      orgSlug: string;
      segmentId: string;
    };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'segments:read', org.id);
    if (!hasAccess) return;

    const segment = await db.query.segments.findFirst({
      where: and(
        eq(segments.orgId, org.id),
        eq(segments.id, segmentId)
      ),
    });

    if (!segment) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Segment not found',
      });
    }

    return reply.send({
      data: segment,
    });
  });

  // Update segment
  fastify.patch('/:orgSlug/segments/:segmentId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, segmentId } = request.params as {
      orgSlug: string;
      segmentId: string;
    };
    const body = UpdateSegmentSchema.parse(request.body);

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'segments:write', org.id);
    if (!hasAccess) return;

    const segment = await db.query.segments.findFirst({
      where: and(
        eq(segments.orgId, org.id),
        eq(segments.id, segmentId)
      ),
    });

    if (!segment) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Segment not found',
      });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.conditions !== undefined) updateData.conditions = body.conditions;

    const [updated] = await db
      .update(segments)
      .set(updateData)
      .where(eq(segments.id, segment.id))
      .returning();

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'segment.updated',
      resourceType: 'segment',
      resourceId: segment.id,
      oldValue: segment,
      newValue: updated,
      ip: request.ip,
    });

    return reply.send({
      data: updated,
    });
  });

  // Delete segment
  fastify.delete('/:orgSlug/segments/:segmentId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { userId: string; email: string };
    const { orgSlug, segmentId } = request.params as {
      orgSlug: string;
      segmentId: string;
    };

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, orgSlug),
    });

    if (!org) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const hasAccess = await assertPermission(request, reply, 'segments:write', org.id);
    if (!hasAccess) return;

    const segment = await db.query.segments.findFirst({
      where: and(
        eq(segments.orgId, org.id),
        eq(segments.id, segmentId)
      ),
    });

    if (!segment) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Segment not found',
      });
    }

    await db.delete(segments).where(eq(segments.id, segment.id));

    await writeAuditLog({
      orgId: org.id,
      actorId: user.userId,
      action: 'segment.deleted',
      resourceType: 'segment',
      resourceId: segment.id,
      oldValue: segment,
      ip: request.ip,
    });

    return reply.code(204).send();
  });
}
