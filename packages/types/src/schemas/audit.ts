import { z } from 'zod';
import { dt, dataOf, ErrorResponseSchema } from '../common';
import { OrgSlugParamsSchema } from './orgs';

// ============================================================================
// Entity schemas
// ============================================================================

export const SelectAuditLogSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  actorKeyId: z.string().uuid().nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().uuid().nullable(),
  oldValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  ip: z.string().nullable(),
  createdAt: z.date(),
});

// ============================================================================
// Request schemas
// ============================================================================

export const AuditActionSchema = z.enum([
  'flag.created',
  'flag.updated',
  'flag.deleted',
  'rule.created',
  'rule.updated',
  'rule.deleted',
  'rule.reordered',
  'segment.created',
  'segment.updated',
  'segment.deleted',
  'member.invited',
  'member.updated',
  'member.removed',
  'apikey.created',
  'apikey.revoked',
  'project.created',
  'project.updated',
  'project.deleted',
  'environment.created',
  'environment.updated',
  'environment.deleted',
  'org.updated',
]);

export const ResourceTypeSchema = z.enum([
  'flag',
  'rule',
  'segment',
  'member',
  'apikey',
  'project',
  'environment',
  'org',
]);

export const CreateAuditLogSchema = z
  .object({
    orgId: z.string().uuid(),
    actorId: z.string().uuid().optional(),
    actorKeyId: z.string().uuid().optional(),
    action: AuditActionSchema,
    resourceType: ResourceTypeSchema,
    resourceId: z.string().uuid().optional(),
    oldValue: z.unknown().optional(),
    newValue: z.unknown().optional(),
    ip: z.string().optional(),
  })
  .transform((data) => ({
    orgId: data.orgId,
    actorId: data.actorId ?? null,
    actorKeyId: data.actorKeyId ?? null,
    action: data.action,
    resourceType: data.resourceType,
    resourceId: data.resourceId ?? null,
    oldValue: data.oldValue ?? null,
    newValue: data.newValue ?? null,
    ip: data.ip ?? null,
  }));

// ============================================================================
// Response schemas
// ============================================================================

export const AuditLogResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  actorKeyId: z.string().uuid().nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().uuid().nullable(),
  oldValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  ip: z.string().nullable(),
  createdAt: dt(),
});

// ============================================================================
// Querystring schemas
// ============================================================================

export const AuditLogQuerySchema = z.object({
  /** Filter by action type (e.g. 'flag.updated') */
  action: AuditActionSchema.optional(),
  /** Filter by resource type (e.g. 'flag') */
  resourceType: ResourceTypeSchema.optional(),
  /** Filter by actor user ID */
  actorId: z.string().uuid().optional(),
  /** Pagination: number of records to return (default 50, max 200) */
  limit: z.coerce.number().int().min(1).max(200).default(50),
  /** Pagination: number of records to skip */
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// Route contracts
// ============================================================================

export const ListAuditLogsRouteSchema = {
  params: OrgSlugParamsSchema,
  querystring: AuditLogQuerySchema,
  response: {
    200: dataOf(
      z.object({
        items: z.array(AuditLogResponseSchema),
        total: z.number().int(),
        limit: z.number().int(),
        offset: z.number().int(),
      })
    ),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

// ============================================================================
// Inferred types
// ============================================================================

export type AuditLog = z.infer<typeof SelectAuditLogSchema>;
export type AuditAction = z.infer<typeof AuditActionSchema>;
export type ResourceType = z.infer<typeof ResourceTypeSchema>;
export type CreateAuditLog = z.input<typeof CreateAuditLogSchema>;
export type AuditLogResponse = z.infer<typeof AuditLogResponseSchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
