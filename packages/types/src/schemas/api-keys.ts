import { z } from 'zod';
import { dt, dataOf, ErrorResponseSchema } from '../common';
import { OrgSlugParamsSchema } from './orgs';

// ============================================================================
// Entity schemas
// ============================================================================

export const SelectApiKeySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  environmentId: z.string().uuid().nullable(),
  name: z.string(),
  keyPrefix: z.string(),
  keyHash: z.string(),
  scopes: z.array(z.string()),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
});

// ============================================================================
// Request schemas
// ============================================================================

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(128),
  environmentId: z.string().uuid(),
  scopes: z.array(z.enum(['read', 'write'])).default(['read']),
  expiresAt: z.date().nullable().optional(),
});

// ============================================================================
// Response schemas
// ============================================================================

/** Safe API key shape — keyHash is never included in any response. */
export const ApiKeySafeResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  keyPrefix: z.string(),
  environmentId: z.string().uuid().nullable(),
  scopes: z.array(z.string()),
  lastUsedAt: dt().nullable(),
  expiresAt: dt().nullable(),
  createdAt: dt(),
});

/** Extended shape returned only at creation time — includes the one-time rawKey. */
export const ApiKeyCreatedResponseSchema = ApiKeySafeResponseSchema.extend({
  rawKey: z.string(),
});

// ============================================================================
// Params schemas
// ============================================================================

export const ApiKeyParamsSchema = z.object({
  orgSlug: z.string(),
  keyId: z.string().uuid(),
});

// ============================================================================
// Route contracts
// ============================================================================

export const ListApiKeysRouteSchema = {
  params: OrgSlugParamsSchema,
  response: {
    200: dataOf(z.array(ApiKeySafeResponseSchema)),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const CreateApiKeyRouteSchema = {
  params: OrgSlugParamsSchema,
  body: CreateApiKeySchema,
  response: {
    201: dataOf(ApiKeyCreatedResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
} as const;

export const RevokeApiKeyRouteSchema = {
  params: ApiKeyParamsSchema,
  response: {
    204: z.null(),
    400: ErrorResponseSchema,
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

// ============================================================================
// Inferred types
// ============================================================================

export type ApiKey = z.infer<typeof SelectApiKeySchema>;
export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;
export type ApiKeySafeResponse = z.infer<typeof ApiKeySafeResponseSchema>;
export type ApiKeyCreatedResponse = z.infer<typeof ApiKeyCreatedResponseSchema>;
