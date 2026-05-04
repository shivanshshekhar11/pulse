'use client';

import { useEffect, useState } from 'react';

const LINES = [
  { delay: 200, text: '$ pulse init --org=acme-corp', color: 'text-foreground' },
  { delay: 800, text: '→ workspace ready · postgres connected · redis pub/sub up', color: 'text-muted-foreground' },
  { delay: 1500, text: '$ pulse list --env=production --watch', color: 'text-foreground' },
  { delay: 2300, text: '● new_dashboard_v2     bool   40% rollout   2 rules', color: 'text-primary' },
  { delay: 2600, text: '● pricing_cta_text     str    100%          0 rules', color: 'text-info' },
  { delay: 2900, text: '● checkout_timeout_ms  num    100%          1 rule ', color: 'text-warning' },
  { delay: 3200, text: '● theme_config        json   100%          1 rule ', color: 'text-magenta' },
  { delay: 3700, text: '[sse] ruleset:updated → 1247 sdks · 12ms p95', color: 'text-primary' },
] as const;

export function TerminalHero() {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const timers = LINES.map((l, i) =>
      window.setTimeout(() => setVisible(i + 1), l.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="rounded-lg border border-border bg-surface-0 shadow-2xl shadow-primary/5 overflow-hidden glow-pulse">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-primary/70" />
        </div>
        <span className="flex-1 text-center font-mono text-[11px] text-muted-foreground">
          ~/acme-corp — pulse@v0.1.0
        </span>
        <span className="font-mono text-[10px] text-dim">zsh</span>
      </div>

      {/* Body */}
      <div className="p-5 font-mono text-[12.5px] leading-relaxed min-h-[280px] noise">
        {LINES.slice(0, visible).map((l, i) => (
          <div
            key={i}
            className={`${l.color} fade-up`}
            style={{ animationDelay: '0ms', animationDuration: '0.4s' }}
          >
            {l.text}
          </div>
        ))}
        <div className="text-primary cursor-blink mt-1">
          <span className="text-dim">$</span>
        </div>
      </div>
    </div>
  );
}
