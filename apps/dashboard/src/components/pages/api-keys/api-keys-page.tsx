'use client';

import { useState } from 'react';
import { Plus, KeyRound, Trash2, Loader2 } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { ConfirmDialog } from '~/components/dialogs/confirm';
import { ApiKeyDialog } from '~/components/dialogs/api-key-dialog';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '~/lib/hooks/use-api-keys';
import { useAllEnvironments } from '~/lib/hooks/use-all-environments';
import type { ApiKeySafeResponse, ApiKeyCreatedResponse } from '@pulse-flags/types';

function formatExpiry(date: string | Date | null | undefined): string {
  if (!date) return 'never';
  return new Date(date as string | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatLastUsed(date: string | Date | null | undefined): string {
  if (!date) return 'never';
  const ms = Date.now() - new Date(date as string | Date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date as string | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const envColor = (prefix: string) =>
  prefix.startsWith('ps_live') ? '#ff5d5d' : prefix.startsWith('ps_test') ? '#f0b95a' : '#6bc5ff';
const envLabel = (prefix: string) =>
  prefix.startsWith('ps_live') ? 'production' : 'non-production';

export function ApiKeysPage({ orgSlug }: { orgSlug: string }) {
  const { data: keys, isLoading } = useApiKeys(orgSlug);
  const createKey = useCreateApiKey(orgSlug);
  const revokeKey = useRevokeApiKey(orgSlug);
  const { data: allEnvs } = useAllEnvironments(orgSlug);

  const [createOpen, setCreateOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeySafeResponse | null>(null);

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader crumb={`${orgSlug} / api keys`} title="api keys" command="pulse keys list --org=acme-corp">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" strokeWidth={2.5} /> generate key
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="font-mono text-[12px]">loading keys…</span>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-surface-1 max-w-[1200px] overflow-hidden">
            <div className="grid grid-cols-[1fr_140px_120px_140px_140px_60px] gap-4 px-5 py-3 border-b border-border bg-surface-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">
              <div>name · prefix</div>
              <div>environment</div>
              <div>scopes</div>
              <div>last used</div>
              <div>expires</div>
              <div />
            </div>
            {(keys ?? []).length === 0 ? (
              <div className="px-5 py-10 text-center font-mono text-[12px] text-dim">
                // no API keys yet ·{' '}
                <button type="button" onClick={() => setCreateOpen(true)} className="text-primary hover:underline">generate one</button>
              </div>
            ) : (
              (keys ?? []).map((k) => (
                <div key={k.id} className="grid grid-cols-[1fr_140px_120px_140px_140px_60px] gap-4 px-5 py-4 items-center border-b border-border last:border-b-0">
                  <div>
                    <div className="text-[14px]">{k.name}</div>
                    <div className="font-mono text-[12px] text-muted-foreground mt-1 flex items-center gap-2">
                      <KeyRound className="size-3 text-dim" />
                      <span>{k.keyPrefix}</span>
                      <span className="text-dim">{'•'.repeat(28)}</span>
                    </div>
                  </div>
                  <div className="font-mono text-[12px] flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: envColor(k.keyPrefix) }} />
                    {envLabel(k.keyPrefix)}
                  </div>
                  <div className="flex items-center gap-1">
                    {k.scopes.map((s) => (
                      <span key={s} className={`font-mono text-[10.5px] px-1.5 py-0.5 rounded border ${s === 'write' ? 'text-warning bg-warning/10 border-warning/30' : 'text-info bg-info/10 border-info/30'}`}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="font-mono text-[12px] text-muted-foreground">{formatLastUsed(k.lastUsedAt)}</div>
                  <div className="font-mono text-[12px] text-muted-foreground">{formatExpiry(k.expiresAt)}</div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setRevokeTarget(k)} className="size-7 grid place-items-center rounded border border-border bg-surface-2 text-destructive hover:bg-destructive/10" aria-label="Revoke key">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <p className="font-mono text-[11.5px] text-dim mt-4 max-w-[1200px]">
          // keys are environment-scoped · prod keys cannot read non-prod data · format: ps_(live|test)_&lt;40 hex chars&gt;
        </p>
      </div>

      <ApiKeyDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setGeneratedKey(null); }}
        loading={createKey.isPending}
        generatedKey={generatedKey ?? undefined}
        onDismissKey={() => setGeneratedKey(null)}
        environments={allEnvs}
        onSubmit={(values) => {
          createKey.mutate(
            {
              name: values.name,
              environmentId: values.environmentId,
              scopes: values.scopes,
              expiresAt: values.expiresAt ?? undefined,
            },
            {
              onSuccess: (data: ApiKeyCreatedResponse) => {
                setGeneratedKey(data.rawKey);
              },
            },
          );
        }}
      />

      <ConfirmDialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title={`Revoke "${revokeTarget?.name}"`}
        description="Any SDK or integration using this key will immediately lose access."
        confirmLabel="revoke key"
        variant="danger"
        onConfirm={() => revokeTarget && revokeKey.mutate(revokeTarget.id)}
        consequences={['Immediate loss of access for all consumers', 'Cannot be undone — generate a new key to replace it']}
      />
    </main>
  );
}
