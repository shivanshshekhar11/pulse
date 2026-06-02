'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { env } from '~/env';
import {
  Zap,
  Radio,
  GitBranch,
  Shield,
  Layers,
  Hash,
  ArrowRight,
  Check,
  Lock,
} from 'lucide-react';
import { TerminalHero } from './terminal-hero';
import { Architecture } from './architecture';

const FEATURES = [
  { icon: Zap, color: 'primary', title: 'Zero Latency Evaluation', desc: 'Evaluations happen locally in memory. Deliver lightning-fast experiences without adding network overhead to your requests.' },
  { icon: Radio, color: 'info', title: 'Real-Time Sync', desc: 'Updates propagate to your servers instantly. Turn off a broken feature and see it reflected globally in milliseconds.' },
  { icon: GitBranch, color: 'magenta', title: 'Granular Targeting', desc: 'Roll out features to specific regions, beta testers, or premium users with our powerful segmentation and rule engine.' },
  { icon: Hash, color: 'warning', title: 'Progressive Rollouts', desc: 'Safely increase exposure from 1% to 100%. Our deterministic assignment ensures users stay in their assigned bucket.' },
  { icon: Shield, color: 'primary', title: 'Enterprise Security', desc: 'Built for scale with granular Role-Based Access Control, project isolation, and comprehensive audit logs.' },
  { icon: Layers, color: 'info', title: 'Always-On Reliability', desc: 'Designed for resilience. Even during network partitions, your applications continue serving flags using cached state.' },
] as const;

const STATS = [
  { value: '<1ms', label: 'evaluation time' },
  { value: 'Real-time', label: 'updates' },
  { value: '99.99%', label: 'uptime SLA' },
  { value: 'Infinite', label: 'scalability' },
];

const TICKER_ITEMS = [
  'zero latency', 'real-time sync', 'granular targeting', 'multi-tier fallbacks',
  'progressive delivery', 'audit logs', 'custom segments', 'enterprise rbac',
];

const SDK_SNIPPET = `import { PulseClient } from '@pulse-flags/sdk';

const client = new PulseClient({
  apiKey: process.env.PULSE_API_KEY,
  defaults: {
    new_dashboard: false,
    pricing_variant: 'control',
  },
});

await client.connect();

// Synchronous, zero-latency evaluation
const show = client.isEnabled('new_dashboard', {
  userId, country, plan,
});`;

const COLOR_MAP: Record<string, string> = {
  primary: '#8be36b',
  info: '#6bc5ff',
  warning: '#f0b95a',
  magenta: '#c77dff',
  destructive: '#ff5d5d',
};

export function Landing() {
  const { data: session } = useSession();
  const isLoggedIn = !!session;
  const dashboardUrl = isLoggedIn
    ? session.orgSlug
      ? `/${session.orgSlug}/projects`
      : '/_/projects'
    : '/login';
  const docsUrl = env.NEXT_PUBLIC_DOCS_URL || 'https://pulse-flags.com/docs';

  return (
    <div className="size-full overflow-y-auto bg-background text-foreground relative">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(139,227,107,0.08),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />

      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-[1200px] mx-auto px-8 h-16 flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary/15 border border-primary/40 grid place-items-center glow-primary">
                <div className="size-3.5 rounded-sm bg-primary" />
              </div>
              <span className="font-mono text-[15px]">
                pulse
              </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 font-mono text-[12.5px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground cursor-pointer">
              features
            </a>
            <a href="#architecture" className="hover:text-foreground cursor-pointer">
              platform
            </a>
            <a 
              href="https://www.npmjs.com/package/@pulse-flags/sdk" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground cursor-pointer"
            >
              sdk
            </a>
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground cursor-pointer"
            >
              docs
            </a>
          </nav>
          <div className="flex-grow" />
          {isLoggedIn ? (
            <Link
              href={dashboardUrl}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              go to dashboard <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:flex font-mono text-[12px] text-muted-foreground hover:text-foreground px-2"
              >
                sign in
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                get started <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-[1200px] mx-auto px-8 pt-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-1 font-mono text-[11px] text-muted-foreground fade-up">
              <span className="size-1.5 rounded-full bg-primary live-dot" />
              pulse feature management
            </div>

            <h1
              className="mt-6 text-[44px] sm:text-[56px] leading-[1.05] tracking-tight font-mono fade-up"
              style={{ animationDelay: '100ms' }}
            >
              release features
              <br />
              <span className="gradient-text">with absolute</span>
              <br />
              <span className="text-foreground">
                confidence
              </span>
            </h1>
            <p
              className="mt-6 text-[15px] text-muted-foreground max-w-[520px] leading-relaxed fade-up"
              style={{ animationDelay: '200ms' }}
            >
              Decouple deployments from releases. Pulse empowers modern product teams to launch 
              features faster, target users precisely, and instantly mitigate risks—all with zero latency.
            </p>

            <div
              className="mt-8 flex items-center gap-3 fade-up"
              style={{ animationDelay: '300ms' }}
            >
              <Link
                href={isLoggedIn ? dashboardUrl : '/register'}
                className="flex items-center gap-2 px-5 py-3 rounded-md font-mono text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors glow-primary"
              >
                {isLoggedIn ? 'go to dashboard' : 'start for free'} <ArrowRight className="size-4" />
              </Link>
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-md font-mono text-[13px] bg-surface-1 border border-border text-foreground hover:border-border-strong"
              >
                view documentation
              </a>
            </div>

            <div
              className="mt-10 flex items-center gap-6 font-mono text-[11.5px] text-muted-foreground fade-up"
              style={{ animationDelay: '400ms' }}
            >
              {['SOC2 compliant', 'Enterprise SLA', 'Always-on reliability'].map(
                (t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="size-3 text-primary" /> {t}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="fade-in" style={{ animationDelay: '200ms' }}>
            <TerminalHero />
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="border-y border-border bg-surface-0/40 overflow-hidden py-3">
        <div className="flex ticker gap-12 font-mono text-[11.5px] text-muted-foreground whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="text-primary">/</span>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="features" className="relative max-w-[1200px] mx-auto px-8 py-24">
        <div className="text-center max-w-[640px] mx-auto mb-14">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-dim mb-3">
            // features
          </div>
          <h2 className="text-[34px] leading-tight font-mono">
            everything you need to
            <br />
            scale your product
          </h2>
          <p className="mt-4 text-[14px] text-muted-foreground">
            Pulse provides a comprehensive toolset for progressive delivery. Give your 
            developers and product managers the power to ship faster and safer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const c = COLOR_MAP[f.color] ?? '#8be36b';
            return (
              <article
                key={f.title}
                className="group relative rounded-lg border border-border bg-surface-1 p-6 hover:border-border-strong transition-colors fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="size-10 rounded-md grid place-items-center mb-5 border"
                  style={{
                    backgroundColor: `${c}15`,
                    borderColor: `${c}55`,
                    color: c,
                  }}
                >
                  <Icon className="size-4" strokeWidth={2} />
                </div>
                <h3 className="mb-2">{f.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
                <div
                  className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(to right, transparent, ${c}, transparent)`,
                  }}
                />
              </article>
            );
          })}
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="relative max-w-[1200px] mx-auto px-8 py-12">
        <Architecture />
      </section>

      {/* SDK / Code */}
      <section id="sdk" className="relative max-w-[1200px] mx-auto px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-dim mb-3">
              // developer experience
            </div>
            <h2 className="text-[32px] leading-tight font-mono mb-5">
              integrate in
              <br />
              minutes<span className="text-primary">_</span>
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed mb-6 max-w-[480px]">
              Our type-safe SDK drops seamlessly into your existing stack. With local evaluation, 
              network requests never block your rendering path.
            </p>
            <ul className="space-y-3 font-mono text-[12.5px]">
              {[
                ['connect()', 'initializes real-time sync in the background'],
                ['isEnabled()', 'evaluates instantly with zero latency'],
                ["on('update')", 'react to configuration changes live'],
                ['close()', 'gracefully tears down connections'],
              ].map(([fn, desc]) => (
                <li key={fn} className="flex items-baseline gap-3">
                  <span className="text-primary">{fn}</span>
                  <span className="text-muted-foreground">{desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-surface-0 overflow-hidden shadow-2xl shadow-primary/5">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 border-b border-border">
              <Lock className="size-3 text-dim" />
              <span className="font-mono text-[11.5px] text-muted-foreground">
                app/lib/pulse.ts
              </span>
              <div className="flex-1" />
              <button
                type="button"
                className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
              >
                copy
              </button>
            </div>
            <pre className="p-5 font-mono text-[12.5px] leading-relaxed overflow-x-auto">
              <CodeHighlight text={SDK_SNIPPET} />
            </pre>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative max-w-[1200px] mx-auto px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {STATS.map((s) => (
            <div key={s.label} className="bg-surface-1 p-8 text-center">
              <div className="font-mono text-[34px] gradient-text flicker">
                {s.value}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim mt-2">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-[1200px] mx-auto px-8 py-24">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-surface-1 to-surface-0 p-12 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div
            className="absolute -top-20 -right-20 size-80 rounded-full opacity-20 float-y"
            style={{
              background:
                'radial-gradient(circle, rgba(139,227,107,0.6), transparent 70%)',
            }}
          />
          <div
            className="absolute -bottom-20 -left-20 size-80 rounded-full opacity-20 float-y"
            style={{
              background:
                'radial-gradient(circle, rgba(107,197,255,0.5), transparent 70%)',
              animationDelay: '1.5s',
            }}
          />
          <div className="relative">
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-dim mb-4">
              // get started
            </div>
            <h2 className="text-[36px] leading-tight font-mono mb-4">
              take control of your
              <br />
              <span className="gradient-text">release cycle</span>
            </h2>
            <p className="text-[14px] text-muted-foreground max-w-[520px] mx-auto mb-8">
              Join leading teams who use Pulse to decouple deployment from release, 
              mitigate risks, and ship with confidence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={isLoggedIn ? dashboardUrl : '/register'}
                className="flex items-center gap-2 px-6 py-3 rounded-md font-mono text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
              >
                {isLoggedIn ? 'go to dashboard' : 'start for free'} <ArrowRight className="size-4" />
              </Link>
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-md font-mono text-[13px] bg-surface-2 border border-border text-foreground hover:border-border-strong"
              >
                view documentation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-[1200px] mx-auto px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 font-mono text-[12px]">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-7 rounded-md bg-primary/15 border border-primary/40 grid place-items-center">
                  <div className="size-3.5 rounded-sm bg-primary" />
                </div>
                <span className="text-[14px]">
                  pulse
              </span>
            </div>
            <p className="text-muted-foreground max-w-[320px] leading-relaxed">
              Pulse is a modern feature management platform designed for teams who want to 
              ship faster and safer. We provide the tools you need to release with confidence.
            </p>
          </div>
          <div>
            <div className="text-dim uppercase tracking-widest text-[10.5px] mb-3">
              // product
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground">
                  features
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/@pulse-flags/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  sdk
                </a>
              </li>
              <li>
                <a
                  href={docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  documentation
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-dim uppercase tracking-widest text-[10.5px] mb-3">
              // company
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground">
                  about
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground">
                  contact
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-[1200px] mx-auto px-8 py-5 flex items-center justify-between font-mono text-[11px] text-dim">
            <span>// © 2026 pulse · all systems operational</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary live-dot" />
              uptime 99.99%
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Minimal syntax highlighter for the SDK snippet
function CodeHighlight({ text }: { text: string }) {
  const tokenize = (line: string) => {
    const parts: { c: string; v: string }[] = [];
    const re =
      /(\/\/.*$)|('[^']*'|"[^"]*")|(\b(?:import|from|const|await|async|function|return|process)\b)|(\b(?:PulseClient|isEnabled|connect|client|env)\b)|(\b(?:true|false|null|undefined)\b)|([{}()[\];,.])/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last)
        parts.push({ c: 'text-foreground', v: line.slice(last, m.index) });
      if (m[1]) parts.push({ c: 'text-dim', v: m[1] });
      else if (m[2]) parts.push({ c: 'text-warning', v: m[2] });
      else if (m[3]) parts.push({ c: 'text-magenta', v: m[3] });
      else if (m[4]) parts.push({ c: 'text-info', v: m[4] });
      else if (m[5]) parts.push({ c: 'text-primary', v: m[5] });
      else if (m[6]) parts.push({ c: 'text-muted-foreground', v: m[6] });
      last = re.lastIndex;
    }
    if (last < line.length)
      parts.push({ c: 'text-foreground', v: line.slice(last) });
    return parts;
  };

  return (
    <>
      {text.split('\n').map((line, i) => (
        <div key={i}>
          {tokenize(line).map((p, j) => (
            <span key={j} className={p.c}>
              {p.v}
            </span>
          ))}
          {line === '' && '\u00A0'}
        </div>
      ))}
    </>
  );
}
