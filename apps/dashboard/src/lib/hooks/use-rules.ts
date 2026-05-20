'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { rulesApi } from '~/lib/api';
import type { CreateRule, UpdateRule, ReorderRules } from '@pulse-flags/types';
import { toast } from 'sonner';
import { ApiError } from '~/lib/api';

export function useRules(o: string, p: string, e: string, fk: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['rules', o, p, e, fk],
    queryFn: () => rulesApi.list(o, p, e, fk, token),
    enabled: !!token && !!fk,
  });
}

export function useCreateRule(o: string, p: string, e: string, fk: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateRule) => rulesApi.create(o, p, e, fk, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rules', o, p, e, fk] });
      void qc.invalidateQueries({ queryKey: ['flag', o, p, e, fk] });
      toast.success('Rule added');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add rule');
    },
  });
}

export function useUpdateRule(o: string, p: string, e: string, fk: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, body }: { ruleId: string; body: UpdateRule }) =>
      rulesApi.update(o, p, e, fk, ruleId, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rules', o, p, e, fk] });
      void qc.invalidateQueries({ queryKey: ['flag', o, p, e, fk] });
      toast.success('Rule updated');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update rule');
    },
  });
}

export function useDeleteRule(o: string, p: string, e: string, fk: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => rulesApi.delete(o, p, e, fk, ruleId, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rules', o, p, e, fk] });
      void qc.invalidateQueries({ queryKey: ['flag', o, p, e, fk] });
      toast.success('Rule deleted');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete rule');
    },
  });
}

export function useReorderRules(o: string, p: string, e: string, fk: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: ReorderRules) => rulesApi.reorder(o, p, e, fk, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rules', o, p, e, fk] });
      void qc.invalidateQueries({ queryKey: ['flag', o, p, e, fk] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to reorder rules');
    },
  });
}
