'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronRight, GitBranch, Plus } from 'lucide-react';
import { cn } from '~/lib/cn';
import { UserMenuPopover } from '~/components/popovers/user-menu';
import { FlagDialog } from '~/components/dialogs/flag-dialog';
import { useEnvironments } from '~/lib/hooks/use-projects';

// These are known org-level route segments â€” not project slugs.
const ORG_SEGMENTS = new Set([
  'segments', 'api-keys', 'members', 'audit', 'settings', 'projects',
]);

function useRouteContext() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  const orgSlug = parts[0] ?? '';
  const secondSegment = parts[1] ?? '';

  // If the second segment is a known org-level route, we're NOT inside a project.
  const isProjectRoute = secondSegment !== '' && !ORG_SEGMENTS.has(secondSegment);

  const projectSlug = isProjectRoute ? secondSegment : '';
  const envName = isProjectRoute ? (parts[2] ?? '') : '';
  // The last meaningful segment for the breadcrumb label
  const section = isProjectRoute
    ? (parts[3] ?? 'flags')
    : secondSegment;

  return { orgSlug, projectSlug, envName, section, isProjectRoute };
}

export function TopBar() {
  const { orgSlug, projectSlug, envName, section, isProjectRoute } = useRouteContext();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: environments } = useEnvironments(orgSlug, projectSlug);

  const avatarRef = useRef<HTMLButtonElement | null>(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toLowerCase()
    : user?.email?.slice(0, 2).toLowerCase() ?? '??';

  // Env tabs: show only real environments
  const envList = isProjectRoute ? (environments ?? []) : [];

  return (
    <>
      <header className="h-14 border-b border-border bg-surface-0 flex items-center px-6 gap-4 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 font-mono text-[12px]">
          {orgSlug && (
            <>
              <Link
                href={`/${orgSlug}/projects`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {orgSlug}
              </Link>
              {isProjectRoute && projectSlug && (
                <>
                  <ChevronRight className="size-3 text-dim" />
                  <Link
                    href={`/${orgSlug}/${projectSlug}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {projectSlug}
                  </Link>
                </>
              )}
              <ChevronRight className="size-3 text-dim" />
              <span className="text-foreground flex items-center gap-1.5">
                <GitBranch className="size-3 text-primary" />
                {section}
              </span>
            </>
          )}
        </div>

        {/* Environment tabs â€” only inside a project */}
        {isProjectRoute && envList.length > 0 && (
          <div className="ml-6 flex items-center gap-1 p-0.5 bg-surface-1 rounded-md border border-border">
            {envList.map((env) => (
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
                <span className="size-1.5 rounded-full" style={{ backgroundColor: env.color }} />
                {env.name}
              </Link>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* New flag â€” only when inside a project env */}
          {isProjectRoute && projectSlug && envName && (
            <button
              type="button"
              onClick={() => setFlagDialogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
              new flag
            </button>
          )}

          <button
            ref={avatarRef}
            type="button"
            onClick={() => setUserMenuOpen(true)}
            className="ml-2 size-8 rounded-md bg-gradient-to-br from-magenta/40 to-info/40 border border-border grid place-items-center font-mono text-[11px] hover:border-border-strong transition-colors"
            aria-label="User menu"
          >
            {initials}
          </button>
        </div>
      </header>

      <UserMenuPopover
        open={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        anchorRef={avatarRef}
        onAccount={() => router.push(`/${orgSlug}/settings`)}
      />
      <FlagDialog open={flagDialogOpen} onClose={() => setFlagDialogOpen(false)} />
    </>
  );
}
