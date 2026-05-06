import { Zap, AlertTriangle } from 'lucide-react';
import type { FlagResponse } from '@pulse-flags/types';

const SPARK_COLORS: Record<string, string> = {
  'text-primary': '#8be36b',
  'text-info': '#6bc5ff',
  'text-magenta': '#c77dff',
  'text-warning': '#f0b95a',
};

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
      spark: [3, 8, 5, 9, 7, 12, 14, 11, 16, activeCount],
    },
    {
      label: 'stale flags',
      value: String(staleCount),
      delta: `unused ${STALE_DAYS}d+`,
      icon: AlertTriangle,
      color: 'text-warning',
      spark: [4, 4, 5, 5, 4, 6, 5, 5, 4, staleCount],
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
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[28px] leading-none">{s.value}</div>
              <div className={`font-mono text-[11.5px] mt-2.5 ${s.color}`}>{s.delta}</div>
            </div>
            <Sparkline data={s.spark} color={s.color} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ data, color }: { data: readonly number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 90;
  const h = 36;
  const step = w / (data.length - 1);
  const points = data.map((d, i) => `${i * step},${h - ((d - min) / range) * h}`).join(' ');
  const stroke = SPARK_COLORS[color] ?? '#8be36b';
  return (
    <svg width={w} height={h} className="opacity-90" aria-hidden>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} />
      <polyline points={`${points} ${w},${h} 0,${h}`} fill={stroke} fillOpacity={0.08} stroke="none" />
    </svg>
  );
}
