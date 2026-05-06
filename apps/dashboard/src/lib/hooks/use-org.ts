'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { orgsApi } from '~/lib/api';
import type {
  CreateOrganization,
  UpdateOrganization,
  InviteMember,
  UpdateMemberRole,
} from '@pulse-flags/types';
import { toast } from 'sonner';
import { ApiError } from '~/lib/api';

export function useOrg(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['org', orgSlug],
    queryFn: () => orgsApi.get(orgSlug, token),
    enabled: !!token,
  });
}

export function useUpdateOrg(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateOrganization) => orgsApi.update(orgSlug, body, token),
    onSuccess: (updated) => {
      qc.setQueryData(['org', orgSlug], updated);
      toast.success('Organization updated');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update organization');
    },
  });
}

export function useCreateOrg() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateOrganization) => orgsApi.create(body, token),
    onSuccess: (org) => {
      void qc.invalidateQueries({ queryKey: ['user-orgs'] });
      qc.setQueryData(['org', org.slug], org);
      toast.success('Organization created');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create organization');
    },
  });
}

export function useDeleteOrg(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => orgsApi.delete(orgSlug, token),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['org', orgSlug] });
      void qc.invalidateQueries({ queryKey: ['user-orgs'] });
      void qc.invalidateQueries({ queryKey: ['projects', orgSlug] });
      toast.success('Organization deleted');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete organization');
    },
  });
}

export function useMembers(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['members', orgSlug],
    queryFn: () => orgsApi.listMembers(orgSlug, token),
    enabled: !!token,
  });
}

export function useInviteMember(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: InviteMember) => orgsApi.inviteMember(orgSlug, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members', orgSlug] });
      toast.success('Member invited');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to invite member');
    },
  });
}

export function useUpdateMemberRole(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UpdateMemberRole }) =>
      orgsApi.updateMemberRole(orgSlug, userId, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members', orgSlug] });
      toast.success('Role updated');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update role');
    },
  });
}

export function useRemoveMember(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => orgsApi.removeMember(orgSlug, userId, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['members', orgSlug] });
      toast.success('Member removed');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to remove member');
    },
  });
}
