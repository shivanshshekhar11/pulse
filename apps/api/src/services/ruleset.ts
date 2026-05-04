import { db } from '../db';
import { environments, flags, segments } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Ruleset } from '@pulse-flags/types';

/**
 * Builds the full ruleset payload for a given environment.
 * Used by both GET /sdk/v1/ruleset and GET /sdk/v1/stream (init event).
 *
 * Flags are scoped to the environment; segments are scoped to the org
 * (shared across all projects within the org).
 */
export async function getRuleset(environmentId: string): Promise<Ruleset> {
  const environment = await db.query.environments.findFirst({
    where: eq(environments.id, environmentId),
    with: { project: true },
  });

  if (!environment) {
    throw new Error(`Environment ${environmentId} not found`);
  }

  const flagList = await db.query.flags.findMany({
    where: eq(flags.environmentId, environment.id),
    with: {
      rules: {
        orderBy: (r, { asc }) => [asc(r.priority)],
      },
    },
  });

  const segmentList = await db.query.segments.findMany({
    where: eq(segments.orgId, environment.project.orgId),
  });

  return {
    flags: flagList.map((flag) => ({
      id: flag.id,
      key: flag.key,
      name: flag.name,
      type: flag.type as 'boolean' | 'string' | 'number' | 'json',
      defaultValue: flag.defaultValue,
      enabled: flag.enabled,
      rules: flag.rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        priority: rule.priority,
        conditions: rule.conditions,
        percentage: rule.percentage,
        value: rule.value,
        enabled: rule.enabled,
      })),
    })),
    segments: segmentList.map((segment) => ({
      id: segment.id,
      name: segment.name,
      conditions: segment.conditions,
    })),
  };
}
