'use client';

import { useState } from 'react';
import { Plus, Mail, Crown, Shield, User as UserIcon, Eye, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { InviteMemberDialog, ChangeRoleDialog } from '~/components/dialogs/member-dialogs';
import { ConfirmDialog } from '~/components/dialogs/confirm';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

const ROLE_INFO: Record<Role, { icon: React.ComponentType<{ className?: string }>; color: string; label: string; perms: string }> = {
  owner: { icon: Crown, color: 'text-warning bg-warning/10 border-warning/30', label: 'owner', perms: 'Full access. Can delete the org and transfer ownership.' },
  admin: { icon: Shield, color: 'text-primary bg-primary/10 border-primary/30', label: 'admin', perms: 'Manage flags, rules, segments, members, API keys, environments.' },
  member: { icon: UserIcon, color: 'text-info bg-info/10 border-info/30', label: 'member', perms: 'Read + write flags and rules. Read segments.' },
  viewer: { icon: Eye, color: 'text-muted-foreground bg-surface-2 border-border', label: 'viewer', perms: 'Read-only access to flags, rules, and segments.' },
};

const MEMBERS = [
  { name: 'Jordan Park', email: 'jordan.p@acme.com', role: 'owner' as Role, projects: ['all'], joined: 'Mar 02, 2026', lastActive: 'active now', initials: 'jp', gradient: 'from-magenta/40 to-info/40' },
  { name: 'Mira Kowalski', email: 'mira.k@acme.com', role: 'admin' as Role, projects: ['novapay', 'lighthouse'], joined: 'Mar 14, 2026', lastActive: '12m ago', initials: 'mk', gradient: 'from-primary/40 to-info/40' },
  { name: 'Sai Ramaswamy', email: 'sai.r@acme.com', role: 'admin' as Role, projects: ['novapay'], joined: 'Mar 22, 2026', lastActive: '2h ago', initials: 'sr', gradient: 'from-warning/40 to-magenta/40' },
  { name: 'Lena Faulk', email: 'lena.f@acme.com', role: 'member' as Role, projects: ['novapay'], joined: 'Apr 01, 2026', lastActive: 'yesterday', initials: 'lf', gradient: 'from-info/40 to-primary/40' },
  { name: 'Dev Patel', email: 'dev.p@acme.com', role: 'member' as Role, projects: ['lighthouse'], joined: 'Apr 11, 2026', lastActive: 'Apr 30', initials: 'dp', gradient: 'from-magenta/40 to-warning/40' },
  { name: 'Riya Banerjee', email: 'riya.b@acme.com', role: 'viewer' as Role, projects: ['all'], joined: 'Apr 18, 2026', lastActive: 'Apr 22', initials: 'rb', gradient: 'from-info/40 to-magenta/40' },
];

const PENDING = [
  { email: 'alex.t@acme.com', role: 'member' as Role, invitedBy: 'jordan.p', at: '2h ago' },
  { email: 'noor.h@partner.io', role: 'viewer' as Role, invitedBy: 'mira.k', at: 'yesterday' },
];

export function MembersPage({ orgSlug }: { orgSlug: string }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<(typeof MEMBERS)[0] | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / members`}
        title="members"
        command="pulse members list --org=acme-corp"
      >
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" strokeWidth={2.5} /> invite member
        </button>
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
                      <Icon className="size-3" />
                      {info.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{info.perms}</p>
                </div>
              );
            })}
          </div>

          {/* Pending invites */}
          {PENDING.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">// pending invites</h4>
                <span className="font-mono text-[11.5px] text-muted-foreground">{PENDING.length} pending</span>
              </div>
              <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
                {PENDING.map((p) => (
                  <div key={p.email} className="grid grid-cols-[1fr_180px_180px_120px] gap-4 px-5 py-3.5 items-center border-b border-border last:border-b-0">
                    <div className="flex items-center gap-3">
                      <Mail className="size-4 text-warning" />
                      <span className="font-mono text-[13px]">{p.email}</span>
                    </div>
                    <RoleBadge role={p.role} />
                    <span className="font-mono text-[12px] text-muted-foreground">invited by {p.invitedBy} · {p.at}</span>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button type="button" className="font-mono text-[11.5px] px-2.5 py-1.5 rounded border border-border bg-surface-2 text-muted-foreground hover:text-foreground">resend</button>
                      <button type="button" className="font-mono text-[11.5px] px-2.5 py-1.5 rounded border border-border bg-surface-2 text-destructive hover:bg-destructive/10">revoke</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Members table */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">// members ({MEMBERS.length})</h4>
            </div>
            <div className="rounded-md border border-border bg-surface-1 overflow-hidden">
              <div className="grid grid-cols-[1fr_140px_180px_140px_60px] gap-4 px-5 py-3 border-b border-border bg-surface-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim">
                <div>user</div>
                <div>org role</div>
                <div>project access</div>
                <div>last active</div>
                <div />
              </div>
              {MEMBERS.map((m) => (
                <div key={m.email} className="grid grid-cols-[1fr_140px_180px_140px_60px] gap-4 px-5 py-4 items-center border-b border-border last:border-b-0 hover:bg-surface-2/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`size-9 rounded-md bg-gradient-to-br ${m.gradient} border border-border grid place-items-center font-mono text-[12px] uppercase`}>
                      {m.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] truncate">{m.name}</div>
                      <div className="font-mono text-[11.5px] text-muted-foreground truncate">{m.email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRoleTarget(m)}
                    className="w-fit hover:opacity-80 transition-opacity"
                  >
                    <RoleBadge role={m.role} />
                  </button>
                  <div className="flex flex-wrap items-center gap-1">
                    {m.projects.map((p) => (
                      <span key={p} className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border">{p}</span>
                    ))}
                  </div>
                  <span className="font-mono text-[11.5px] text-muted-foreground">{m.lastActive}</span>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(m.name)}
                      className="size-7 grid place-items-center rounded border border-transparent hover:border-border hover:bg-surface-2 text-dim hover:text-foreground"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <InviteMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ChangeRoleDialog
        open={roleTarget !== null}
        onClose={() => setRoleTarget(null)}
        member={roleTarget ?? undefined}
      />
      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title={`Remove ${removeTarget}`}
        description="This member will lose access to all projects in this organization."
        confirmLabel="remove member"
        variant="warning"
      />
    </main>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const info = ROLE_INFO[role];
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded font-mono text-[11px] border w-fit ${info.color}`}>
      <Icon className="size-3" />
      {info.label}
    </span>
  );
}
