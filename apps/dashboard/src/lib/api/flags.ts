import type { FlagResponse, CreateFlag, UpdateFlag } from '@pulse-flags/types';
import { apiGet, apiPost, apiPatch, apiDelete } from './client';

const base = (o: string, p: string, e: string) =>
  `/api/v1/orgs/${o}/projects/${p}/envs/${e}/flags`;

export const flagsApi = {
  list: (orgSlug: string, projectSlug: string, envName: string, limit: number, offset: number, token?: string) =>
    apiGet<{ items: FlagResponse[]; total: number; limit: number; offset: number }>(
      `${base(orgSlug, projectSlug, envName)}?limit=${limit}&offset=${offset}`,
      token
    ),

  get: (orgSlug: string, projectSlug: string, envName: string, flagKey: string, token?: string) =>
    apiGet<FlagResponse>(`${base(orgSlug, projectSlug, envName)}/${flagKey}`, token),

  create: (orgSlug: string, projectSlug: string, envName: string, body: CreateFlag, token?: string) =>
    apiPost<FlagResponse>(base(orgSlug, projectSlug, envName), body, token),

  update: (orgSlug: string, projectSlug: string, envName: string, flagKey: string, body: UpdateFlag, token?: string) =>
    apiPatch<FlagResponse>(`${base(orgSlug, projectSlug, envName)}/${flagKey}`, body, token),

  delete: (orgSlug: string, projectSlug: string, envName: string, flagKey: string, token?: string) =>
    apiDelete(`${base(orgSlug, projectSlug, envName)}/${flagKey}`, token),
};
