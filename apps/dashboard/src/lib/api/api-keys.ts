import type {
  ApiKeySafeResponse,
  ApiKeyCreatedResponse,
  CreateApiKey,
} from '@pulse-flags/types';
import { apiGet, apiPost, apiDelete } from './client';

const base = (orgSlug: string) => `/api/v1/orgs/${orgSlug}/api-keys`;

export const apiKeysApi = {
  list: (orgSlug: string, token?: string) =>
    apiGet<ApiKeySafeResponse[]>(base(orgSlug), token),

  create: (orgSlug: string, body: CreateApiKey, token?: string) =>
    apiPost<ApiKeyCreatedResponse>(base(orgSlug), body, token),

  revoke: (orgSlug: string, keyId: string, token?: string) =>
    apiDelete(`${base(orgSlug)}/${keyId}`, token),
};
