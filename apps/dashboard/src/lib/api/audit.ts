import type { AuditLogResponse } from '@pulse-flags/types';
import { apiGet } from './client';

export interface AuditLogPage {
  items: AuditLogResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLogFilters {
  action?: string;
  resourceType?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}

export const auditApi = {
  list: (orgSlug: string, filters: AuditLogFilters = {}, token?: string) => {
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.resourceType) params.set('resourceType', filters.resourceType);
    if (filters.actorId) params.set('actorId', filters.actorId);
    if (filters.limit !== undefined) params.set('limit', String(filters.limit));
    if (filters.offset !== undefined) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return apiGet<AuditLogPage>(
      `/api/v1/orgs/${orgSlug}/audit-logs${qs ? `?${qs}` : ''}`,
      token,
    );
  },
};
