'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, GitCommit, Plus, Lock, Copy, Code2,
  Sparkles, Trash2, Archive, Pencil, Loader2,
} from 'lucide-react';
import { Toggle } from '~/components/ui/toggle';
import { RuleDialog } from '~/components/dialogs/rule-dialog';
import { FlagDialog } from '~/components/dialogs/flag-dialog';
import { ConfirmDialog } from '~/components/dialogs/confirm';
import { useFlag, useUpdateFlag, useDeleteFlag } from '~/lib/hooks/use-flags';
import {
  useRules,
  useCreateRule,
  useUpdateRule,
  useReorderRules,
  useDeleteRule,
} from '~/lib/hooks/use-rules';
import { useAuditLogs } from '~/lib/hooks/use-audit';
import type { RuleResponse, AuditLogResponse } from '@pulse-flags/types';

// Condition tree — handles both local shape (op/children/leaf) and API shape (operator/conditions/attribute)
type Tree =
  | { op: 'AND' | 'OR' | 'NOT'; children: Array<Tree | Leaf> }
  | { operator: 'AND' | 'OR' | 'NOT'; conditions: Array<Tree | Leaf>; condition?: Tree | Leaf }
  | Leaf;

type Leaf =
  | { leaf: true; attr: string; op: string; val: string }
  | { attribute: string; op: string; value: unknown };

function formatRelative(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FlagDetailPage({
  orgSlug, projectSlug, envName, flagKey,
}: {
  orgSlug: string; projectSlug: string; envName: string; flagKey: string;
}) {
  const router = useRouter();
  const backHref = `/${orgSlug}/${projectSlug}/${envName}/flags`;

  const { data: flag, isLoading } = useFlag(orgSlug, projectSlug, envName, flagKey);
  const { data: rules } = useRules(orgSlug, projectSlug, envName, flagKey);
  const createRule = useCreateRule(orgSlug, projectSlug, envName, flagKey);
  const updateRule = useUpdateRule(orgSlug, projectSlug, envName, flagKey);
  const reorderRules = useReorderRules(orgSlug, projectSlug, envName, flagKey);
  const deleteRule = useDeleteRule(orgSlug, projectSlug, envName, flagKey);
  const { data: auditPage } = useAuditLogs(orgSlug, { limit: 5 });
  const updateFlag = useUpdateFlag(orgSlug, projectSlug, envName, flagKey);
  const deleteFlag = useDeleteFlag(orgSlug, projectSlug, envName);

  const [editFlagOpen, setEditFlagOpen] = useState(false);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [orderedRules, setOrderedRules] = useState<RuleResponse[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  // Find the rule being edited so we can pre-populate the dialog
  const editRule = editRuleId ? (rules ?? []).find((r) => r.id === editRuleId) : null;
  const deleteRuleTarget = deleteRuleId ? (rules ?? []).find((r) => r.id === deleteRuleId) : null;

  useEffect(() => {
    if (rules) setOrderedRules(rules);
  }, [rules]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" />
        <span className="font-mono text-[12px]">loading flag…</span>
      </div>
    );
  }

  if (!flag) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-[13px] text-muted-foreground">Flag not found.</p>
        <Link href={backHref} className="font-mono text-[12px] text-primary hover:underline">← back to flags</Link>
      </div>
    );
  }

  const handleToggle = (next: boolean) => {
    updateFlag.mutate({ version: flag.version, enabled: next });
  };

  const handleDelete = () => {
    deleteFlag.mutate(flagKey, {
      onSuccess: () => router.push(backHref),
    });
  };

  // Filter audit logs to this flag
  const flagAudit = (auditPage?.items ?? [])
    .filter((e) => e.resourceId === flag.id)
    .slice(0, 4);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Page header */}
      <div className="px-10 pt-8 pb-6 border-b border-border">
        <Link href={backHref} className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground hover:text-foreground mb-5 w-fit">
          <ArrowLeft className="size-3.5" /> back to flags
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
              <button type="button" aria-label="Copy key" onClick={() => navigator.clipboard?.writeText(flag.key)} className="text-dim hover:text-foreground">
                <Copy className="size-3.5" />
              </button>
              <span className="text-dim">·</span>
              <span className="text-dim">v{flag.version}</span>
              <Lock className="size-3 text-dim" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setEditFlagOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground">
              <Pencil className="size-3.5" /> edit
            </button>
            <button
              type="button"
              onClick={() => setArchiveOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
            >
              <Archive className="size-3.5" />
              {flag.enabled ? 'archive' : 'unarchive'}
            </button>
            <button type="button" onClick={() => setDeleteOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-destructive hover:bg-destructive/10">
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
              Flag is {flag.enabled ? <>live in <span className="text-warning font-mono">{envName}</span></> : <span className="text-muted-foreground">disabled</span>}
            </div>
            <div className="font-mono text-[12px] text-muted-foreground mt-1">
              {rules?.length ?? 0} targeting rules · last updated {formatRelative(flag.updatedAt as string | Date)}
            </div>
          </div>
          <Toggle on={flag.enabled} onChange={handleToggle} disabled={updateFlag.isPending} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-10 font-mono text-[12.5px]">
        <span className="px-4 py-3.5 -mb-px border-b-2 border-primary text-primary">targeting</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1100px] mx-auto px-10 py-8 grid grid-cols-3 gap-8">
          {/* Left */}
          <div className="col-span-2 space-y-8">
            <Section label="default" hint="returned when no rule matches">
              <div className="font-mono text-[13px] p-4 rounded-md bg-surface-1 border border-border">
                <span className="text-muted-foreground">return</span>{' '}
                <span className="text-destructive">{JSON.stringify(flag.defaultValue)}</span>
              </div>
            </Section>

            <Section
              label="rules"
              hint="evaluated top-to-bottom · first match wins"
              action={
                <button type="button" onClick={() => setAddRuleOpen(true)} className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-foreground">
                  <Plus className="size-3.5" /> add rule
                </button>
              }
            >
              {!rules || rules.length === 0 ? (
                <div className="font-mono text-[12px] text-dim p-4 rounded-md border border-border bg-surface-1">
                  // no rules — flag returns default value for all users
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="font-mono text-[11px] text-dim">drag rules to reorder priority</div>
                  {(orderedRules.length > 0 ? orderedRules : rules).map((rule, i) => (
                    <RuleCard
                      key={rule.id}
                      index={i}
                      rule={rule}
                      draggable={rules.length > 1}
                      dragActive={dragId === rule.id}
                      onDragStart={() => setDragId(rule.id)}
                      onDragEnd={() => setDragId(null)}
                      onDrop={() => {
                        if (!dragId || dragId === rule.id) return;
                        const current = orderedRules.length > 0 ? orderedRules : rules;
                        const fromIndex = current.findIndex((r) => r.id === dragId);
                        const toIndex = current.findIndex((r) => r.id === rule.id);
                        if (fromIndex < 0 || toIndex < 0) return;
                        const next = [...current];
                        const [moved] = next.splice(fromIndex, 1);
                        if (!moved) return;
                        next.splice(toIndex, 0, moved);
                        setOrderedRules(next);
                        reorderRules.mutate(
                          { orderedIds: next.map((r) => r.id) },
                          { onError: () => setOrderedRules(rules) },
                        );
                      }}
                      onEdit={() => setEditRuleId(rule.id)}
                      onDelete={() => setDeleteRuleId(rule.id)}
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section label="sdk usage" hint="@pulse-flags/sdk">
              <pre className="font-mono text-[12.5px] p-5 rounded-md bg-surface-1 border border-border overflow-x-auto leading-relaxed">
                <span className="text-muted-foreground">{'// in-memory · zero-latency\n'}</span>
                <span className="text-magenta">const</span>{' '}
                <span className="text-foreground">{flag.type === 'boolean' ? 'enabled' : 'value'}</span>{' '}
                <span className="text-muted-foreground">=</span>{' '}
                <span className="text-foreground">client</span>
                <span className="text-muted-foreground">.</span>
                <span className="text-info">{flag.type === 'boolean' ? 'isEnabled' : 'getVariant'}</span>
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
                <MetaRow k="rules" v={String(rules?.length ?? 0)} />
                <MetaRow k="last update" v={formatRelative(flag.updatedAt as string | Date)} />
                {flag.description && <MetaRow k="description" v={flag.description} />}
              </dl>
            </Section>

            {flag.tags.length > 0 && (
              <Section label="tags">
                <div className="flex flex-wrap gap-1.5">
                  {flag.tags.map((t) => (
                    <span key={t} className="font-mono text-[11px] px-2 py-1 rounded bg-surface-1 text-muted-foreground border border-border">{t}</span>
                  ))}
                </div>
              </Section>
            )}

            <Section label="history" hint="recent changes">
              {flagAudit.length === 0 ? (
                <p className="font-mono text-[12px] text-dim">// no recent changes</p>
              ) : (
                <ol className="relative space-y-4">
                  {flagAudit.map((e, i) => (
                    <AuditEntry key={e.id} entry={e} isLast={i === flagAudit.length - 1} />
                  ))}
                </ol>
              )}
            </Section>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <FlagDialog
        open={editFlagOpen}
        onClose={() => setEditFlagOpen(false)}
        mode="edit"
        loading={updateFlag.isPending}
        initial={{
          name: flag.name,
          key: flag.key,
          type: flag.type,
          description: flag.description ?? '',
          tags: flag.tags,
          defaultValue: flag.defaultValue,
        }}
        onSubmit={(values) => {
          updateFlag.mutate(
            {
              version: flag.version,
              name: values.name,
              description: values.description,
              tags: values.tags,
              defaultValue: values.defaultValue,
            },
            { onSuccess: () => setEditFlagOpen(false) },
          );
        }}
      />
      <ConfirmDialog
        open={deleteRuleId !== null}
        onClose={() => setDeleteRuleId(null)}
        title={deleteRuleTarget ? `Delete rule "${deleteRuleTarget.name || 'Untitled rule'}"` : 'Delete rule'}
        description="This rule will be permanently removed from the flag."
        confirmLabel="delete rule"
        onConfirm={() => {
          if (!deleteRuleId) return;
          deleteRule.mutate(deleteRuleId, { onSuccess: () => setDeleteRuleId(null) });
        }}
        consequences={['Rule removed immediately', 'Targeting will fall back to the next rule or default']}
      />
      <RuleDialog
        open={addRuleOpen}
        onClose={() => setAddRuleOpen(false)}
        mode="create"
        loading={createRule.isPending}
        onSubmit={(values) => {
          createRule.mutate(values, { onSuccess: () => setAddRuleOpen(false) });
        }}
      />
      <RuleDialog
        open={editRuleId !== null}
        onClose={() => setEditRuleId(null)}
        mode="edit"
        loading={updateRule.isPending}
        initial={editRule ? {
          name: editRule.name,
          percentage: editRule.percentage,
          value: editRule.value,
          conditions: editRule.conditions,
          priority: editRule.priority,
        } : undefined}
        onSubmit={(values) => {
          if (!editRuleId) return;
          updateRule.mutate(
            { ruleId: editRuleId, body: values },
            { onSuccess: () => setEditRuleId(null) },
          );
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete "${flag.key}"`}
        description="This flag will be permanently removed from all environments."
        confirmLabel="delete flag"
        confirmType={flag.key}
        onConfirm={handleDelete}
        consequences={['Removed from all environments immediately', 'All rules and targeting history deleted', 'SDK clients will fall back to defaults', 'Cannot be undone']}
      />
      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title={flag.enabled ? `Archive "${flag.key}"` : `Unarchive "${flag.key}"`}
        description={
          flag.enabled
            ? 'Archiving disables the flag. SDK clients will fall back to the default value.'
            : 'Unarchiving re-enables the flag. It will be live again immediately.'
        }
        confirmLabel={flag.enabled ? 'archive' : 'unarchive'}
        variant="warning"
        onConfirm={() => {
          updateFlag.mutate(
            { version: flag.version, enabled: !flag.enabled },
            { onSuccess: () => setArchiveOpen(false) },
          );
        }}
      />
    </div>
  );
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-dim">{k}</dt>
      <dd className="text-foreground truncate max-w-[160px] text-right">{v}</dd>
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

function RuleCard({
  index,
  rule,
  onEdit,
  onDelete,
  draggable,
  dragActive,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  index: number;
  rule: RuleResponse;
  onEdit?: () => void;
  onDelete?: () => void;
  draggable?: boolean;
  dragActive?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDrop?: () => void;
}) {
  const tree = rule.conditions as Tree;
  return (
    <div
      className={`rounded-md border border-border bg-surface-1 overflow-hidden ${dragActive ? 'ring-1 ring-primary/60' : ''}`}
      draggable={draggable}
      onDragStart={(e) => {
        if (draggable) e.dataTransfer.setData('text/plain', rule.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
    >
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-surface-2 border-b border-border font-mono text-[11.5px]">
        <span className="text-dim">#{index}</span>
        <span className="text-muted-foreground">name</span>
        <span className="text-foreground truncate max-w-[200px]">{rule.name || 'Untitled rule'}</span>
        <span className="text-muted-foreground">priority</span>
        <span className="text-foreground">{rule.priority}</span>
        {draggable && (
          <span className="ml-2 text-[10px] text-dim">drag to reorder</span>
        )}
        <span className="flex-1" />
        <span className="text-muted-foreground">→ return</span>
        <span className="text-primary">{JSON.stringify(rule.value)}</span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="ml-2 flex items-center gap-1 text-[10.5px] text-muted-foreground hover:text-foreground">
            <Pencil className="size-3" /> edit
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={onDelete} className="ml-2 flex items-center gap-1 text-[10.5px] text-destructive hover:text-destructive">
            <Trash2 className="size-3" /> delete
          </button>
        )}
      </div>
      <div className="p-4">
        <RuleTree tree={tree} />
      </div>
      <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-surface-1">
        <span className="font-mono text-[11.5px] text-muted-foreground">rollout</span>
        <div className="flex-1 h-1.5 bg-surface-3 rounded overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${rule.percentage}%` }} />
        </div>
        <span className="font-mono text-[12px] text-foreground tabular-nums">{rule.percentage}%</span>
        <span className="font-mono text-[10.5px] text-dim">sha256(key:userId) % 100</span>
      </div>
    </div>
  );
}

function RuleTree({ tree, depth = 0 }: { tree: Tree; depth?: number }) {
  // Leaf: has 'attribute' field (API shape) or 'leaf' marker (local shape)
  const isLeaf = 'leaf' in tree || 'attribute' in tree;

  if (isLeaf) {
    const leaf = tree as Leaf;
    // Handle both API shape (attribute/op/value) and local shape (attr/op/val)
    const attr = 'attribute' in leaf ? (leaf as unknown as { attribute: string }).attribute : leaf.attr;
    const op = leaf.op;
    const val = 'value' in leaf
      ? JSON.stringify((leaf as unknown as { value: unknown }).value)
      : leaf.val;

    return (
      <div className="flex items-center gap-2 font-mono text-[12.5px] py-1">
        <Code2 className="size-3.5 text-dim shrink-0" />
        <span className="text-info">{attr}</span>
        <span className="px-2 py-0.5 rounded bg-surface-2 text-muted-foreground text-[11px] border border-border">{op}</span>
        <span className="text-warning truncate">{val}</span>
      </div>
    );
  }

  // AND/OR/NOT node — handle both 'op' (local) and 'operator' (API) field names
  const node = tree as {
    op?: string;
    operator?: string;
    children?: Tree[];
    conditions?: Tree[];
    condition?: Tree;
  };
  const opLabel = node.op ?? node.operator ?? 'AND';
  const children = node.children ?? node.conditions ?? [];

  if (opLabel === 'NOT') {
    const child = node.condition ?? children[0];
    return (
      <div className={depth === 0 ? '' : 'ml-4 pl-4 border-l border-dashed border-border'}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[11px] px-2 py-0.5 rounded border text-warning border-warning/40 bg-warning/10">NOT</span>
          <span className="font-mono text-[11px] text-dim">invert match</span>
        </div>
        {child ? <RuleTree tree={child} depth={depth + 1} /> : <span className="font-mono text-[11px] text-dim">// empty</span>}
      </div>
    );
  }

  // Guard: if children is not an array, render nothing
  if (!Array.isArray(children)) {
    return <span className="font-mono text-[11px] text-dim">// invalid condition</span>;
  }

  const opColor = opLabel === 'AND'
    ? 'text-primary border-primary/40 bg-primary/10'
    : 'text-magenta border-magenta/40 bg-magenta/10';

  return (
    <div className={depth === 0 ? '' : 'ml-4 pl-4 border-l border-dashed border-border'}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${opColor}`}>{opLabel}</span>
        <span className="font-mono text-[11px] text-dim">match {opLabel === 'AND' ? 'all' : 'any'}</span>
      </div>
      <div className="space-y-1">
        {children.map((c, i) => <RuleTree key={i} tree={c} depth={depth + 1} />)}
      </div>
    </div>
  );
}

function AuditEntry({ entry, isLast }: { entry: AuditLogResponse; isLast: boolean }) {
  return (
    <li className="relative pl-5 font-mono text-[12px]">
      <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" />
      {!isLast && <span className="absolute left-[3.5px] top-3.5 bottom-[-16px] w-px bg-border" />}
      <div className="flex items-center gap-2 flex-wrap text-foreground">
        <span className="text-muted-foreground">{entry.actorId?.slice(0, 8) ?? 'system'}</span>
        <span>{entry.action}</span>
      </div>
      <div className="text-dim mt-1 flex items-center gap-2">
        <GitCommit className="size-3" />
        <span>{entry.id.slice(0, 7)}</span>
        <span>·</span>
        <span>{formatRelative(entry.createdAt as string | Date)}</span>
      </div>
    </li>
  );
}
