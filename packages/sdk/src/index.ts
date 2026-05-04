/**
 * @pulse-flags/sdk — TypeScript SDK for the Pulse feature flag service.
 *
 * Provides local flag evaluation against a downloaded ruleset,
 * real-time updates via SSE, a three-tier fallback cache, and a
 * test helper for Playwright E2E tests.
 *
 * @example
 * ```ts
 * import { PulseClient } from '@pulse-flags/sdk';
 *
 * const client = new PulseClient({
 *   apiKey: 'ps_live_...',
 *   apiUrl: 'https://api.pulse.dev',
 *   defaults: {
 *     new_homepage_hero: false,
 *     pricing_cta_text: 'Start Free',
 *   },
 * });
 *
 * await client.connect();
 *
 * const show = client.isEnabled('new_homepage_hero', { userId: 'user-123' });
 * const copy = client.getVariant<string>('pricing_cta_text', { userId: 'user-123' });
 *
 * client.on('flag:updated', ({ flagKey }) => {
 *   console.log(`Flag "${flagKey}" may have changed`);
 * });
 * ```
 */

// ── Core client ───────────────────────────────────────────────────────────────
export { PulseClient } from './client';
export type {
  PulseClientOptions,
  PulseClientEvents,
  ConnectionState,
  DefaultFlagMap,
  BooleanFlagKeys,
  VariantFlagKeys,
} from './client';

// ── Test helper ───────────────────────────────────────────────────────────────
export { PulseTestClient } from './test-client';
export type { PulseTestClientOptions } from './test-client';

// ── Low-level exports (for advanced use / server-side evaluation) ─────────────
export { getBucket } from './hash';
export { evaluateCondition } from './evaluator';

// ── Cache adapters (for custom Tier 2 implementations) ────────────────────────
export { LocalStorageAdapter, MemoryCacheAdapter, createDefaultCacheAdapter } from './cache';
export type { CacheAdapter } from './cache';

// ── Types ─────────────────────────────────────────────────────────────────────
export type { Segment, Rule, Flag, Ruleset } from './types';
