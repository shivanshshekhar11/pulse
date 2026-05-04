'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '~/components/primitives/dialog';
import {
  Field,
  Input,
  Textarea,
  Button,
  Checkbox,
} from '~/components/primitives/form';

export function ProjectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [envs, setEnvs] = useState({
    production: true,
    staging: true,
    development: true,
  });

  const slugify = (n: string) =>
    n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogHeader
        crumb="new project"
        title="create project"
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
                setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="slug" required hint="immutable">
            <Input
              mono
              prefix="acme-corp/"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </Field>
        </div>

        <Field label="description" hint="optional">
          <Textarea
            placeholder="Consumer payments product"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="environments" hint="auto-created with default API keys">
          <div className="space-y-2 p-3 rounded-md bg-surface-0 border border-border">
            <Checkbox
              checked={envs.production}
              onChange={(v) => setEnvs({ ...envs, production: v })}
              label="production"
              hint="customer-facing — issues live keys (ps_live_…)"
            />
            <Checkbox
              checked={envs.staging}
              onChange={(v) => setEnvs({ ...envs, staging: v })}
              label="staging"
              hint="pre-production — issues test keys (ps_test_…)"
            />
            <Checkbox
              checked={envs.development}
              onChange={(v) => setEnvs({ ...envs, development: v })}
              label="development"
              hint="local — issues test keys (ps_test_…)"
            />
          </div>
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          cancel
        </Button>
        <Button
          variant="primary"
          icon={Plus}
          disabled={!name || !slug}
          onClick={onClose}
        >
          create project
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export function EnvironmentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6bc5ff');

  const presets = ['#ff5d5d', '#f0b95a', '#8be36b', '#6bc5ff', '#c77dff'];

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
          <Input
            mono
            autoFocus
            placeholder="performance-test"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="color" hint="for UI badges">
          <div className="flex items-center gap-2">
            {presets.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`size-9 rounded-md border-2 transition-all ${
                  color === c
                    ? 'border-foreground scale-110'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <Input
              mono
              className="ml-2 w-32"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          cancel
        </Button>
        <Button
          variant="primary"
          icon={Plus}
          disabled={!name}
          onClick={onClose}
        >
          create
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
