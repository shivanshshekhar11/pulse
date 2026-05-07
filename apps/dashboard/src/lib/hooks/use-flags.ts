'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { flagsApi } from '~/lib/api';
import type { CreateFlag, UpdateFlag } from '@pulse-flags/types';
import { toast } from 'sonner';
import { ApiError } from '~/lib/api';
import { FLAG_QUERY_OPTIONS } from '~/lib/query-client';

export function useFlags(orgSlug: string, projectSlug: string, envName: string, limit: number = 50, offset: number = 0) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['flags', orgSlug, projectSlug, envName, limit, offset],
    queryFn: () => flagsApi.list(orgSlug, projectSlug, envName, limit, offset, token),
    enabled: !!token,
    ...FLAG_QUERY_OPTIONS,
  });
}

export function useFlag(orgSlug: string, projectSlug: string, envName: string, flagKey: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['flag', orgSlug, projectSlug, envName, flagKey],
    queryFn: () => flagsApi.get(orgSlug, projectSlug, envName, flagKey, token),
    enabled: !!token && !!flagKey,
    ...FLAG_QUERY_OPTIONS,
  });
}

export function useCreateFlag(orgSlug: string, projectSlug: string, envName: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateFlag) =>
      flagsApi.create(orgSlug, projectSlug, envName, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['flags', orgSlug, projectSlug, envName] });
      toast.success('Flag created');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create flag');
    },
  });
}

export function useUpdateFlag(orgSlug: string, projectSlug: string, envName: string, flagKey: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateFlag) =>
      flagsApi.update(orgSlug, projectSlug, envName, flagKey, body, token),
    onSuccess: (updated) => {
      qc.setQueryData(['flag', orgSlug, projectSlug, envName, flagKey], updated);
      void qc.invalidateQueries({ queryKey: ['flags', orgSlug, projectSlug, envName] });
      toast.success('Flag updated');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('Conflict — flag was modified by someone else. Reload and retry.');
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Failed to update flag');
      }
    },
  });
}

export function useDeleteFlag(orgSlug: string, projectSlug: string, envName: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (flagKey: string) =>
      flagsApi.delete(orgSlug, projectSlug, envName, flagKey, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['flags', orgSlug, projectSlug, envName] });
      toast.success('Flag deleted');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete flag');
    },
  });
}
