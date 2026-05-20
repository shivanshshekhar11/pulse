"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Hash, ToggleLeft, Braces, Type, Save, Plus } from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '@pulse-flags/ui';
import {
  Field, Input, Textarea, Button, TagInput,
} from '@pulse-flags/ui';
import { CreateFlagSchema } from '@pulse-flags/types';

const TYPES = [
  { value: 'boolean' as const, label: 'boolean', hint: 'on/off toggle', icon: ToggleLeft },
  { value: 'string' as const, label: 'string', hint: 'text variant â€” e.g. CTA copy', icon: Type },
  { value: 'number' as const, label: 'number', hint: 'numeric config â€” e.g. timeout ms', icon: Hash },
  { value: 'json' as const, label: 'json', hint: 'arbitrary structured config', icon: Braces },
];

const DEFAULT_VALUES = {
  boolean: false,
  string: 'control',
  number: 5000,
  json: {},
};

export interface FlagFormValues {
  key: string;
  name: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  description?: string;
  tags: string[];
  defaultValue: unknown;
}

export function FlagDialog({
  open,
  onClose,
  onSubmit,
  mode = 'create',
  initial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: FlagFormValues) => void;
  mode?: 'create' | 'edit';
  initial?: Partial<FlagFormValues>;
  loading?: boolean;
}) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<z.input<typeof CreateFlagSchema>>({
    resolver: zodResolver(CreateFlagSchema),
    defaultValues: { key: initial?.key ?? '', name: initial?.name ?? '', type: initial?.type ?? 'boolean', description: initial?.description ?? '', tags: initial?.tags ?? [] },
  });
  const [defaultValueInput, setDefaultValueInput] = useState('');

  const watched = watch();

  const type = (watched?.type ?? 'boolean') as NonNullable<z.input<typeof CreateFlagSchema>['type']>;
  const name = watched?.name ?? '';
  const tags = watched?.tags ?? [];

  const slugify = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const formatDefaultValue = (value: unknown, valueType: FlagFormValues['type']) => {
    if (valueType === 'json') {
      try {
        return JSON.stringify(value ?? {}, null, 2);
      } catch {
        return '{}';
      }
    }
    if (valueType === 'boolean') return value ? 'true' : 'false';
    if (valueType === 'number') return Number.isFinite(value as number) ? String(value) : '0';
    return typeof value === 'string' ? value : String(value ?? '');
  };

  useEffect(() => {
    if (!open) return;
    const initialType = initial?.type ?? 'boolean';
    reset({ key: initial?.key ?? '', name: initial?.name ?? '', type: initialType, description: initial?.description ?? '', tags: initial?.tags ?? [] });
    const defaultValue = initial?.defaultValue ?? DEFAULT_VALUES[initialType];
    setDefaultValueInput(formatDefaultValue(defaultValue, initialType));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const key = watched?.key ?? '';
  const keyError = key && !/^[a-z][a-z0-9_]*$/.test(key) ? 'invalid format' : undefined;

  const trimmedDefault = defaultValueInput.trim();
  const normalizedDefault = trimmedDefault.toLowerCase();
  let defaultValueError: string | undefined;
  if (type === 'boolean' && normalizedDefault !== 'true' && normalizedDefault !== 'false') {
    defaultValueError = 'use true or false';
  } else if (type === 'number' && (trimmedDefault === '' || Number.isNaN(Number(trimmedDefault)))) {
    defaultValueError = 'enter a number';
  } else if (type === 'json') {
    if (trimmedDefault === '') {
      defaultValueError = 'enter JSON';
    } else {
      try {
        JSON.parse(trimmedDefault);
      } catch {
        defaultValueError = 'invalid JSON';
      }
    }
  }

  
  const canSubmit = !!name && !!key && !keyError && !defaultValueError;

  const handleSubmitInternal = (values: z.input<typeof CreateFlagSchema>) => {
    if (!canSubmit) return;
    let defaultValue: unknown = defaultValueInput;
    if (type === 'boolean') defaultValue = normalizedDefault === 'true';
    if (type === 'number') defaultValue = Number(trimmedDefault);
    if (type === 'json') defaultValue = trimmedDefault ? JSON.parse(trimmedDefault) : {};
    onSubmit?.({
      key: values.key,
      name: values.name,
      type: values.type ?? 'boolean',
      description: values.description || undefined,
      tags: values.tags ?? tags,
      defaultValue,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogHeader
        crumb={mode === 'create' ? 'new flag' : 'edit flag'}
        title={mode === 'create' ? 'create feature flag' : `edit ${initial?.key}`}
        subtitle="Flags are environment-scoped. Define a key once, target users with rules."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="display name" required>
            <Input
              autoFocus
              placeholder="New checkout flow"
              {...register('name')}
              onChange={(e) => {
                const v = e.target.value;
                setValue('name', v);
                if (mode === 'create') setValue('key', slugify(v));
              }}
            />
          </Field>
          <Field label="key" required hint="snake_case Â· immutable" error={keyError}>
            <Input
              mono
              placeholder="new_checkout_flow"
              {...register('key')}
              disabled={mode === 'edit'}
            />
          </Field>
        </div>

          <Field label="description" hint="optional">
          <Textarea
            placeholder="What does this flag control?"
            {...register('description')}
          />
        </Field>

          <Field label="type" required>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => {
              const active = type === t.value;
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setValue('type', t.value);
                    if (mode === 'create') {
                      setDefaultValueInput(formatDefaultValue(DEFAULT_VALUES[t.value], t.value));
                    }
                  }}
                  disabled={mode === 'edit'}
                  className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors disabled:opacity-60 ${
                    active ? 'border-primary/50 bg-primary/5' : 'border-border bg-surface-0 hover:border-border-strong'
                  }`}
                >
                  <Icon className="size-4 mt-0.5 shrink-0" style={{ color: active ? '#8be36b' : '#6b7a85' }} />
                  <div className="min-w-0">
                    <div className="font-mono text-[12.5px]">{t.label}</div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">{t.hint}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="default value"
          required
          hint={type === 'boolean' ? 'true or false' : type === 'json' ? 'valid JSON' : undefined}
          error={defaultValueError}
        >
          {type === 'json' ? (
            <Textarea
              rows={5}
              placeholder='{"theme":"dark"}'
              value={defaultValueInput}
              onChange={(e) => setDefaultValueInput(e.target.value)}
              className="font-mono"
            />
          ) : (
            <Input
              mono
              type={type === 'number' ? 'number' : 'text'}
              placeholder={type === 'number' ? '5000' : type === 'boolean' ? 'true' : 'control'}
              value={defaultValueInput}
              onChange={(e) => setDefaultValueInput(e.target.value)}
            />
          )}
        </Field>

          <Field label="tags" hint="press enter to add">
          <TagInput value={tags} onChange={(t) => setValue('tags', t)} placeholder="e.g. frontend, experiment" />
        </Field>

        {mode === 'create' && (
          <div className="rounded-md border border-info/30 bg-info/5 p-3 font-mono text-[11.5px] text-muted-foreground">
            <span className="text-info">// </span>created flag will be{' '}
            <span className="text-foreground">disabled</span> by default. Toggle to roll out.
          </div>
        )}
      </DialogBody>
      <DialogFooter hint={mode === 'create' ? 'creates with version=1, audit logged' : 'increments version Â· audit logged'}>
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button
          variant="primary"
          icon={mode === 'create' ? Plus : Save}
          disabled={!canSubmit || loading}
          onClick={handleSubmit(handleSubmitInternal)}
        >
          {loading ? 'savingâ€¦' : mode === 'create' ? 'create flag' : 'save changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
