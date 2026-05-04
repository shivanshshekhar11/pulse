'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Flag,
  Layers,
  KeyRound,
  Users,
  ScrollText,
  Boxes,
  Settings,
  Radio,
  Plus,
  ArrowRight,
  Command as CmdIcon,
  CornerDownLeft,
} from 'lucide-react';

type Cmd = {
  id: string;
  label: string;
  group: 'navigate' | 'create' | 'actions';
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
};

const COMMANDS: Cmd[] = [
  { id: 'n-flags', group: 'navigate', icon: Flag, label: 'go to flags', hint: 'g f' },
  { id: 'n-segments', group: 'navigate', icon: Layers, label: 'go to segments', hint: 'g s' },
  { id: 'n-keys', group: 'navigate', icon: KeyRound, label: 'go to API keys', hint: 'g k' },
  { id: 'n-members', group: 'navigate', icon: Users, label: 'go to members', hint: 'g m' },
  { id: 'n-audit', group: 'navigate', icon: ScrollText, label: 'go to audit log', hint: 'g a' },
  { id: 'n-stream', group: 'navigate', icon: Radio, label: 'go to live stream', hint: 'g l' },
  { id: 'n-projects', group: 'navigate', icon: Boxes, label: 'go to projects', hint: 'g p' },
  { id: 'n-settings', group: 'navigate', icon: Settings, label: 'go to settings', hint: 'g ,' },
  { id: 'c-flag', group: 'create', icon: Plus, label: 'create flag', hint: '⌘N' },
  { id: 'c-segment', group: 'create', icon: Plus, label: 'create segment' },
  { id: 'c-key', group: 'create', icon: Plus, label: 'generate API key' },
  { id: 'c-project', group: 'create', icon: Plus, label: 'create project' },
  { id: 'c-member', group: 'create', icon: Plus, label: 'invite member' },
  { id: 'a-env-prod', group: 'actions', icon: ArrowRight, label: 'switch env → production' },
  { id: 'a-env-stg', group: 'actions', icon: ArrowRight, label: 'switch env → staging' },
  { id: 'a-env-dev', group: 'actions', icon: ArrowRight, label: 'switch env → development' },
  { id: 'a-org', group: 'actions', icon: ArrowRight, label: 'switch organization…' },
];

const GROUP_LABELS = {
  navigate: '// navigate',
  create: '// create',
  actions: '// actions',
} as const;

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return COMMANDS;
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(needle));
  }, [q]);

  const grouped = useMemo(() => {
    const g: Record<string, Cmd[]> = {};
    filtered.forEach((c) => {
      (g[c.group] ||= []).push(c);
    });
    return g;
  }, [filtered]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(filtered.length - 1, a + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, filtered.length]);

  if (!open) return null;

  let idx = -1;

  return (
    <div className="fixed inset-0 z-[100] overlay-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative flex items-start justify-center pt-[12vh] px-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[640px] rounded-lg border border-border bg-surface-1 shadow-2xl shadow-black/60 scale-in overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search commands, flags, segments…"
              className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-dim"
            />
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
              esc
            </kbd>
          </div>

          <div className="max-h-[420px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center font-mono text-[12px] text-muted-foreground">
                <span className="text-dim">// </span>no matches for &quot;{q}&quot;
              </div>
            ) : (
              (
                Object.keys(grouped) as (keyof typeof GROUP_LABELS)[]
              ).map((g) => (
                <div key={g} className="py-1">
                  <div className="px-3 pt-1.5 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
                    {GROUP_LABELS[g]}
                  </div>
                  {grouped[g]?.map((c) => {
                    idx++;
                    const isActive = idx === active;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onMouseEnter={() => setActive(idx)}
                        onClick={onClose}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-surface-2'
                        }`}
                      >
                        <c.icon className="size-3.5 shrink-0" />
                        <span className="flex-1 truncate">{c.label}</span>
                        {c.hint && (
                          <span className="font-mono text-[10.5px] text-dim">
                            {c.hint}
                          </span>
                        )}
                        {isActive && (
                          <CornerDownLeft className="size-3 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-surface-0 font-mono text-[10.5px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-border">↑</kbd>
                <kbd className="px-1 rounded border border-border">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-border">↵</kbd>{' '}
                select
              </span>
            </div>
            <div className="flex items-center gap-1">
              <CmdIcon className="size-3" />
              <span>K · pulse command</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
