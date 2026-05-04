'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Filter, SortDesc, RefreshCw, Tag } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { Stats } from './stats';
import { FlagRow, type Flag } from './flag-row';

// ── Mock data (replaced by TanStack Query + API in Phase 4) ──────────────────

const FLAGS: Flag[] = [
  { key: 'new_dashboard_v2', name: 'New Dashboard v2', type: 'boolean', enabled: true, rollout: 40, rules: 2, segments: ['Internal_Beta', 'Pro_Plan'], updatedAt: '12m ago', updatedBy: 'jordan.p', tags: ['frontend', 'ui'], version: 14 },
  { key: 'pricing_cta_text', name: 'Pricing CTA copy', type: 'string', enabled: true, rollout: 100, rules: 1, segments: [], updatedAt: '2h ago', updatedBy: 'mira.k', tags: ['marketing'], version: 7 },
  { key: 'checkout_timeout_ms', name: 'Checkout request timeout', type: 'number', enabled: true, rollout: 100, rules: 0, segments: [], updatedAt: 'yesterday', updatedBy: 'sai.r', tags: ['backend', 'perf'], version: 3 },
  { key: 'theme_config', name: 'Theme config object', type: 'json', enabled: true, rollout: 100, rules: 1, segments: ['EU_Users'], updatedAt: 'Apr 30', updatedBy: 'jordan.p', tags: ['theme'], version: 22 },
  { key: 'beta_export_feature', name: 'Beta CSV export', type: 'boolean', enabled: true, rollout: 100, rules: 1, segments: ['Internal_Beta'], updatedAt: 'Apr 29', updatedBy: 'system', tags: ['beta'], version: 5 },
  { key: 'new_analytics_widget', name: 'Analytics widget rollout', type: 'boolean', enabled: true, rollout: 10, rules: 1, segments: [], updatedAt: 'Apr 28', updatedBy: 'mira.k', tags: ['frontend'], version: 9 },
  { key: 'new_homepage_hero', name: 'Homepage hero redesign', type: 'boolean', enabled: false, rollout: 0, rules: 0, segments: [], updatedAt: 'Apr 26', updatedBy: 'jordan.p', tags: ['marketing', 'stale'], version: 2 },
  { key: 'rate_limit_per_min', name: 'API rate limit (per min)', type: 'number', enabled: true, rollout: 100, rules: 2, segments: ['Pro_Plan', 'Enterprise'], updatedAt: 'Apr 22', updatedBy: 'sai.r', tags: ['backend', 'infra'], version: 18 },
  { key: 'ml_recommender_v3', name: 'ML recommender v3', type: 'json', enabled: false, rollout: 0, rules: 3, segments: ['Internal_Beta'], updatedAt: 'Apr 18', updatedBy: 'mira.k', tags: ['ml', 'experiment'], version: 11 },
];

const TAGS = ['all', 'frontend', 'backend', 'marketing', 'experiment', 'ml', 'beta', 'stale'];

// ── Component ────────────────────────────────────────────────────────────────

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

  const filtered =
    activeTag === 'all'
      ? FLAGS
      : FLAGS.filter((f) => f.tags.includes(activeTag));

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / ${projectSlug} / ${envName}`}
        title="feature flags"
        command={`pulse list --env=${envName} --watch`}
        meta={<Stats />}
      >
        <div className="font-mono text-[11.5px] text-muted-foreground text-right">
          <div>
            last sync <span className="text-foreground">2s ago</span>
          </div>
          <div className="text-dim mt-1">2026-05-04 14:23:09 UTC</div>
        </div>
      </PageHeader>

      {/* Tag filters + toolbar */}
      <div className="px-10 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {TAGS.map((t) => (
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[11.5px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
        >
          <Filter className="size-3.5" /> filter
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[11.5px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
        >
          <SortDesc className="size-3.5" /> updated
        </button>
        <button
          type="button"
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
        <div>rollout</div>
        <div>targeting · updated</div>
        <div />
      </div>

      {/* Flag rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((flag) => (
          <Link
            key={flag.key}
            href={`/${orgSlug}/${projectSlug}/${envName}/flags/${flag.key}`}
          >
            <FlagRow flag={flag} />
          </Link>
        ))}
        <div className="px-6 py-8 text-center font-mono text-[12px] text-dim">
          <span className="text-primary">$</span> end of stream ·{' '}
          {filtered.length} flags
        </div>
      </div>
    </main>
  );
}
