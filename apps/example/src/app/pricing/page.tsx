'use client';

import { Check, Zap } from 'lucide-react';
import { usePulseFlag } from '@/lib/hooks';

const FREE_FEATURES = [
  '1,000 transactions / month',
  'Basic analytics',
  'Standard support',
  '2 team members',
];

const PRO_FEATURES = [
  '50,000 transactions / month',
  'Advanced analytics',
  'Priority support',
  'Unlimited team members',
  'Custom webhooks',
  'API access',
];

const ENTERPRISE_FEATURES = [
  'Unlimited transactions',
  'Real-time analytics',
  'Dedicated support',
  'Custom SLA',
  'On-premise option',
  'SAML SSO',
  'Audit logs',
];

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: readonly string[];
  cta?: string;
  highlighted?: boolean;
  badge?: string;
}

function PlanCard({
  name,
  price,
  period,
  description,
  features,
  cta = 'Get started',
  highlighted = false,
  badge,
}: PlanCardProps) {
  return (
    <div
      className={`relative flex flex-col p-7 rounded-2xl border transition-all ${
        highlighted
          ? 'bg-gradient-to-b from-violet-900/40 to-slate-900/60 border-violet-500/50 shadow-xl shadow-violet-500/10'
          : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-violet-600 text-white text-xs font-semibold shadow-lg">
            <Zap size={10} fill="white" />
            {badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">
          {name}
        </h2>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-white">{price}</span>
          {period && <span className="text-slate-400 text-sm">{period}</span>}
        </div>
        <p className="text-sm text-slate-400 mt-2">{description}</p>
      </div>

      <ul className="space-y-2.5 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
            <Check
              size={15}
              className={`mt-0.5 shrink-0 ${highlighted ? 'text-violet-400' : 'text-emerald-400'}`}
            />
            {f}
          </li>
        ))}
      </ul>

      <button
        data-testid={highlighted ? 'pricing-cta' : undefined}
        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
          highlighted
            ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20'
            : 'bg-slate-700 hover:bg-slate-600 text-white'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

export default function Pricing() {
  // pricing_cta_text flag controls the Pro plan CTA button text
  const { variant: ctaVariant } = usePulseFlag('pricing_cta_text');
  const ctaText = typeof ctaVariant === 'string' ? ctaVariant : 'Start Free Trial';

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-white mb-4">Simple, transparent pricing</h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Start free. Scale as you grow. No hidden fees.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid md:grid-cols-3 gap-6 items-start">
        <PlanCard
          name="Free"
          price="$0"
          period="/mo"
          description="For indie developers and side projects."
          features={FREE_FEATURES}
          cta="Start for free"
        />
        <PlanCard
          name="Pro"
          price="$49"
          period="/mo"
          description="For growing startups and teams."
          features={PRO_FEATURES}
          cta={ctaText}
          highlighted
          badge="Most Popular"
        />
        <PlanCard
          name="Enterprise"
          price="Custom"
          period=""
          description="For large organizations with custom needs."
          features={ENTERPRISE_FEATURES}
          cta="Contact sales"
        />
      </div>

      {/* Fine print */}
      <p className="text-center text-xs text-slate-600">
        The Pro CTA text above is controlled by the{' '}
        <code className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-400">
          pricing_cta_text
        </code>{' '}
        feature flag in Pulse — change it in the dashboard and watch it update live.
      </p>
    </div>
  );
}
