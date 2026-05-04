'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  GitCommit,
  Plus,
  Lock,
  Copy,
  Code2,
  Sparkles,
  Trash2,
  Archive,
  Pencil,
} from 'lucide-react';
import { Toggle } from '~/components/ui/toggle';
import { RuleDialog } from '~/components/dialogs/rule-dialog';
import { FlagDialog } from '~/components/dialogs/flag-dialog';
import { ConfirmDialog } from '~/components/dialogs/confirm';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tree = { op: 'AND' | 'OR'; children: Array<Tree | Leaf> } | Leaf;
type Leaf = { leaf: true; attr: string; op: string; val: string };

const AUDIT_TIMELINE = [
  { who: 'jordan.p', action: 'increased rollout', from: '25%', to: '40%', at: '12m ago', hash: 'a3f9c12' },
  { who: 'mira.k', action: 'added rule', detail: 'country IN [US,CA,UK]', at: '2h ago', hash: 'b7e1d04' },
  { who: 'system', action: 'auto-disabled in dev', detail: 'stale 30d', at: 'yesterday', hash: 'c0a9b88' },
  { who: 'jordan.p', action: 'created flag', detail: 'type=boolean', at: 'Apr 28', hash: 'd4f2e51' },
] as const;

const RULE_TREE: Tree = {
  op: 'OR',
  children: [
    { op: 'AND', children: [{ leaf: true, attr: 'country', op: 'in', val: '["US","CA","UK"]' }, { leaf: true, attr: 'plan', op: 'eq', val: '"pro"' }] },
    { op: 'AND', children: [{ leaf: true, attr: 'segment', op: 'matches', val: 'Internal_Beta' }, { leaf: true, attr: 'email', op: 'ends_with', val: '"@acme.com"' }] },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export function FlagDetailPage({
  orgSlug,
  projectSlug,
  envName,
  flagKey,
}: {
  orgSlug: string;
  projectSlug: string;
  envName: string;
  flagKey: string;
}) {
  const backHref = `/${orgSlug}/${projectSlug}/${envName}/flags`;

  // Mock flag — replaced by TanStack Query in Phase 4
  const flag = {
    key: flagKey,
    name: flagKey.replace(/_/g, ' '),
    type: 'boolean' as const,
    enabled: true,
    rollout: 40,
    rules: 2,
    version: 14,
    updatedAt: '12m ago',
    updatedBy: 'jordan.p',
    tags: ['frontend', 'ui'],
    description: '',
  };

  const [enabled, setEnabled] = useState(flag.enabled);
  const [editFlagOpen, setEditFlagOpen] = useState(false);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [editRuleIndex, setEditRuleIndex] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Page header */}
      <div className="px-10 pt-8 pb-6 border-b border-border">
        <Link
          href={backHref}
          className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground hover:text-foreground mb-5 w-fit"
        >
          <ArrowLeft className="size-3.5" />
          back to flags
        </Link>

        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim mb-2">
              // {orgSlug} / {projectSlug} / {envName} / flag
            </div>
            <h1 className="text-[28px] leading-tight">{flag.name}</h1>
            <div className="font-mono text-[13px] text-muted-foreground mt-3 flex items-center gap-2.5">
              <span className="text-primary">$</span>
              <span>{flag.key}</span>
              <button type="button" aria-label="Copy key" className="text-dim hover:text-foreground">
                <Copy className="size-3.5" />
              </button>
              <span className="text-dim">·</span>
              <span className="text-dim">v{flag.version}</span>
              <Lock className="size-3 text-dim" />
              <span className="text-dim">·</span>
              <span className="text-dim">created Apr 28 by {flag.updatedBy}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEditFlagOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" /> edit
            </button>
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
            >
              <Archive className="size-3.5" /> archive
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> delete
            </button>
          </div>
        </div>

        {/* Master switch */}
        <div className="mt-7 flex items-center gap-4 p-5 rounded-md bg-surface-1 border border-border">
          <div className="size-11 rounded-md bg-primary/15 border border-primary/40 grid place-items-center glow-primary">
            <Sparkles className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-[15px]">
              Flag is{' '}
              {enabled ? (
                <>live in <span className="text-warning font-mono">{envName}</span></>
              ) : (
                <span className="text-muted-foreground">disabled</span>
              )}
            </div>
            <div className="font-mono text-[12px] text-muted-foreground mt-1">
              propagated to 1,247 SDK clients · last broadcast 12s ago
            </div>
          </div>
          <Toggle on={enabled} onChange={setEnabled} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-10 font-mono text-[12.5px]">
        {['targeting', 'values', 'history', 'sdk'].map((t, i) => (
          <button
            key={t}
            type="button"
            className={`px-4 py-3.5 -mb-px border-b-2 ${
              i === 0
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-10 py-8 grid grid-cols-3 gap-8">
          {/* Left */}
          <div className="col-span-2 space-y-8">
            <Section label="default" hint="returned when no rule matches">
              <div className="font-mono text-[13px] p-4 rounded-md bg-surface-1 border border-border">
                <span className="text-muted-foreground">return</span>{' '}
                <span className="text-destructive">false</span>
              </div>
            </Section>

            <Section
              label="rules"
              hint="evaluated top-to-bottom · first match wins"
              action={
                <button
                  type="button"
                  onClick={() => setAddRuleOpen(true)}
                  className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3.5" /> add rule
                </button>
              }
            >
              <div className="space-y-4">
                <RuleCard index={0} priority={0} pct={40} value="true" tree={RULE_TREE} onEdit={() => setEditRuleIndex(0)} />
                <RuleCard
                  index={1}
                  priority={1}
                  pct={100}
                  value="true"
                  tree={{ op: 'AND', children: [{ leaf: true, attr: 'userId', op: 'in', val: '["u_42","u_99"]' }] }}
                  onEdit={() => setEditRuleIndex(1)}
                />
              </div>
            </Section>

            <Section label="sdk usage" hint="@pulse-flags/sdk">
              <pre className="font-mono text-[12.5px] p-5 rounded-md bg-surface-1 border border-border overflow-x-auto leading-relaxed">
                <span className="text-muted-foreground">{'// in-memory · zero-latency\n'}</span>
                <span className="text-magenta">const</span>{' '}
                <span className="text-foreground">show</span>{' '}
                <span className="text-muted-foreground">=</span>{' '}
                <span className="text-foreground">client</span>
                <span className="text-muted-foreground">.</span>
                <span className="text-info">isEnabled</span>
                <span className="text-muted-foreground">{'(\n'}</span>
                {'  '}<span className="text-warning">'{flag.key}'</span>
                <span className="text-muted-foreground">,</span>
                {'\n  '}<span className="text-muted-foreground">{'{ userId, country, plan }'}</span>
                {'\n'}<span className="text-muted-foreground">{');'}</span>
              </pre>
            </Section>
          </div>

          {/* Right */}
          <div className="col-span-1 space-y-8">
            <Section label="metadata">
              <dl className="font-mono text-[12.5px] space-y-3">
                <MetaRow k="type" v={flag.type} />
                <MetaRow k="version" v={`v${flag.version}`} />
                <MetaRow k="rollout" v={`${flag.rollout}%`} />
                <MetaRow k="rules" v={`${flag.rules}`} />
                <MetaRow k="last update" v={flag.updatedAt} />
                <MetaRow k="updated by" v={flag.updatedBy} />
              </dl>
            </Section>

            <Section label="tags">
              <div className="flex flex-wrap gap-1.5">
                {flag.tags.map((t) => (
                  <span key={t} className="font-mono text-[11px] px-2 py-1 rounded bg-surface-1 text-muted-foreground border border-border">
                    {t}
                  </span>
                ))}
              </div>
            </Section>

            <Section label="history" hint="last 4 changes">
              <ol className="relative space-y-4">
                {AUDIT_TIMELINE.map((e, i) => (
                  <li key={i} className="relative pl-5 font-mono text-[12px]">
                    <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" />
                    {i < AUDIT_TIMELINE.length - 1 && (
                      <span className="absolute left-[3.5px] top-3.5 bottom-[-16px] w-px bg-border" />
                    )}
                    <div className="flex items-center gap-2 flex-wrap text-foreground">
                      <span className="text-muted-foreground">{e.who}</span>
                      <span>{e.action}</span>
                      {'from' in e && (
                        <>
                          <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10.5px]">{e.from}</span>
                          <span className="text-dim">→</span>
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10.5px]">{e.to}</span>
                        </>
                      )}
                    </div>
                    <div className="text-dim mt-1 flex items-center gap-2 flex-wrap">
                      {'detail' in e && <span>{e.detail}</span>}
                      <span>·</span>
                      <span>{e.at}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <GitCommit className="size-3" />
                        {e.hash}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <FlagDialog
        open={editFlagOpen}
        onClose={() => setEditFlagOpen(false)}
        mode="edit"
        initial={{ name: flag.name, key: flag.key, type: flag.type, description: flag.description, tags: flag.tags }}
      />
      <RuleDialog
        open={addRuleOpen}
        onClose={() => setAddRuleOpen(false)}
        mode="create"
      />
      <RuleDialog
        open={editRuleIndex !== null}
        onClose={() => setEditRuleIndex(null)}
        mode="edit"
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete "${flag.key}"`}
        description="This flag will be permanently removed from all environments."
        confirmLabel="delete flag"
        confirmType={flag.key}
        consequences={[
          'Removed from all environments immediately',
          'All rules and targeting history deleted',
          'SDK clients will fall back to defaults',
          'Cannot be undone',
        ]}
      />
      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title={`Archive "${flag.key}"`}
        description="Archived flags are disabled and hidden from the default view."
        confirmLabel="archive"
        variant="warning"
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-dim">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}

function Section({ label, hint, action, children }: { label: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-baseline gap-2.5">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">// {label}</h4>
          {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function RuleCard({ index, priority, pct, value, tree, onEdit }: { index: number; priority: number; pct: number; value: string; tree: Tree; onEdit?: () => void }) {
  return (
    <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-surface-2 border-b border-border font-mono text-[11.5px]">
        <span className="text-dim">#{index}</span>
        <span className="text-muted-foreground">priority</span>
        <span className="text-foreground">{priority}</span>
        <span className="flex-1" />
        <span className="text-muted-foreground">→ return</span>
        <span className="text-primary">{value}</span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="ml-2 flex items-center gap-1 text-[10.5px] text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3" /> edit
          </button>
        )}
      </div>
      <div className="p-4">
        <RuleTree tree={tree} />
      </div>
      <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-surface-1">
        <span className="font-mono text-[11.5px] text-muted-foreground">rollout</span>
        <div className="flex-1 h-1.5 bg-surface-3 rounded overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-[12px] text-foreground tabular-nums">{pct}%</span>
        <span className="font-mono text-[10.5px] text-dim">sha256(key:userId) % 100</span>
      </div>
    </div>
  );
}

function RuleTree({ tree, depth = 0 }: { tree: Tree; depth?: number }) {
  if ('leaf' in tree) {
    return (
      <div className="flex items-center gap-2 font-mono text-[12.5px] py-1">
        <Code2 className="size-3.5 text-dim shrink-0" />
        <span className="text-info">{tree.attr}</span>
        <span className="px-2 py-0.5 rounded bg-surface-2 text-muted-foreground text-[11px] border border-border">{tree.op}</span>
        <span className="text-warning truncate">{tree.val}</span>
      </div>
    );
  }
  const opColor = tree.op === 'AND' ? 'text-primary border-primary/40 bg-primary/10' : 'text-magenta border-magenta/40 bg-magenta/10';
  return (
    <div className={depth === 0 ? '' : 'ml-4 pl-4 border-l border-dashed border-border'}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${opColor}`}>{tree.op}</span>
        <span className="font-mono text-[11px] text-dim">match {tree.op === 'AND' ? 'all' : 'any'}</span>
      </div>
      <div className="space-y-1">
        {tree.children.map((c, i) => <RuleTree key={i} tree={c} depth={depth + 1} />)}
      </div>
    </div>
  );
}
