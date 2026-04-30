import { z } from 'zod';
import { dataOf, ErrorResponseSchema } from '../common';

// ============================================================================
// Ruleset response schemas
//
// These are the shapes the SDK receives from GET /sdk/v1/ruleset.
// They are also used by packages/sdk/src/types.ts for local evaluation.
// ============================================================================

export const RulesetRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  priority: z.number().int(),
  conditions: z.unknown(),
  percentage: z.number().int().min(0).max(100),
  value: z.unknown(),
  enabled: z.boolean(),
});

export const RulesetFlagSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  type: z.enum(['boolean', 'string', 'number', 'json']),
  defaultValue: z.unknown(),
  enabled: z.boolean(),
  rules: z.array(RulesetRuleSchema),
});

export const RulesetSegmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  conditions: z.unknown(),
});

export const RulesetSchema = z.object({
  flags: z.array(RulesetFlagSchema),
  segments: z.array(RulesetSegmentSchema),
});

// ============================================================================
// Response schemas (API response envelope versions)
// ============================================================================

export const RulesetRuleResponseSchema = RulesetRuleSchema;
export const RulesetFlagResponseSchema = RulesetFlagSchema;
export const RulesetSegmentResponseSchema = RulesetSegmentSchema;
export const RulesetResponseSchema = RulesetSchema;

// ============================================================================
// Route contracts
// ============================================================================

export const GetRulesetRouteSchema = {
  response: {
    200: dataOf(RulesetResponseSchema),
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

// ============================================================================
// SSE event shapes
//
// These are the JSON payloads written to the SSE stream.
// The SDK parses these to decide whether to re-fetch the ruleset.
// ============================================================================

/**
 * Sent immediately on SSE connection — delivers the current ruleset so the
 * client doesn't need a separate GET /ruleset call.
 */
export const SseInitEventSchema = z.object({
  type: z.literal('init'),
  ruleset: RulesetSchema,
});

/**
 * Sent after any flag or rule mutation — tells the SDK to re-evaluate.
 * The SDK re-fetches GET /ruleset to get the updated payload.
 */
export const SseRulesetUpdatedEventSchema = z.object({
  type: z.literal('ruleset:updated'),
  flagId: z.string().uuid(),
  action: z.enum(['created', 'updated', 'deleted', 'rule.created', 'rule.updated', 'rule.deleted', 'rules.reordered']),
});

export type SseInitEvent = z.infer<typeof SseInitEventSchema>;
export type SseRulesetUpdatedEvent = z.infer<typeof SseRulesetUpdatedEventSchema>;

// ============================================================================
// Inferred types
// ============================================================================

export type Ruleset = z.infer<typeof RulesetSchema>;
export type RulesetFlag = z.infer<typeof RulesetFlagSchema>;
export type RulesetSegment = z.infer<typeof RulesetSegmentSchema>;
export type RulesetResponse = z.infer<typeof RulesetResponseSchema>;
export type RulesetFlagResponse = z.infer<typeof RulesetFlagResponseSchema>;
export type RulesetSegmentResponse = z.infer<typeof RulesetSegmentResponseSchema>;
