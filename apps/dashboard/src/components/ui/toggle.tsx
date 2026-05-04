'use client';

/**
 * Toggle — custom pill switch used throughout the dashboard.
 * Uses a plain button (not Radix Switch) to keep the animation
 * exactly as designed in the Figma source.
 */
export function Toggle({
  on,
  onChange,
  size = 'md',
  disabled = false,
}: {
  on: boolean;
  onChange?: (next: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}) {
  const dims = {
    sm: {
      track: 'w-9 h-5',
      knob: 'size-[14px]',
      on: 'translate-x-[19px]',
      off: 'translate-x-[3px]',
    },
    md: {
      track: 'w-11 h-6',
      knob: 'size-[18px]',
      on: 'translate-x-[23px]',
      off: 'translate-x-[3px]',
    },
    lg: {
      track: 'w-14 h-7',
      knob: 'size-[22px]',
      on: 'translate-x-[31px]',
      off: 'translate-x-[3px]',
    },
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
      className={`relative ${dims.track} rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
        on ? 'bg-primary' : 'bg-surface-3'
      }`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 ${dims.knob} rounded-full bg-background transition-transform ${
          on ? dims.on : dims.off
        }`}
      />
    </button>
  );
}
