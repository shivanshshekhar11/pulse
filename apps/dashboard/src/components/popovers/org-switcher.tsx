'use client';

import { Check, Plus, Settings, LogOut, Users } from 'lucide-react';
import type { UserOrgResponse } from '@pulse-flags/types';
import {
  Popover,
  PopoverHeader,
  PopoverItem,
  PopoverSeparator,
} from '~/components/primitives/popover';

export function OrgSwitcherPopover({
  open,
  onClose,
  anchorRef,
  orgs,
  currentSlug,
  onSelect,
  onCreate,
  onSettings,
  onSignOut,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  orgs?: UserOrgResponse[];
  currentSlug?: string;
  onSelect?: (orgSlug: string) => void;
  onCreate?: () => void;
  onSettings?: () => void;
  onSignOut?: () => void;
  loading?: boolean;
}) {
  const items = orgs ?? [];

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      width={280}
      side="bottom"
      align="start"
    >
      <PopoverHeader>// switch organization</PopoverHeader>
      <div className="py-1">
        {loading ? (
          <div className="px-3 py-2 text-[12px] text-muted-foreground font-mono">
            loading organizations...
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-muted-foreground font-mono">
            // no organizations yet
          </div>
        ) : (
          items.map((o) => {
            const active = o.slug === currentSlug;
            return (
              <button
                key={o.slug}
                type="button"
                onClick={() => {
                  onClose();
                  onSelect?.(o.slug);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  active ? 'bg-primary/10' : 'hover:bg-surface-2'
                }`}
              >
                <div
                  className="size-8 rounded-md bg-gradient-to-br from-primary/40 to-info/40 border border-border grid place-items-center font-mono text-[11px] uppercase shrink-0"
                >
                  {o.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] truncate">{o.name}</div>
                  <div className="font-mono text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                    <span>{o.plan}</span>
                    <span className="text-dim">·</span>
                    <Users className="size-2.5" />
                    <span>{o.role}</span>
                  </div>
                </div>
                {active && (
                  <Check className="size-3.5 text-primary shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>
      <PopoverSeparator />
      <div className="py-1">
        <PopoverItem
          icon={Plus}
          label="create organization"
          onClick={() => {
            onClose();
            onCreate?.();
          }}
        />
        <PopoverItem
          icon={Settings}
          label="organization settings"
          onClick={onSettings}
        />
        <PopoverSeparator />
        <PopoverItem icon={LogOut} label="sign out" danger onClick={onSignOut} />
      </div>
    </Popover>
  );
}
