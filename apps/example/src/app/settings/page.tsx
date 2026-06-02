'use client';

import { usePulseFlag } from '@/lib/hooks';
import { useUserContext } from '@/lib/user-context';
import { User, Bell, Shield, Download, ChevronRight, Lock } from 'lucide-react';

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass p-6 rounded-xl ${className}`}>
      {children}
    </div>
  );
}

export default function Settings() {
  const { userId, plan } = useUserContext();
  const { value: canExport } = usePulseFlag('beta_export_feature');

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your profile, preferences, and feature access.
        </p>
      </div>

      {/* Profile */}
      <SectionCard>
        <div className="flex items-center gap-3 mb-5">
          <User size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">User ID</label>
            <div className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 font-mono">
              {userId}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Change your User ID from the Demo Lab to test different targeting rules.
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Plan</label>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  plan === 'enterprise'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : plan === 'pro'
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      : 'bg-slate-700 text-slate-400 border border-slate-600'
                }`}
              >
                {plan}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard>
        <div className="flex items-center gap-3 mb-5">
          <Bell size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Email alerts on failed payments', enabled: true  },
            { label: 'Weekly revenue digest',           enabled: true  },
            { label: 'New feature announcements',       enabled: false },
          ].map(({ label, enabled }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-slate-300">{label}</span>
              <div
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  enabled ? 'bg-violet-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard>
        <div className="flex items-center gap-3 mb-5">
          <Shield size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Security</h2>
        </div>
        <div className="space-y-2">
          {['Change password', 'Two-factor authentication', 'Active sessions'].map((item) => (
            <button
              key={item}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-sm text-slate-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lock size={13} className="text-slate-500" />
                {item}
              </div>
              <ChevronRight size={14} className="text-slate-500" />
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Beta: Data Export — gated by beta_export_feature flag */}
      {canExport && (
        <SectionCard
          data-testid="export-feature"
          className="border-emerald-500/30 bg-emerald-900/10"
        >
          <div className="flex items-center gap-3 mb-3">
            <Download size={16} className="text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Data Export</h2>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 ml-1">
                Beta
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Export your complete transaction history and analytics data as CSV or JSON.
          </p>
          <div className="flex gap-3">
            <button
              data-testid="export-feature"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
            >
              <Download size={14} />
              Export as CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors">
              Export as JSON
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            This panel is gated by the{' '}
            <code className="font-mono bg-slate-800 px-1 rounded text-slate-400">
              beta_export_feature
            </code>{' '}
            flag. Enable the{' '}
            <strong className="text-slate-400">Internal Beta</strong> toggle in the Demo Lab to
            unlock it.
          </p>
        </SectionCard>
      )}
    </div>
  );
}
