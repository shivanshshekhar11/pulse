import type { RuleResponse, CreateRule, UpdateRule, ReorderRules } from '@pulse-flags/types';
import { apiGet, apiPost, apiPatch, apiDelete } from './client';

const base = (o: string, p: string, e: string, fk: string) =>
  `/api/v1/orgs/${o}/projects/${p}/envs/${e}/flags/${fk}/rules`;

export const rulesApi = {
  list: (o: string, p: string, e: string, fk: string, token?: string) =>
    apiGet<RuleResponse[]>(base(o, p, e, fk), token),

  create: (o: string, p: string, e: string, fk: string, body: CreateRule, token?: string) =>
    apiPost<RuleResponse>(base(o, p, e, fk), body, token),

  update: (o: string, p: string, e: string, fk: string, ruleId: string, body: UpdateRule, token?: string) =>
    apiPatch<RuleResponse>(`${base(o, p, e, fk)}/${ruleId}`, body, token),

  delete: (o: string, p: string, e: string, fk: string, ruleId: string, token?: string) =>
    apiDelete(`${base(o, p, e, fk)}/${ruleId}`, token),

  reorder: (o: string, p: string, e: string, fk: string, body: ReorderRules, token?: string) =>
    apiPost<{ success: boolean }>(`${base(o, p, e, fk)}/reorder`, body, token),
};
