'use client';

import { useState } from 'react';
import {
  KeyRound,
  Plus,
  Eye,
  EyeOff,
  Copy,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '~/components/primitives/dialog';
import {
  Field,
  Input,
  Button,
  Checkbox,
  Select,
} from '~/components/primitives/form';

const ENV_OPTIONS = [
  { value: 'production', label: 'production' },
  { value: 'staging', label: 'staging' },
  { value: 'development', label: 'development' },
];

const EXPIRY_OPTIONS = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'never', label: 'never' },
];

const GENERATED = 'ps_test_b7e1d04a3f9c1287de91442b80fc7e119cd64a02';

export function ApiKeyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'form' | 'reveal'>('form');
  const [name, setName] = useState('');
  const [env, setEnv] = useState('staging');
  const [scopes, setScopes] = useState({ read: true, write: false });
  const [expiry, setExpiry] = useState('never');
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => setStep('reveal');
  const handleClose = () => {
    setStep('form');
    setName('');
    setReveal(false);
    onClose();
  };
  const copyKey = () => {
    navigator.clipboard?.writeText(GENERATED);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

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
              <Select value={env} onChange={setEnv} options={ENV_OPTIONS} />
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
              <Select
                value={expiry}
                onChange={setExpiry}
                options={EXPIRY_OPTIONS}
              />
            </Field>
          </DialogBody>
          <DialogFooter hint="key format: ps_(live|test)_<40 hex chars> · stored as SHA-256">
            <Button variant="ghost" onClick={handleClose}>
              cancel
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              disabled={!name || (!scopes.read && !scopes.write)}
              onClick={handleCreate}
            >
              generate
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
                If you lose this key, you must revoke it and generate a new one.
                There is no way to recover it.
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface-0 p-3 flex items-center gap-2 font-mono text-[12.5px]">
              <KeyRound className="size-3.5 text-warning shrink-0" />
              <span className="flex-1 truncate">
                {reveal
                  ? GENERATED
                  : GENERATED.slice(0, 12) + '•'.repeat(40)}
              </span>
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="size-7 grid place-items-center rounded border border-border bg-surface-1 text-muted-foreground hover:text-foreground"
                aria-label={reveal ? 'Hide key' : 'Reveal key'}
              >
                {reveal ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={copyKey}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border bg-surface-1 text-muted-foreground hover:text-foreground text-[11.5px]"
              >
                {copied ? (
                  <Check className="size-3.5 text-primary" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? 'copied' : 'copy'}
              </button>
            </div>

            <pre className="font-mono text-[11.5px] p-3 rounded-md bg-surface-0 border border-border text-muted-foreground">
              <span className="text-dim">// usage</span>
              {'\n'}
              export PULSE_API_KEY=
              {reveal ? GENERATED.slice(0, 18) + '...' : 'ps_test_...'}
            </pre>
          </DialogBody>
          <DialogFooter>
            <Button variant="primary" onClick={handleClose}>
              I&apos;ve saved it — close
            </Button>
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
