import { z } from 'zod';

// ============================================================================
// Datetime helper
//
// Response schemas use z.union([z.string(), z.date()]) for datetime fields.
// Route handlers pass Date objects from Drizzle; Fastify's serializer converts
// them to ISO strings before sending. The union type satisfies both sides.
// ============================================================================

/** Datetime field for response schemas — accepts both Date (from Drizzle) and string (on the wire). */
export const dt = () => z.union([z.string(), z.date()]);

// ============================================================================
// Standard response envelope
// ============================================================================

/** Wraps a data schema in the standard { data: T } success envelope. */
export function dataOf<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema });
}

/** Standard error response shape — every error route returns this. */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
