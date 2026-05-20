import { Hash, ToggleLeft, Braces, Type, Users, Clock, ChevronRight } from 'lucide-react';
import type { FlagResponse } from '@pulse-flags/types';

const TYPE_ICON = {
  boolean: ToggleLeft,
  string: Type,
  number: Hash,
  json: Braces,
} as const;

const TYPE_COLOR = {
  boolean: 'text-primary bg-primary/10 border-primary/30',
  string: 'text-info bg-info/10 border-info/30',
  number: 'text-warning bg-warning/10 border-warning/30',
  json: 'text-magenta bg-magenta/10 border-magenta/30',
} as const;

function formatRelative(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FlagRow({ flag }: { flag: FlagResponse }) {
  const Icon = TYPE_ICON[flag.type];

  // The API doesn't return rollout% directly â€” that lives on rules.
  // We show the flag's enabled state and rule count instead.
  const ruleCount = 'â€”';

  return (
    <div className="group grid grid-cols-[28px_1fr_140px_180px_200px_64px] gap-6 items-center px-6 py-5 border-b border-border cursor-pointer transition-colors hover:bg-surface-1/60">
      {/* Status dot */}
      <div className="flex items-center justify-center">
        {flag.enabled ? (
          <span className="size-2.5 rounded-full bg-primary live-dot" />
        ) : (
          <span className="size-2.5 rounded-full bg-dim" />
        )}
      </div>

      {/* Name + key */}
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] truncate">{flag.name}</span>
          {flag.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border">
              {t}
            </span>
          ))}
        </div>
        <div className="font-mono text-[12.5px] text-muted-foreground mt-1.5 flex items-center gap-2">
          <span className="text-primary/80">$</span>
          <span className="truncate">{flag.key}</span>
          <span className="text-dim">Â·</span>
          <span className="text-dim">v{flag.version}</span>
        </div>
      </div>

      {/* Type badge */}
      <div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded font-mono text-[11.5px] border ${TYPE_COLOR[flag.type]}`}>
          <Icon className="size-3.5" strokeWidth={2.2} />
          {flag.type}
        </span>
      </div>

      {/* Enabled state (rollout% requires rules fetch â€” show enabled/disabled) */}
      <div className="font-mono text-[12px]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-muted-foreground">status</span>
          <span className={flag.enabled ? 'text-primary' : 'text-dim'}>
            {flag.enabled ? 'enabled' : 'disabled'}
          </span>
        </div>
        <div className="h-1.5 bg-surface-2 rounded overflow-hidden">
          <div className={`h-full transition-all ${flag.enabled ? 'bg-primary w-full' : 'bg-dim w-0'}`} />
        </div>
      </div>

      {/* Updated */}
      <div className="font-mono text-[12px] text-muted-foreground space-y-1.5">
        <div className="flex items-center gap-2">
          <Users className="size-3.5 text-dim shrink-0" />
          <span className="text-dim">all users</span>
          <span className="text-dim">Â·</span>
          <span className="text-foreground">{ruleCount}</span>
          <span className="text-dim">rules</span>
        </div>
        <div className="flex items-center gap-1.5 text-dim">
          <Clock className="size-3 shrink-0" />
          <span>{formatRelative(flag.updatedAt as string | Date)}</span>
        </div>
      </div>

      {/* Chevron */}
      <div className="flex items-center gap-2 justify-end">
        <span className="size-7 grid place-items-center rounded-md border border-transparent text-dim group-hover:text-foreground group-hover:border-border group-hover:bg-surface-2 transition-colors">
          <ChevronRight className="size-4" />
        </span>
      </div>
    </div>
  );
}
