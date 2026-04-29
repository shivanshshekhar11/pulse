import { z } from 'zod';
import { dt, dataOf, ErrorResponseSchema } from '../common';
import { ConditionSchema } from '../rules';
import { FlagParamsSchema } from './flags';

// ============================================================================
// Entity schemas
// ============================================================================

export const SelectRuleSchema = z.object({
  id: z.string().uuid(),
  flagId: z.string().uuid(),
  name: z.string().nullable(),
  priority: z.number().int(),
  /** Condition tree — validated separately via ConditionSchema when writing. */
  conditions: z.unknown(),
  percentage: z.number().int().min(0).max(100),
  value: z.unknown(),
  enabled: z.boolean(),
  createdAt: z.date(),
});

// ============================================================================
// Request schemas
// ============================================================================

export const CreateRuleSchema = z.object({
  name: z.string().max(128).optional(),
  priority: z.number().int().min(0).default(0),
  conditions: ConditionSchema,
  percentage: z.number().int().min(0).max(100).default(100),
  value: z.unknown(),
  enabled: z.boolean().default(true),
});

export const UpdateRuleSchema = CreateRuleSchema.partial();

export const ReorderRulesSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

// ============================================================================
// Response schemas
// ============================================================================

export const RuleResponseSchema = z.object({
  id: z.string().uuid(),
  flagId: z.string().uuid(),
  name: z.string().nullable(),
  priority: z.number().int(),
  conditions: z.unknown(),
  percentage: z.number().int().min(0).max(100),
  value: z.unknown(),
  enabled: z.boolean(),
  createdAt: dt(),
});

// ============================================================================
// Params schemas
// ============================================================================

export const RuleParamsSchema = FlagParamsSchema.extend({
  ruleId: z.string().uuid(),
});

// ============================================================================
// Route contracts
// ============================================================================

export const ListRulesRouteSchema = {
  params: FlagParamsSchema,
  response: {
    200: dataOf(z.array(RuleResponseSchema)),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const CreateRuleRouteSchema = {
  params: FlagParamsSchema,
  body: CreateRuleSchema,
  response: {
    201: dataOf(RuleResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const UpdateRuleRouteSchema = {
  params: RuleParamsSchema,
  body: UpdateRuleSchema,
  response: {
    200: dataOf(RuleResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const DeleteRuleRouteSchema = {
  params: RuleParamsSchema,
  response: {
    204: z.null(),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const ReorderRulesRouteSchema = {
  params: FlagParamsSchema,
  body: ReorderRulesSchema,
  response: {
    200: dataOf(z.object({ success: z.boolean() })),
    400: ErrorResponseSchema,
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

// ============================================================================
// Inferred types
// ============================================================================

export type Rule = z.infer<typeof SelectRuleSchema>;
export type CreateRule = z.infer<typeof CreateRuleSchema>;
export type UpdateRule = z.infer<typeof UpdateRuleSchema>;
export type ReorderRules = z.infer<typeof ReorderRulesSchema>;
export type RuleResponse = z.infer<typeof RuleResponseSchema>;
