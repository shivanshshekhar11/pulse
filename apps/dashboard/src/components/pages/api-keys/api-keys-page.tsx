'use client';

import { useState } from 'react';
import { Plus, KeyRound, Trash2 } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { ApiKeyDialog } from '~/components/dialogs/api-key-dialog';
import { ConfirmDialog } from '~/components/dialogs/confirm';

type ApiKey = {
  name: string;
  prefix: string;
  env: { name: string; color: string };
  scopes: ('read' | 'write')[];
  lastUsed: string;
  expires: string;
  revoked?: boolean;
};

const KEYS: ApiKey[] = [
  { name: 'novapay-prod-sdk', prefix: 'ps_live_a3f9', env: { name: 'production', color: '#ff5d5d' }, scopes: ['read'], lastUsed: '8s ago', expires: 'never' },
  { name: 'novapay-staging-sdk', prefix: 'ps_test_b7e1', env: { name: 'staging', color: '#f0b95a' }, scopes: ['read'], lastUsed: '12s ago', expires: 'never' },
  { name: 'ci-deployer', prefix: 'ps_test_c0a9', env: { name: 'staging', color: '#f0b95a' }, scopes: ['read', 'write'], lastUsed: '3m ago', expires: 'Jul 18, 2026' },
  { name: 'mira-local-dev', prefix: 'ps_test_d4f2', env: { name: 'development', color: '#6bc5ff' }, scopes: ['read', 'write'], lastUsed: 'yesterday', expires: 'May 22, 2026' },
  { name: 'old-mobile-build', prefix: 'ps_live_e6b8', env: { name: 'production', color: '#ff5d5d' }, scopes: ['read'], lastUsed: 'Apr 02', expires: 'revoked Apr 04', revoked: true },
];

export function ApiKeysPage({ orgSlug }: { orgSlug: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / api keys`}
        title="api keys"
        command="pulse keys list --org=acme-corp"
      >
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" strokeWidth={2.5} /> generate key
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="rounded-md border border-border bg-surface-1 max-w-[1200px] overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px_140px_140px_60px] gap-4 px-5 py-3 border-b border-border bg-surface-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">
            <div>name · prefix</div>
            <div>environment</div>
            <div>scopes</div>
            <div>last used</div>
            <div>expires</div>
            <div />
          </div>
          {KEYS.map((k) => (
            <div
              key={k.prefix}
              className={`grid grid-cols-[1fr_140px_120px_140px_140px_60px] gap-4 px-5 py-4 items-center border-b border-border last:border-b-0 ${k.revoked ? 'opacity-50' : ''}`}
            >
              <div>
                <div className="text-[14px]">{k.name}</div>
                <div className="font-mono text-[12px] text-muted-foreground mt-1 flex items-center gap-2">
                  <KeyRound className="size-3 text-dim" />
                  <span>{k.prefix}</span>
                  <span className="text-dim">{'•'.repeat(28)}</span>
                </div>
              </div>
              <div className="font-mono text-[12px] flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: k.env.color }} />
                {k.env.name}
              </div>
              <div className="flex items-center gap-1">
                {k.scopes.map((s) => (
                  <span key={s} className={`font-mono text-[10.5px] px-1.5 py-0.5 rounded border ${s === 'write' ? 'text-warning bg-warning/10 border-warning/30' : 'text-info bg-info/10 border-info/30'}`}>
                    {s}
                  </span>
                ))}
              </div>
              <div className="font-mono text-[12px] text-muted-foreground">
                {k.revoked ? <span className="text-destructive">revoked</span> : k.lastUsed}
              </div>
              <div className="font-mono text-[12px] text-muted-foreground">{k.expires}</div>
              <div className="flex justify-end">
                {!k.revoked && (
                  <button
                    type="button"
                    onClick={() => setRevokeTarget(k.name)}
                    className="size-7 grid place-items-center rounded border border-border bg-surface-2 text-destructive hover:bg-destructive/10"
                    aria-label="Revoke key"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="font-mono text-[11.5px] text-dim mt-4 max-w-[1200px]">
          // keys are environment-scoped · prod keys cannot read non-prod data ·
          format: ps_(live|test)_&lt;40 hex chars&gt;
        </p>
      </div>

      <ApiKeyDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ConfirmDialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title={`Revoke "${revokeTarget}"`}
        description="Any SDK or integration using this key will immediately lose access."
        confirmLabel="revoke key"
        variant="danger"
        consequences={['Immediate loss of access for all consumers', 'Cannot be undone — generate a new key to replace it']}
      />
    </main>
  );
}
