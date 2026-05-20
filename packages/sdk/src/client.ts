/**
 * PulseClient — the main entry point for the @pulse-flags/sdk package.
 *
 * Responsibilities:
 * 1. Fetch the full ruleset from GET /sdk/v1/ruleset on connect.
 * 2. Open an SSE connection to GET /sdk/v1/stream and keep it alive.
 * 3. Evaluate flags locally (zero network call per evaluation).
 * 4. Maintain a three-tier fallback cache for resilience.
 * 5. Emit `flag:updated` events when the ruleset changes.
 *
 * ## Generic flag map
 * Pass a flag map type to get full type inference on `isEnabled`, `getVariant`,
 * and `defaults`. Without a type parameter, falls back to `Record<string, unknown>`.
 *
 * ```ts
 * interface MyFlags {
 *   new_homepage_hero:    boolean;
 *   pricing_cta_text:     string;
 *   theme_config:         { primaryColor: string; radius: number };
 * }
 * const client = new PulseClient<MyFlags>({ ... });
 * client.isEnabled('new_homepage_hero', ctx);   // boolean
 * client.getVariant('pricing_cta_text', ctx);   // string | undefined — no cast needed
 * ```
 *
 * ## Three-tier fallback
 * ```
 * Tier 1: In-memory ruleset (updated on SSE events)
 *           ↓ SSE disconnects or fetch fails
 * Tier 2: localStorage / in-process TTL cache snapshot (5-minute TTL)
 *           ↓ cache miss (first boot, cold start)
 * Tier 3: Developer-provided `defaults` object passed to constructor
 * ```
 *
 * ## State machine
 * ```
 * DISCONNECTED → connect() → CONNECTING → SSE open → CONNECTED
 *                                        → fetch fails → STALE (uses cache/defaults)
 * CONNECTED    → SSE closes → RECONNECTING (exponential backoff)
 * RECONNECTING → success    → CONNECTED
 * RECONNECTING → max retries → STALE
 * STALE / any  → connect()  → CONNECTING  (client is reconnectable after close())
 * ```
 */

import { evaluateCondition } from './evaluator';
import { getBucket } from './hash';
import { createDefaultCacheAdapter } from './cache';
import { TypedEmitter } from './emitter';
import type { Ruleset, Flag, Segment } from './types';
import type { CacheAdapter } from './cache';
import type { UserContext } from '@pulse-flags/types';

// ── Flag map type helpers ─────────────────────────────────────────────────────

/**
 * Default flag map used when no type parameter is provided.
 * Allows any string key with unknown value — identical to the untyped behaviour.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DefaultFlagMap = Record<string, any>;

/**
 * Extracts the keys from FlagMap whose value type extends boolean.
 * These are the only keys valid for `isEnabled()`.
 */
export type BooleanFlagKeys<FlagMap> = {
  [K in keyof FlagMap]: FlagMap[K] extends boolean ? K : never;
}[keyof FlagMap];

/**
 * Extracts the keys from FlagMap whose value type does NOT extend boolean.
 * These are the only keys valid for `getVariant()`.
 *
 * When FlagMap is the default (Record<string, any>), all keys are valid for
 * both methods — preserving the untyped fallback behaviour.
 */
export type VariantFlagKeys<FlagMap> = FlagMap extends DefaultFlagMap
  ? string
  : {
      [K in keyof FlagMap]: FlagMap[K] extends boolean ? never : K;
    }[keyof FlagMap];

// ── Types ─────────────────────────────────────────────────────────────────────

/** Connection state of the PulseClient. */
export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'STALE';

export interface PulseClientOptions<FlagMap = DefaultFlagMap> {
  /** API key — `ps_live_*` for production, `ps_test_*` for other environments. */
  apiKey: string;
  /** Base URL of the Pulse API (e.g. `https://api.pulse.dev` or `http://localhost:3000`). */
  apiUrl: string;
  /**
   * Tier 3 fallback values. Returned when both in-memory and cache tiers are
   * unavailable for a given flag key.
   *
   * When a FlagMap type parameter is provided, this object is type-checked
   * against the map — keys must exist in FlagMap and values must match their
   * declared types.
   */
  defaults?: Partial<FlagMap>;
  /**
   * Custom Tier 2 cache adapter. Defaults to `LocalStorageAdapter` in browsers
   * and `MemoryCacheAdapter` in Node.js.
   */
  cache?: CacheAdapter;
  /**
   * Maximum number of reconnect attempts before transitioning to STALE.
   * Defaults to `Infinity` (retry forever).
   */
  maxReconnectAttempts?: number;
  /**
   * Custom EventSource constructor. Use this to inject an EventSource polyfill
   * in pure Node.js environments (e.g. `eventsource` npm package).
   */
  EventSource?: any;
}

/** Events emitted by PulseClient. */
export interface PulseClientEvents {
  /** Emitted when a flag's evaluated value may have changed due to a ruleset update. */
  'flag:updated': { flagKey: string };
  /** Emitted when the connection state changes. */
  'state:changed': { state: ConnectionState };
  /**
   * Emitted when a non-fatal error occurs (fetch failure, SSE error, max
   * reconnect attempts reached, etc.). The client continues operating in a
   * degraded state — it never throws.
   */
  error: { message: string; cause?: unknown };
}

// ── Cache key ─────────────────────────────────────────────────────────────────

/** Derives a stable cache key from the API key prefix (first 12 chars). */
function cacheKey(apiKey: string): string {
  return `pulse:ruleset:${apiKey.slice(0, 12)}`;
}

// ── PulseClient ───────────────────────────────────────────────────────────────

export class PulseClient<FlagMap = DefaultFlagMap> extends TypedEmitter<PulseClientEvents> {
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly defaults: Partial<FlagMap>;
  private readonly cache: CacheAdapter;
  private readonly maxReconnectAttempts: number;
  private readonly EventSourceClass: any;

  /** Derived lookup maps for O(1) flag and segment access. */
  private flagMap = new Map<string, Flag>();
  private segmentMap = new Map<string, Segment>();

  private state: ConnectionState = 'DISCONNECTED';
  private eventSource: EventSource | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(options: PulseClientOptions<FlagMap>) {
    super();
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl.replace(/\/$/, ''); // strip trailing slash
    this.defaults = options.defaults ?? ({} as Partial<FlagMap>);
    this.cache = options.cache ?? createDefaultCacheAdapter();
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? Infinity;
    this.EventSourceClass = options.EventSource ?? (typeof EventSource !== 'undefined' ? EventSource : undefined);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Connects to the Pulse API.
   *
   * 1. Fetches the ruleset from GET /sdk/v1/ruleset.
   * 2. Opens an SSE connection to GET /sdk/v1/stream.
   *
   * Resolves once the initial ruleset is loaded (or a cached/default fallback
   * is available). Does not reject — errors are emitted via the `error` event.
   *
   * Safe to call after `close()` — the client is fully reconnectable.
   */
  async connect(): Promise<void> {
    if (this.state !== 'DISCONNECTED') return;
    this.closed = false; // reset so openStream() is allowed
    this.setState('CONNECTING');

    await this.fetchRuleset();
    this.openStream();
  }

  /**
   * Evaluates a boolean flag for the given user context.
   *
   * Never throws. Returns `false` (or the Tier 3 default) if the flag is
   * unknown or evaluation fails.
   *
   * When a FlagMap type parameter is provided, `flagKey` is constrained to
   * keys whose value type is `boolean`, preventing accidental misuse.
   *
   * @param flagKey - The flag key (e.g. `new_homepage_hero`)
   * @param context - User attributes used for targeting (e.g. `{ userId, country, plan }`)
   */
  isEnabled(flagKey: BooleanFlagKeys<FlagMap> & string, context: UserContext): boolean {
    const value = this.evaluate(flagKey as string, context);
    if (typeof value === 'boolean') return value;
    // Coerce non-boolean defaults gracefully
    return Boolean(value ?? false);
  }

  /**
   * Evaluates a string, number, or JSON flag for the given user context.
   *
   * Never throws. Returns `undefined` (or the Tier 3 default) if the flag is
   * unknown or evaluation fails.
   *
   * When a FlagMap type parameter is provided, the return type is inferred
   * directly from the map — no manual type cast needed.
   *
   * @param flagKey - The flag key (e.g. `pricing_cta_text`)
   * @param context - User attributes used for targeting
   */
  getVariant<K extends VariantFlagKeys<FlagMap> & string>(
    flagKey: K,
    context: UserContext
  ): (FlagMap extends DefaultFlagMap ? unknown : FlagMap[K & keyof FlagMap]) | undefined {
    return this.evaluate(flagKey, context) as
      | (FlagMap extends DefaultFlagMap ? unknown : FlagMap[K & keyof FlagMap])
      | undefined;
  }

  /** Returns the current connection state. */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Closes the SSE connection and cancels any pending reconnect.
   * The client transitions to DISCONNECTED.
   *
   * The client is fully reconnectable — call `connect()` again to resume.
   * Note: event listeners are NOT removed on close so they survive reconnects.
   * Call `removeAllListeners()` explicitly if you want full teardown.
   */
  close(): void {
    this.closed = true;
    this.clearReconnectTimer();
    this.closeStream();
    this.setState('DISCONNECTED');
  }

  // ── Evaluation ──────────────────────────────────────────────────────────────

  /**
   * Core evaluation logic. Walks the flag's rules in priority order and
   * returns the first matching rule's value, or the flag's `defaultValue`.
   *
   * Falls back through the three tiers if the flag is not in memory.
   */
  private evaluate(flagKey: string, context: UserContext): unknown {
    try {
      const flag = this.flagMap.get(flagKey);

      if (!flag) {
        // Tier 3: developer defaults
        if (flagKey in this.defaults) return (this.defaults as Record<string, unknown>)[flagKey];
        this.warn(`Flag "${flagKey}" not found in ruleset — returning undefined`);
        return undefined;
      }

      if (!flag.enabled) return flag.defaultValue;

      for (const rule of flag.rules) {
        if (!rule.enabled) continue;

        const matches = evaluateCondition(rule.conditions, context, this.segmentMap);
        if (!matches) continue;

        // Percentage rollout — consistent hashing ensures sticky bucketing.
        // Only applies to users with a userId in context. If userId is absent,
        // the percentage check is skipped and the rule matches on conditions alone.
        const userId = String(context['userId'] ?? '');
        if (userId && getBucket(flagKey, userId) >= rule.percentage) continue;

        return rule.value;
      }

      return flag.defaultValue;
    } catch (err) {
      this.warn(`Error evaluating flag "${flagKey}"`, err);
      return (this.defaults as Record<string, unknown>)[flagKey] ?? undefined;
    }
  }

  // ── Ruleset management ──────────────────────────────────────────────────────

  /**
   * Fetches the ruleset from the API and updates the in-memory store.
   * On failure, falls back to Tier 2 (cache) then Tier 3 (defaults).
   */
  private async fetchRuleset(): Promise<void> {
    try {
      const res = await fetch(`${this.apiUrl}/sdk/v1/ruleset`, {
        headers: { 'x-api-key': this.apiKey },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const body = (await res.json()) as { data: Ruleset };
      this.applyRuleset(body.data);
      this.cache.set(cacheKey(this.apiKey), body.data);
    } catch (err) {
      this.emit('error', { message: 'Failed to fetch ruleset', cause: err });

      // Tier 2: try the cache
      const cached = this.cache.get(cacheKey(this.apiKey));
      if (cached) {
        this.applyRuleset(cached);
        this.setState('STALE');
      } else {
        // Tier 3: no ruleset at all — evaluation will use defaults
        this.setState('STALE');
      }
    }
  }

  /**
   * Applies a new ruleset to the in-memory store and rebuilds lookup maps.
   * Emits `flag:updated` for every flag key so consumers can re-render.
   */
  private applyRuleset(ruleset: Ruleset): void {
    const previousKeys = new Set(this.flagMap.keys());

    this.flagMap = new Map(ruleset.flags.map(f => [f.key, f]));
    this.segmentMap = new Map(ruleset.segments.map(s => [s.id, s]));

    // Emit flag:updated for every flag that exists in the new ruleset
    for (const flag of ruleset.flags) {
      this.emit('flag:updated', { flagKey: flag.key });
    }
    // Also emit for flags that were removed
    for (const key of previousKeys) {
      if (!this.flagMap.has(key)) {
        this.emit('flag:updated', { flagKey: key });
      }
    }
  }

  // ── SSE connection ──────────────────────────────────────────────────────────

  /** Opens the SSE stream and wires up event handlers. */
  private openStream(): void {
    if (this.closed) return;

    // EventSource does not support custom headers natively.
    // The API key is passed as a query parameter for SSE connections only.
    // All other SDK calls use the x-api-key header.
    // The server's api-key plugin accepts both forms.
    const streamUrl = `${this.apiUrl}/sdk/v1/stream?apiKey=${encodeURIComponent(this.apiKey)}`;

    try {
      if (!this.EventSourceClass) {
        this.emit('error', { message: 'EventSource is not available. Please inject a polyfill via options.EventSource for Node.js usage.' });
        return;
      }
      this.eventSource = new this.EventSourceClass(streamUrl);
    } catch (err) {
      this.emit('error', { message: 'Failed to open SSE connection', cause: err });
      this.scheduleReconnect();
      return;
    }

    this.eventSource?.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.setState('CONNECTED');
    });

    // `init` event — server sends the current ruleset on connect.
    // The `any` cast is required because EventSource.addEventListener with a
    // custom event name expects EventListenerOrEventListenerObject (a DOM type),
    // but our tsconfig targets ES2022 without DOM lib. The cast is safe here
    // because we control the server-side event shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.eventSource?.addEventListener('init', (e: any) => {
      try {
        const data = JSON.parse(e.data) as { type: 'init'; ruleset: Ruleset };
        if (data.type === 'init' && data.ruleset) {
          this.applyRuleset(data.ruleset);
          this.cache.set(cacheKey(this.apiKey), data.ruleset);
        }
      } catch {
        // Malformed init event — ignore, we already have the ruleset from fetch
      }
    });

    // `ruleset:updated` event — re-fetch the full ruleset
    this.eventSource?.addEventListener('ruleset:updated', () => {
      this.fetchRuleset().catch(() => undefined);
    });

    if (this.eventSource) {
      this.eventSource.onerror = () => {
        this.closeStream();
        if (!this.closed) {
          this.scheduleReconnect();
        }
      };
    }
  }

  /** Closes the current EventSource without triggering a reconnect. */
  private closeStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // ── Reconnect logic ─────────────────────────────────────────────────────────

  /**
   * Schedules a reconnect attempt using exponential backoff.
   * Delay: `Math.min(1000 * 2 ** attempt, 30_000)` ms.
   */
  private scheduleReconnect(): void {
    if (this.closed) return;

    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.emit('error', {
        message: `Max reconnect attempts (${this.maxReconnectAttempts}) reached — entering STALE mode`,
      });
      this.setState('STALE');
      return;
    }

    this.setState('RECONNECTING');
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 30_000);
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      if (this.closed) return;
      this.fetchRuleset().then(() => {
        this.openStream();
      }).catch(() => {
        this.scheduleReconnect();
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.emit('state:changed', { state });
  }

  private warn(message: string, cause?: unknown): void {
    // Structured warn — does not throw
    if (typeof console !== 'undefined') {
      console.warn(`[PulseClient] ${message}`, cause ?? '');
    }
  }
}
