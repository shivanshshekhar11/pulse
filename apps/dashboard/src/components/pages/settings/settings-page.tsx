'use client';

import { useState } from 'react';
import {
  Save, AlertTriangle, Trash2, Crown, User as UserIcon, Lock,
  Shield, Smartphone, KeyRound, Building2, Bell, Plug, Plus,
  LogOut, Camera,
} from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { Toggle } from '~/components/ui/toggle';

type Tab =
  | 'profile' | 'security' | 'tokens' | 'sessions' | 'notifications'
  | 'org-general' | 'org-security' | 'org-billing' | 'org-integrations' | 'org-danger';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; group: 'account' | 'org' }[] = [
  { id: 'profile', label: 'profile', icon: UserIcon, group: 'account' },
  { id: 'security', label: 'password & 2FA', icon: Lock, group: 'account' },
  { id: 'tokens', label: 'personal tokens', icon: KeyRound, group: 'account' },
  { id: 'sessions', label: 'active sessions', icon: Smartphone, group: 'account' },
  { id: 'notifications', label: 'notifications', icon: Bell, group: 'account' },
  { id: 'org-general', label: 'general', icon: Building2, group: 'org' },
  { id: 'org-security', label: 'security', icon: Shield, group: 'org' },
  { id: 'org-billing', label: 'billing & plan', icon: Crown, group: 'org' },
  { id: 'org-integrations', label: 'integrations', icon: Plug, group: 'org' },
  { id: 'org-danger', label: 'danger zone', icon: AlertTriangle, group: 'org' },
];

export function SettingsPage({ orgSlug }: { orgSlug: string }) {
  const [tab, setTab] = useState<Tab>('profile');

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
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim px-2 mb-1.5">// organization</div>
          <ul className="space-y-0.5">
            {TABS.filter((t) => t.group === 'org').map((t) => (
              <SettingsNavItem key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
            ))}
          </ul>
        </aside>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8 min-w-0">
          <div className="max-w-[820px] space-y-6">
            {tab === 'profile' && <ProfileSection />}
            {tab === 'security' && <SecuritySection />}
            {tab === 'tokens' && <TokensSection />}
            {tab === 'sessions' && <SessionsSection />}
            {tab === 'notifications' && <NotificationsSection />}
            {tab === 'org-general' && <OrgGeneralSection orgSlug={orgSlug} />}
            {tab === 'org-security' && <OrgSecuritySection />}
            {tab === 'org-billing' && <OrgBillingSection />}
            {tab === 'org-integrations' && <OrgIntegrationsSection />}
            {tab === 'org-danger' && <OrgDangerSection />}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────────

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

// ── Section components ────────────────────────────────────────────────────────

function ProfileSection() {
  return (
    <>
      <SectionHead title="profile" subtitle="How you appear across pulse." />
      <Card label="public">
        <div className="px-5 py-5 flex items-center gap-5">
          <div className="relative">
            <div className="size-16 rounded-md bg-gradient-to-br from-primary/40 to-info/40 border border-border grid place-items-center font-mono text-[18px]">AK</div>
            <button type="button" className="absolute -bottom-1 -right-1 size-6 rounded-md bg-surface-2 border border-border grid place-items-center hover:bg-surface-3">
              <Camera className="size-3" />
            </button>
          </div>
          <div className="flex-1">
            <div className="text-[13.5px]">Alex Kowalski</div>
            <div className="font-mono text-[11.5px] text-muted-foreground">alex@acme.com · joined Jan 2024</div>
          </div>
          <button type="button" className="font-mono text-[11.5px] px-3 py-1.5 rounded border border-border bg-surface-2 text-muted-foreground hover:text-foreground">remove avatar</button>
        </div>
        <FieldRow label="display name" hint="Shown in the audit log and to teammates."><TextInput defaultValue="Alex Kowalski" /></FieldRow>
        <FieldRow label="username" hint="Unique handle. Lowercase, hyphenated."><PrefixInput prefix="pulse.dev/u/" defaultValue="alex.k" /></FieldRow>
        <FieldRow label="timezone"><SelectInput options={['America/New_York (UTC-4)', 'Europe/London (UTC+1)', 'Asia/Tokyo (UTC+9)']} /></FieldRow>
        <ActionRow><PrimaryBtn icon={Save}>save changes</PrimaryBtn></ActionRow>
      </Card>
    </>
  );
}

function SecuritySection() {
  const [twofa, setTwofa] = useState(true);
  return (
    <>
      <SectionHead title="password & 2FA" subtitle="Keep your account secure." />
      <Card label="password">
        <FieldRow label="current password"><TextInput type="password" placeholder="••••••••" /></FieldRow>
        <FieldRow label="new password" hint="Minimum 12 characters."><TextInput type="password" /></FieldRow>
        <FieldRow label="confirm new password"><TextInput type="password" /></FieldRow>
        <ActionRow><PrimaryBtn icon={Save}>update password</PrimaryBtn></ActionRow>
      </Card>
      <Card label="two-factor authentication">
        <ToggleRow label="Authenticator app" hint="Use a TOTP app like 1Password or Authy. Required for production toggles." on={twofa} onChange={setTwofa} />
        <FieldRow label="recovery codes" hint="Single-use codes for account recovery.">
          <button type="button" className="font-mono text-[11.5px] px-3 py-1.5 rounded border border-border bg-surface-2 text-muted-foreground hover:text-foreground">view & regenerate</button>
        </FieldRow>
      </Card>
    </>
  );
}

function TokensSection() {
  const tokens = [
    { name: 'cli-laptop', prefix: 'ppat_a8f2…', lastUsed: '12m ago', scopes: 'read,write' },
    { name: 'deploy-bot', prefix: 'ppat_3c0e…', lastUsed: '2h ago', scopes: 'read' },
  ];
  return (
    <>
      <SectionHead title="personal access tokens" subtitle="For pulse CLI and personal scripts. Tokens act on your behalf." action={<PrimaryBtn icon={Plus}>generate token</PrimaryBtn>} />
      <Card label="active tokens">
        {tokens.map((t) => (
          <div key={t.name} className="px-5 py-3.5 flex items-center gap-4">
            <KeyRound className="size-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[12.5px]">{t.name}</div>
              <div className="font-mono text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>{t.prefix}</span><span className="text-dim">·</span><span>{t.scopes}</span><span className="text-dim">·</span><span>last used {t.lastUsed}</span>
              </div>
            </div>
            <button type="button" className="font-mono text-[11px] px-2.5 py-1 rounded border border-destructive/30 text-destructive hover:bg-destructive/10">revoke</button>
          </div>
        ))}
      </Card>
    </>
  );
}

function SessionsSection() {
  const sessions = [
    { device: 'MacBook Pro · Chrome 134', loc: 'Brooklyn, NY', ip: '73.42.18.91', last: 'now', current: true },
    { device: 'iPhone 15 · Safari', loc: 'Brooklyn, NY', ip: '73.42.18.91', last: '1h ago', current: false },
    { device: 'Linux · pulse-cli/0.1.0', loc: 'us-east-1', ip: '10.0.4.22', last: '2d ago', current: false },
  ];
  return (
    <>
      <SectionHead title="active sessions" subtitle="Devices currently signed in to your account." action={
        <button type="button" className="font-mono text-[11.5px] px-3 py-1.5 rounded border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center gap-1.5">
          <LogOut className="size-3.5" /> sign out everywhere
        </button>
      } />
      <Card label="devices">
        {sessions.map((s) => (
          <div key={s.ip + s.device} className="px-5 py-3.5 flex items-center gap-4">
            <Smartphone className="size-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] flex items-center gap-2">
                {s.device}
                {s.current && <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">current</span>}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground mt-0.5">{s.loc} · {s.ip} · {s.last}</div>
            </div>
            {!s.current && <button type="button" className="font-mono text-[11px] px-2.5 py-1 rounded border border-border text-muted-foreground hover:text-foreground">revoke</button>}
          </div>
        ))}
      </Card>
    </>
  );
}

function NotificationsSection() {
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);
  const [digest, setDigest] = useState(true);
  return (
    <>
      <SectionHead title="notifications" subtitle="Choose what reaches your inbox." />
      <Card label="channels">
        <ToggleRow label="Email" hint="alex@acme.com" on={email} onChange={setEmail} />
        <ToggleRow label="Browser push" hint="Real-time toast notifications" on={push} onChange={setPush} />
        <ToggleRow label="Weekly digest" hint="Summary of flag activity every Monday." on={digest} onChange={setDigest} />
      </Card>
    </>
  );
}

function OrgGeneralSection({ orgSlug }: { orgSlug: string }) {
  return (
    <>
      <SectionHead title="organization · general" subtitle="Public-facing organization details." />
      <Card label="profile">
        <FieldRow label="organization name"><TextInput defaultValue="Acme Corp" /></FieldRow>
        <FieldRow label="slug" hint="Used in URLs and the API. Immutable."><PrefixInput prefix="pulse.dev/" defaultValue={orgSlug} disabled /></FieldRow>
        <FieldRow label="default project"><SelectInput options={['novapay', 'lighthouse', 'pelican-mobile']} /></FieldRow>
        <ActionRow><PrimaryBtn icon={Save}>save changes</PrimaryBtn></ActionRow>
      </Card>
    </>
  );
}

function OrgSecuritySection() {
  const [enforce2fa, setEnforce2fa] = useState(true);
  const [sso, setSso] = useState(false);
  return (
    <>
      <SectionHead title="organization · security" subtitle="Policy applied to all members." />
      <Card label="policies">
        <ToggleRow label="Enforce 2FA for all members" hint="Members without 2FA cannot sign in." on={enforce2fa} onChange={setEnforce2fa} />
        <ToggleRow label="Single sign-on (SAML)" hint="Available on Enterprise plans." on={sso} onChange={setSso} />
        <FieldRow label="session timeout" hint="Auto-logout after inactivity."><SelectInput options={['15 minutes', '1 hour', '8 hours', '30 days']} /></FieldRow>
        <FieldRow label="allowed email domains" hint="Comma-separated. Empty = anyone with an invite."><TextInput defaultValue="acme.com, acme-internal.dev" /></FieldRow>
      </Card>
    </>
  );
}

function OrgBillingSection() {
  return (
    <>
      <SectionHead title="billing & plan" subtitle="Manage your subscription and invoices." />
      <Card label="current plan">
        <div className="px-5 py-5 flex items-center gap-4">
          <div className="size-12 rounded-md bg-warning/15 border border-warning/40 grid place-items-center">
            <Crown className="size-5 text-warning" />
          </div>
          <div className="flex-1">
            <div className="text-[14px]">Enterprise</div>
            <div className="font-mono text-[11.5px] text-muted-foreground">unlimited flags · 1y audit retention · sso · priority support</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[16px] text-foreground">$1,200<span className="text-muted-foreground text-[12px]">/mo</span></div>
            <div className="font-mono text-[10.5px] text-dim">renews Jun 1, 2026</div>
          </div>
        </div>
        <div className="px-5 py-3 bg-surface-2/40 flex items-center justify-end gap-2">
          <button type="button" className="font-mono text-[11.5px] px-3 py-1.5 rounded border border-border bg-surface-2 hover:bg-surface-3">view invoices</button>
          <PrimaryBtn>manage billing</PrimaryBtn>
        </div>
      </Card>
    </>
  );
}

function OrgIntegrationsSection() {
  const integrations = [
    { name: 'Slack', desc: 'Post audit events to channels', connected: true, color: 'from-magenta/40 to-info/40' },
    { name: 'GitHub', desc: 'Link flags to PRs and issues', connected: true, color: 'from-foreground/30 to-muted-foreground/20' },
    { name: 'Datadog', desc: 'Forward eval metrics', connected: false, color: 'from-magenta/40 to-warning/40' },
    { name: 'Webhooks', desc: 'Custom HTTP endpoints', connected: true, color: 'from-primary/40 to-info/40' },
  ];
  return (
    <>
      <SectionHead title="integrations" subtitle="Connect pulse to the rest of your stack." />
      <Card label="available">
        {integrations.map((i) => (
          <div key={i.name} className="px-5 py-4 flex items-center gap-4">
            <div className={`size-10 rounded-md bg-gradient-to-br ${i.color} border border-border`} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px]">{i.name}</div>
              <div className="font-mono text-[11.5px] text-muted-foreground">{i.desc}</div>
            </div>
            {i.connected ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] text-primary flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary" /> connected
                </span>
                <button type="button" className="font-mono text-[11.5px] px-3 py-1.5 rounded border border-border bg-surface-2 hover:bg-surface-3">configure</button>
              </div>
            ) : (
              <PrimaryBtn>connect</PrimaryBtn>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}

function OrgDangerSection() {
  return (
    <>
      <SectionHead title="danger zone" subtitle="Irreversible and destructive operations." />
      <Card label="" tone="danger">
        <DangerRow title="Transfer ownership" hint="Move this organization to another member. You will lose owner access." cta="transfer" />
        <DangerRow title="Export & delete data" hint="Download a JSON archive of all flags, segments, and audit logs." cta="export" />
        <DangerRow title="Delete organization" hint="Permanently delete this organization, all projects, flags, and audit history. This cannot be undone." cta="delete org" destructive icon={Trash2} />
      </Card>
    </>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function SectionHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-2">
      <div>
        <h2 className="text-[20px]">{title}</h2>
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

function ToggleRow({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="px-5 py-4 flex items-center gap-6">
      <div className="flex-1">
        <div className="text-[13px]">{label}</div>
        {hint && <p className="text-[11.5px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-3 bg-surface-2/40 flex justify-end">{children}</div>;
}

function DangerRow({ title, hint, cta, destructive, icon: Icon }: { title: string; hint: string; cta: string; destructive?: boolean; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="px-5 py-4 flex items-center gap-6">
      <div className="flex-1">
        <div className="text-[13.5px]">{title}</div>
        <p className="text-[11.5px] text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <button type="button" className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] border ${destructive ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20' : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground'}`}>
        {Icon && <Icon className="size-3.5" />}
        {cta}
      </button>
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full px-3 py-2 bg-surface-0 border border-border rounded-md text-[13px] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-60 ${props.className ?? ''}`} />;
}

function PrefixInput({ prefix, ...props }: { prefix: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center font-mono">
      <span className="px-3 py-2 bg-surface-2 border border-r-0 border-border rounded-l-md text-[13px] text-muted-foreground">{prefix}</span>
      <input {...props} className={`flex-1 px-3 py-2 bg-surface-0 border border-border rounded-r-md text-[13px] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-60 ${props.className ?? ''}`} />
    </div>
  );
}

function SelectInput({ options }: { options: string[] }) {
  return (
    <select className="w-full px-3 py-2 bg-surface-0 border border-border rounded-md text-[13px] font-mono focus:outline-none focus:border-primary/50">
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function PrimaryBtn({ icon: Icon, children }: { icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>; children: React.ReactNode }) {
  return (
    <button type="button" className="flex items-center gap-1.5 px-3.5 py-2 rounded-md font-mono text-[12.5px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
      {Icon && <Icon className="size-3.5" strokeWidth={2.2} />}
      {children}
    </button>
  );
}
