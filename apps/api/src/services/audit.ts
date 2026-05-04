import { db } from '../db';
import { auditLogs } from '../db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import type { AuditLogQuery } from '@pulse-flags/types';

/**
 * Returns a paginated, filterable list of audit log entries for an org.
 * Filters are all optional — omitting them returns all entries.
 */
export async function listAuditLogs(
  orgId: string,
  query: AuditLogQuery
) {
  const { action, resourceType, actorId, limit, offset } = query;

  // Build the where conditions dynamically
  const conditions = [eq(auditLogs.orgId, orgId)];
  if (action) conditions.push(eq(auditLogs.action, action));
  if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
  if (actorId) conditions.push(eq(auditLogs.actorId, actorId));

  const where = conditions.length === 1 ? conditions[0]! : and(...conditions);

  const [items, [totals]] = await Promise.all([
    db.query.auditLogs.findMany({
      where,
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      offset,
    }),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);

  return {
    items,
    total: totals?.total ?? 0,
    limit,
    offset,
  };
}
