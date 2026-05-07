import { z } from 'zod';
import { dt, dataOf, ErrorResponseSchema } from '../common';

// ============================================================================
// Entity schemas
// ============================================================================

export const SelectFlagSchema = z.object({
  id: z.string().uuid(),
  environmentId: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(['boolean', 'string', 'number', 'json']),
  defaultValue: z.unknown(),
  enabled: z.boolean(),
  version: z.number().int(),
  tags: z.array(z.string()),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Request schemas
// ============================================================================

/**
 * Flag key format: ^[a-z][a-z0-9_]*$
 * Must start with a lowercase letter, then only lowercase letters, digits, underscores.
 * Enforced at every route boundary.
 */
export const FlagKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    'Flag key must start with a lowercase letter and contain only lowercase letters, digits, and underscores'
  );

export const CreateFlagSchema = z.object({
  key: FlagKeySchema,
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  type: z.enum(['boolean', 'string', 'number', 'json']).default('boolean'),
  defaultValue: z.unknown().optional(),
  enabled: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const UpdateFlagSchema = z.object({
  /** Required for optimistic locking — must match the current version in the DB. */
  version: z.number().int().positive(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).nullable().optional(),
  defaultValue: z.unknown().optional(),
  enabled: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// Response schemas
// ============================================================================

export const FlagResponseSchema = z.object({
  id: z.string().uuid(),
  environmentId: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(['boolean', 'string', 'number', 'json']),
  defaultValue: z.unknown(),
  enabled: z.boolean(),
  version: z.number().int(),
  tags: z.array(z.string()),
  createdBy: z.string().uuid().nullable(),
  createdAt: dt(),
  updatedAt: dt(),
});

// ============================================================================
// Querystring schemas
// ============================================================================

export const ListFlagsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// Params schemas
// ============================================================================

export const EnvParamsSchema = z.object({
  orgSlug: z.string(),
  projectSlug: z.string(),
  envName: z.string(),
});

export const FlagParamsSchema = EnvParamsSchema.extend({
  flagKey: z.string(),
});

// ============================================================================
// Route contracts
// ============================================================================

export const ListFlagsRouteSchema = {
  params: EnvParamsSchema,
  querystring: ListFlagsQuerySchema,
  response: {
    200: dataOf(
      z.object({
        items: z.array(FlagResponseSchema),
        total: z.number().int(),
        limit: z.number().int(),
        offset: z.number().int(),
      })
    ),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const CreateFlagRouteSchema = {
  params: EnvParamsSchema,
  body: CreateFlagSchema,
  response: {
    201: dataOf(FlagResponseSchema),
    400: ErrorResponseSchema,
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const GetFlagRouteSchema = {
  params: FlagParamsSchema,
  response: {
    200: dataOf(FlagResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const UpdateFlagRouteSchema = {
  params: FlagParamsSchema,
  body: UpdateFlagSchema,
  response: {
    200: dataOf(FlagResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    409: ErrorResponseSchema,
  },
} as const;

export const DeleteFlagRouteSchema = {
  params: FlagParamsSchema,
  response: {
    204: z.null(),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

// ============================================================================
// Inferred types
// ============================================================================

export type Flag = z.infer<typeof SelectFlagSchema>;
export type CreateFlag = z.infer<typeof CreateFlagSchema>;
export type UpdateFlag = z.infer<typeof UpdateFlagSchema>;
export type FlagResponse = z.infer<typeof FlagResponseSchema>;
