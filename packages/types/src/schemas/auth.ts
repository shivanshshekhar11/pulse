import { z } from 'zod';
import { dataOf, ErrorResponseSchema } from '../common';

// ============================================================================
// Entity schemas
// ============================================================================

export const SelectUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  passwordHash: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Request schemas
// ============================================================================

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
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
// Response schemas
// ============================================================================

/** Public user shape returned in API responses — omits passwordHash. */
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const AuthTokenPairSchema = z.object({
  user: UserResponseSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const AuthRefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

// ============================================================================
// Route contracts
// ============================================================================

export const RegisterRouteSchema = {
  body: CreateUserSchema,
  response: {
    201: dataOf(AuthTokenPairSchema),
    400: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
} as const;

export const LoginRouteSchema = {
  body: LoginSchema,
  response: {
    200: dataOf(AuthTokenPairSchema),
    401: ErrorResponseSchema,
  },
} as const;

export const RefreshRouteSchema = {
  body: z.object({ refreshToken: z.string() }),
  response: {
    200: dataOf(AuthRefreshResponseSchema),
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
  },
} as const;

export const LogoutRouteSchema = {
  body: z.object({ refreshToken: z.string().optional() }),
  response: {
    200: dataOf(z.object({ message: z.string() })),
  },
} as const;

export const MeRouteSchema = {
  response: {
    200: dataOf(UserResponseSchema),
    404: ErrorResponseSchema,
  },
} as const;

// ============================================================================
// Inferred types
// ============================================================================

export type User = z.infer<typeof SelectUserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type AuthTokenPair = z.infer<typeof AuthTokenPairSchema>;
export type AuthRefreshResponse = z.infer<typeof AuthRefreshResponseSchema>;
