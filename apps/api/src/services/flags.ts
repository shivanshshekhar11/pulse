import { db } from '../db';
import { flags } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { redis } from '../lib/redis';
import type { CreateFlag, UpdateFlag } from '@pulse-flags/types';

type FlagType = 'boolean' | 'string' | 'number' | 'json';

/** Casts the Drizzle `type: string` column to the typed enum. */
function castFlag<T extends { type: string }>(flag: T): Omit<T, 'type'> & { type: FlagType } {
  return { ...flag, type: flag.type as FlagType };
}

export async function listFlags(environmentId: string) {
  const rows = await db.query.flags.findMany({
    where: eq(flags.environmentId, environmentId),
    orderBy: (f, { desc }) => [desc(f.createdAt)],
  });
  return rows.map(castFlag);
}

export async function findFlagByKey(environmentId: string, key: string) {
  const row = await db.query.flags.findFirst({
    where: and(eq(flags.environmentId, environmentId), eq(flags.key, key)),
  });
  return row ? castFlag(row) : null;
}

export async function isFlagKeyTaken(environmentId: string, key: string) {
  const existing = await db.query.flags.findFirst({
    where: and(eq(flags.environmentId, environmentId), eq(flags.key, key)),
  });
  return !!existing;
}

export async function createFlag(environmentId: string, createdBy: string, data: CreateFlag) {
  const [flag] = await db
    .insert(flags)
    .values({
      environmentId,
      key: data.key,
      name: data.name,
      description: data.description ?? null,
      type: data.type ?? 'boolean',
      defaultValue: data.defaultValue ?? false,
      enabled: data.enabled ?? false,
      tags: (data.tags ?? []) as string[],
      createdBy,
    })
    .returning();
  return castFlag(flag!);
}

/**
 * Updates a flag using optimistic locking.
 * Returns the updated flag, or null if the version did not match (conflict).
 */
export async function updateFlag(flagId: string, data: UpdateFlag) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updateData['name'] = data.name;
  if (data.description !== undefined) updateData['description'] = data.description;
  if (data.defaultValue !== undefined) updateData['defaultValue'] = data.defaultValue;
  if (data.enabled !== undefined) updateData['enabled'] = data.enabled;
  if (data.tags !== undefined) updateData['tags'] = data.tags;

  const result = await db
    .update(flags)
    .set({ ...updateData, version: sql`${flags.version} + 1` })
    .where(and(eq(flags.id, flagId), eq(flags.version, data.version)))
    .returning();

  const row = result[0] ?? null;
  return row ? castFlag(row) : null;
}

export async function deleteFlag(flagId: string) {
  await db.delete(flags).where(eq(flags.id, flagId));
}

/** Publishes a ruleset change event to all connected SDK clients for this environment. */
export async function publishFlagChange(
  environmentId: string,
  flagId: string,
  action: 'created' | 'updated' | 'deleted'
) {
  await redis.publish(
    `pulse:env:${environmentId}`,
    JSON.stringify({ type: 'ruleset:updated', flagId, action })
  );
}
