import { z } from 'zod';
import { dt, dataOf, ErrorResponseSchema } from '../common';
import { UserResponseSchema } from './auth';

// ============================================================================
// Entity schemas
// ============================================================================

export const SelectOrganizationSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  plan: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SelectOrgMemberSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  invitedBy: z.string().uuid().nullable(),
  joinedAt: z.date(),
});

// ============================================================================
// Request schemas
// ============================================================================

export const CreateOrganizationSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(128),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

// ============================================================================
// Response schemas
// ============================================================================

export const OrganizationResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  plan: z.string(),
  createdAt: dt(),
  updatedAt: dt(),
});

export const OrgMemberResponseSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  joinedAt: dt(),
  user: UserResponseSchema,
});

// ============================================================================
// Params schemas
// ============================================================================

export const OrgSlugParamsSchema = z.object({ orgSlug: z.string() });

export const OrgMemberParamsSchema = z.object({
  orgSlug: z.string(),
  userId: z.string().uuid(),
});

// ============================================================================
// Route contracts
// ============================================================================

export const CreateOrgRouteSchema = {
  body: CreateOrganizationSchema,
  response: {
    201: dataOf(OrganizationResponseSchema),
    400: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
} as const;

export const GetOrgRouteSchema = {
  params: OrgSlugParamsSchema,
  response: {
    200: dataOf(OrganizationResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const UpdateOrgRouteSchema = {
  params: OrgSlugParamsSchema,
  body: UpdateOrganizationSchema,
  response: {
    200: dataOf(OrganizationResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
} as const;

export const DeleteOrgRouteSchema = {
  params: OrgSlugParamsSchema,
  response: {
    204: z.null(),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const ListMembersRouteSchema = {
  params: OrgSlugParamsSchema,
  response: {
    200: dataOf(z.array(OrgMemberResponseSchema)),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const InviteMemberRouteSchema = {
  params: OrgSlugParamsSchema,
  body: InviteMemberSchema,
  response: {
    201: dataOf(OrgMemberResponseSchema),
    400: ErrorResponseSchema,
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
} as const;

export const UpdateMemberRoleRouteSchema = {
  params: OrgMemberParamsSchema,
  body: UpdateMemberRoleSchema,
  response: {
    200: dataOf(OrgMemberResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const RemoveMemberRouteSchema = {
  params: OrgMemberParamsSchema,
  response: {
    204: z.null(),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

// ============================================================================
// Inferred types
// ============================================================================

export type Organization = z.infer<typeof SelectOrganizationSchema>;
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;
export type OrgMember = z.infer<typeof SelectOrgMemberSchema>;
export type InviteMember = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberRole = z.infer<typeof UpdateMemberRoleSchema>;
export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;
export type OrgMemberResponse = z.infer<typeof OrgMemberResponseSchema>;
