import { z } from 'zod';
import { dt, dataOf, ErrorResponseSchema } from '../common';
import { ConditionSchema } from '../rules';
import { OrgSlugParamsSchema } from './orgs';

// ============================================================================
// Entity schemas
// ============================================================================

export const SelectSegmentSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  /** Condition tree — validated separately via ConditionSchema when writing. */
  conditions: z.unknown(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Request schemas
// ============================================================================

export const CreateSegmentSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  conditions: ConditionSchema,
});

export const UpdateSegmentSchema = CreateSegmentSchema.partial();

// ============================================================================
// Response schemas
// ============================================================================

export const SegmentResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  conditions: z.unknown(),
  createdAt: dt(),
  updatedAt: dt(),
});

// ============================================================================
// Querystring schemas
// ============================================================================

export const ListSegmentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// Params schemas
// ============================================================================

export const SegmentParamsSchema = z.object({
  orgSlug: z.string(),
  segmentId: z.string().uuid(),
});

// ============================================================================
// Route contracts
// ============================================================================

export const ListSegmentsRouteSchema = {
  params: OrgSlugParamsSchema,
  querystring: ListSegmentsQuerySchema,
  response: {
    200: dataOf(
      z.object({
        items: z.array(SegmentResponseSchema),
        total: z.number().int(),
        limit: z.number().int(),
        offset: z.number().int(),
      })
    ),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const CreateSegmentRouteSchema = {
  params: OrgSlugParamsSchema,
  body: CreateSegmentSchema,
  response: {
    201: dataOf(SegmentResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const GetSegmentRouteSchema = {
  params: SegmentParamsSchema,
  response: {
    200: dataOf(SegmentResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const UpdateSegmentRouteSchema = {
  params: SegmentParamsSchema,
  body: UpdateSegmentSchema,
  response: {
    200: dataOf(SegmentResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const DeleteSegmentRouteSchema = {
  params: SegmentParamsSchema,
  response: {
    204: z.null(),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

// ============================================================================
// Inferred types
// ============================================================================

export type Segment = z.infer<typeof SelectSegmentSchema>;
export type CreateSegment = z.infer<typeof CreateSegmentSchema>;
export type UpdateSegment = z.infer<typeof UpdateSegmentSchema>;
export type SegmentResponse = z.infer<typeof SegmentResponseSchema>;
