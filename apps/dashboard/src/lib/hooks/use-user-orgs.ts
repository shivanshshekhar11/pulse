'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { authApi } from '~/lib/api';

export function useUserOrgs() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['user-orgs'],
    queryFn: () => authApi.listOrgs(token),
    enabled: !!token,
  });
}
