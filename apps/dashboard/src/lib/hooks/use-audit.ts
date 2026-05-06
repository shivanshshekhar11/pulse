'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { auditApi } from '~/lib/api';
import type { AuditLogFilters } from '~/lib/api';

export function useAuditLogs(orgSlug: string, filters: AuditLogFilters = {}) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string })?.accessToken;

  return useQuery({
    queryKey: ['audit', orgSlug, filters],
    queryFn: () => auditApi.list(orgSlug, filters, token),
    enabled: !!token,
    // Audit logs are append-only — 60s stale time is fine
    staleTime: 60_000,
  });
}
