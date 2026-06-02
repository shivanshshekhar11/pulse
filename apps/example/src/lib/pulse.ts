'use client';

import { PulseClient } from '@pulse-flags/sdk';
import { env } from '@/env';

if (!env.NEXT_PUBLIC_PULSE_API_KEY) {
  console.warn(
    'NEXT_PUBLIC_PULSE_API_KEY is not set. The Pulse SDK will operate in offline mode, using only developer defaults.',
  );
}

export const pulseClient = new PulseClient({
  // Never hardcode API keys in public code, even test ones.
  apiKey: env.NEXT_PUBLIC_PULSE_API_KEY,
  apiUrl: env.NEXT_PUBLIC_PULSE_URL,
  defaults: {
    new_homepage_hero:     false,
    pricing_cta_text:      'Start Free',
    new_analytics_widget:  false,
    beta_export_feature:   false,
    theme_config:          { primaryColor: '#6366f1', radius: 8 },
  },
  EventSource: typeof window !== 'undefined' ? window.EventSource : undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
