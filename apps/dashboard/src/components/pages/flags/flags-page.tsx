'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Tag, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '~/components/ui/page-header';
import { Stats } from './stats';
import { FlagRow } from './flag-row';
import { FlagDialog } from '~/components/dialogs/flag-dialog';
import { LiveUpdatesDialog } from '~/components/dialogs/live-updates-dialog';
import type { FlagResponse } from '@pulse-flags/types';
import { useFlags, useCreateFlag } from '~/lib/hooks/use-flags';
import { useEnvironments } from '~/lib/hooks/use-projects';
import { useSdkStream } from '~/lib/hooks/use-sdk-stream';

function extractTags(flags: FlagResponse[]): string[] {
  const all = new Set<string>();
  flags.forEach((f) => f.tags.forEach((t) => all.add(t)));
  return ['all', ...Array.from(all).sort()];
}

export function FlagsPage({
  orgSlug,
  projectSlug,
  envName,
}: {
  orgSlug: string;
  projectSlug: string;
  envName: string;
}) {
  const [activeTag, setActiveTag] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);

  const { data: flags, isLoading, dataUpdatedAt } = useFlags(orgSlug, projectSlug, envName);
  const { data: environments } = useEnvironments(orgSlug, projectSlug);
  const env = environments?.find((e) => e.name === envName);
  const envId = env?.id;
  const { data: session } = useSession();
  const qc = useQueryClient();
  const createFlag = useCreateFlag(orgSlug, projectSlug, envName);

  const handleStreamEvent = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['flags', orgSlug, projectSlug, envName] });
  }, [qc, orgSlug, projectSlug, envName]);

  const stream = useSdkStream({ envId, onEvent: handleStreamEvent });

  // Fallback polling when live updates are not connected
  useEffect(() => {
    if (!session) return undefined;
    if (stream.status === 'connected' || stream.status === 'reconnecting') return undefined;
    const interval = setInterval(() => {
      void qc.invalidateQueries({ queryKey: ['flags', orgSlug, projectSlug, envName] });
    }, 30_000);
    return () => clearInterval(interval);
  }, [session, orgSlug, projectSlug, envName, qc, stream.status]);

  const tags = flags ? extractTags(flags) : ['all'];
  const filtered = !flags
    ? []
    : activeTag === 'all'
      ? flags
      : flags.filter((f) => f.tags.includes(activeTag));

  const lastSync = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour12: false })
    : '—';

  const sseTone = {
    connected: 'text-primary',
    connecting: 'text-warning',
    reconnecting: 'text-warning',
    error: 'text-destructive',
    'missing-key': 'text-muted-foreground',
    idle: 'text-muted-foreground',
  }[stream.status];

  const sseDot = {
    connected: 'bg-primary',
    connecting: 'bg-warning',
    reconnecting: 'bg-warning',
    error: 'bg-destructive',
    'missing-key': 'bg-dim',
    idle: 'bg-dim',
  }[stream.status];

  const sseLabel = {
    connected: 'connected',
    connecting: 'connecting',
    reconnecting: 'reconnecting',
    error: 'error',
    'missing-key': 'needs key',
    idle: 'idle',
  }[stream.status];

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / ${projectSlug} / ${envName}`}
        title="feature flags"
        command={`pulse list --env=${envName} --watch`}
        meta={<Stats flags={flags ?? []} />}
      >
        <div className="font-mono text-[11.5px] text-muted-foreground text-right mr-3">
          <div className={`flex items-center justify-end gap-1.5 ${sseTone}`}>
            <span className={`size-1.5 rounded-full ${sseDot} ${stream.status === 'connected' ? 'live-dot' : ''}`} />
            live updates {sseLabel}
            {(stream.status === 'missing-key' || stream.status === 'error') && (
              <button
                type="button"
                onClick={() => setLiveOpen(true)}
                className="ml-2 text-[10.5px] text-primary hover:underline"
              >
                set key
              </button>
            )}
          </div>
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTag(t)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-[11.5px] border transition-colors ${
                activeTag === t
                  ? 'bg-primary/15 text-primary border-primary/40'
                  : 'bg-surface-1 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <Tag className="size-3" />
              {t}
            </button>
          ))}
        </div>
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
        <div>flag · key</div>
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
            <span className="font-mono text-[12px]">loading flags…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center font-mono text-[12px] text-dim">
            <span className="text-primary">$</span> no flags found
            {activeTag !== 'all' ? (
              <> · <button type="button" onClick={() => setActiveTag('all')} className="text-primary hover:underline">clear filter</button></>
            ) : (
              <> · <button type="button" onClick={() => setCreateOpen(true)} className="text-primary hover:underline">create one</button></>
            )}
          </div>
        ) : (
          <>
            {filtered.map((flag) => (
              <Link key={flag.key} href={`/${orgSlug}/${projectSlug}/${envName}/flags/${flag.key}`}>
                <FlagRow flag={flag} />
              </Link>
            ))}
            <div className="px-6 py-8 text-center font-mono text-[12px] text-dim">
              <span className="text-primary">$</span> end of stream · {filtered.length} flags
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
      <LiveUpdatesDialog
        open={liveOpen}
        onClose={() => setLiveOpen(false)}
        envId={envId}
        envName={envName}
      />
    </main>
  );
}
