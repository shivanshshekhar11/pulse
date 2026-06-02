'use client';

import { usePulseFlag } from '@/lib/hooks';
import { useUserContext } from '@/lib/user-context';
import { TrendingUp, Users, DollarSign, Download, BarChart3 } from 'lucide-react';

// ─── Animated bar chart for the new analytics widget ─────────────────────────

const BAR_DATA = [
  { label: 'Mon', height: 55, predicted: 62 },
  { label: 'Tue', height: 72, predicted: 80 },
  { label: 'Wed', height: 48, predicted: 58 },
  { label: 'Thu', height: 90, predicted: 95 },
  { label: 'Fri', height: 65, predicted: 74 },
  { label: 'Sat', height: 38, predicted: 50 },
  { label: 'Sun', height: 44, predicted: 55 },
] as const;

function PredictiveChart() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white text-sm">Predictive Revenue</h3>
          <p className="text-xs text-violet-400">AI-powered forecast 🚀</p>
        </div>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Actual
          </span>
          <span className="flex items-center gap-1 text-violet-400">
            <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" /> Forecast
          </span>
        </div>
      </div>
      <div className="flex items-end gap-2 flex-1" data-testid="new-widget">
        {BAR_DATA.map(({ label, height, predicted }, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end" style={{ height: 80 }}>
              <div
                className="flex-1 rounded-t-sm bg-indigo-500/80 bar-grow"
                style={{
                  height: `${height}%`,
                  animationDelay: `${i * 60}ms`,
                }}
              />
              <div
                className="flex-1 rounded-t-sm bg-violet-500/50 bar-grow"
                style={{
                  height: `${predicted}%`,
                  animationDelay: `${i * 60 + 30}ms`,
                }}
              />
            </div>
            <span className="text-[9px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── KPI cards ────────────────────────────────────────────────────────────────

const KPI_CARDS = [
  { label: 'Revenue',       value: '$128,430', delta: '+12.4%', icon: DollarSign, color: 'text-emerald-400' },
  { label: 'Active Users',  value: '24,891',   delta: '+5.8%',  icon: Users,      color: 'text-blue-400'    },
  { label: 'Transactions',  value: '1.2M',     delta: '+18.2%', icon: TrendingUp, color: 'text-violet-400'  },
] as const;

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  // Context comes from global UserContextProvider — Demo Lab controls this
  const { userId, isBeta, setUserId, setIsBeta } = useUserContext();

  const { value: hasNewWidget } = usePulseFlag('new_analytics_widget');
  const { value: hasExport }    = usePulseFlag('beta_export_feature');

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Viewing as{' '}
            <code className="font-mono text-violet-300 bg-slate-800 px-1 py-0.5 rounded text-xs">
              {userId}
            </code>
          </p>
        </div>

        {hasExport && (
          <button
            data-testid="export-feature"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
          >
            <Download size={14} />
            Export Data (Beta)
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {KPI_CARDS.map(({ label, value, delta, icon: Icon, color }, i) => (
          <div
            key={label}
            className="glass p-5 rounded-xl slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className={`text-xs mt-1 ${color}`}>{delta} this month</p>
          </div>
        ))}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Standard chart — always shown */}
        <div className="glass p-5 rounded-xl h-48 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white text-sm">Monthly Revenue</h3>
            <BarChart3 size={14} className="text-slate-500" />
          </div>
          <div className="flex items-end gap-2 flex-1">
            {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-slate-600/60 bar-grow"
                style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>

        {/* New analytics widget — percentage rollout flag */}
        {hasNewWidget ? (
          <div className="glass border-violet-500/30 p-5 rounded-xl h-48 bg-gradient-to-br from-violet-900/20 to-slate-900/40">
            <PredictiveChart />
          </div>
        ) : (
          <div className="glass p-5 rounded-xl h-48 flex items-center justify-center">
            <p className="text-slate-500 text-sm text-center">
              Predictive analytics widget
              <br />
              <span className="text-xs">(10% rollout — change userId to unlock)</span>
            </p>
          </div>
        )}
      </div>

      {/*
       * ── Test-compatibility shim ─────────────────────────────────────────────
       * These hidden inputs sync to the global UserContext so Playwright tests
       * that interact with data-testid="user-id-input" and "beta-checkbox"
       * continue to work without touching the Demo Lab sidebar.
       */}
      <div className="relative h-6">
        <input
          data-testid="user-id-input"
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          tabIndex={-1}
          className="absolute top-0 left-0 opacity-0 pointer-events-auto z-[9999] w-6 h-6 cursor-pointer"
        />
        <input
          data-testid="beta-checkbox"
          type="checkbox"
          checked={isBeta}
          onChange={(e) => setIsBeta(e.target.checked)}
          tabIndex={-1}
          className="absolute top-0 left-0 opacity-0 pointer-events-auto z-[9999] w-6 h-6 cursor-pointer"
        />
      </div>
    </div>
  );
}
