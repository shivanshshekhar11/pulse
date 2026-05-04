'use client';

import { Check, Flag, KeyRound, UserPlus, AlertTriangle, GitBranch } from 'lucide-react';
import {
  Popover,
  PopoverSeparator,
} from '~/components/primitives/popover';

type Tone = 'primary' | 'info' | 'warning' | 'destructive' | 'magenta';

type Notif = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const ITEMS: Notif[] = [
  { id: '1', icon: Flag, tone: 'primary', title: 'checkout-redesign-v2 enabled', body: 'by sam@acme.com in production · rollout 25%', time: '2m', unread: true },
  { id: '2', icon: KeyRound, tone: 'warning', title: 'API key expires in 3 days', body: 'ci-deploy-bot · ps_live_…a8f2', time: '1h', unread: true },
  { id: '3', icon: UserPlus, tone: 'info', title: 'Taylor accepted invite', body: 'joined acme-corp as member', time: '3h', unread: true },
  { id: '4', icon: AlertTriangle, tone: 'destructive', title: 'rule eval spike', body: 'novapay/production p99 > 12ms for 5m', time: 'yesterday', unread: false },
  { id: '5', icon: GitBranch, tone: 'magenta', title: "segment 'eu-pro' updated", body: 'by alex · v7 → v8', time: '2d', unread: false },
];

const TONE_MAP: Record<Tone, string> = {
  primary: 'text-primary bg-primary/10 border-primary/30',
  info: 'text-info bg-info/10 border-info/30',
  warning: 'text-warning bg-warning/10 border-warning/30',
  destructive: 'text-destructive bg-destructive/10 border-destructive/30',
  magenta: 'text-magenta bg-magenta/10 border-magenta/30',
};

export function NotificationsPopover({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const unread = ITEMS.filter((i) => i.unread).length;

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      width={380}
      side="bottom"
      align="end"
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
          // notifications{' '}
          {unread > 0 && (
            <span className="text-primary">· {unread} new</span>
          )}
        </div>
        <button
          type="button"
          className="font-mono text-[10.5px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Check className="size-3" /> mark all read
        </button>
      </div>
      <PopoverSeparator />
      <div className="max-h-[420px] overflow-y-auto">
        {ITEMS.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={onClose}
            className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-2 border-b border-border/50 last:border-b-0 ${
              n.unread ? 'bg-surface-1' : ''
            }`}
          >
            <div
              className={`size-7 rounded-md grid place-items-center border shrink-0 ${TONE_MAP[n.tone]}`}
            >
              <n.icon className="size-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[12.5px] truncate flex-1">{n.title}</div>
                <div className="font-mono text-[10px] text-dim shrink-0">
                  {n.time}
                </div>
              </div>
              <div className="font-mono text-[10.5px] text-muted-foreground truncate">
                {n.body}
              </div>
            </div>
            {n.unread && (
              <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0 live-dot" />
            )}
          </button>
        ))}
      </div>
      <PopoverSeparator />
      <button
        type="button"
        onClick={onClose}
        className="w-full px-3 py-2 font-mono text-[11px] text-center text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
      >
        view all activity →
      </button>
    </Popover>
  );
}
