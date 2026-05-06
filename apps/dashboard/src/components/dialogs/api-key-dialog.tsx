'use client';

import { useState, useEffect } from 'react';
import {
  KeyRound, Plus, Eye, EyeOff, Copy, AlertTriangle, Check,
} from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '~/components/primitives/dialog';
import {
  Field, Input, Button, Checkbox, Select,
} from '~/components/primitives/form';
import { setStreamKey } from '~/lib/stream-keys';

// Fallback shown while real environments are loading
const FALLBACK_ENV_OPTIONS = [
  { value: '', label: 'loading environments…' },
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
  const [name, setName] = useState('');
  const [envId, setEnvId] = useState('');
  const [scopes, setScopes] = useState<{ read: boolean; write: boolean }>({ read: true, write: false });
  const [expiry, setExpiry] = useState('never');
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep('form');
      setName('');
      setScopes({ read: true, write: false });
      setExpiry('never');
      setReveal(false);
      setCopied(false);
      // Default to first environment
      const firstId = environments?.[0]?.id ?? '';
      setEnvId(firstId);
    }
  }, [open, environments]);

  // When environments load after dialog is already open, set default
  useEffect(() => {
    if (open && !envId && environments && environments.length > 0) {
      setEnvId(environments[0]!.id);
    }
  }, [environments, open, envId]);

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

  const selectedEnv = environments?.find((e) => e.id === envId);

  const handleCreate = () => {
    if (!name.trim() || (!scopes.read && !scopes.write) || !envId) return;
    const expiresAt = expiry === 'never' ? null : (() => {
      const d = new Date();
      if (expiry === '30d') d.setDate(d.getDate() + 30);
      else if (expiry === '90d') d.setDate(d.getDate() + 90);
      else if (expiry === '1y') d.setFullYear(d.getFullYear() + 1);
      return d;
    })();
    const selectedScopes: ('read' | 'write')[] = [
      ...(scopes.read ? ['read' as const] : []),
      ...(scopes.write ? ['write' as const] : []),
    ];
    const selectedEnv = environments?.find((e) => e.id === envId);
    onSubmit?.({
      name: name.trim(),
      environmentId: envId,
      envName: selectedEnv?.name ?? '',
      scopes: selectedScopes,
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

  const canCreate = !!name.trim() && (scopes.read || scopes.write) && !!envId;
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
            <Field label="name" required hint="for your reference">
              <Input
                autoFocus
                placeholder="e.g. novapay-staging-sdk"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="environment" required>
              {environments && environments.length > 0 ? (
                <Select value={envId} onChange={setEnvId} options={envOptions} />
              ) : (
                <div className="w-full px-3 py-2 bg-surface-0 border border-border rounded-md text-[13px] text-muted-foreground font-mono">
                  loading environments…
                </div>
              )}
            </Field>

            <Field label="scopes" required>
              <div className="space-y-2 p-3 rounded-md bg-surface-0 border border-border">
                <Checkbox
                  checked={scopes.read}
                  onChange={(v) => setScopes({ ...scopes, read: v })}
                  label="read"
                  hint="evaluate flags · read ruleset · open SSE stream"
                />
                <Checkbox
                  checked={scopes.write}
                  onChange={(v) => setScopes({ ...scopes, write: v })}
                  label="write"
                  hint="mutate flags and rules · use sparingly · never embed in clients"
                />
              </div>
            </Field>

            <Field label="expiry">
              <Select value={expiry} onChange={setExpiry} options={EXPIRY_OPTIONS} />
            </Field>
          </DialogBody>
          <DialogFooter hint="key format: ps_(live|test)_<40 hex chars> · stored as SHA-256">
            <Button variant="ghost" onClick={handleClose}>cancel</Button>
            <Button
              variant="primary"
              icon={Plus}
              disabled={!canCreate || loading || !environments || environments.length === 0}
              onClick={handleCreate}
            >
              {loading ? 'generating…' : 'generate'}
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
                {reveal ? displayKey : displayKey.slice(0, 12) + '•'.repeat(40)}
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
            {selectedEnv && generatedKey && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-0 px-3 py-2">
                <div className="text-[11.5px] text-muted-foreground">
                  use this key for live updates (memory only)
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setStreamKey(selectedEnv.id, generatedKey, selectedEnv.name)}
                >
                  use key
                </Button>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="primary" onClick={handleClose}>I&apos;ve saved it — close</Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
