'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { ChevronRight, Bell, GitBranch, Plus } from 'lucide-react';
import { cn } from '~/lib/cn';
import { NotificationsPopover } from '~/components/popovers/notifications';
import { UserMenuPopover } from '~/components/popovers/user-menu';
import { FlagDialog } from '~/components/dialogs/flag-dialog';

const ENVS = [
  { name: 'production', color: '#ff5d5d', flags: 47 },
  { name: 'staging', color: '#f0b95a', flags: 52 },
  { name: 'development', color: '#6bc5ff', flags: 61 },
];

export function TopBar() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  const orgSlug = parts[0] ?? 'acme-corp';
  const projectSlug = parts[1] ?? 'novapay';
  const envName = parts[2] ?? 'staging';
  const section = parts[3] ?? 'flags';

  const bellRef = useRef<HTMLButtonElement | null>(null);
  const avatarRef = useRef<HTMLButtonElement | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border bg-surface-0 flex items-center px-6 gap-4 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-mono text-[12px]">
          <Link
            href={`/${orgSlug}/projects`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {orgSlug}
          </Link>
          <ChevronRight className="size-3 text-dim" />
          <Link
            href={`/${orgSlug}/${projectSlug}/${envName}/flags`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {projectSlug}
          </Link>
          <ChevronRight className="size-3 text-dim" />
          <span className="text-foreground flex items-center gap-1.5">
            <GitBranch className="size-3 text-primary" />
            {section}
          </span>
        </div>

        {/* Environment tabs */}
        <div className="ml-6 flex items-center gap-1 p-0.5 bg-surface-1 rounded-md border border-border">
          {ENVS.map((env) => (
            <Link
              key={env.name}
              href={`/${orgSlug}/${projectSlug}/${env.name}/flags`}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1 rounded text-[12px] font-mono transition-colors',
                envName === env.name
                  ? 'bg-surface-3 text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: env.color }}
              />
              {env.name}
              <span className="text-[10px] text-dim">{env.flags}</span>
            </Link>
          ))}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href="/docs"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-mono text-muted-foreground hover:text-foreground hover:bg-surface-1 border border-border transition-colors"
          >
            docs
          </a>

          {/* Notifications */}
          <button
            ref={bellRef}
            type="button"
            aria-label="Notifications"
            onClick={() => setNotifOpen(true)}
            className="relative size-8 grid place-items-center rounded-md hover:bg-surface-1 border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="size-3.5" />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
          </button>

          {/* New flag */}
          <button
            type="button"
            onClick={() => setFlagDialogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" strokeWidth={2.5} />
            new flag
          </button>

          {/* User avatar */}
          <button
            ref={avatarRef}
            type="button"
            onClick={() => setUserMenuOpen(true)}
            className="ml-2 size-8 rounded-md bg-gradient-to-br from-magenta/40 to-info/40 border border-border grid place-items-center font-mono text-[11px] hover:border-border-strong transition-colors"
            aria-label="User menu"
          >
            jp
          </button>
        </div>
      </header>

      {/* Popovers */}
      <NotificationsPopover
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        anchorRef={bellRef}
      />
      <UserMenuPopover
        open={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        anchorRef={avatarRef}
      />

      {/* Dialogs */}
      <FlagDialog
        open={flagDialogOpen}
        onClose={() => setFlagDialogOpen(false)}
      />
    </>
  );
}
