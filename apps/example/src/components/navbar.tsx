'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap } from 'lucide-react';
import { usePulseState } from '@/lib/hooks';
import { env } from '@/env';

const NAV_LINKS = [
  { href: '/',          label: 'Home'      },
  { href: '/pricing',   label: 'Pricing'   },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings',  label: 'Settings'  },
] as const;

function SseBadge() {
  const state = usePulseState();
  const isLive = state === 'CONNECTED';

  return (
    <div
      title={`SDK state: ${state}`}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
        isLive
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 pulse-dot' : 'bg-amber-400'}`}
      />
      {isLive ? 'Live' : state.toLowerCase()}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
      <nav className="max-w-5xl mx-auto px-6 pr-14 h-14 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">NovaPay</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <SseBadge />
          <Link
            href={env.NEXT_PUBLIC_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
          >
            Dashboard →
          </Link>
        </div>
      </nav>
    </header>
  );
}
