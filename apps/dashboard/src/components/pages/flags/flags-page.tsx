'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '~/components/ui/page-header';
import { Stats } from './stats';
import { FlagRow } from './flag-row';
import { FlagDialog } from '~/components/dialogs/flag-dialog';
import { useFlags, useCreateFlag } from '~/lib/hooks/use-flags';

export function FlagsPage({
  orgSlug,
  projectSlug,
  envName,
}: {
  orgSlug: string;
  projectSlug: string;
  envName: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const {
    data: flagData,
    isLoading,
    dataUpdatedAt,
  } = useFlags(orgSlug, projectSlug, envName, pageSize, (page - 1) * pageSize);
  
  const { data: session } = useSession();
  const qc = useQueryClient();
  const createFlag = useCreateFlag(orgSlug, projectSlug, envName);

  // Poll for updates as fallback, but use SSE for real-time
  useEffect(() => {
    if (!session) return undefined;
    const token = (session as { accessToken?: string }).accessToken;
    if (!token) return undefined;

    const streamUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1/orgs/${orgSlug}/projects/${projectSlug}/envs/${envName}/flags/stream?token=${token}`;
    
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let attempt = 0;

    const connect = () => {
      es = new EventSource(streamUrl);

      es.onopen = () => {
        attempt = 0;
      };

      es.addEventListener('flag:updated', () => {
        void qc.invalidateQueries({ queryKey: ['flags', orgSlug, projectSlug, envName] });
      });

      es.onerror = () => {
        if (es) {
          es.close();
          es = null;
        }
        const delay = Math.min(1000 * 2 ** attempt, 30000);
        attempt++;
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      if (es) es.close();
      clearTimeout(reconnectTimer);
    };
  }, [session, orgSlug, projectSlug, envName, qc]);

  const flags = flagData?.items ?? [];
  const total = flagData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const rangeStart = total === 0 ? 0 : startIndex + 1;
  const rangeEnd = endIndex;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const lastSync = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
    : 'â€”';

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / ${projectSlug} / ${envName}`}
        title="feature flags"
        command={`pulse list --env=${envName} --watch`}
        meta={<Stats flags={flags} />}
      >
        <div className="font-mono text-[11.5px] text-muted-foreground text-right mr-3">
          <div>last sync <span className="text-foreground">{lastSync}</span></div>
          <div className="text-dim mt-1">{new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" strokeWidth={2.5} /> new flag
        </button>
      </PageHeader>

      {/* Tag filters + toolbar */}
      <div className="px-10 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => void qc.invalidateQueries({ queryKey: ['flags', orgSlug, projectSlug, envName] })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[11.5px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="size-3.5" /> sync
        </button>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[28px_1fr_140px_180px_200px_64px] gap-6 px-6 py-3 border-b border-border bg-surface-0/50 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">
        <div />
        <div>flag Â· key</div>
        <div>type</div>
        <div>status</div>
        <div>updated</div>
        <div />
      </div>

      {/* Flag rows */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="font-mono text-[12px]">loading flagsâ€¦</span>
          </div>
        ) : flags.length === 0 ? (
          <div className="px-6 py-16 text-center font-mono text-[12px] text-dim">
            <span className="text-primary">$</span> no flags found
            <> Â· <button type="button" onClick={() => setCreateOpen(true)} className="text-primary hover:underline">create one</button></>
          </div>
        ) : (
          <>
            {flags.map((flag) => (
              <Link key={flag.key} href={`/${orgSlug}/${projectSlug}/${envName}/flags/${flag.key}`}>
                <FlagRow flag={flag} />
              </Link>
            ))}
            <div className="px-6 py-6 flex items-center justify-between border-t border-border bg-surface-0/40">
              <div className="font-mono text-[12px] text-dim">
                <span className="text-primary">$</span> showing {rangeStart}-{rangeEnd} of {total} flags
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1.5 rounded font-mono text-[11.5px] border border-border bg-surface-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  prev
                </button>
                <span className="font-mono text-[11px] text-dim">
                  page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 rounded font-mono text-[11.5px] border border-border bg-surface-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <FlagDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        loading={createFlag.isPending}
        onSubmit={(values) => {
          createFlag.mutate(
            {
              key: values.key,
              name: values.name,
              type: values.type,
              description: values.description,
              tags: values.tags,
              defaultValue: values.defaultValue,
              enabled: false,
            },
            { onSuccess: () => setCreateOpen(false) },
          );
        }}
      />
    </main>
  );
}
