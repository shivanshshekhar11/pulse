'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  Flag,
  Users,
  KeyRound,
  ScrollText,
  Settings,
  Layers,
  Boxes,
  ChevronDown,
  Activity,
  Terminal,
  Search,
} from 'lucide-react';
import { cn } from '~/lib/cn';
import { OrgSwitcherPopover } from '~/components/popovers/org-switcher';
import { CommandPalette } from '~/components/popovers/command-palette';

type NavItem = {
  href: (orgSlug: string, projectSlug?: string, envName?: string) => string;
  matchSegment: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  badge?: string;
};

const NAV_WORKSPACE: NavItem[] = [
  { href: (o, p, e) => `/${o}/${p}/${e}/flags`, matchSegment: 'flags', icon: Flag, label: 'Flags', badge: '47' },
  { href: (o) => `/${o}/segments`, matchSegment: 'segments', icon: Layers, label: 'Segments', badge: '12' },
  { href: (o) => `/${o}/api-keys`, matchSegment: 'api-keys', icon: KeyRound, label: 'API Keys', badge: '8' },
  { href: (o) => `/${o}/members`, matchSegment: 'members', icon: Users, label: 'Members', badge: '23' },
  { href: (o) => `/${o}/audit`, matchSegment: 'audit', icon: ScrollText, label: 'Audit Log' },
  { href: (o) => `/${o}/live-stream`, matchSegment: 'live-stream', icon: Activity, label: 'Live Stream' },
];

const NAV_ORG: NavItem[] = [
  { href: (o) => `/${o}/projects`, matchSegment: 'projects', icon: Boxes, label: 'Projects' },
  { href: (o) => `/${o}/settings`, matchSegment: 'settings', icon: Settings, label: 'Settings' },
];

function useRouteSegments() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  return {
    orgSlug: parts[0] ?? 'acme-corp',
    projectSlug: parts[1] ?? 'novapay',
    envName: parts[2] ?? 'staging',
    activeSegment: parts[parts.length - 1] ?? '',
  };
}

export function AppSidebar() {
  const { orgSlug, projectSlug, envName, activeSegment } = useRouteSegments();
  const router = useRouter();

  const orgBtnRef = useRef<HTMLButtonElement | null>(null);
  const [orgOpen, setOrgOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <aside className="w-[240px] shrink-0 border-r border-border bg-surface-0 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <div className="size-7 rounded-md bg-primary/15 border border-primary/40 grid place-items-center glow-primary">
            <Terminal className="size-3.5 text-primary" strokeWidth={2.5} />
          </div>
          <div className="font-mono leading-none">
            <div className="text-[15px] tracking-tight">
              pulse<span className="text-primary">_</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              v0.1.0
            </div>
          </div>
        </div>

        {/* Org switcher */}
        <button
          ref={orgBtnRef}
          type="button"
          onClick={() => setOrgOpen(true)}
          className="mx-3 mt-3 flex items-center gap-2 px-2.5 py-2 rounded-md bg-surface-1 border border-border hover:border-border-strong transition-colors"
        >
          <div className="size-6 rounded bg-gradient-to-br from-primary/40 to-primary/10 border border-primary/30 grid place-items-center font-mono text-[10px] text-primary uppercase">
            {orgSlug.slice(0, 1)}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-[12px] truncate">{orgSlug}</div>
            <div className="text-[10px] text-muted-foreground font-mono">
              enterprise · 23 members
            </div>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>

        {/* Search / command palette trigger */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="mx-3 mt-3 relative text-left"
        >
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <div className="w-full pl-8 pr-10 py-1.5 bg-surface-1 border border-border rounded-md text-[12px] font-mono text-muted-foreground hover:border-border-strong transition-colors">
            search...
          </div>
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-mono px-1 py-0.5 rounded border border-border bg-surface-2">
            ⌘K
          </kbd>
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto mt-5 px-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-dim font-mono px-2 mb-1.5">
            // workspace
          </p>
          <ul className="space-y-0.5">
            {NAV_WORKSPACE.map((item) => (
              <NavRow
                key={item.label}
                item={item}
                href={item.href(orgSlug, projectSlug, envName)}
                active={activeSegment === item.matchSegment}
              />
            ))}
          </ul>

          <p className="text-[10px] uppercase tracking-[0.15em] text-dim font-mono px-2 mt-5 mb-1.5">
            // organization
          </p>
          <ul className="space-y-0.5">
            {NAV_ORG.map((item) => (
              <NavRow
                key={item.label}
                item={item}
                href={item.href(orgSlug)}
                active={activeSegment === item.matchSegment}
              />
            ))}
          </ul>
        </nav>

        {/* Status footer */}
        <div className="border-t border-border px-3 py-2.5 font-mono text-[10px] space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>SSE</span>
            <span className="flex items-center gap-1.5 text-primary">
              <span className="size-1.5 rounded-full bg-primary live-dot" />
              connected
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>region</span>
            <span>us-east-1</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>latency</span>
            <span className="text-foreground">12ms</span>
          </div>
        </div>
      </aside>

      {/* Popovers rendered outside the aside so they can escape overflow */}
      <OrgSwitcherPopover
        open={orgOpen}
        onClose={() => setOrgOpen(false)}
        anchorRef={orgBtnRef}
        onSettings={() => {
          setOrgOpen(false);
          router.push(`/${orgSlug}/settings`);
        }}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}

function NavRow({
  item,
  href,
  active,
}: {
  item: NavItem;
  href: string;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[12.5px] transition-colors group',
          active
            ? 'bg-primary/10 text-primary border-l-2 border-primary -ml-px pl-[7px]'
            : 'text-foreground/80 hover:bg-surface-1 hover:text-foreground',
        )}
      >
        <Icon className="size-3.5" strokeWidth={2} />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span
            className={cn(
              'font-mono text-[10px] px-1.5 py-0.5 rounded',
              active
                ? 'bg-primary/20 text-primary'
                : 'bg-surface-2 text-muted-foreground',
            )}
          >
            {item.badge}
          </span>
        )}
      </Link>
    </li>
  );
}
