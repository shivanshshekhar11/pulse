'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiKeysApi } from '~/lib/api';
import type { CreateApiKey } from '@pulse-flags/types';
import { toast } from 'sonner';
import { ApiError } from '~/lib/api';

export function useApiKeys(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['api-keys', orgSlug],
    queryFn: () => apiKeysApi.list(orgSlug, token),
    enabled: !!token,
  });
}

export function useCreateApiKey(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateApiKey) => apiKeysApi.create(orgSlug, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['api-keys', orgSlug] });
      // Don't toast here — the caller shows the one-time reveal dialog
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to generate key');
    },
  });
}

export function useRevokeApiKey(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (keyId: string) => apiKeysApi.revoke(orgSlug, keyId, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['api-keys', orgSlug] });
      toast.success('Key revoked');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to revoke key');
    },
  });
}
