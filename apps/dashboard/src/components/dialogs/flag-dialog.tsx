'use client';

import { useState } from 'react';
import { Hash, ToggleLeft, Braces, Type, Save, Plus } from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '~/components/primitives/dialog';
import {
  Field, Input, Textarea, Button, TagInput,
} from '~/components/primitives/form';

const TYPES = [
  { value: 'boolean' as const, label: 'boolean', hint: 'on/off toggle', icon: ToggleLeft },
  { value: 'string' as const, label: 'string', hint: 'text variant — e.g. CTA copy', icon: Type },
  { value: 'number' as const, label: 'number', hint: 'numeric config — e.g. timeout ms', icon: Hash },
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
  const [name, setName] = useState(initial?.name ?? '');
  const [key, setKey] = useState(initial?.key ?? '');
  const [type, setType] = useState<FlagFormValues['type']>(initial?.type ?? 'boolean');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);

  const slugify = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const keyError = key && !/^[a-z][a-z0-9_]*$/.test(key) ? 'invalid format' : undefined;
  const canSubmit = !!name && !!key && !keyError;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({
      key,
      name,
      type,
      description: description || undefined,
      tags,
      defaultValue: DEFAULT_VALUES[type],
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
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (mode === 'create') setKey(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="key" required hint="snake_case · immutable" error={keyError}>
            <Input
              mono
              placeholder="new_checkout_flow"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={mode === 'edit'}
            />
          </Field>
        </div>

        <Field label="description" hint="optional">
          <Textarea
            placeholder="What does this flag control?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
                  onClick={() => setType(t.value)}
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

        <Field label="tags" hint="press enter to add">
          <TagInput value={tags} onChange={setTags} placeholder="e.g. frontend, experiment" />
        </Field>

        {mode === 'create' && (
          <div className="rounded-md border border-info/30 bg-info/5 p-3 font-mono text-[11.5px] text-muted-foreground">
            <span className="text-info">// </span>created flag will be{' '}
            <span className="text-foreground">disabled</span> by default. Toggle to roll out.
          </div>
        )}
      </DialogBody>
      <DialogFooter hint={mode === 'create' ? 'creates with version=1, audit logged' : 'increments version · audit logged'}>
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button
          variant="primary"
          icon={mode === 'create' ? Plus : Save}
          disabled={!canSubmit || loading}
          onClick={handleSubmit}
        >
          {loading ? 'saving…' : mode === 'create' ? 'create flag' : 'save changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
