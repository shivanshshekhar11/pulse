'use client';

import { Pause, Trash2, Activity } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';

const LINES = [
  { t: '14:23:09.412', ev: 'ruleset:updated', env: 'staging', flag: 'new_dashboard_v2', actor: 'jordan.p', dur: '8ms' },
  { t: '14:23:09.418', ev: 'broadcast', env: 'staging', flag: 'new_dashboard_v2', clients: 1247, dur: '4ms' },
  { t: '14:22:54.001', ev: 'sdk:connect', env: 'production', client: 'novapay@web/2.4.1', region: 'us-east-1' },
  { t: '14:22:53.221', ev: 'evaluate', env: 'production', flag: 'pricing_cta_text', value: '"Start Free"', user: 'u_99812' },
  { t: '14:22:51.812', ev: 'ruleset:updated', env: 'staging', flag: 'rate_limit_per_min', actor: 'ci-deployer', dur: '11ms' },
  { t: '14:22:48.144', ev: 'evaluate', env: 'production', flag: 'checkout_timeout_ms', value: '8000', user: 'u_42118' },
  { t: '14:22:42.910', ev: 'sdk:reconnect', env: 'production', client: 'novapay@mobile/1.8.0', attempt: 2 },
  { t: '14:22:39.041', ev: 'broadcast', env: 'staging', flag: 'new_dashboard_v2', clients: 1244, dur: '5ms' },
  { t: '14:22:35.611', ev: 'evaluate', env: 'staging', flag: 'beta_export_feature', value: 'true', user: 'u_2 (Internal_Beta)' },
  { t: '14:22:30.119', ev: 'sdk:connect', env: 'staging', client: 'lighthouse@web/0.3.2', region: 'eu-west-1' },
] as const;

const EV_COLOR: Record<string, string> = {
  'ruleset:updated': 'text-warning',
  broadcast: 'text-primary',
  'sdk:connect': 'text-info',
  'sdk:reconnect': 'text-magenta',
  evaluate: 'text-muted-foreground',
};

export function LiveStreamPage({ orgSlug }: { orgSlug: string }) {
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / live stream`}
        title="live stream"
        command="pulse stream --env=all --follow"
        blink
      >
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
        >
          <Pause className="size-3.5" /> pause
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="size-3.5" /> clear
        </button>
      </PageHeader>

      <div className="px-10 py-4 border-b border-border flex items-center gap-4 font-mono text-[11.5px]">
        <span className="flex items-center gap-1.5 text-primary">
          <Activity className="size-3.5" />
          <span className="size-1.5 rounded-full bg-primary live-dot" />
          streaming
        </span>
        <span className="text-muted-foreground">
          redis pub/sub · pulse:env:*
        </span>
        <div className="flex-1" />
        <span className="text-muted-foreground">
          events/sec <span className="text-foreground">42.1</span>
        </span>
        <span className="text-muted-foreground">
          p95 latency <span className="text-foreground">14ms</span>
        </span>
        <span className="text-muted-foreground">
          connected sdks <span className="text-foreground">1,247</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-0">
        <div className="font-mono text-[12px] leading-relaxed">
          {LINES.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-[110px_140px_100px_1fr] gap-4 px-10 py-1.5 hover:bg-surface-1/50 border-l-2 border-transparent hover:border-primary/40"
            >
              <span className="text-dim">{l.t}</span>
              <span className={EV_COLOR[l.ev] ?? 'text-foreground'}>{l.ev}</span>
              <span className="text-muted-foreground">{l.env}</span>
              <span className="text-foreground/90 truncate">
                {'flag' in l && l.flag && (
                  <><span className="text-info">{l.flag}</span>{' '}</>
                )}
                {'actor' in l && l.actor && (
                  <span className="text-muted-foreground">by {l.actor} </span>
                )}
                {'client' in l && l.client && (
                  <span className="text-muted-foreground">{l.client} </span>
                )}
                {'region' in l && l.region && (
                  <span className="text-dim">[{l.region}] </span>
                )}
                {'value' in l && l.value && (
                  <><span className="text-warning">{l.value}</span>{' '}</>
                )}
                {'user' in l && l.user && (
                  <span className="text-dim">→ {l.user} </span>
                )}
                {'clients' in l && l.clients && (
                  <span className="text-dim">→ {l.clients} clients </span>
                )}
                {'attempt' in l && l.attempt && (
                  <span className="text-dim">attempt={l.attempt} </span>
                )}
                {'dur' in l && l.dur && (
                  <span className="text-dim">({l.dur})</span>
                )}
              </span>
            </div>
          ))}
          <div className="px-10 py-3 text-primary cursor-blink">
            <span className="text-dim">$</span>
          </div>
        </div>
      </div>
    </main>
  );
}
