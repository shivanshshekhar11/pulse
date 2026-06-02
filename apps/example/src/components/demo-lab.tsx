'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';
import { usePulseState, useAllFlags } from '@/lib/hooks';
import { useUserContext, type Plan } from '@/lib/user-context';
import { env } from '@/env';

// ─── Connection status badge ──────────────────────────────────────────────────

function ConnectionBadge() {
  const state = usePulseState();

  const configs = {
    CONNECTED:    { label: 'Live',         color: 'bg-emerald-500', icon: Wifi,    pulse: true  },
    CONNECTING:   { label: 'Connecting…',  color: 'bg-amber-400',   icon: Loader2, pulse: false },
    RECONNECTING: { label: 'Reconnecting', color: 'bg-amber-400',   icon: Loader2, pulse: false },
    STALE:        { label: 'Stale cache',  color: 'bg-rose-500',    icon: WifiOff, pulse: false },
    DISCONNECTED: { label: 'Offline',      color: 'bg-rose-500',    icon: WifiOff, pulse: false },
  } as const;

  const cfg = configs[state] ?? configs.DISCONNECTED;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="relative flex h-2 w-2">
        <span
          className={`${cfg.color} ${cfg.pulse ? 'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75' : 'hidden'}`}
        />
        <span className={`${cfg.color} relative inline-flex rounded-full h-2 w-2`} />
      </span>
      <Icon
        size={12}
        className={`${state === 'CONNECTING' || state === 'RECONNECTING' ? 'animate-spin' : ''} text-slate-400`}
      />
      <span className="text-slate-400">{cfg.label}</span>
    </div>
  );
}

// ─── Flag value display ───────────────────────────────────────────────────────

function FlagValue({ value, variant }: { value: boolean; variant: unknown }) {
  // If it's a boolean flag — show ON/OFF pill
  if (typeof variant === 'boolean' || variant === undefined || variant === null) {
    return value ? (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        ON
      </span>
    ) : (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">
        OFF
      </span>
    );
  }

  // String/number/json — show truncated value
  const display =
    typeof variant === 'string'
      ? variant
      : typeof variant === 'number'
        ? String(variant)
        : JSON.stringify(variant);

  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 truncate max-w-[90px]">
      {display}
    </span>
  );
}

// ─── Live flag evaluations table ──────────────────────────────────────────────

function FlagTable() {
  const flags = useAllFlags();

  return (
    <div className="space-y-1.5">
      {flags.map(({ key, value, variant }) => (
        <div
          key={key}
          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <span className="text-[10px] font-mono text-slate-400 truncate flex-1">{key}</span>
          <FlagValue value={value} variant={variant} />
        </div>
      ))}
    </div>
  );
}

// ─── Demo Lab panel ───────────────────────────────────────────────────────────

export function DemoLab() {
  const [open, setOpen] = useState(false);
  const { userId, plan, isBeta, setUserId, setPlan, setIsBeta } = useUserContext();

  return (
    <>
      {/* Toggle tab — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close Demo Lab' : 'Open Demo Lab'}
        className={`fixed top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5 px-2 py-4 rounded-l-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg transition-all duration-300 ease-in-out ${open ? 'right-72' : 'right-0'}`}
        style={{ writingMode: 'vertical-rl' }}
      >
        <Activity size={14} />
        Demo Lab
        <span className="rotate-180">
          {open ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </span>
      </button>

      {/* Sliding panel */}
      <aside
        className={`fixed top-0 right-0 h-full z-40 w-72 bg-slate-900 border-l border-slate-700/50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Demo Lab</span>
          </div>
          <ConnectionBadge />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* User context */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              User Context
            </h3>

            <div className="space-y-3">
              {/* User ID */}
              <div>
                <label className="block text-xs text-slate-400 mb-1" htmlFor="demo-user-id">
                  User ID
                </label>
                <input
                  id="demo-user-id"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="user-1"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs text-slate-400 mb-1" htmlFor="demo-plan">
                  Plan
                </label>
                <select
                  id="demo-plan"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as Plan)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Beta opt-in */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  className={`relative w-8 h-4 rounded-full transition-colors ${
                    isBeta ? 'bg-violet-600' : 'bg-slate-700'
                  }`}
                  onClick={() => setIsBeta(!isBeta)}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                      isBeta ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                  Internal Beta
                </span>
              </label>
            </div>

            {/* Context preview */}
            <div className="mt-3 p-2 rounded-md bg-slate-800/60 border border-slate-700/30">
              <p className="text-[10px] text-slate-500 font-mono">
                {`{ userId: "${userId}", plan: "${plan}", beta: "${isBeta ? 'true' : 'false'}" }`}
              </p>
            </div>
          </section>

          {/* Flag evaluations */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Live Flag Evaluations
            </h3>
            <FlagTable />
            <p className="mt-2 text-[10px] text-slate-600">
              Evaluated in-memory — zero network calls per flag.
            </p>
          </section>
        </div>

        {/* Footer — link to dashboard */}
        <div className="p-4 border-t border-slate-700/50">
          <Link
            href={env.NEXT_PUBLIC_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
          >
            Open Pulse Dashboard
            <ExternalLink size={11} />
          </Link>
        </div>
      </aside>
    </>
  );
}
