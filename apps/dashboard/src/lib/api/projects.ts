import type {
  ProjectResponse,
  EnvironmentResponse,
  CreateProject,
  CreateEnvironment,
  UpdateProject,
} from '@pulse-flags/types';
import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export const projectsApi = {
  list: (orgSlug: string, token?: string) =>
    apiGet<ProjectResponse[]>(`/api/v1/orgs/${orgSlug}/projects`, token),

  get: (orgSlug: string, projectSlug: string, token?: string) =>
    apiGet<ProjectResponse>(`/api/v1/orgs/${orgSlug}/projects/${projectSlug}`, token),

  create: (orgSlug: string, body: CreateProject, token?: string) =>
    apiPost<ProjectResponse>(`/api/v1/orgs/${orgSlug}/projects`, body, token),

  update: (orgSlug: string, projectSlug: string, body: UpdateProject, token?: string) =>
    apiPatch<ProjectResponse>(
      `/api/v1/orgs/${orgSlug}/projects/${projectSlug}`,
      body,
      token,
    ),

  delete: (orgSlug: string, projectSlug: string, token?: string) =>
    apiDelete(`/api/v1/orgs/${orgSlug}/projects/${projectSlug}`, token),

  listEnvironments: (orgSlug: string, projectSlug: string, token?: string) =>
    apiGet<EnvironmentResponse[]>(
      `/api/v1/orgs/${orgSlug}/projects/${projectSlug}/environments`,
      token,
    ),

  createEnvironment: (orgSlug: string, projectSlug: string, body: CreateEnvironment, token?: string) =>
    apiPost<EnvironmentResponse>(
      `/api/v1/orgs/${orgSlug}/projects/${projectSlug}/environments`,
      body,
      token,
    ),
};
