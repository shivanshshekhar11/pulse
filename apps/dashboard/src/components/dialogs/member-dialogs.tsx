'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '~/components/primitives/dialog';
import { Field, Input, Button, Radio } from '~/components/primitives/form';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

const ROLES: { value: Role; label: string; hint: string }[] = [
  {
    value: 'admin',
    label: 'admin',
    hint: 'Manage flags, rules, segments, members, API keys, environments.',
  },
  {
    value: 'member',
    label: 'member',
    hint: 'Read + write flags and rules. Read segments.',
  },
  {
    value: 'viewer',
    label: 'viewer',
    hint: 'Read-only access to flags, rules, and segments.',
  },
];

export function InviteMemberDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Role>('member');

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <DialogHeader
        crumb="invite members"
        title="invite to acme-corp"
        subtitle="Members are added immediately on registered emails. New users receive a sign-up link."
        onClose={onClose}
      />
      <DialogBody className="space-y-5">
        <Field
          label="email address(es)"
          required
          hint="comma-separated for bulk invite"
        >
          <Input
            autoFocus
            type="email"
            placeholder="alex@acme.com, taylor@acme.com"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </Field>

        <Field label="org role" required>
          <Radio<Role> options={ROLES} value={role} onChange={setRole} />
        </Field>

        <div className="rounded-md border border-info/30 bg-info/5 p-3 font-mono text-[11.5px] text-muted-foreground">
          <span className="text-info">// </span>org roles can be overridden
          per-project from the member&apos;s profile.
        </div>
      </DialogBody>
      <DialogFooter hint="audit logged · invitee notified by email">
        <Button variant="ghost" onClick={onClose}>
          cancel
        </Button>
        <Button
          variant="primary"
          icon={Send}
          disabled={!emails}
          onClick={onClose}
        >
          send invites
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export function ChangeRoleDialog({
  open,
  onClose,
  member,
}: {
  open: boolean;
  onClose: () => void;
  member?: { name: string; email: string; role: Role };
}) {
  const [role, setRole] = useState<Role>(member?.role ?? 'member');

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
          <Radio<Role> options={ROLES} value={role} onChange={setRole} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          cancel
        </Button>
        <Button variant="primary" onClick={onClose}>
          save
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
