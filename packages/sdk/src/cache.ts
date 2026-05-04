/**
 * Two-tier cache adapter for Tier 2 fallback storage.
 *
 * In browser environments, uses `localStorage` with JSON serialization.
 * In Node.js environments, uses an in-process Map with TTL expiry.
 *
 * The TTL defaults to 5 minutes — long enough to survive a brief network
 * partition, short enough that stale data doesn't linger.
 */

import type { Ruleset } from './types';

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Cache adapter interface ───────────────────────────────────────────────────

export interface CacheAdapter {
  get(key: string): Ruleset | null;
  set(key: string, value: Ruleset): void;
  delete(key: string): void;
}

// ── LocalStorage adapter (browser) ───────────────────────────────────────────

/**
 * Stores the ruleset snapshot in `localStorage` as a JSON string.
 * Includes an `expiresAt` timestamp so stale entries are ignored on read.
 */
export class LocalStorageAdapter implements CacheAdapter {
  private readonly ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(key: string): Ruleset | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as { expiresAt: number; ruleset: Ruleset };
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.ruleset;
    } catch {
      return null;
    }
  }

  set(key: string, value: Ruleset): void {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ expiresAt: Date.now() + this.ttlMs, ruleset: value })
      );
    } catch {
      // localStorage may be unavailable (private browsing quota, etc.) — fail silently
    }
  }

  delete(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

// ── In-memory TTL adapter (Node.js) ──────────────────────────────────────────

interface CacheEntry {
  ruleset: Ruleset;
  expiresAt: number;
}

/**
 * In-process Map-based cache with TTL expiry.
 * Used in Node.js environments where `localStorage` is unavailable.
 * Equivalent to `node-cache` but with zero external dependencies.
 */
export class MemoryCacheAdapter implements CacheAdapter {
  private readonly store = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(key: string): Ruleset | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.ruleset;
  }

  set(key: string, value: Ruleset): void {
    this.store.set(key, { ruleset: value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

// ── Auto-detect the right adapter ────────────────────────────────────────────

/**
 * Returns a `LocalStorageAdapter` in browser environments,
 * or a `MemoryCacheAdapter` in Node.js environments.
 */
export function createDefaultCacheAdapter(ttlMs?: number): CacheAdapter {
  if (typeof localStorage !== 'undefined') {
    return new LocalStorageAdapter(ttlMs);
  }
  return new MemoryCacheAdapter(ttlMs);
}
