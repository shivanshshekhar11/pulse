'use client';

import { useEffect, useRef } from 'react';

export function Popover({
  open,
  onClose,
  anchorRef,
  align = 'start',
  side = 'bottom',
  offset = 8,
  width,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  align?: 'start' | 'end' | 'center';
  side?: 'bottom' | 'top' | 'right';
  offset?: number;
  width?: number | string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(t) &&
        anchorRef.current &&
        !anchorRef.current.contains(t)
      ) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();

    const reposition = () => {
      const a = anchorRef.current;
      const p = ref.current;
      if (!a || !p) return;
      const r = a.getBoundingClientRect();
      let top = 0;
      let left = 0;
      if (side === 'bottom') {
        top = r.bottom + offset;
        left =
          align === 'start'
            ? r.left
            : align === 'end'
              ? r.right - p.offsetWidth
              : r.left + r.width / 2 - p.offsetWidth / 2;
      } else if (side === 'top') {
        top = r.top - p.offsetHeight - offset;
        left =
          align === 'start'
            ? r.left
            : align === 'end'
              ? r.right - p.offsetWidth
              : r.left + r.width / 2 - p.offsetWidth / 2;
      } else {
        top = r.top;
        left = r.right + offset;
      }
      const maxLeft = window.innerWidth - p.offsetWidth - 8;
      const maxTop = window.innerHeight - p.offsetHeight - 8;
      p.style.top = `${Math.max(8, Math.min(top, maxTop))}px`;
      p.style.left = `${Math.max(8, Math.min(left, maxLeft))}px`;
    };

    reposition();
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, anchorRef, onClose, side, align, offset]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      className="fixed z-[90] rounded-md border border-border bg-surface-1 shadow-2xl shadow-black/40 scale-in overflow-hidden"
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
    >
      {children}
    </div>
  );
}

export function PopoverItem({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
  active,
  trailing,
  disabled,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick?: () => void;
  danger?: boolean;
  active?: boolean;
  trailing?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition-colors ${
        disabled
          ? 'text-muted-foreground/60 cursor-not-allowed'
          : danger
          ? 'text-destructive hover:bg-destructive/10'
          : active
            ? 'bg-primary/10 text-primary'
            : 'text-foreground hover:bg-surface-2'
      }`}
    >
      {Icon && <Icon className="size-3.5 shrink-0" />}
      <span className="flex-1 truncate">{label}</span>
      {hint && (
        <span className="font-mono text-[10.5px] text-dim">{hint}</span>
      )}
      {trailing}
    </button>
  );
}

export function PopoverSeparator() {
  return <div className="h-px bg-border my-1" />;
}

export function PopoverHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-2.5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
      {children}
    </div>
  );
}
