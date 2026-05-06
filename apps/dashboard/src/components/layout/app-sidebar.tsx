'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  Users, KeyRound, ScrollText, Settings,
  Layers, Boxes, ChevronDown, Terminal,
} from 'lucide-react';
import { cn } from '~/lib/cn';
import { OrgSwitcherPopover } from '~/components/popovers/org-switcher';
import { useOrg, useCreateOrg } from '~/lib/hooks/use-org';
import { useUserOrgs } from '~/lib/hooks/use-user-orgs';
import { useEnvironments } from '~/lib/hooks/use-projects';
import { useSdkStream } from '~/lib/hooks/use-sdk-stream';
import { LiveUpdatesDialog } from '~/components/dialogs/live-updates-dialog';
import { OrgDialog } from '~/components/dialogs/org-dialog';

type NavItem = {
  href: (orgSlug: string) => string;
  // matchSegment is the URL segment that marks this item as active.
  // For org-level routes it's the literal segment (e.g. "segments").
  matchSegment: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
};

// All workspace nav items are org-scoped — no project/env dependency.
// Flags are accessed through Projects → Project Overview → View Flags.
const NAV_WORKSPACE: NavItem[] = [
  { href: (o) => `/${o}/projects`, matchSegment: 'projects', icon: Boxes, label: 'Projects' },
  { href: (o) => `/${o}/segments`, matchSegment: 'segments', icon: Layers, label: 'Segments' },
  { href: (o) => `/${o}/api-keys`, matchSegment: 'api-keys', icon: KeyRound, label: 'API Keys' },
  { href: (o) => `/${o}/members`, matchSegment: 'members', icon: Users, label: 'Members' },
  { href: (o) => `/${o}/audit`, matchSegment: 'audit', icon: ScrollText, label: 'Audit Log' },
];

const NAV_ORG: NavItem[] = [
  { href: (o) => `/${o}/settings`, matchSegment: 'settings', icon: Settings, label: 'Settings' },
];

function useRouteSegments() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  // /acme-corp                          → orgSlug=acme-corp, rest=[]
  // /acme-corp/segments                 → orgSlug=acme-corp, rest=[segments]
  // /acme-corp/novapay/staging/flags    → orgSlug=acme-corp, rest=[novapay,staging,flags]
  const orgSlug = parts[0] ?? '';

  // Determine the active sidebar segment.
  // For org-level routes (segments, api-keys, members, audit, settings, projects)
  // the active segment is parts[1].
  // For project-level routes (novapay/staging/flags) we highlight "projects".
  const secondSegment = parts[1] ?? '';
  const knownOrgSegments = new Set(['segments', 'api-keys', 'members', 'audit', 'settings', 'projects']);
  const activeSegment = knownOrgSegments.has(secondSegment) ? secondSegment : 'projects';

  const isProjectRoute = secondSegment !== '' && !knownOrgSegments.has(secondSegment);
  const projectSlug = isProjectRoute ? secondSegment : '';
  const envName = isProjectRoute ? (parts[2] ?? '') : '';

  return { orgSlug, activeSegment, projectSlug, envName, isProjectRoute };
}

export function AppSidebar() {
  const { orgSlug, activeSegment, projectSlug, envName, isProjectRoute } = useRouteSegments();
  const router = useRouter();
  const { data: org } = useOrg(orgSlug);
  const { data: orgs, isLoading: orgsLoading } = useUserOrgs();
  const createOrg = useCreateOrg();
  const { data: environments } = useEnvironments(orgSlug, projectSlug);
  const env = environments?.find((e) => e.name === envName);
  const envId = env?.id;
  const stream = useSdkStream({ envId, enabled: isProjectRoute && !!envId });

  const orgBtnRef = useRef<HTMLButtonElement | null>(null);
  const [orgOpen, setOrgOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  const planLabel = org?.plan ? `${org.plan} plan` : 'loading plan';

  const statusTone = {
    connected: 'text-primary',
    connecting: 'text-warning',
    reconnecting: 'text-warning',
    error: 'text-destructive',
    'missing-key': 'text-muted-foreground',
    idle: 'text-muted-foreground',
  }[stream.status];

  const dotTone = {
    connected: 'bg-primary',
    connecting: 'bg-warning',
    reconnecting: 'bg-warning',
    error: 'bg-destructive',
    'missing-key': 'bg-dim',
    idle: 'bg-dim',
  }[stream.status];

  const statusLabel = {
    connected: 'connected',
    connecting: 'connecting',
    reconnecting: 'reconnecting',
    error: 'error',
    'missing-key': 'needs key',
    idle: 'idle',
  }[stream.status];

  return (
    <>
      <aside className="w-[240px] shrink-0 border-r border-border bg-surface-0 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border">
          <div className="size-7 rounded-md bg-primary/15 border border-primary/40 grid place-items-center glow-primary">
            <Terminal className="size-3.5 text-primary" strokeWidth={2.5} />
          </div>
          <div className="font-mono leading-none">
            <div className="text-[15px] tracking-tight">pulse<span className="text-primary">_</span></div>
            <div className="text-[10px] text-muted-foreground mt-0.5">v0.1.0</div>
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
            {(org?.name ?? orgSlug ?? '?').slice(0, 1)}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-[12px] truncate">{org?.name ?? orgSlug}</div>
            <div className="text-[10px] text-muted-foreground font-mono truncate">
              {planLabel}
            </div>
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
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
                href={item.href(orgSlug)}
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

        {/* SSE status footer */}
        <div className="border-t border-border px-3 py-2.5 font-mono text-[10px] space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>live updates</span>
            <span className={`flex items-center gap-1.5 ${statusTone}`}>
              <span className={`size-1.5 rounded-full ${dotTone} ${stream.status === 'connected' ? 'live-dot' : ''}`} />
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>env</span>
            <span>{envName || '—'}</span>
          </div>
          {isProjectRoute && envId && (stream.status === 'missing-key' || stream.status === 'error') && (
            <button
              type="button"
              onClick={() => setLiveOpen(true)}
              className="w-full text-left text-[10px] text-primary hover:underline"
            >
              set live updates key
            </button>
          )}
        </div>
      </aside>

      <OrgSwitcherPopover
        open={orgOpen}
        onClose={() => setOrgOpen(false)}
        anchorRef={orgBtnRef}
        orgs={orgs}
        currentSlug={orgSlug}
        loading={orgsLoading}
        onSelect={(slug) => router.push(`/${slug}/projects`)}
        onSettings={() => {
          setOrgOpen(false);
          router.push(`/${orgSlug}/settings`);
        }}
        onCreate={() => {
          setOrgOpen(false);
          setCreateOrgOpen(true);
        }}
        onSignOut={() => void signOut({ callbackUrl: '/login' })}
      />
      <LiveUpdatesDialog
        open={liveOpen}
        onClose={() => setLiveOpen(false)}
        envId={envId}
        envName={envName}
      />
      <OrgDialog
        open={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        loading={createOrg.isPending}
        onSubmit={(values) => {
          createOrg.mutate(values, {
            onSuccess: (org) => {
              setCreateOrgOpen(false);
              router.push(`/${org.slug}/projects`);
            },
          });
        }}
      />
    </>
  );
}

function NavRow({ item, href, active }: { item: NavItem; href: string; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[12.5px] transition-colors',
          active
            ? 'bg-primary/10 text-primary border-l-2 border-primary -ml-px pl-[7px]'
            : 'text-foreground/80 hover:bg-surface-1 hover:text-foreground',
        )}
      >
        <Icon className="size-3.5" strokeWidth={2} />
        <span className="flex-1">{item.label}</span>
      </Link>
    </li>
  );
}
