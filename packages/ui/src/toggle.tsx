'use client';

import { cn } from './lib/cn';

export function Toggle({
  on,
  onChange,
  size = 'md',
  disabled = false,
  className,
}: {
  on: boolean;
  onChange?: (next: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) {
  const dims = {
    sm: { track: 'w-7 h-4', knob: 'size-3', on: 'translate-x-3' },
    md: { track: 'w-9 h-5', knob: 'size-4', on: 'translate-x-4' },
    lg: { track: 'w-11 h-6', knob: 'size-5', on: 'translate-x-5' },
  }[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!on);
      }}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        dims.track,
        on ? 'bg-primary' : 'bg-surface-3',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none block rounded-full shadow-sm transition-transform',
          dims.knob,
          on ? dims.on : 'translate-x-0',
          on ? 'bg-background' : 'bg-foreground'
        )}
      />
    </button>
  );
}
