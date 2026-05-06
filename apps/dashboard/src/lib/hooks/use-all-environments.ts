'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { projectsApi } from '~/lib/api/projects';
import type { EnvironmentResponse } from '@pulse-flags/types';

export interface EnvOption {
  id: string;
  name: string;
  projectSlug: string;
  color: string;
}

/**
 * Fetches all environments across all projects for an org.
 * Used by the API key dialog to let users pick a real environment UUID.
 */
export function useAllEnvironments(orgSlug: string) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['all-environments', orgSlug],
    queryFn: async (): Promise<EnvOption[]> => {
      const projects = await projectsApi.list(orgSlug, token);
      const results = await Promise.all(
        projects.map(async (p) => {
          const envs = await projectsApi.listEnvironments(orgSlug, p.slug, token);
          return envs.map((e: EnvironmentResponse) => ({
            id: e.id,
            name: e.name,
            projectSlug: p.slug,
            color: e.color,
          }));
        }),
      );
      return results.flat();
    },
    enabled: !!token,
    staleTime: 60_000,
  });
}
