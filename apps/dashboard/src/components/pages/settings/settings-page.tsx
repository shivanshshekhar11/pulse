"use client";

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Save,
  AlertTriangle,
  Trash2,
  User as UserIcon,
  Lock,
  Building2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '~/components/ui/page-header';
import { useOrg, useUpdateOrg, useDeleteOrg } from '~/lib/hooks/use-org';
import { useProfile, useUpdateProfile, useChangePassword } from '~/lib/hooks/use-auth';
import { useUserOrgs } from '~/lib/hooks/use-user-orgs';
import { ConfirmDialog } from '~/components/dialogs/confirm';
import { usePermission } from '~/lib/hooks/use-permissions';
import { CreateOrganizationSchema, UpdateUserSchema, ChangePasswordSchema } from '@pulse-flags/types';

type Tab = 'profile' | 'security' | 'org-general' | 'org-danger';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; group: 'account' | 'org' }[] = [
  { id: 'profile', label: 'profile', icon: UserIcon, group: 'account' },
  { id: 'security', label: 'password', icon: Lock, group: 'account' },
  { id: 'org-general', label: 'general', icon: Building2, group: 'org' },
  { id: 'org-danger', label: 'danger zone', icon: AlertTriangle, group: 'org' },
];

export function SettingsPage({ orgSlug }: { orgSlug: string }) {
  const [tab, setTab] = useState<Tab>('profile');
  const router = useRouter();
  const { data: org } = useOrg(orgSlug);
  const updateOrg = useUpdateOrg(orgSlug);
  const deleteOrg = useDeleteOrg(orgSlug);
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { refetch: refetchUserOrgs } = useUserOrgs();

  const { hasPerm: canUpdateOrg, isLoading: permLoading } = usePermission(orgSlug, 'org:update');

  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!permLoading && !canUpdateOrg && (tab === 'org-general' || tab === 'org-danger')) {
      setTab('profile');
    }
  }, [canUpdateOrg, permLoading, tab]);

  const handleDeleteOrg = async () => {
    try {
      await deleteOrg.mutateAsync();
      const next = await refetchUserOrgs();
      const nextOrg = next.data?.find((o) => o.slug !== orgSlug);
      router.push(nextOrg ? `/${nextOrg.slug}/projects` : '/_/projects');
    } catch {
      // Errors are surfaced by the mutation toast.
    }
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader crumb={`${orgSlug} / settings`} title="settings" />

      <div className="flex-1 flex min-h-0">
        {/* Settings sidebar */}
        <aside className="w-[220px] shrink-0 border-r border-border bg-surface-0 overflow-y-auto py-5 px-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim px-2 mb-1.5">// account</div>
          <ul className="space-y-0.5 mb-5">
            {TABS.filter((t) => t.group === 'account').map((t) => (
              <SettingsNavItem key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
            ))}
          </ul>
          {canUpdateOrg && (
            <>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim px-2 mb-1.5">// organization</div>
              <ul className="space-y-0.5">
                {TABS.filter((t) => t.group === 'org').map((t) => (
                  <SettingsNavItem key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
                ))}
              </ul>
            </>
          )}
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8 min-w-0">
          <div className="max-w-[820px] space-y-6">
            {tab === 'profile' && (
              <ProfileSection
                profile={profile}
                saving={updateProfile.isPending}
                onSave={(values) => updateProfile.mutate(values)}
              />
            )}
            {tab === 'security' && (
              <SecuritySection
                saving={changePassword.isPending}
                onSave={async (values) => { await changePassword.mutateAsync(values); }}
              />
            )}
            {tab === 'org-general' && (
              <OrgGeneralSection
                orgSlug={orgSlug}
                orgName={org?.name}
                orgPlan={org?.plan}
                saving={updateOrg.isPending}
                onSave={(name) => updateOrg.mutate({ name })}
              />
            )}
            {tab === 'org-danger' && (
              <OrgDangerSection onDelete={() => setDeleteOpen(true)} />
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete "${org?.name ?? orgSlug}"`}
        description="This organization, its projects, and all associated data will be removed."
        confirmLabel="delete organization"
        confirmType={orgSlug}
        onConfirm={() => {
          void handleDeleteOrg();
        }}
        consequences={[
          'All projects, environments, flags, and rules deleted',
          'API keys immediately revoked',
          'Audit logs removed with the org',
          'Cannot be undone',
        ]}
      />
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────────

function SettingsNavItem({ tab, active, onClick }: { tab: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <li>
      <button type="button" onClick={onClick} className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[12.5px] transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-surface-1 hover:text-foreground'}`}>
        <Icon className="size-3.5" />
        <span className="flex-1 text-left">{tab.label}</span>
      </button>
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────────

function ProfileSection({
  profile,
  saving,
  onSave,
}: {
  profile?: { name: string | null; email: string; avatarUrl: string | null };
  saving?: boolean;
  onSave?: (values: { name: string | null; email: string; avatarUrl: string | null }) => void;
}) {
  const { register, handleSubmit, reset, watch } = useForm<z.infer<typeof UpdateUserSchema>>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: {
      name: profile?.name ?? null,
      email: profile?.email ?? '',
      avatarUrl: profile?.avatarUrl ?? null,
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      name: profile.name ?? null,
      email: profile.email,
      avatarUrl: profile.avatarUrl ?? null,
    });
  }, [profile, reset]);

  const canSave = !!watch('email')?.trim();

  return (
    <>
      <SectionHead title="profile" subtitle="Your account details." />
      <Card label="account">
        <FieldRow label="display name" hint="Shown in audit logs and member lists.">
          <TextInput
            {...register('name', {
              setValueAs: (value) => {
                const next = String(value ?? '').trim();
                return next ? next : null;
              },
            })}
          />
        </FieldRow>
        <FieldRow label="email" hint="Used for login and notifications.">
          <TextInput
            type="email"
            {...register('email', {
              setValueAs: (value) => String(value ?? '').trim(),
            })}
          />
        </FieldRow>
        <FieldRow label="avatar URL" hint="Optional image URL.">
          <TextInput
            {...register('avatarUrl', {
              setValueAs: (value) => {
                const next = String(value ?? '').trim();
                return next ? next : null;
              },
            })}
          />
        </FieldRow>
        <ActionRow>
          <PrimaryBtn
            icon={Save}
            onClick={handleSubmit((values) => onSave?.({
              name: values.name ?? null,
              email: values.email ?? '',
              avatarUrl: values.avatarUrl ?? null,
            }))}
            disabled={!canSave || saving}
          >
            {saving ? 'saving…' : 'save changes'}
          </PrimaryBtn>
        </ActionRow>
      </Card>
    </>
  );
}

function SecuritySection({
  saving,
  onSave,
}: {
  saving?: boolean;
  onSave?: (values: { currentPassword: string; newPassword: string }) => Promise<void>;
}) {
  const SecuritySchema = z.object({
    currentPassword: ChangePasswordSchema.shape.currentPassword,
    newPassword: ChangePasswordSchema.shape.newPassword,
    confirmPassword: z.string().min(1, 'confirm your new password'),
  }).refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'passwords do not match',
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<z.infer<typeof SecuritySchema>>({
    resolver: zodResolver(SecuritySchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPassword = watch('newPassword');
  const canSave = !!watch('currentPassword') && !!newPassword && newPassword.length >= 8 && !errors.confirmPassword;

  return (
    <>
      <SectionHead title="password" subtitle="Update your account password." />
      <Card label="password">
        <FieldRow label="current password">
          <TextInput type="password" {...register('currentPassword')} />
        </FieldRow>
        <FieldRow label="new password" hint="Minimum 8 characters.">
          <TextInput type="password" {...register('newPassword')} />
        </FieldRow>
        <FieldRow label="confirm new password" hint={errors.confirmPassword?.message}>
          <TextInput type="password" {...register('confirmPassword')} />
        </FieldRow>
        <ActionRow>
          <PrimaryBtn
            icon={Save}
            onClick={handleSubmit(async ({ currentPassword, newPassword }) => {
              if (!onSave) return;
              try {
                await onSave({ currentPassword, newPassword });
                reset();
              } catch {
                // Errors are surfaced by the mutation toast.
              }
            })}
            disabled={!canSave || saving}
          >
            {saving ? 'updating…' : 'update password'}
          </PrimaryBtn>
        </ActionRow>
      </Card>
    </>
  );
}

function OrgGeneralSection({ orgSlug, orgName, orgPlan, onSave, saving }: { orgSlug: string; orgName?: string; orgPlan?: string; onSave?: (name: string) => void; saving?: boolean }) {
  const { register, handleSubmit, reset, watch } = useForm<{ name: string }>({
    resolver: zodResolver(z.object({ name: CreateOrganizationSchema.shape.name })),
    defaultValues: { name: orgName ?? '' },
  });

  const name = watch('name');
  const planLabel = orgPlan ? orgPlan.charAt(0).toUpperCase() + orgPlan.slice(1) : 'Free';
  useEffect(() => {
    if (orgName) reset({ name: orgName });
  }, [orgName, reset]);
  return (
    <>
      <SectionHead title="organization · general" subtitle="Public-facing organization details." />
      <Card label="profile">
        <FieldRow label="organization name" hint="Display name shown across the dashboard.">
          <TextInput {...register('name')} />
        </FieldRow>
        <FieldRow label="slug" hint="Used in URLs and the API. Immutable.">
          <PrefixInput prefix="pulse.dev/" defaultValue={orgSlug} disabled />
        </FieldRow>
        <FieldRow label="plan" hint="Read-only in v1."><TextInput value={planLabel} disabled /></FieldRow>
        <ActionRow>
          <PrimaryBtn icon={Save} onClick={handleSubmit((values) => onSave?.(values.name.trim()))} disabled={!name?.trim() || saving}>
            {saving ? 'saving…' : 'save changes'}
          </PrimaryBtn>
        </ActionRow>
      </Card>
    </>
  );
}

function OrgDangerSection({ onDelete }: { onDelete?: () => void }) {
  return (
    <>
      <SectionHead title="danger zone" subtitle="Irreversible and destructive operations." />
      <Card label="danger" tone="danger">
        <DangerRow
          title="Delete organization"
          hint="Permanently delete this organization, all projects, flags, and audit history."
          cta="delete org"
          destructive
          icon={Trash2}
          onClick={onDelete}
        />
      </Card>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────

function SectionHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-2">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[20px]">{title}</h2>
        </div>
        {subtitle && <p className="font-mono text-[12px] text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Card({ label, tone = 'default', children }: { label: string; tone?: 'default' | 'danger'; children: React.ReactNode }) {
  return (
    <section className={`rounded-md border bg-surface-1 overflow-hidden ${tone === 'danger' ? 'border-destructive/40' : 'border-border'}`}>
      {label && (
        <header className={`px-5 py-3 border-b font-mono text-[11px] uppercase tracking-[0.2em] ${tone === 'danger' ? 'border-destructive/30 text-destructive bg-destructive/5' : 'border-border text-dim bg-surface-2'}`}>
          {tone === 'danger' && <AlertTriangle className="inline size-3 mr-1.5" />}
          // {label}
        </header>
      )}
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 grid grid-cols-[200px_1fr] gap-6 items-start">
      <div>
        <label className="block text-[13px]">{label}</label>
        {hint && <p className="text-[11.5px] text-muted-foreground mt-1">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-3 bg-surface-2/40 flex justify-end">{children}</div>;
}

function DangerRow({ title, hint, cta, destructive, icon: Icon, onClick }: { title: string; hint: string; cta: string; destructive?: boolean; icon?: React.ComponentType<{ className?: string }>; onClick?: () => void }) {
  return (
    <div className="px-5 py-4 flex items-center gap-6">
      <div className="flex-1">
        <div className="text-[13.5px]">{title}</div>
        <p className="text-[11.5px] text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] border ${destructive ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20' : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground'}`}
      >
        {Icon && <Icon className="size-3.5" />}
        {cta}
      </button>
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 bg-surface-0 border border-border rounded-md text-[13px] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-60 ${props.className ?? ''}`}
    />
  );
}

function PrefixInput({ prefix, ...props }: { prefix: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center font-mono">
      <span className="px-3 py-2 bg-surface-2 border border-r-0 border-border rounded-l-md text-[13px] text-muted-foreground">{prefix}</span>
      <input {...props} className={`flex-1 px-3 py-2 bg-surface-0 border border-border rounded-r-md text-[13px] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-60 ${props.className ?? ''}`} />
    </div>
  );
}

function PrimaryBtn({ icon: Icon, children, onClick, disabled }: { icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="flex items-center gap-1.5 px-3.5 py-2 rounded-md font-mono text-[12.5px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
      {Icon && <Icon className="size-3.5" strokeWidth={2.2} />}
      {children}
    </button>
  );
}
