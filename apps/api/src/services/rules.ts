import { db } from '../db';
import { rules } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { redis } from '../lib/redis';
import type { CreateRule, UpdateRule } from '@pulse/types';

export async function listRules(flagId: string) {
  return db.query.rules.findMany({
    where: eq(rules.flagId, flagId),
    orderBy: (r, { asc }) => [asc(r.priority)],
  });
}

export async function findRule(flagId: string, ruleId: string) {
  return db.query.rules.findFirst({
    where: and(eq(rules.flagId, flagId), eq(rules.id, ruleId)),
  });
}

export async function createRule(flagId: string, data: CreateRule) {
  const [rule] = await db
    .insert(rules)
    .values({
      flagId,
      name: data.name ?? null,
      priority: data.priority ?? 0,
      conditions: data.conditions,
      percentage: data.percentage ?? 100,
      value: data.value,
      enabled: data.enabled ?? true,
    })
    .returning();
  return rule!;
}

export async function updateRule(ruleId: string, data: UpdateRule) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData['name'] = data.name;
  if (data.priority !== undefined) updateData['priority'] = data.priority;
  if (data.conditions !== undefined) updateData['conditions'] = data.conditions;
  if (data.percentage !== undefined) updateData['percentage'] = data.percentage;
  if (data.value !== undefined) updateData['value'] = data.value;
  if (data.enabled !== undefined) updateData['enabled'] = data.enabled;

  const [updated] = await db
    .update(rules)
    .set(updateData)
    .where(eq(rules.id, ruleId))
    .returning();
  return updated!;
}

export async function deleteRule(ruleId: string) {
  await db.delete(rules).where(eq(rules.id, ruleId));
}

/**
 * Verifies all IDs belong to the given flag, then updates priorities in order.
 * Returns false if any ID is invalid.
 */
export async function reorderRules(flagId: string, orderedIds: string[]) {
  const existing = await db.query.rules.findMany({
    where: and(eq(rules.flagId, flagId), inArray(rules.id, orderedIds)),
  });

  if (existing.length !== orderedIds.length) return false;

  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(rules).set({ priority: index }).where(eq(rules.id, id))
    )
  );

  return true;
}

/** Publishes a ruleset change event to all connected SDK clients for this environment. */
export async function publishRuleChange(
  environmentId: string,
  flagId: string,
  ruleId: string,
  action: 'rule.created' | 'rule.updated' | 'rule.deleted' | 'rules.reordered'
) {
  await redis.publish(
    `pulse:env:${environmentId}`,
    JSON.stringify({ type: 'ruleset:updated', flagId, ruleId, action })
  );
}
