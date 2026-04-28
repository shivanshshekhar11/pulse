import { db } from '../db';
import { auditLogs } from '../db/schema';
import { CreateAuditLogSchema, type CreateAuditLog } from '@pulse/types';

export async function writeAuditLog(data: CreateAuditLog): Promise<void> {
  const validated = CreateAuditLogSchema.parse(data);
  await db.insert(auditLogs).values(validated);
}
