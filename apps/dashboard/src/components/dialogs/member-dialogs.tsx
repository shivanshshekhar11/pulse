"use client";

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { z } from 'zod';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter,
} from '~/components/primitives/dialog';
import { Field, Input, Button, Radio } from '~/components/primitives/form';
import { InviteMemberSchema, UpdateMemberRoleSchema } from '@pulse-flags/types';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'admin', label: 'admin', hint: 'Manage flags, rules, segments, members, API keys, environments.' },
  { value: 'member', label: 'member', hint: 'Read + write flags and rules. Read segments.' },
  { value: 'viewer', label: 'viewer', hint: 'Read-only access to flags, rules, and segments.' },
];

export interface InviteMemberFormValues {
  email: string;
  role: Role;
}

export function InviteMemberDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: InviteMemberFormValues) => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, reset, control } = useForm<z.input<typeof InviteMemberSchema>>({
    resolver: zodResolver(InviteMemberSchema),
    defaultValues: { email: '', role: 'member' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ email: '', role: 'member' });
  }, [open, reset]);

  const onValid = (values: z.input<typeof InviteMemberSchema>) => {
    const email = values.email.split(',')[0]?.trim() ?? '';
    if (!email) return;
    onSubmit?.({ email, role: values.role ?? 'member' });
  };

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogHeader
        crumb="invite members"
        title="invite to organization"
        subtitle="Members are added immediately on registered emails."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <Field label="email address" required hint="comma-separated for bulk invite">
          <Input
            autoFocus
            type="email"
            placeholder="alex@acme.com, taylor@acme.com"
            {...register('email')}
          />
        </Field>

        <Field label="org role" required>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Radio<Role> options={ROLES} value={field.value ?? 'member'} onChange={field.onChange} />
            )}
          />
        </Field>

        <div className="rounded-md border border-info/30 bg-info/5 p-3 font-mono text-[11.5px] text-muted-foreground">
          <span className="text-info">// </span>org roles can be overridden per-project from the member&apos;s profile.
        </div>
      </DialogBody>
      <DialogFooter hint="audit logged · invitee notified by email">
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button variant="primary" icon={Send} disabled={loading} onClick={handleSubmit(onValid)}>
          {loading ? 'sending…' : 'send invite'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export interface ChangeRoleFormValues {
  role: Role;
}

export function ChangeRoleDialog({
  open,
  onClose,
  onSubmit,
  member,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit?: (values: ChangeRoleFormValues) => void;
  member?: { name: string; email: string; role: Role };
  loading?: boolean;
}) {
  const { control, reset, handleSubmit } = useForm<z.input<typeof UpdateMemberRoleSchema>>({
    resolver: zodResolver(UpdateMemberRoleSchema),
    defaultValues: { role: member?.role ?? 'member' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ role: member?.role ?? 'member' });
  }, [open, member, reset]);

  const onValid = (values: z.input<typeof UpdateMemberRoleSchema>) => onSubmit?.({ role: values.role });

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogHeader
        crumb="change role"
        title={member ? `update ${member.name}` : 'change role'}
        subtitle={member?.email}
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <Field label="new role" required>
          <Controller control={control} name="role" render={({ field }) => (
            <Radio<Role> options={ROLES} value={field.value ?? 'member'} onChange={field.onChange} />
          )} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>cancel</Button>
        <Button variant="primary" disabled={loading} onClick={handleSubmit(onValid)}>
          {loading ? 'saving…' : 'save'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
