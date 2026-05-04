'use client';

import { Check, Plus, Settings, LogOut, Users } from 'lucide-react';
import {
  Popover,
  PopoverHeader,
  PopoverItem,
  PopoverSeparator,
} from '~/components/primitives/popover';

const ORGS = [
  { slug: 'acme-corp', name: 'Acme Corp', plan: 'enterprise', members: 23, color: 'from-primary/40 to-info/40', current: true },
  { slug: 'lighthouse-labs', name: 'Lighthouse Labs', plan: 'pro', members: 7, color: 'from-magenta/40 to-warning/40', current: false },
  { slug: 'personal', name: 'personal', plan: 'free', members: 1, color: 'from-info/40 to-magenta/40', current: false },
];

export function OrgSwitcherPopover({
  open,
  onClose,
  anchorRef,
  onCreate,
  onSettings,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onCreate?: () => void;
  onSettings?: () => void;
}) {
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
        {ORGS.map((o) => (
          <button
            key={o.slug}
            type="button"
            onClick={onClose}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
              o.current ? 'bg-primary/10' : 'hover:bg-surface-2'
            }`}
          >
            <div
              className={`size-8 rounded-md bg-gradient-to-br ${o.color} border border-border grid place-items-center font-mono text-[11px] uppercase shrink-0`}
            >
              {o.name.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] truncate">{o.name}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                <span>{o.plan}</span>
                <span className="text-dim">·</span>
                <Users className="size-2.5" />
                <span>{o.members}</span>
              </div>
            </div>
            {o.current && (
              <Check className="size-3.5 text-primary shrink-0" />
            )}
          </button>
        ))}
      </div>
      <PopoverSeparator />
      <div className="py-1">
        <PopoverItem
          icon={Plus}
          label="create organization"
          onClick={onCreate}
          hint="⌘N"
        />
        <PopoverItem
          icon={Settings}
          label="organization settings"
          onClick={onSettings}
        />
        <PopoverSeparator />
        <PopoverItem icon={LogOut} label="sign out" danger />
      </div>
    </Popover>
  );
}
