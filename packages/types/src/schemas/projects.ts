import { z } from 'zod';
import { dt, dataOf, ErrorResponseSchema } from '../common';
import { OrgSlugParamsSchema } from './orgs';

// ============================================================================
// Entity schemas
// ============================================================================

export const SelectProjectSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SelectProjectMemberSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['admin', 'writer', 'viewer']),
});

export const SelectEnvironmentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  isDefault: z.boolean(),
  createdAt: z.date(),
});

// ============================================================================
// Request schemas
// ============================================================================

export const CreateProjectSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(128),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(128).optional(),
});

export const UpdateProjectMemberSchema = z.object({
  role: z.enum(['admin', 'writer', 'viewer']),
});

export const CreateEnvironmentSchema = z.object({
  name: z.string().min(1).max(64),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color')
    .optional(),
  isDefault: z.boolean().optional(),
});

export const UpdateEnvironmentSchema = CreateEnvironmentSchema.partial();

// ============================================================================
// Response schemas
// ============================================================================

export const ProjectResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  createdAt: dt(),
  updatedAt: dt(),
});

export const EnvironmentResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  color: z.string(),
  isDefault: z.boolean(),
  createdAt: dt(),
});

// ============================================================================
// Params schemas
// ============================================================================

export const OrgProjectParamsSchema = z.object({
  orgSlug: z.string(),
  projectSlug: z.string(),
});

// ============================================================================
// Route contracts
// ============================================================================

export const ListProjectsRouteSchema = {
  params: OrgSlugParamsSchema,
  response: {
    200: dataOf(z.array(ProjectResponseSchema)),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const CreateProjectRouteSchema = {
  params: OrgSlugParamsSchema,
  body: CreateProjectSchema,
  response: {
    201: dataOf(ProjectResponseSchema),
    400: ErrorResponseSchema,
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
} as const;

export const GetProjectRouteSchema = {
  params: OrgProjectParamsSchema,
  response: {
    200: dataOf(ProjectResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const UpdateProjectRouteSchema = {
  params: OrgProjectParamsSchema,
  body: UpdateProjectSchema,
  response: {
    200: dataOf(ProjectResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
} as const;

export const DeleteProjectRouteSchema = {
  params: OrgProjectParamsSchema,
  response: {
    204: z.null(),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const ListEnvironmentsRouteSchema = {
  params: OrgProjectParamsSchema,
  response: {
    200: dataOf(z.array(EnvironmentResponseSchema)),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
} as const;

export const CreateEnvironmentRouteSchema = {
  params: OrgProjectParamsSchema,
  body: CreateEnvironmentSchema,
  response: {
    201: dataOf(EnvironmentResponseSchema),
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
} as const;

// ============================================================================
// Inferred types
// ============================================================================

export type Project = z.infer<typeof SelectProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
export type ProjectMember = z.infer<typeof SelectProjectMemberSchema>;
export type UpdateProjectMember = z.infer<typeof UpdateProjectMemberSchema>;
export type Environment = z.infer<typeof SelectEnvironmentSchema>;
export type CreateEnvironment = z.infer<typeof CreateEnvironmentSchema>;
export type UpdateEnvironment = z.infer<typeof UpdateEnvironmentSchema>;
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
export type EnvironmentResponse = z.infer<typeof EnvironmentResponseSchema>;