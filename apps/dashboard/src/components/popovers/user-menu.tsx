'use client';

import {
  User,
  Settings,
  Keyboard,
  Sun,
  Moon,
  BookOpen,
  LifeBuoy,
  LogOut,
  KeyRound,
} from 'lucide-react';
import {
  Popover,
  PopoverItem,
  PopoverSeparator,
} from '~/components/primitives/popover';

export function UserMenuPopover({
  open,
  onClose,
  anchorRef,
  onAccount,
  onShortcuts,
  theme = 'dark',
  onToggleTheme,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onAccount?: () => void;
  onShortcuts?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}) {
  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      width={260}
      side="bottom"
      align="end"
    >
      {/* User info header */}
      <div className="px-3 py-3 border-b border-border bg-surface-0">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-full bg-gradient-to-br from-primary/40 to-info/40 border border-border grid place-items-center font-mono text-[11px]">
            AK
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] truncate">Alex Kowalski</div>
            <div className="font-mono text-[10.5px] text-muted-foreground truncate">
              alex@acme.com
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-dim">
          <span className="size-1.5 rounded-full bg-primary live-dot" />
          <span>online</span>
          <span className="text-dim">·</span>
          <span>owner</span>
        </div>
      </div>

      <div className="py-1">
        <PopoverItem icon={User} label="account settings" onClick={onAccount} />
        <PopoverItem icon={KeyRound} label="personal API tokens" />
        <PopoverItem icon={Settings} label="preferences" />
        <PopoverItem
          icon={Keyboard}
          label="keyboard shortcuts"
          hint="?"
          onClick={onShortcuts}
        />
      </div>
      <PopoverSeparator />
      <div className="py-1">
        <PopoverItem
          icon={theme === 'dark' ? Sun : Moon}
          label={theme === 'dark' ? 'switch to light' : 'switch to dark'}
          onClick={onToggleTheme}
        />
        <PopoverItem icon={BookOpen} label="documentation" hint="↗" />
        <PopoverItem icon={LifeBuoy} label="support" hint="↗" />
      </div>
      <PopoverSeparator />
      <div className="py-1">
        <PopoverItem icon={LogOut} label="sign out" danger hint="⌘⇧Q" />
      </div>
    </Popover>
  );
}
