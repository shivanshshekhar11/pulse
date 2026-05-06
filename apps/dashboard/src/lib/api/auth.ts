import type { UserResponse, UserOrgResponse, UpdateUser, ChangePassword } from '@pulse-flags/types';
import { apiGet, apiPatch, apiPost } from './client';

export const authApi = {
  me: (token?: string) => apiGet<UserResponse>('/api/v1/auth/me', token),
  updateProfile: (body: UpdateUser, token?: string) =>
    apiPatch<UserResponse>('/api/v1/auth/me', body, token),
  changePassword: (body: ChangePassword, token?: string) =>
    apiPost<{ message: string }>('/api/v1/auth/me/password', body, token),
  listOrgs: (token?: string) => apiGet<UserOrgResponse[]>('/api/v1/auth/me/orgs', token),
};
