'use client';

import { Filter, Download, GitCommit, Flag, Layers, KeyRound, Users, Settings } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';

type Action =
  | 'flag.created' | 'flag.updated' | 'flag.deleted' | 'flag.toggled'
  | 'rule.created' | 'rule.updated' | 'rule.deleted'
  | 'segment.created' | 'segment.updated'
  | 'member.invited' | 'member.removed' | 'member.role_changed'
  | 'apikey.created' | 'apikey.revoked'
  | 'env.created';

const RESOURCE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  flag: Flag, rule: Flag, segment: Layers, member: Users, apikey: KeyRound, env: Settings,
};

const ACTION_COLOR: Partial<Record<Action, string>> = {
  'flag.created': 'text-primary', 'flag.updated': 'text-info', 'flag.toggled': 'text-warning',
  'flag.deleted': 'text-destructive', 'rule.created': 'text-primary', 'rule.deleted': 'text-destructive',
  'segment.updated': 'text-info', 'member.invited': 'text-primary', 'member.removed': 'text-destructive',
  'member.role_changed': 'text-warning', 'apikey.created': 'text-primary', 'apikey.revoked': 'text-destructive',
  'env.created': 'text-primary',
};

const EVENTS = [
  { actor: 'jordan.p', action: 'flag.toggled' as Action, resource: 'new_dashboard_v2', resourceType: 'flag', at: '12m ago', ip: '10.42.1.7', hash: 'a3f9c12', diff: { from: '25%', to: '40%' } },
  { actor: 'mira.k', action: 'rule.created' as Action, resource: 'country_in_us_ca_uk', resourceType: 'rule', at: '2h ago', ip: '10.42.1.22', hash: 'b7e1d04' },
  { actor: 'ci-deployer', isKey: true, action: 'flag.updated' as Action, resource: 'rate_limit_per_min', resourceType: 'flag', at: '3h ago', ip: '52.14.88.1', hash: 'f1c8a44' },
  { actor: 'sai.r', action: 'apikey.created' as Action, resource: 'ci-deployer', resourceType: 'apikey', at: 'yesterday', ip: '10.42.1.5', hash: 'd4f2e51' },
  { actor: 'jordan.p', action: 'member.invited' as Action, resource: 'alex.t@acme.com', resourceType: 'member', at: 'yesterday', ip: '10.42.1.7', hash: 'e8b3a76' },
  { actor: 'system', action: 'flag.updated' as Action, resource: 'new_homepage_hero', resourceType: 'flag', at: 'Apr 30', ip: '—', hash: 'c0a9b88', diff: { from: 'enabled', to: 'disabled' } },
  { actor: 'mira.k', action: 'segment.updated' as Action, resource: 'Internal_Beta', resourceType: 'segment', at: 'Apr 29', ip: '10.42.1.22', hash: '9a7f231' },
  { actor: 'jordan.p', action: 'member.role_changed' as Action, resource: 'lena.f@acme.com', resourceType: 'member', at: 'Apr 28', ip: '10.42.1.7', hash: '33e9112', diff: { from: 'viewer', to: 'member' } },
  { actor: 'sai.r', action: 'env.created' as Action, resource: 'performance-test', resourceType: 'env', at: 'Apr 26', ip: '10.42.1.5', hash: '55c2db7' },
  { actor: 'mira.k', action: 'apikey.revoked' as Action, resource: 'old-mobile-build', resourceType: 'apikey', at: 'Apr 04', ip: '10.42.1.22', hash: '66b8a99' },
];

export function AuditPage({ orgSlug }: { orgSlug: string }) {
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / audit log`}
        title="audit log"
        command="pulse audit tail --follow"
      >
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
        >
          <Download className="size-3.5" /> export csv
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="px-10 py-4 border-b border-border flex items-center gap-2 flex-wrap">
        {['action: all', 'resource: all', 'actor: all', 'last 7 days'].map((label) => (
          <button
            key={label}
            type="button"
            className="font-mono text-[11.5px] px-2.5 py-1.5 rounded bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded font-mono text-[11.5px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
        >
          <Filter className="size-3" /> add filter
        </button>
        <div className="flex-1" />
        <span className="font-mono text-[11.5px] text-muted-foreground">
          <span className="text-foreground">{EVENTS.length}</span> events ·
          auto-refresh{' '}
          <span className="inline-block size-1.5 rounded-full bg-primary live-dot align-middle ml-1" />
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="rounded-md border border-border bg-surface-1 max-w-[1200px] overflow-hidden">
          <div className="grid grid-cols-[160px_1fr_180px_140px_120px] gap-4 px-5 py-3 border-b border-border bg-surface-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">
            <div>actor</div>
            <div>action · resource</div>
            <div>change</div>
            <div>when</div>
            <div>commit · ip</div>
          </div>
          {EVENTS.map((e, i) => {
            const Icon = RESOURCE_ICON[e.resourceType] ?? Flag;
            return (
              <div
                key={i}
                className="grid grid-cols-[160px_1fr_180px_140px_120px] gap-4 px-5 py-3.5 items-center border-b border-border last:border-b-0 hover:bg-surface-2/40 font-mono text-[12px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`size-6 rounded grid place-items-center text-[10px] uppercase ${
                      e.isKey
                        ? 'bg-warning/10 border border-warning/30 text-warning'
                        : 'bg-surface-2 border border-border'
                    }`}
                  >
                    {e.isKey ? (
                      <KeyRound className="size-3" />
                    ) : (
                      e.actor.slice(0, 2)
                    )}
                  </div>
                  <span className="truncate">{e.actor}</span>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="size-3.5 text-dim shrink-0" />
                  <span className={ACTION_COLOR[e.action] ?? 'text-foreground'}>
                    {e.action}
                  </span>
                  <span className="text-dim">·</span>
                  <span className="truncate text-foreground">{e.resource}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {'diff' in e && e.diff ? (
                    <>
                      <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10.5px]">
                        {e.diff.from}
                      </span>
                      <span className="text-dim">→</span>
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10.5px]">
                        {e.diff.to}
                      </span>
                    </>
                  ) : (
                    <span className="text-dim">—</span>
                  )}
                </div>

                <span className="text-muted-foreground">{e.at}</span>

                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <GitCommit className="size-3 text-dim" />
                  <span>{e.hash}</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="font-mono text-[11.5px] text-dim mt-4">
          // every mutation is recorded · retained 90 days on free, 1 year on
          pro, forever on enterprise
        </p>
      </div>
    </main>
  );
}
