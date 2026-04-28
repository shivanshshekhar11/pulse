import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import * as schema from './db-schemas';

// ============================================================================
// Users & Auth
// ============================================================================

export const SelectUserSchema = createSelectSchema(schema.users);
export const InsertUserSchema = createInsertSchema(schema.users);

export const CreateUserSchema = InsertUserSchema.pick({
  email: true,
  name: true,
}).extend({
  password: z.string().min(8),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const JWTPayloadSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
});

// ============================================================================
// Organizations
// ============================================================================

export const SelectOrganizationSchema = createSelectSchema(schema.organizations);
export const InsertOrganizationSchema = createInsertSchema(schema.organizations);

export const CreateOrganizationSchema = InsertOrganizationSchema.pick({
  slug: true,
  name: true,
});

export const UpdateOrganizationSchema = InsertOrganizationSchema.pick({
  name: true,
  plan: true,
}).partial();

// ============================================================================
// Org Members
// ============================================================================

export const SelectOrgMemberSchema = createSelectSchema(schema.orgMembers);
export const InsertOrgMemberSchema = createInsertSchema(schema.orgMembers);

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

// ============================================================================
// Projects
// ============================================================================

export const SelectProjectSchema = createSelectSchema(schema.projects);
export const InsertProjectSchema = createInsertSchema(schema.projects);

export const CreateProjectSchema = InsertProjectSchema.pick({
  slug: true,
  name: true,
});

export const UpdateProjectSchema = InsertProjectSchema.pick({
  name: true,
}).partial();

// ============================================================================
// Project Members
// ============================================================================

export const SelectProjectMemberSchema = createSelectSchema(schema.projectMembers);
export const InsertProjectMemberSchema = createInsertSchema(schema.projectMembers);

export const UpdateProjectMemberSchema = z.object({
  role: z.enum(['admin', 'writer', 'viewer']),
});

// ============================================================================
// Environments
// ============================================================================

export const SelectEnvironmentSchema = createSelectSchema(schema.environments);
export const InsertEnvironmentSchema = createInsertSchema(schema.environments);

export const CreateEnvironmentSchema = InsertEnvironmentSchema.pick({
  name: true,
  color: true,
  isDefault: true,
}).partial({
  color: true,
  isDefault: true,
});

export const UpdateEnvironmentSchema = CreateEnvironmentSchema.partial();

// ============================================================================
// API Keys
// ============================================================================

export const SelectApiKeySchema = createSelectSchema(schema.apiKeys);
export const InsertApiKeySchema = createInsertSchema(schema.apiKeys);

export const CreateApiKeySchema = InsertApiKeySchema.pick({
  name: true,
  environmentId: true,
  scopes: true,
  expiresAt: true,
}).partial({
  scopes: true,
  expiresAt: true,
});

// ============================================================================
// Flags
// ============================================================================

export const SelectFlagSchema = createSelectSchema(schema.flags);
export const InsertFlagSchema = createInsertSchema(schema.flags);

export const CreateFlagSchema = InsertFlagSchema.pick({
  key: true,
  name: true,
  description: true,
  type: true,
  defaultValue: true,
  enabled: true,
  tags: true,
}).partial({
  description: true,
  type: true,
  enabled: true,
  tags: true,
});

export const UpdateFlagSchema = InsertFlagSchema.pick({
  name: true,
  description: true,
  defaultValue: true,
  enabled: true,
  tags: true,
}).extend({
  version: z.number().int().positive(), // Required for optimistic locking
}).partial({
  name: true,
  description: true,
  defaultValue: true,
  enabled: true,
  tags: true,
});

// ============================================================================
// Rules
// ============================================================================

export const SelectRuleSchema = createSelectSchema(schema.rules);
export const InsertRuleSchema = createInsertSchema(schema.rules);

// Condition schema is defined in rules.ts since it's recursive
import { ConditionSchema } from './rules';

export const CreateRuleSchema = InsertRuleSchema.pick({
  name: true,
  priority: true,
  percentage: true,
  enabled: true,
}).extend({
  conditions: ConditionSchema,
  value: z.unknown(),
}).partial({
  name: true,
  priority: true,
  percentage: true,
  enabled: true,
});

export const UpdateRuleSchema = CreateRuleSchema.partial();

export const ReorderRulesSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

// ============================================================================
// Segments
// ============================================================================

export const SelectSegmentSchema = createSelectSchema(schema.segments);
export const InsertSegmentSchema = createInsertSchema(schema.segments);

export const CreateSegmentSchema = InsertSegmentSchema.pick({
  name: true,
  description: true,
}).extend({
  conditions: ConditionSchema,
});

export const UpdateSegmentSchema = CreateSegmentSchema.partial();

// ============================================================================
// Audit Logs
// ============================================================================

export const SelectAuditLogSchema = createSelectSchema(schema.auditLogs);
export const InsertAuditLogSchema = createInsertSchema(schema.auditLogs);

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

export const CreateAuditLogSchema = z.object({
  orgId: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  actorKeyId: z.string().uuid().optional(),
  action: AuditActionSchema,
  resourceType: ResourceTypeSchema,
  resourceId: z.string().uuid().optional(),
  oldValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
  ip: z.string().optional(),
}).transform((data) => ({
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
// Type exports
// ============================================================================

export type User = z.infer<typeof SelectUserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

export type Organization = z.infer<typeof SelectOrganizationSchema>;
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;

export type OrgMember = z.infer<typeof SelectOrgMemberSchema>;
export type InviteMember = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberRole = z.infer<typeof UpdateMemberRoleSchema>;

export type Project = z.infer<typeof SelectProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

export type ProjectMember = z.infer<typeof SelectProjectMemberSchema>;
export type UpdateProjectMember = z.infer<typeof UpdateProjectMemberSchema>;

export type Environment = z.infer<typeof SelectEnvironmentSchema>;
export type CreateEnvironment = z.infer<typeof CreateEnvironmentSchema>;
export type UpdateEnvironment = z.infer<typeof UpdateEnvironmentSchema>;

export type ApiKey = z.infer<typeof SelectApiKeySchema>;
export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;

export type Flag = z.infer<typeof SelectFlagSchema>;
export type CreateFlag = z.infer<typeof CreateFlagSchema>;
export type UpdateFlag = z.infer<typeof UpdateFlagSchema>;

export type Rule = z.infer<typeof SelectRuleSchema>;
export type CreateRule = z.infer<typeof CreateRuleSchema>;
export type UpdateRule = z.infer<typeof UpdateRuleSchema>;
export type ReorderRules = z.infer<typeof ReorderRulesSchema>;

export type Segment = z.infer<typeof SelectSegmentSchema>;
export type CreateSegment = z.infer<typeof CreateSegmentSchema>;
export type UpdateSegment = z.infer<typeof UpdateSegmentSchema>;

export type AuditLog = z.infer<typeof SelectAuditLogSchema>;
export type AuditAction = z.infer<typeof AuditActionSchema>;
export type ResourceType = z.infer<typeof ResourceTypeSchema>;
export type CreateAuditLog = z.input<typeof CreateAuditLogSchema>;
