import type { Condition } from '@pulse-flags/types';

/**
 * A reusable user segment with a condition tree.
 * Segments are org-scoped and referenced by rules via the `segment` operator.
 */
export interface Segment {
  id: string;
  name: string;
  conditions: Condition;
}

/**
 * A single targeting rule attached to a flag.
 * Rules are evaluated in ascending `priority` order.
 * If the user matches `conditions` and falls within `percentage`, the rule's `value` is returned.
 */
export interface Rule {
  id: string;
  name: string | null;
  priority: number;
  conditions: Condition;
  /** Percentage of matching users who receive this rule's value (0–100). */
  percentage: number;
  value: unknown;
  enabled: boolean;
}

/**
 * A feature flag with its targeting rules.
 * Flags are environment-scoped and evaluated locally by the SDK.
 */
export interface Flag {
  id: string;
  key: string;
  name: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  /** Returned when no rule matches or the flag is disabled. */
  defaultValue: unknown;
  enabled: boolean;
  rules: Rule[];
}

/**
 * The full ruleset downloaded from GET /sdk/v1/ruleset.
 * Contains all flags and segments for a given environment.
 * The SDK stores this in memory and evaluates flags locally against it.
 */
export interface Ruleset {
  flags: Flag[];
  segments: Segment[];
}
