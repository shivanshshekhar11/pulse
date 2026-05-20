'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '@pulse-flags/ui';
import {
  Field, Input, Button, Checkbox,
} from '@pulse-flags/ui';
import { CreateProjectSchema, CreateEnvironmentSchema } from '@pulse-flags/types';

const ENV_LIMIT = 5;

const DEFAULT_ENVS = [
  { name: 'production', color: '#ef4444', isDefault: true },
  { name: 'staging', color: '#f59e0b', isDefault: false },
  { name: 'development', color: '#10b981', isDefault: false },
];



export interface ProjectEnvironmentValues {
  name: string;
  color?: string;
  isDefault?: boolean;
}

export interface ProjectFormValues {
  name: string;
  slug: string;
  environments: ProjectEnvironmentValues[];
}

export function ProjectDialog({
  open,
  onClose,
  onSubmit,
  loading,
  mode = 'create',
  initial,
  orgSlug,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: ProjectFormValues) => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
  initial?: Partial<ProjectFormValues>;
  orgSlug?: string;
}) {
  const { register, handleSubmit, reset, control, setValue, watch } = useForm<z.input<typeof CreateProjectSchema>>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: initial?.name ?? '',
      slug: initial?.slug ?? '',
      environments: initial?.environments?.length ? initial.environments : DEFAULT_ENVS.map((env) => ({ name: env.name, color: env.color, isDefault: env.isDefault })),
    },
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'environments' });

  useEffect(() => {
    if (!open) return;
    reset({
      name: initial?.name ?? '',
      slug: initial?.slug ?? '',
      environments: initial?.environments?.length ? initial.environments : DEFAULT_ENVS.map((env) => ({ name: env.name, color: env.color, isDefault: env.isDefault })),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const slugify = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const envs = watch('environments') ?? [];
  const normalizedNames = envs.map((env: any) => env.name.trim().toLowerCase());
  const duplicateNames = normalizedNames.filter((name: string, index: number) => name && normalizedNames.indexOf(name) !== index);
  const envError = mode === 'create'
    ? envs.length === 0
      ? 'at least one environment is required'
      : duplicateNames.length > 0
        ? 'environment names must be unique'
        : envs.some((env: any) => !env.name.trim())
          ? 'environment names are required'
          : undefined
    : undefined;
  const slug = watch('slug') ?? '';
  const name = watch('name') ?? '';
  const slugError = slug && !/^[a-z0-9-]+$/.test(slug) ? 'invalid format' : undefined;
  const canSubmit = !!name && !!slug && !slugError && !envError;

  const setDefault = (index: number) => {
    const next = fields.map((f, i) => ({ ...f, isDefault: i === index }));
    next.forEach((n, i) => update(i, n));
  };

  const addEnv = () => {
    if (fields.length >= ENV_LIMIT) return;
    append({ name: '', color: '#6366f1', isDefault: fields.length === 0 });
  };

  const removeEnv = (index: number) => remove(index);

  const onValid = (values: z.input<typeof CreateProjectSchema>) => onSubmit?.({
    name: values.name,
    slug: values.slug,
    environments: (values.environments ?? []).map((env) => ({
      name: env.name,
      color: env.color ?? '#6366f1',
      isDefault: env.isDefault ?? false,
    })),
  });

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogHeader
        crumb={mode === 'create' ? 'new project' : 'edit project'}
        title={mode === 'create' ? 'create project' : 'edit project'}
        subtitle="Projects group flags by product or service. Each gets its own environments and keys."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="project name" required>
            <Input
              autoFocus
              placeholder="NovaPay"
              value={watch('name')}
              onChange={(e) => {
                setValue('name', e.target.value);
                if (mode === 'create') setValue('slug', slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="slug" required hint="immutable" error={slugError}>
            <Input
              mono
              prefix={orgSlug ? `${orgSlug}/` : 'org/'}
              value={watch('slug')}
              onChange={(e) => setValue('slug', e.target.value)}
              disabled={mode === 'edit'}
            />
          </Field>
        </div>

        {mode === 'create' && (
          <Field label="environments" hint="up to 5" error={envError}>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_140px_120px_32px] gap-3 items-center">
                  <Input
                    mono
                    placeholder={index === 0 ? 'production' : 'staging'}
                    {...register(`environments.${index}.name`)}
                  />
                  <Input
                    mono
                    {...register(`environments.${index}.color`)}
                  />
                  <Checkbox
                    checked={!!envs[index]?.isDefault}
                    onChange={() => setDefault(index)}
                    label="default"
                  />
                  <button
                    type="button"
                    disabled={fields.length <= 1}
                    onClick={() => removeEnv(index)}
                    className="size-8 grid place-items-center rounded-md border border-border bg-surface-1 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Remove environment"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>{fields.length} of {ENV_LIMIT} environments</span>
                <button
                  type="button"
                  onClick={addEnv}
                  disabled={fields.length >= ENV_LIMIT}
                  className="font-mono text-[11.5px] text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  add environment
                </button>
              </div>
            </div>
          </Field>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button
          variant="primary"
          icon={mode === 'create' ? Plus : Save}
          disabled={!canSubmit || loading}
          onClick={handleSubmit(onValid)}
        >
          {loading ? 'savingâ€¦' : mode === 'create' ? 'create project' : 'save changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export interface EnvironmentFormValues {
  name: string;
  color: string;
  isDefault: boolean;
}

export function EnvironmentDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: EnvironmentFormValues) => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<z.input<typeof CreateEnvironmentSchema>>({
    resolver: zodResolver(CreateEnvironmentSchema),
    defaultValues: { name: '', color: '#6bc5ff', isDefault: false },
  });

  useEffect(() => {
    if (!open) return;
    reset({ name: '', color: '#6bc5ff', isDefault: false });
  }, [open, reset]);

  const presets = ['#ff5d5d', '#f0b95a', '#8be36b', '#6bc5ff', '#c77dff'];

  const onValid = (values: z.input<typeof CreateEnvironmentSchema>) => onSubmit?.({
    name: values.name,
    color: values.color ?? '#6bc5ff',
    isDefault: values.isDefault ?? false,
  });

  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <DialogHeader
        crumb="new environment"
        title="create environment"
        subtitle="Environments isolate flag rulesets. API keys are environment-scoped."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <Field label="name" required>
          <Input mono autoFocus placeholder="performance-test" {...register('name')} />
        </Field>
        <Field label="color" hint="for UI badges">
          <div className="flex items-center gap-2">
            {presets.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setValue('color', c)}
                className={`size-9 rounded-md border-2 transition-all ${watch('color') === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <Input mono className="ml-2 w-32" {...register('color')} />
          </div>
        </Field>
        <Field label="default environment" hint="used when no env is specified">
          <Checkbox
            checked={!!watch('isDefault')}
            onChange={(v) => setValue('isDefault', v)}
            label="set as default"
          />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button variant="primary" icon={Plus} disabled={!watch('name') || loading} onClick={handleSubmit(onValid)}>
          {loading ? 'creatingâ€¦' : 'create'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
