'use client';

import { useSession, signOut } from 'next-auth/react';
import {
  User, LogOut,
} from 'lucide-react';
import { Popover, PopoverItem, PopoverSeparator } from '@pulse-flags/ui';

export function UserMenuPopover({
  open,
  onClose,
  anchorRef,
  onAccount,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  onAccount?: () => void;
}) {
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'JP';

  const handleSignOut = () => {
    onClose();
    void signOut({ callbackUrl: '/login' });
  };

  return (
    <Popover open={open} onClose={onClose} anchorRef={anchorRef} width={260} side="bottom" align="end">
      {/* User info */}
      <div className="px-3 py-3 border-b border-border bg-surface-0">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-full bg-gradient-to-br from-primary/40 to-info/40 border border-border grid place-items-center font-mono text-[11px]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] truncate">{user?.name ?? 'User'}</div>
            <div className="font-mono text-[10.5px] text-muted-foreground truncate">{user?.email ?? ''}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-dim">
          <span className="size-1.5 rounded-full bg-primary live-dot" />
          <span>online</span>
        </div>
      </div>

      <div className="py-1">
        <PopoverItem
          icon={User}
          label="account settings"
          onClick={() => {
            onAccount?.();
            onClose();
          }}
        />
      </div>
      <PopoverSeparator />
      <div className="py-1">
        <PopoverItem icon={LogOut} label="sign out" danger hint="âŒ˜â‡§Q" onClick={handleSignOut} />
      </div>
    </Popover>
  );
}
