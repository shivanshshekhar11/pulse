'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { authApi, ApiError } from '~/lib/api';
import type { UpdateUser, ChangePassword } from '@pulse-flags/types';
import { toast } from 'sonner';

export function useProfile() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(token),
    enabled: !!token,
  });
}

export function useUpdateProfile() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateUser) => authApi.updateProfile(body, token),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user);
      toast.success('Profile updated');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update profile');
    },
  });
}

export function useChangePassword() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useMutation({
    mutationFn: (body: ChangePassword) => authApi.changePassword(body, token),
    onSuccess: () => {
      toast.success('Password updated');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update password');
    },
  });
}
