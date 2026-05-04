'use client';

import { ChevronDown } from 'lucide-react';

// ── Field ─────────────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {hint && !error && (
          <span className="text-[11px] text-dim">{hint}</span>
        )}
        {error && (
          <span className="text-[11px] text-destructive font-mono">{error}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

const inputBase =
  'w-full px-3 py-2 bg-surface-0 border border-border rounded-md text-[13px] placeholder:text-dim focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-60';

export function Input({
  mono,
  prefix: prefixProp,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
  mono?: boolean;
  prefix?: React.ReactNode;
}) {
  if (prefixProp) {
    if (typeof prefixProp === 'string') {
      return (
        <div className="flex items-center">
          <span className="px-3 py-2 bg-surface-2 border border-r-0 border-border rounded-l-md text-[13px] text-muted-foreground font-mono">
            {prefixProp}
          </span>
          <input
            {...props}
            className={`${inputBase} rounded-l-none ${mono ? 'font-mono' : ''} ${props.className ?? ''}`}
          />
        </div>
      );
    }
    return (
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {prefixProp}
        </span>
        <input
          {...props}
          className={`${inputBase} pl-8 ${mono ? 'font-mono' : ''} ${props.className ?? ''}`}
        />
      </div>
    );
  }
  return (
    <input
      {...props}
      className={`${inputBase} ${mono ? 'font-mono' : ''} ${props.className ?? ''}`}
    />
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`${inputBase} resize-y min-h-[80px] ${props.className ?? ''}`}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

export function Select({
  options,
  value,
  onChange,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        {...props}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${inputBase} appearance-none pr-9 cursor-pointer font-mono ${props.className ?? ''}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconRight?: boolean;
}) {
  const sizes = {
    sm: 'px-2.5 py-1.5 text-[11.5px]',
    md: 'px-3.5 py-2 text-[12.5px]',
  }[size];
  const variants = {
    primary:
      'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent',
    secondary:
      'bg-surface-2 text-foreground hover:bg-surface-3 border-border',
    outline:
      'bg-transparent text-foreground hover:bg-surface-2 border-border',
    ghost:
      'bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-2 border-transparent',
    danger:
      'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30',
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-md font-mono border transition-colors ${sizes} ${variants} disabled:opacity-50 disabled:cursor-not-allowed ${props.className ?? ''}`}
    >
      {Icon && !iconRight && <Icon className="size-3.5" strokeWidth={2.2} />}
      {children}
      {Icon && iconRight && <Icon className="size-3.5" strokeWidth={2.2} />}
    </button>
  );
}

// ── Radio ─────────────────────────────────────────────────────────────────────

export function Radio<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`w-full flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${
              active
                ? 'border-primary/50 bg-primary/5'
                : 'border-border bg-surface-0 hover:border-border-strong'
            }`}
          >
            <span
              className={`mt-0.5 size-4 rounded-full border-2 grid place-items-center shrink-0 ${
                active ? 'border-primary' : 'border-border-strong'
              }`}
            >
              {active && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </span>
            <div className="min-w-0">
              <div className="font-mono text-[12.5px]">{o.label}</div>
              {o.hint && (
                <div className="text-[11.5px] text-muted-foreground mt-0.5">
                  {o.hint}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 text-left"
    >
      <span
        className={`mt-0.5 size-4 rounded border grid place-items-center shrink-0 transition-colors ${
          checked
            ? 'bg-primary border-primary'
            : 'bg-surface-0 border-border-strong'
        }`}
      >
        {checked && (
          <svg
            className="size-3 text-primary-foreground"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2 6l3 3 5-6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <div className="text-[12.5px]">{label}</div>
        {hint && (
          <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>
        )}
      </div>
    </button>
  );
}

// ── TagInput ──────────────────────────────────────────────────────────────────

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div
      className={`${inputBase} flex flex-wrap items-center gap-1.5 cursor-text`}
    >
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-2 border border-border font-mono text-[11px]"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="text-dim hover:text-foreground"
          >
            ×
          </button>
        </span>
      ))}
      <input
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-[12.5px] font-mono"
        onKeyDown={(e) => {
          const v = (e.target as HTMLInputElement).value.trim();
          if (e.key === 'Enter' && v) {
            e.preventDefault();
            if (!value.includes(v)) onChange([...value, v]);
            (e.target as HTMLInputElement).value = '';
          }
          if (
            e.key === 'Backspace' &&
            !(e.target as HTMLInputElement).value
          ) {
            onChange(value.slice(0, -1));
          }
        }}
      />
    </div>
  );
}
