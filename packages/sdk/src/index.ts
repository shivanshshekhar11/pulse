/**
 * @pulse/sdk — TypeScript SDK for the Pulse feature flag service.
 *
 * Provides local flag evaluation against a downloaded ruleset,
 * consistent hashing for percentage rollouts, and typed interfaces
 * for the ruleset data model.
 *
 * @example
 * ```ts
 * import { evaluateCondition, getBucket } from '@pulse/sdk';
 * ```
 */

export { getBucket } from './hash';
export { evaluateCondition } from './evaluator';
export type { Segment, Rule, Flag, Ruleset } from './types';
