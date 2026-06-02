import { Zap, AlertTriangle } from 'lucide-react';
import type { FlagResponse } from '@pulse-flags/types';

// 30-day stale threshold
const STALE_DAYS = 30;

function isStale(flag: FlagResponse): boolean {
  const updated = new Date(flag.updatedAt as string | Date);
  return Date.now() - updated.getTime() > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export function Stats({ flags }: { flags: FlagResponse[] }) {
  const activeCount = flags.filter((f) => f.enabled).length;
  const staleCount = flags.filter((f) => isStale(f)).length;

  const stats = [
    {
      label: 'active flags',
      value: String(activeCount),
      delta: `${flags.length} total`,
      icon: Zap,
      color: 'text-primary',
    },
    {
      label: 'stale flags',
      value: String(staleCount),
      delta: `unused ${STALE_DAYS}d+`,
      icon: AlertTriangle,
      color: 'text-warning',
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-md border border-border bg-surface-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-[11px] uppercase tracking-widest text-dim">{s.label}</span>
            <s.icon className={`size-4 ${s.color}`} strokeWidth={2} />
          </div>
          <div>
            <div className="font-mono text-[28px] leading-none">{s.value}</div>
            <div className={`font-mono text-[11.5px] mt-2.5 ${s.color}`}>{s.delta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
