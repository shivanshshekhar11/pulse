'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '~/components/primitives/dialog';
import { Field, Input, Button } from '~/components/primitives/form';

export interface OrgFormValues {
  name: string;
  slug: string;
}

export function OrgDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: OrgFormValues) => void;
  loading?: boolean;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setSlug('');
  }, [open]);

  const slugify = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const slugError = slug && !/^[a-z0-9-]+$/.test(slug) ? 'invalid format' : undefined;
  const canSubmit = !!name && !!slug && !slugError;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({ name, slug });
  };

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogHeader
        crumb="new organization"
        title="create organization"
        subtitle="Organizations scope projects, members, and audit logs."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="organization name" required>
            <Input
              autoFocus
              placeholder="Acme Corp"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="slug" required hint="lowercase · hyphens" error={slugError}>
            <Input
              mono
              placeholder="acme-corp"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </Field>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button variant="primary" icon={Plus} disabled={!canSubmit || loading} onClick={handleSubmit}>
          {loading ? 'creating…' : 'create organization'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
