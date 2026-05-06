'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '~/components/primitives/dialog';
import {
  Field, Input, Button, Checkbox,
} from '~/components/primitives/form';

const ENV_LIMIT = 5;

const DEFAULT_ENVS = [
  { name: 'production', color: '#ef4444', isDefault: true },
  { name: 'staging', color: '#f59e0b', isDefault: false },
  { name: 'development', color: '#10b981', isDefault: false },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ProjectEnvironmentValues {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
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
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [envs, setEnvs] = useState<ProjectEnvironmentValues[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setSlug(initial?.slug ?? '');
    const initialEnvs = initial?.environments?.length
      ? initial.environments
      : mode === 'edit'
        ? []
        : DEFAULT_ENVS.map((env) => ({
          id: makeId(),
          name: env.name,
          color: env.color,
          isDefault: env.isDefault,
        }));
    setEnvs(initialEnvs);
  }, [open, initial, mode]);

  const slugify = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const normalizedNames = envs.map((env) => env.name.trim().toLowerCase());
  const duplicateNames = normalizedNames.filter((name, index) =>
    name && normalizedNames.indexOf(name) !== index,
  );
  const envError = mode === 'create'
    ? envs.length === 0
      ? 'at least one environment is required'
      : duplicateNames.length > 0
        ? 'environment names must be unique'
        : envs.some((env) => !env.name.trim())
          ? 'environment names are required'
          : undefined
    : undefined;
  const slugError = slug && !/^[a-z0-9-]+$/.test(slug) ? 'invalid format' : undefined;
  const canSubmit = !!name && !!slug && !slugError && !envError;

  const applyDefault = (next: ProjectEnvironmentValues[]) => {
    if (next.some((env) => env.isDefault)) return next;
    return next.map((env, index) => ({ ...env, isDefault: index === 0 }));
  };

  const updateEnv = (id: string, changes: Partial<ProjectEnvironmentValues>) => {
    setEnvs((prev) =>
      applyDefault(prev.map((env) => (env.id === id ? { ...env, ...changes } : env))),
    );
  };

  const setDefault = (id: string) => {
    setEnvs((prev) => prev.map((env) => ({ ...env, isDefault: env.id === id })));
  };

  const addEnv = () => {
    if (envs.length >= ENV_LIMIT) return;
    setEnvs((prev) => applyDefault([
      ...prev,
      {
        id: makeId(),
        name: '',
        color: '#6366f1',
        isDefault: prev.length === 0,
      },
    ]));
  };

  const removeEnv = (id: string) => {
    setEnvs((prev) => applyDefault(prev.filter((env) => env.id !== id)));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({ name, slug, environments: envs });
  };

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
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (mode === 'create') setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="slug" required hint="immutable" error={slugError}>
            <Input
              mono
              prefix={orgSlug ? `${orgSlug}/` : 'org/'}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={mode === 'edit'}
            />
          </Field>
        </div>

        {mode === 'create' && (
          <Field label="environments" hint="up to 5" error={envError}>
            <div className="space-y-3">
              {envs.map((env, index) => (
                <div key={env.id} className="grid grid-cols-[1fr_140px_120px_32px] gap-3 items-center">
                  <Input
                    mono
                    placeholder={index === 0 ? 'production' : 'staging'}
                    value={env.name}
                    onChange={(e) => updateEnv(env.id, { name: e.target.value })}
                  />
                  <Input
                    mono
                    value={env.color}
                    onChange={(e) => updateEnv(env.id, { color: e.target.value })}
                  />
                  <Checkbox
                    checked={env.isDefault}
                    onChange={() => setDefault(env.id)}
                    label="default"
                  />
                  <button
                    type="button"
                    disabled={envs.length <= 1}
                    onClick={() => removeEnv(env.id)}
                    className="size-8 grid place-items-center rounded-md border border-border bg-surface-1 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Remove environment"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>{envs.length} of {ENV_LIMIT} environments</span>
                <button
                  type="button"
                  onClick={addEnv}
                  disabled={envs.length >= ENV_LIMIT}
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
          onClick={handleSubmit}
        >
          {loading ? 'saving…' : mode === 'create' ? 'create project' : 'save changes'}
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
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6bc5ff');
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setColor('#6bc5ff');
    setIsDefault(false);
  }, [open]);

  const presets = ['#ff5d5d', '#f0b95a', '#8be36b', '#6bc5ff', '#c77dff'];

  const handleSubmit = () => {
    if (!name) return;
    onSubmit?.({ name, color, isDefault });
  };

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
          <Input mono autoFocus placeholder="performance-test" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="color" hint="for UI badges">
          <div className="flex items-center gap-2">
            {presets.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-9 rounded-md border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <Input mono className="ml-2 w-32" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </Field>
        <Field label="default environment" hint="used when no env is specified">
          <Checkbox
            checked={isDefault}
            onChange={setIsDefault}
            label="set as default"
          />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button variant="primary" icon={Plus} disabled={!name || loading} onClick={handleSubmit}>
          {loading ? 'creating…' : 'create'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
