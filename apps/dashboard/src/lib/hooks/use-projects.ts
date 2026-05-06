'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { projectsApi } from '~/lib/api';
import type { CreateProject, CreateEnvironment, UpdateProject } from '@pulse-flags/types';
import { toast } from 'sonner';
import { ApiError } from '~/lib/api';

export function useProjects(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['projects', orgSlug],
    queryFn: () => projectsApi.list(orgSlug, token),
    enabled: !!token,
  });
}

export function useProject(orgSlug: string, projectSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['project', orgSlug, projectSlug],
    queryFn: () => projectsApi.get(orgSlug, projectSlug, token),
    enabled: !!token && !!projectSlug,
  });
}

export function useEnvironments(orgSlug: string, projectSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['environments', orgSlug, projectSlug],
    queryFn: () => projectsApi.listEnvironments(orgSlug, projectSlug, token),
    enabled: !!token && !!projectSlug,
  });
}

export function useCreateProject(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProject) => projectsApi.create(orgSlug, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects', orgSlug] });
      toast.success('Project created');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create project');
    },
  });
}

export function useUpdateProject(orgSlug: string, projectSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateProject) =>
      projectsApi.update(orgSlug, projectSlug, body, token),
    onSuccess: (project) => {
      qc.setQueryData(['project', orgSlug, projectSlug], project);
      void qc.invalidateQueries({ queryKey: ['projects', orgSlug] });
      toast.success('Project updated');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update project');
    },
  });
}

export function useDeleteProject(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (projectSlug: string) => projectsApi.delete(orgSlug, projectSlug, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects', orgSlug] });
      toast.success('Project deleted');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete project');
    },
  });
}

export function useCreateEnvironment(orgSlug: string, projectSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateEnvironment) =>
      projectsApi.createEnvironment(orgSlug, projectSlug, body, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['environments', orgSlug, projectSlug] });
      toast.success('Environment created');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create environment');
    },
  });
}
