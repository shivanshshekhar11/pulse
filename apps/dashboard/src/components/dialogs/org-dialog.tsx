"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '@pulse-flags/ui';
import { Field, Input, Button } from '@pulse-flags/ui';
import { CreateOrganizationSchema } from '@pulse-flags/types';

export interface OrgFormValues {
  name: string;
  slug: string;
}

export function OrgDialog({
  open,
  onClose,
  onSubmit,
  loading,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: OrgFormValues) => void;
  loading?: boolean;
  dismissable?: boolean;
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm<z.input<typeof CreateOrganizationSchema>>({
    resolver: zodResolver(CreateOrganizationSchema),
    defaultValues: { name: '', slug: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ name: '', slug: '' });
  }, [open, reset]);

  const slugify = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const slug = watch('slug') ?? '';
  const name = watch('name') ?? '';
  const slugError = slug && !/^[a-z0-9-]+$/.test(slug) ? 'invalid format' : undefined;
  const canSubmit = !!name && !!slug && !slugError;

  const onValid = (values: z.input<typeof CreateOrganizationSchema>) => onSubmit?.({ name: values.name, slug: values.slug });

  return (
    <Dialog open={open} onClose={onClose} size="md" dismissable={dismissable}>
      <DialogHeader
        crumb="new organization"
        title="create organization"
        subtitle="Organizations scope projects, members, and audit logs."
        onClose={dismissable ? onClose : undefined}
      />
      <DialogBody className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="organization name" required>
            <Input
              autoFocus
              placeholder="Acme Corp"
              {...register('name')}
              onChange={(e) => {
                const v = e.target.value;
                setValue('name', v);
                setValue('slug', slugify(v));
              }}
            />
          </Field>
          <Field label="slug" required hint="lowercase · hyphens" error={slugError}>
            <Input
              mono
              placeholder="acme-corp"
              {...register('slug')}
            />
          </Field>
        </div>
      </DialogBody>
      <DialogFooter>
        {dismissable ? <Button variant="ghost" onClick={onClose}>cancel</Button> : <span />}
        <Button variant="primary" icon={Plus} disabled={!canSubmit || loading} onClick={handleSubmit(onValid)}>
          {loading ? 'creating…' : 'create organization'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
