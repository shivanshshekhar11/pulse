'use client';

import { useEffect, useState } from 'react';
import { Plus, Users, Code2, Pencil, Copy, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { SegmentDialog } from '~/components/dialogs/segment-dialog';
import { ConfirmDialog } from '~/components/dialogs/confirm';
import { useSegments, useDeleteSegment, useCreateSegment, useUpdateSegment } from '~/lib/hooks/use-segments';
import type { SegmentResponse } from '@pulse-flags/types';

type Cond = { attr: string; op: string; val: string };

function parseConds(conditions: unknown): Cond[] {
  if (!conditions || typeof conditions !== 'object') return [];
  const c = conditions as Record<string, unknown>;
  // Leaf condition
  if ('attribute' in c && 'op' in c) {
    return [{ attr: String(c['attribute']), op: String(c['op']), val: JSON.stringify(c['value']) }];
  }
  // AND/OR node
  if ('conditions' in c && Array.isArray(c['conditions'])) {
    return (c['conditions'] as unknown[]).flatMap((child) => parseConds(child));
  }
  // NOT node
  if ('condition' in c) {
    return parseConds(c['condition']);
  }
  return [];
}

const SEGMENT_COLORS = ['#8be36b', '#6bc5ff', '#f0b95a', '#c77dff', '#ff5d5d'];

export function SegmentsPage({ orgSlug }: { orgSlug: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SegmentResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SegmentResponse | null>(null);
  const [page, setPage] = useState(1);

  const pageSize = 8;
  const { data: segmentData, isLoading } = useSegments(orgSlug, pageSize, (page - 1) * pageSize);
  const deleteSegment = useDeleteSegment(orgSlug);
  const createSegment = useCreateSegment(orgSlug);
  const updateSegment = useUpdateSegment(orgSlug);

  const segments = segmentData?.items ?? [];
  const total = segmentData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const rangeStart = total === 0 ? 0 : startIndex + 1;
  const rangeEnd = endIndex;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader crumb={`${orgSlug} / segments`} title="segments" command="pulse segments list --org=acme-corp">
        <button type="button" onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="size-3.5" strokeWidth={2.5} /> new segment
        </button>
      </PageHeader>

      <div className="px-10 py-4 border-b border-border font-mono text-[12px] text-muted-foreground">
        Reusable user groups Â· org-scoped Â· referenced by{' '}
        <span className="text-foreground">flag rules</span> via{' '}
        <span className="text-info">segment</span> operator
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="font-mono text-[12px]">loading segmentsâ€¦</span>
          </div>
        ) : !segments || segments.length === 0 ? (
          <div className="text-center py-20 font-mono text-[12px] text-dim">
            // no segments yet Â·{' '}
            <button type="button" onClick={() => setCreateOpen(true)} className="text-primary hover:underline">create one</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-w-[1200px]">
            {segments.map((s, idx) => {
              const color = SEGMENT_COLORS[(startIndex + idx) % SEGMENT_COLORS.length] ?? '#8be36b';
              const conds = parseConds(s.conditions);
              return (
                <article key={s.id} className="rounded-md border border-border bg-surface-1 hover:border-border-strong transition-colors group cursor-pointer">
                  <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                        <h3 className="font-mono">{s.name}</h3>
                      </div>
                      {s.description && <p className="text-[13px] text-muted-foreground">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconBtn icon={Pencil} onClick={() => setEditTarget(s)} />
                      <IconBtn icon={Copy} onClick={() => navigator.clipboard?.writeText(s.id)} />
                      <IconBtn icon={Trash2} danger onClick={() => setDeleteTarget(s)} />
                    </div>
                  </header>

                  <div className="px-5 pb-4 space-y-1.5">
                    {conds.slice(0, 3).map((c, i) => (
                      <div key={i} className="flex items-center gap-2 font-mono text-[12px] py-0.5">
                        <Code2 className="size-3.5 text-dim shrink-0" />
                        <span className="text-info">{c.attr}</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground text-[10.5px] border border-border">{c.op}</span>
                        <span className="text-warning truncate">{c.val}</span>
                      </div>
                    ))}
                    {conds.length === 0 && (
                      <span className="font-mono text-[12px] text-dim">// no conditions defined</span>
                    )}
                  </div>

                  <footer className="px-5 py-3 border-t border-border flex items-center justify-between font-mono text-[11.5px] text-muted-foreground bg-surface-0/40 rounded-b-md">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Users className="size-3 text-dim" />
                        <span className="text-dim">org-scoped</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-dim">updated {new Date(s.updatedAt as string | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <ChevronRight className="size-3.5 text-dim group-hover:text-foreground" />
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="px-10 pb-8">
          <div className="max-w-[1200px] flex items-center justify-between rounded-md border border-border bg-surface-0/40 px-4 py-3">
            <div className="font-mono text-[12px] text-dim">
              <span className="text-primary">$</span> showing {rangeStart}-{rangeEnd} of {total} segments
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
        </div>
      )}

      <SegmentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
        loading={createSegment.isPending}
        onSubmit={(values) => {
          createSegment.mutate(values, { onSuccess: () => setCreateOpen(false) });
        }}
      />
      <SegmentDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        mode="edit"
        loading={updateSegment.isPending}
        initial={editTarget ? { name: editTarget.name, description: editTarget.description, conditions: editTarget.conditions } : undefined}
        onSubmit={(values) => {
          if (!editTarget) return;
          updateSegment.mutate(
            { segmentId: editTarget.id, body: values },
            { onSuccess: () => setEditTarget(null) },
          );
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`Delete segment "${deleteTarget?.name}"`}
        description="This will remove the segment from all flag rules that reference it."
        confirmLabel="delete segment"
        confirmType={deleteTarget?.name}
        onConfirm={() => deleteTarget && deleteSegment.mutate(deleteTarget.id)}
        consequences={['Removed from all flag rules that reference it', 'Cannot be undone']}
      />
    </main>
  );
}

function IconBtn({ icon: Icon, danger, onClick }: { icon: React.ComponentType<{ className?: string }>; danger?: boolean; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick?.(e); }} className={`size-7 grid place-items-center rounded border border-border bg-surface-2 hover:bg-surface-3 ${danger ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'}`}>
      <Icon className="size-3.5" />
    </button>
  );
}
