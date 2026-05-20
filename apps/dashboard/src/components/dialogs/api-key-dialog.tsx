'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateApiKeySchema } from '@pulse-flags/types';
import {
  KeyRound, Plus, Eye, EyeOff, Copy, AlertTriangle, Check,
} from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '@pulse-flags/ui';
import {
  Field, Input, Button, Checkbox, Select,
} from '@pulse-flags/ui';

// Fallback shown while real environments are loading
const FALLBACK_ENV_OPTIONS = [
  { value: '', label: 'loading environmentsâ€¦' },
];

const EXPIRY_OPTIONS = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'never', label: 'never' },
];

export interface ApiKeyFormValues {
  name: string;
  environmentId: string; // UUID
  envName: string;
  scopes: ('read' | 'write')[];
  expiresAt: Date | null;
}

export function ApiKeyDialog({
  open,
  onClose,
  onSubmit,
  loading,
  environments,
  generatedKey,
  onDismissKey,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: ApiKeyFormValues) => void;
  loading?: boolean;
  environments?: { id: string; name: string; projectSlug?: string }[];
  generatedKey?: string;
  onDismissKey?: () => void;
}) {
  const [step, setStep] = useState<'form' | 'reveal'>('form');
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<z.input<typeof CreateApiKeySchema>>({
    resolver: zodResolver(CreateApiKeySchema),
    defaultValues: {
      name: '',
      environmentId: '',
      scopes: ['read'],
      expiresAt: undefined,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep('form');
      setReveal(false);
      setCopied(false);
      reset({ name: '', environmentId: environments?.[0]?.id ?? '', scopes: ['read'], expiresAt: undefined });
    }
  }, [open, environments, reset]);

  // Switch to reveal step when key is generated
  useEffect(() => {
    if (generatedKey && step === 'form') {
      setStep('reveal');
    }
  }, [generatedKey, step]);

  const envOptions = environments && environments.length > 0
    ? environments.map((e) => ({
        value: e.id,
        label: e.projectSlug ? `${e.projectSlug} / ${e.name}` : e.name,
      }))
    : FALLBACK_ENV_OPTIONS;


  const onValid = (data: z.input<typeof CreateApiKeySchema>) => {
    // Map optional expiresAt if left undefined
    const expiresAt = data.expiresAt instanceof Date ? data.expiresAt : null;
    const selectedEnv = environments?.find((e) => e.id === data.environmentId);
    onSubmit?.({
      name: data.name.trim(),
      environmentId: data.environmentId,
      envName: selectedEnv?.name ?? '',
      scopes: data.scopes ?? ['read'],
      expiresAt,
    });
  };

  const handleClose = () => {
    onDismissKey?.();
    onClose();
  };

  const copyKey = () => {
    if (generatedKey) navigator.clipboard?.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const currentScopes = watch('scopes') ?? [];
  const canCreate = !!(watch('name')?.trim()) && currentScopes.length > 0 && !!watch('environmentId');
  const displayKey = generatedKey ?? '';

  return (
    <Dialog open={open} onClose={handleClose} size="md">
      {step === 'form' ? (
        <>
          <DialogHeader
            crumb="new api key"
            title="generate api key"
            subtitle="Keys authenticate the SDK and external integrations against a single environment."
            onClose={handleClose}
          />
          <DialogBody className="space-y-5">
            <Field label="name" required error={errors.name?.message}>
              <Input
                autoFocus
                placeholder="e.g. novapay-staging-sdk"
                {...register('name')}
              />
            </Field>

            <Field label="environment" required error={errors.environmentId?.message}>
              {environments && environments.length > 0 ? (
                <Select value={watch('environmentId') ?? ''} onChange={(v) => setValue('environmentId', v)} options={envOptions} />
              ) : (
                <div className="w-full px-3 py-2 bg-surface-0 border border-border rounded-md text-[13px] text-muted-foreground font-mono">
                  loading environmentsâ€¦
                </div>
              )}
            </Field>

            <Field label="scopes" required>
              <div className="space-y-2 p-3 rounded-md bg-surface-0 border border-border">
                <Checkbox
                  checked={currentScopes.includes('read')}
                  onChange={(v) => {
                    const next = v
                      ? Array.from(new Set([...currentScopes, 'read']))
                      : currentScopes.filter((s) => s !== 'read');
                    setValue('scopes', next as any);
                  }}
                  label="read"
                  hint="evaluate flags Â· read ruleset Â· open stream"
                />
                <Checkbox
                  checked={currentScopes.includes('write')}
                  onChange={(v) => {
                    const next = v
                      ? Array.from(new Set([...currentScopes, 'write']))
                      : currentScopes.filter((s) => s !== 'write');
                    setValue('scopes', next as any);
                  }}
                  label="write"
                  hint="mutate flags and rules Â· use sparingly Â· never embed in clients"
                />
              </div>
            </Field>

            <Field label="expiry">
              <Select
                value={(() => {
                  const e = watch('expiresAt');
                  if (!e) return 'never';
                  const d = new Date(e as any);
                  const now = new Date();
                  const days = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  if (days >= 365) return '1y';
                  if (days >= 90) return '90d';
                  if (days >= 30) return '30d';
                  return 'never';
                })()}
                onChange={(v) => {
                  if (v === 'never') setValue('expiresAt', undefined);
                  else {
                    const d = new Date();
                    if (v === '30d') d.setDate(d.getDate() + 30);
                    else if (v === '90d') d.setDate(d.getDate() + 90);
                    else if (v === '1y') d.setFullYear(d.getFullYear() + 1);
                    setValue('expiresAt', d as any);
                  }
                }}
                options={EXPIRY_OPTIONS}
              />
            </Field>
          </DialogBody>
          <DialogFooter hint="key format: ps_(live|test)_<40 hex chars> Â· stored as SHA-256">
            <Button variant="ghost" onClick={handleClose}>cancel</Button>
            <Button
              variant="primary"
              icon={Plus}
              disabled={!canCreate || loading || !environments || environments.length === 0}
              onClick={handleSubmit(onValid)}
            >
              {loading ? 'generatingâ€¦' : 'generate'}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <>
          <DialogHeader
            crumb="reveal once"
            title="copy your key now"
            subtitle="This is the only time the raw key will be shown. Pulse stores only its hash."
            onClose={handleClose}
            tone="danger"
          />
          <DialogBody className="space-y-4">
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3.5 flex items-start gap-2.5">
              <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
              <div className="text-[12.5px] text-muted-foreground">
                If you lose this key, you must revoke it and generate a new one. There is no way to recover it.
              </div>
            </div>
            <div className="rounded-md border border-border bg-surface-0 p-3 flex items-center gap-2 font-mono text-[12.5px]">
              <KeyRound className="size-3.5 text-warning shrink-0" />
              <span className="flex-1 truncate">
                {reveal ? displayKey : displayKey.slice(0, 12) + 'â€¢'.repeat(40)}
              </span>
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="size-7 grid place-items-center rounded border border-border bg-surface-1 text-muted-foreground hover:text-foreground"
                aria-label={reveal ? 'Hide key' : 'Reveal key'}
              >
                {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={copyKey}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border bg-surface-1 text-muted-foreground hover:text-foreground text-[11.5px]"
              >
                {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
                {copied ? 'copied' : 'copy'}
              </button>
            </div>
            <pre className="font-mono text-[11.5px] p-3 rounded-md bg-surface-0 border border-border text-muted-foreground">
              <span className="text-dim">// usage</span>{'\n'}
              export PULSE_API_KEY={reveal ? displayKey.slice(0, 18) + '...' : 'ps_test_...'}
            </pre>

          </DialogBody>
          <DialogFooter>
            <Button variant="primary" onClick={handleClose}>I&apos;ve saved it â€” close</Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
