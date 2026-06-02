'use client';

import { useState } from 'react';
import { Plus, Crown, Shield, User as UserIcon, Eye, MoreHorizontal, Loader2 } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { InviteMemberDialog, ChangeRoleDialog } from '~/components/dialogs/member-dialogs';
import { ConfirmDialog } from '~/components/dialogs/confirm';
import { useMembers, useRemoveMember, useInviteMember, useUpdateMemberRole } from '~/lib/hooks/use-org';
import { usePermission } from '~/lib/hooks/use-permissions';
import type { OrgMemberResponse } from '@pulse-flags/types';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_INFO: Record<Role, { icon: React.ComponentType<{ className?: string }>; color: string; label: string; perms: string }> = {
  owner: { icon: Crown, color: 'text-warning bg-warning/10 border-warning/30', label: 'owner', perms: 'Full access. Can delete the org and transfer ownership.' },
  admin: { icon: Shield, color: 'text-primary bg-primary/10 border-primary/30', label: 'admin', perms: 'Manage flags, rules, segments, members, API keys, environments.' },
  member: { icon: UserIcon, color: 'text-info bg-info/10 border-info/30', label: 'member', perms: 'Read + write flags and rules. Read segments.' },
  viewer: { icon: Eye, color: 'text-muted-foreground bg-surface-2 border-border', label: 'viewer', perms: 'Read-only access to flags, rules, and segments.' },
};

function initials(name: string | null | undefined, email: string): string {
  if (name) return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

const GRADIENTS = ['from-magenta/40 to-info/40', 'from-primary/40 to-info/40', 'from-warning/40 to-magenta/40', 'from-info/40 to-primary/40', 'from-magenta/40 to-warning/40'];

export function MembersPage({ orgSlug }: { orgSlug: string }) {
  const { data: members, isLoading } = useMembers(orgSlug);
  const removeMember = useRemoveMember(orgSlug);
  const inviteMember = useInviteMember(orgSlug);
  const updateMemberRole = useUpdateMemberRole(orgSlug);
  const { hasPerm: canInvite } = usePermission(orgSlug, 'members:invite');
  const { hasPerm: canUpdate } = usePermission(orgSlug, 'members:update');
  const { hasPerm: canRemove } = usePermission(orgSlug, 'members:remove');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<OrgMemberResponse | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrgMemberResponse | null>(null);

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader crumb={`${orgSlug} / members`} title="members" command={`pulse members list --org=${orgSlug}`}>
        {canInvite && (
          <button type="button" onClick={() => setInviteOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="size-3.5" strokeWidth={2.5} /> invite member
          </button>
        )}
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="max-w-[1200px] space-y-8">
          {/* Role legend */}
          <div className="grid grid-cols-4 gap-3">
            {(Object.keys(ROLE_INFO) as Role[]).map((r) => {
              const info = ROLE_INFO[r];
              const Icon = info.icon;
              return (
                <div key={r} className="rounded-md border border-border bg-surface-1 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10.5px] border ${info.color}`}>
                      <Icon className="size-3" />{info.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{info.perms}</p>
                </div>
              );
            })}
          </div>

          {/* Members table */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
                // members {members ? `(${members.length})` : ''}
              </h4>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" />
                <span className="font-mono text-[12px]">loading members…</span>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
                <div className="grid grid-cols-[1fr_140px_140px_60px] gap-4 px-5 py-3 border-b border-border bg-surface-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">
                  <div>user</div>
                  <div>org role</div>
                  <div>joined</div>
                  <div />
                </div>
                {(members ?? []).map((m, idx) => {
                  const role = m.role as Role;
                  const info = ROLE_INFO[role] ?? ROLE_INFO.viewer;
                  const Icon = info.icon;
                  const grad = GRADIENTS[idx % GRADIENTS.length] ?? GRADIENTS[0];
                  return (
                    <div key={m.id} className="grid grid-cols-[1fr_140px_140px_60px] gap-4 px-5 py-4 items-center border-b border-border last:border-b-0 hover:bg-surface-2/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`size-9 rounded-md bg-gradient-to-br ${grad} border border-border grid place-items-center font-mono text-[12px] uppercase`}>
                          {initials(m.user.name, m.user.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13.5px] truncate">{m.user.name ?? m.user.email}</div>
                          <div className="font-mono text-[11.5px] text-muted-foreground truncate">{m.user.email}</div>
                        </div>
                      </div>
                      {canUpdate ? (
                        <button type="button" onClick={() => setRoleTarget(m)} className="w-fit hover:opacity-80 transition-opacity">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded font-mono text-[11px] border w-fit ${info.color}`}>
                            <Icon className="size-3" />{info.label}
                          </span>
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded font-mono text-[11px] border w-fit ${info.color}`}>
                          <Icon className="size-3" />{info.label}
                        </span>
                      )}
                      <span className="font-mono text-[11.5px] text-muted-foreground">
                        {new Date(m.joinedAt as string | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div className="flex justify-end">
                        {canRemove && (
                          <button type="button" onClick={() => setRemoveTarget(m)} className="size-7 grid place-items-center rounded border border-transparent hover:border-border hover:bg-surface-2 text-dim hover:text-foreground">
                            <MoreHorizontal className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        loading={inviteMember.isPending}
        onSubmit={(values) => {
          inviteMember.mutate(values, { onSuccess: () => setInviteOpen(false) });
        }}
      />
      <ChangeRoleDialog
        open={roleTarget !== null}
        onClose={() => setRoleTarget(null)}
        loading={updateMemberRole.isPending}
        member={roleTarget ? { name: roleTarget.user.name ?? roleTarget.user.email, email: roleTarget.user.email, role: roleTarget.role as Role } : undefined}
        onSubmit={(values) => {
          if (!roleTarget) return;
          updateMemberRole.mutate(
            { userId: roleTarget.user.id, body: { role: values.role } },
            { onSuccess: () => setRoleTarget(null) },
          );
        }}
      />
      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title={`Remove ${removeTarget?.user.name ?? removeTarget?.user.email}`}
        description="This member will lose access to all projects in this organization."
        confirmLabel="remove member"
        variant="warning"
        onConfirm={() => removeTarget && removeMember.mutate(removeTarget.user.id)}
      />
    </main>
  );
}
