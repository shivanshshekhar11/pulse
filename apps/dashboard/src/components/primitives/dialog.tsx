'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Dialog({
  open,
  onClose,
  children,
  size = 'md',
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  dismissable?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (dismissable) document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      if (dismissable) document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, dismissable]);

  if (!open) return null;

  const widths = {
    sm: 'max-w-[420px]',
    md: 'max-w-[540px]',
    lg: 'max-w-[720px]',
    xl: 'max-w-[960px]',
  }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm overlay-in"
        onClick={dismissable ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${widths} rounded-lg border border-border bg-surface-1 shadow-2xl shadow-black/50 scale-in overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  title,
  subtitle,
  onClose,
  tone = 'default',
  crumb = 'action',
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  tone?: 'default' | 'danger';
  crumb?: string;
}) {
  return (
    <header
      className={`px-6 py-5 border-b flex items-start justify-between gap-4 ${
        tone === 'danger'
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-border'
      }`}
    >
      <div className="min-w-0">
        <div
          className={`font-mono text-[10.5px] uppercase tracking-[0.2em] mb-1.5 ${
            tone === 'danger' ? 'text-destructive' : 'text-dim'
          }`}
        >
          // {crumb}
        </div>
        <h2 className="font-mono text-[18px] truncate">{title}</h2>
        {subtitle && (
          <p className="text-[12.5px] text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="size-7 grid place-items-center rounded hover:bg-surface-2 text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="size-4" />
        </button>
      )}
    </header>
  );
}

export function DialogBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-6 py-5 max-h-[70vh] overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

export function DialogFooter({
  children,
  hint,
}: {
  children?: React.ReactNode;
  hint?: string;
}) {
  return (
    <footer className="px-6 py-4 border-t border-border bg-surface-0/50 flex items-center justify-between gap-3">
      {hint ? <p className="font-mono text-[11px] text-dim">{hint}</p> : <span />}
      <div className="flex items-center gap-2">{children}</div>
    </footer>
  );
}
