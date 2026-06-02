'use client';

import { usePulseFlag } from '@/lib/hooks';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';

const STATS = [
  { label: 'Transactions / day', value: '2.4M+' },
  { label: 'Uptime SLA',         value: '99.99%' },
  { label: 'Countries',          value: '140+'   },
  { label: 'Avg. latency',       value: '18ms'   },
] as const;

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant Payouts',
    desc: 'Move money in milliseconds, not days. Real-time rails built on modern infrastructure.',
  },
  {
    icon: Shield,
    title: 'Bank-Grade Security',
    desc: 'End-to-end encryption, fraud detection, and SOC 2 Type II certified infrastructure.',
  },
  {
    icon: Globe,
    title: 'Global Coverage',
    desc: '140+ currencies, 50+ local payment methods, and compliance handled for you.',
  },
] as const;

export default function Home() {
  const { value: isNewHero } = usePulseFlag('new_homepage_hero');
  const { variant: themeConfig } = usePulseFlag('theme_config') as {
    variant: { radius?: number; primaryColor?: string } | undefined;
  };

  const radius = themeConfig?.radius ?? 8;

  return (
    <div className="space-y-16">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {isNewHero ? (
        /* NEW HERO — flag ON */
        <section
          data-testid="new-hero"
          className="hero-gradient rounded-2xl px-8 py-20 text-center relative overflow-hidden"
          style={{ borderRadius: `${radius}px` }}
        >
          {/* Glow orbs */}
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-violet-600/30 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-indigo-600/30 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium mb-6">
              <Zap size={10} fill="currentColor" /> New — NovaPay 2.0 is here
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Welcome to{' '}
              <span className="gradient-text">NovaPay 2.0!</span>
            </h1>
            <p className="text-xl text-slate-300 mb-10 max-w-xl mx-auto">
              The future of payments is finally here. Faster, smarter, and built for the next
              billion users.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors shadow-lg"
                style={{ borderRadius: `${radius}px` }}
              >
                Get Started Free <ArrowRight size={16} />
              </button>
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/10"
                style={{ borderRadius: `${radius}px` }}
              >
                See Demo
              </button>
            </div>

            {/* Stat strip */}
            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map(({ label, value }) => (
                <div
                  key={label}
                  className="glass px-4 py-3 text-center slide-up"
                  style={{ borderRadius: `${radius}px` }}
                >
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* OLD HERO — flag OFF */
        <section
          data-testid="old-hero"
          className="bg-slate-800/40 border border-slate-700/50 rounded-2xl px-8 py-20 text-center"
          style={{ borderRadius: `${radius}px` }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">NovaPay</h1>
          <p className="text-lg text-slate-400 mb-8">Taking payments online.</p>
          <button
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
            style={{ borderRadius: `${radius}px` }}
          >
            Get Started
          </button>
        </section>
      )}

      {/* ── Feature cards — always visible ──────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Everything you need to accept payments
        </h2>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="glass p-6 hover:border-slate-600 transition-colors"
              style={{ borderRadius: `${radius}px` }}
            >
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center mb-4">
                <Icon size={20} className="text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
