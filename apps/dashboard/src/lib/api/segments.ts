import type { SegmentResponse, CreateSegment, UpdateSegment } from '@pulse-flags/types';
import { apiGet, apiPost, apiPatch, apiDelete } from './client';

const base = (orgSlug: string) => `/api/v1/orgs/${orgSlug}/segments`;

export const segmentsApi = {
  list: (orgSlug: string, limit: number, offset: number, token?: string) =>
    apiGet<{ items: SegmentResponse[]; total: number; limit: number; offset: number }>(
      `${base(orgSlug)}?limit=${limit}&offset=${offset}`,
      token
    ),

  get: (orgSlug: string, segmentId: string, token?: string) =>
    apiGet<SegmentResponse>(`${base(orgSlug)}/${segmentId}`, token),

  create: (orgSlug: string, body: CreateSegment, token?: string) =>
    apiPost<SegmentResponse>(base(orgSlug), body, token),

  update: (orgSlug: string, segmentId: string, body: UpdateSegment, token?: string) =>
    apiPatch<SegmentResponse>(`${base(orgSlug)}/${segmentId}`, body, token),

  delete: (orgSlug: string, segmentId: string, token?: string) =>
    apiDelete(`${base(orgSlug)}/${segmentId}`, token),
};
