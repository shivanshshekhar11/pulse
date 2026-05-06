'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { segmentsApi } from '~/lib/api';
import type { CreateSegment, UpdateSegment } from '@pulse-flags/types';
import { toast } from 'sonner';
import { ApiError } from '~/lib/api';

export function useSegments(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['segments', orgSlug],
    queryFn: () => segmentsApi.list(orgSlug, token),
    enabled: !!token,
  });
}

export function useCreateSegment(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateSegment) => segmentsApi.create(orgSlug, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['segments', orgSlug] });
      toast.success('Segment created');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create segment');
    },
  });
}

export function useUpdateSegment(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ segmentId, body }: { segmentId: string; body: UpdateSegment }) =>
      segmentsApi.update(orgSlug, segmentId, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['segments', orgSlug] });
      toast.success('Segment updated');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update segment');
    },
  });
}

export function useDeleteSegment(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (segmentId: string) => segmentsApi.delete(orgSlug, segmentId, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['segments', orgSlug] });
      toast.success('Segment deleted');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete segment');
    },
  });
}
