import { db } from '../db';
import { segments } from '../db/schema';
import { eq, and, count } from 'drizzle-orm';
import type { CreateSegment, UpdateSegment } from '@pulse-flags/types';

export async function listSegments(orgId: string, limit: number, offset: number) {
  const [items, [totals]] = await Promise.all([
    db.query.segments.findMany({
      where: eq(segments.orgId, orgId),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
      limit,
      offset,
    }),
    db.select({ total: count() }).from(segments).where(eq(segments.orgId, orgId)),
  ]);

  return {
    items,
    total: totals?.total ?? 0,
    limit,
    offset,
  };
}

export async function findSegment(orgId: string, segmentId: string) {
  return db.query.segments.findFirst({
    where: and(eq(segments.orgId, orgId), eq(segments.id, segmentId)),
  });
}

export async function createSegment(orgId: string, data: CreateSegment) {
  const [segment] = await db
    .insert(segments)
    .values({
      orgId,
      name: data.name,
      description: data.description ?? null,
      conditions: data.conditions,
    })
    .returning();
  return segment!;
}

export async function updateSegment(segmentId: string, data: UpdateSegment) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData['name'] = data.name;
  if (data.description !== undefined) updateData['description'] = data.description;
  if (data.conditions !== undefined) updateData['conditions'] = data.conditions;

  const [updated] = await db
    .update(segments)
    .set(updateData)
    .where(eq(segments.id, segmentId))
    .returning();
  return updated!;
}

export async function deleteSegment(segmentId: string) {
  await db.delete(segments).where(eq(segments.id, segmentId));
}
