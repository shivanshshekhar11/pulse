import type {
  OrganizationResponse,
  CreateOrganization,
  OrgMemberResponse,
  UpdateOrganization,
  InviteMember,
  UpdateMemberRole,
} from '@pulse-flags/types';
import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export const orgsApi = {
  create: (body: CreateOrganization, token?: string) =>
    apiPost<OrganizationResponse>('/api/v1/orgs', body, token),

  get: (orgSlug: string, token?: string) =>
    apiGet<OrganizationResponse>(`/api/v1/orgs/${orgSlug}`, token),

  update: (orgSlug: string, body: UpdateOrganization, token?: string) =>
    apiPatch<OrganizationResponse>(`/api/v1/orgs/${orgSlug}`, body, token),

  delete: (orgSlug: string, token?: string) =>
    apiDelete(`/api/v1/orgs/${orgSlug}`, token),

  listMembers: (orgSlug: string, token?: string) =>
    apiGet<OrgMemberResponse[]>(`/api/v1/orgs/${orgSlug}/members`, token),

  inviteMember: (orgSlug: string, body: InviteMember, token?: string) =>
    apiPost<OrgMemberResponse>(`/api/v1/orgs/${orgSlug}/members`, body, token),

  updateMemberRole: (orgSlug: string, userId: string, body: UpdateMemberRole, token?: string) =>
    apiPatch<OrgMemberResponse>(`/api/v1/orgs/${orgSlug}/members/${userId}`, body, token),

  removeMember: (orgSlug: string, userId: string, token?: string) =>
    apiDelete(`/api/v1/orgs/${orgSlug}/members/${userId}`, token),
};
