'use client';

import { PulseClient } from '@pulse-flags/sdk';

if (!process.env.NEXT_PUBLIC_PULSE_API_KEY) {
  console.warn(
    'NEXT_PUBLIC_PULSE_API_KEY is not set. The Pulse SDK will operate in offline mode, using only developer defaults.',
  );
}

export const pulseClient = new PulseClient({
  // Never hardcode API keys in public code, even test ones.
  apiKey: process.env.NEXT_PUBLIC_PULSE_API_KEY || '',
  apiUrl: process.env.NEXT_PUBLIC_PULSE_URL || 'http://127.0.0.1:3001',
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
