'use client';

import { useState } from 'react';
import { Plus, Users, Code2, Pencil, Copy, Trash2, ChevronRight } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { SegmentDialog } from '~/components/dialogs/segment-dialog';
import { ConfirmDialog } from '~/components/dialogs/confirm';

const SEGMENTS = [
  { name: 'Internal_Beta', description: 'Acme employees + trusted external testers', users: 142, flags: 8, updatedAt: '2h ago', color: '#8be36b', conditions: [{ attr: 'email', op: 'ends_with', val: '"@acme.com"' }, { attr: 'role', op: 'in', val: '["beta","admin"]' }] },
  { name: 'EU_Users', description: 'Users in GDPR jurisdictions', users: 18420, flags: 12, updatedAt: 'yesterday', color: '#6bc5ff', conditions: [{ attr: 'country', op: 'in', val: '["DE","FR","ES","IT","NL"]' }] },
  { name: 'Pro_Plan', description: 'Subscribers on Pro tier', users: 3819, flags: 22, updatedAt: 'Apr 30', color: '#f0b95a', conditions: [{ attr: 'plan', op: 'eq', val: '"pro"' }] },
  { name: 'Enterprise', description: 'Enterprise contracts only', users: 47, flags: 9, updatedAt: 'Apr 22', color: '#c77dff', conditions: [{ attr: 'plan', op: 'eq', val: '"enterprise"' }] },
  { name: 'Mobile_Users', description: 'Sessions originating from iOS / Android', users: 9401, flags: 4, updatedAt: 'Apr 18', color: '#6bc5ff', conditions: [{ attr: 'platform', op: 'in', val: '["ios","android"]' }] },
];

export function SegmentsPage({ orgSlug }: { orgSlug: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / segments`}
        title="segments"
        command="pulse segments list --org=acme-corp"
      >
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" strokeWidth={2.5} /> new segment
        </button>
      </PageHeader>

      <div className="px-10 py-4 border-b border-border font-mono text-[12px] text-muted-foreground">
        Reusable user groups · org-scoped · referenced by{' '}
        <span className="text-foreground">flag rules</span> via{' '}
        <span className="text-info">segment</span> operator
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="grid grid-cols-2 gap-4 max-w-[1200px]">
          {SEGMENTS.map((s) => (
            <article
              key={s.name}
              className="rounded-md border border-border bg-surface-1 hover:border-border-strong transition-colors group cursor-pointer"
            >
              <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <h3 className="font-mono">{s.name}</h3>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {s.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconBtn
                    icon={Pencil}
                    onClick={() => setEditTarget(s.name)}
                  />
                  <IconBtn icon={Copy} />
                  <IconBtn
                    icon={Trash2}
                    danger
                    onClick={() => setDeleteTarget(s.name)}
                  />
                </div>
              </header>

              <div className="px-5 pb-4 space-y-1.5">
                {s.conditions.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 font-mono text-[12px] py-0.5"
                  >
                    <Code2 className="size-3.5 text-dim shrink-0" />
                    <span className="text-info">{c.attr}</span>
                    <span className="px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground text-[10.5px] border border-border">
                      {c.op}
                    </span>
                    <span className="text-warning truncate">{c.val}</span>
                  </div>
                ))}
              </div>

              <footer className="px-5 py-3 border-t border-border flex items-center justify-between font-mono text-[11.5px] text-muted-foreground bg-surface-0/40 rounded-b-md">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3 text-dim" />
                    <span className="text-foreground">
                      {s.users.toLocaleString()}
                    </span>{' '}
                    users
                  </span>
                  <span>
                    <span className="text-foreground">{s.flags}</span> flags
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-dim">updated {s.updatedAt}</span>
                  <ChevronRight className="size-3.5 text-dim group-hover:text-foreground" />
                </div>
              </footer>
            </article>
          ))}
        </div>
      </div>

      <SegmentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
      <SegmentDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        mode="edit"
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete segment "${deleteTarget}"`}
        description="This will remove the segment from all flag rules that reference it."
        confirmLabel="delete segment"
        confirmType={deleteTarget ?? undefined}
        consequences={[
          'Removed from all flag rules that reference it',
          'Cannot be undone',
        ]}
      />
    </main>
  );
}

function IconBtn({
  icon: Icon,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`size-7 grid place-items-center rounded border border-border bg-surface-2 hover:bg-surface-3 ${
        danger
          ? 'text-destructive'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
