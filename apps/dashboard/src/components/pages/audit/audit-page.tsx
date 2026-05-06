'use client';

import { useState } from 'react';
import { Filter, GitCommit, Flag, Layers, KeyRound, Users, Settings, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { useAuditLogs } from '~/lib/hooks/use-audit';
import type { AuditLogResponse } from '@pulse-flags/types';
import { Input } from '~/components/primitives/form';

const RESOURCE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  flag: Flag, rule: Flag, segment: Layers, member: Users, apikey: KeyRound,
  environment: Settings, project: Settings, org: Settings,
};

const ACTION_COLOR: Record<string, string> = {
  'flag.created': 'text-primary', 'flag.updated': 'text-info', 'flag.toggled': 'text-warning',
  'flag.deleted': 'text-destructive', 'rule.created': 'text-primary', 'rule.deleted': 'text-destructive',
  'segment.created': 'text-primary', 'segment.updated': 'text-info', 'segment.deleted': 'text-destructive',
  'member.invited': 'text-primary', 'member.removed': 'text-destructive', 'member.updated': 'text-warning',
  'apikey.created': 'text-primary', 'apikey.revoked': 'text-destructive',
  'project.created': 'text-primary', 'environment.created': 'text-primary',
};

const LIMIT = 20;

function formatRelative(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AuditPage({ orgSlug }: { orgSlug: string }) {
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');

  const { data, isLoading, isFetching, dataUpdatedAt, refetch } = useAuditLogs(orgSlug, {
    action: actionFilter || undefined,
    resourceType: resourceFilter || undefined,
    actorId: actorFilter || undefined,
    limit: LIMIT,
    offset,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader crumb={`${orgSlug} / audit log`} title="audit log" command="pulse audit tail --follow">
      </PageHeader>

      {/* Filters */}
      <div className="px-10 py-4 border-b border-border flex items-center gap-2 flex-wrap">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
          className="font-mono text-[11.5px] px-2.5 py-1.5 rounded bg-surface-1 border border-border text-muted-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="">action: all</option>
          <option value="flag.created">flag.created</option>
          <option value="flag.updated">flag.updated</option>
          <option value="flag.deleted">flag.deleted</option>
          <option value="rule.created">rule.created</option>
          <option value="segment.created">segment.created</option>
          <option value="member.invited">member.invited</option>
          <option value="apikey.created">apikey.created</option>
          <option value="apikey.revoked">apikey.revoked</option>
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setOffset(0); }}
          className="font-mono text-[11.5px] px-2.5 py-1.5 rounded bg-surface-1 border border-border text-muted-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="">resource: all</option>
          <option value="flag">flag</option>
          <option value="rule">rule</option>
          <option value="segment">segment</option>
          <option value="member">member</option>
          <option value="apikey">apikey</option>
          <option value="project">project</option>
          <option value="environment">environment</option>
        </select>
        <Input
          mono
          placeholder="actor id"
          value={actorFilter}
          onChange={(e) => { setActorFilter(e.target.value); setOffset(0); }}
          className="w-[180px]"
        />
        {(actionFilter || resourceFilter || actorFilter) && (
          <button type="button" onClick={() => { setActionFilter(''); setResourceFilter(''); setActorFilter(''); setOffset(0); }} className="font-mono text-[11.5px] px-2.5 py-1.5 rounded bg-surface-1 border border-border text-primary hover:text-primary/80">
            <Filter className="size-3 inline mr-1" /> clear
          </button>
        )}
        <div className="flex-1" />
        <span className="font-mono text-[11.5px] text-muted-foreground">
          <span className="text-foreground">{total}</span> events
        </span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="font-mono text-[11.5px] px-2.5 py-1.5 rounded bg-surface-1 border border-border text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <RefreshCw className={`size-3 ${isFetching ? 'animate-spin' : ''}`} /> refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="font-mono text-[12px]">loading audit log…</span>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-border bg-surface-1 max-w-[1200px] overflow-hidden">
              <div className="grid grid-cols-[160px_1fr_180px_140px_100px] gap-4 px-5 py-3 border-b border-border bg-surface-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">
                <div>actor</div>
                <div>action · resource</div>
                <div>change</div>
                <div>when</div>
                <div>id</div>
              </div>
              {items.length === 0 ? (
                <div className="px-5 py-10 text-center font-mono text-[12px] text-dim">// no events found</div>
              ) : (
                items.map((e) => <AuditRow key={e.id} event={e} />)
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 max-w-[1200px] font-mono text-[11.5px] text-muted-foreground">
                <span>page {currentPage} of {totalPages} · {total} total</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-border bg-surface-1 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="size-3.5" /> prev
                  </button>
                  <button
                    type="button"
                    disabled={offset + LIMIT >= total}
                    onClick={() => setOffset(offset + LIMIT)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-border bg-surface-1 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    next <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {dataUpdatedAt ? (
              <p className="font-mono text-[11px] text-muted-foreground mt-2">
                last updated {new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })}
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function AuditRow({ event: e }: { event: AuditLogResponse }) {
  const Icon = RESOURCE_ICON[e.resourceType] ?? Flag;
  const oldVal = e.oldValue as Record<string, unknown> | null;
  const newVal = e.newValue as Record<string, unknown> | null;

  // Try to extract a meaningful diff label
  const diffFrom = oldVal?.enabled !== undefined ? String(oldVal.enabled) : oldVal?.name ? String(oldVal.name) : null;
  const diffTo = newVal?.enabled !== undefined ? String(newVal.enabled) : newVal?.name ? String(newVal.name) : null;

  return (
    <div className="grid grid-cols-[160px_1fr_180px_140px_100px] gap-4 px-5 py-3.5 items-center border-b border-border last:border-b-0 hover:bg-surface-2/40 font-mono text-[12px]">
      <div className="flex items-center gap-2 min-w-0">
        <div className="size-6 rounded grid place-items-center text-[10px] uppercase bg-surface-2 border border-border shrink-0">
          {e.actorId ? e.actorId.slice(0, 2) : <KeyRound className="size-3" />}
        </div>
        <span className="truncate text-muted-foreground">{e.actorId?.slice(0, 8) ?? 'system'}</span>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <Icon className="size-3.5 text-dim shrink-0" />
        <span className={ACTION_COLOR[e.action] ?? 'text-foreground'}>{e.action}</span>
        <span className="text-dim">·</span>
        <span className="truncate text-foreground">{e.resourceId?.slice(0, 8) ?? '—'}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {diffFrom && diffTo ? (
          <>
            <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10.5px]">{diffFrom}</span>
            <span className="text-dim">→</span>
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10.5px]">{diffTo}</span>
          </>
        ) : (
          <span className="text-dim">—</span>
        )}
      </div>

      <span className="text-muted-foreground">{formatRelative(e.createdAt as string | Date)}</span>

      <div className="flex items-center gap-1.5 text-muted-foreground">
        <GitCommit className="size-3 text-dim" />
        <span>{e.id.slice(0, 7)}</span>
      </div>
    </div>
  );
}
