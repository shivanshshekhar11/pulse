import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryCacheAdapter, LocalStorageAdapter, createDefaultCacheAdapter } from '../cache';
import type { Ruleset } from '../types';

const RULESET: Ruleset = {
  flags: [
    {
      id: 'flag-1',
      key: 'test_flag',
      name: 'Test Flag',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      rules: [],
    },
  ],
  segments: [],
};

// ── MemoryCacheAdapter ────────────────────────────────────────────────────────

describe('MemoryCacheAdapter', () => {
  it('returns null for a missing key', () => {
    const cache = new MemoryCacheAdapter();
    expect(cache.get('missing')).toBeNull();
  });

  it('stores and retrieves a ruleset', () => {
    const cache = new MemoryCacheAdapter();
    cache.set('key', RULESET);
    expect(cache.get('key')).toEqual(RULESET);
  });

  it('returns null after TTL expires', () => {
    vi.useFakeTimers();
    const cache = new MemoryCacheAdapter(1000); // 1 second TTL
    cache.set('key', RULESET);

    vi.advanceTimersByTime(1001);
    expect(cache.get('key')).toBeNull();
    vi.useRealTimers();
  });

  it('returns value before TTL expires', () => {
    vi.useFakeTimers();
    const cache = new MemoryCacheAdapter(1000);
    cache.set('key', RULESET);

    vi.advanceTimersByTime(999);
    expect(cache.get('key')).toEqual(RULESET);
    vi.useRealTimers();
  });

  it('deletes a key', () => {
    const cache = new MemoryCacheAdapter();
    cache.set('key', RULESET);
    cache.delete('key');
    expect(cache.get('key')).toBeNull();
  });

  it('overwrites an existing key', () => {
    const cache = new MemoryCacheAdapter();
    cache.set('key', RULESET);

    const updated: Ruleset = { ...RULESET, flags: [] };
    cache.set('key', updated);

    expect(cache.get('key')).toEqual(updated);
  });

  it('handles multiple independent keys', () => {
    const cache = new MemoryCacheAdapter();
    const ruleset2: Ruleset = { flags: [], segments: [] };

    cache.set('key1', RULESET);
    cache.set('key2', ruleset2);

    expect(cache.get('key1')).toEqual(RULESET);
    expect(cache.get('key2')).toEqual(ruleset2);
  });
});

// ── LocalStorageAdapter ───────────────────────────────────────────────────────

describe('LocalStorageAdapter', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null for a missing key', () => {
    const cache = new LocalStorageAdapter();
    expect(cache.get('missing')).toBeNull();
  });

  it('stores and retrieves a ruleset', () => {
    const cache = new LocalStorageAdapter();
    cache.set('key', RULESET);
    expect(cache.get('key')).toEqual(RULESET);
  });

  it('returns null after TTL expires', () => {
    vi.useFakeTimers();
    const cache = new LocalStorageAdapter(1000);
    cache.set('key', RULESET);

    vi.advanceTimersByTime(1001);
    expect(cache.get('key')).toBeNull();
    vi.useRealTimers();
  });

  it('deletes a key', () => {
    const cache = new LocalStorageAdapter();
    cache.set('key', RULESET);
    cache.delete('key');
    expect(cache.get('key')).toBeNull();
  });

  it('handles malformed JSON gracefully', () => {
    store['bad-key'] = 'not-valid-json{{{';
    const cache = new LocalStorageAdapter();
    expect(cache.get('bad-key')).toBeNull();
  });

  it('handles localStorage.setItem throwing (quota exceeded)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => undefined,
    });

    const cache = new LocalStorageAdapter();
    // Should not throw
    expect(() => cache.set('key', RULESET)).not.toThrow();
  });
});

// ── createDefaultCacheAdapter ─────────────────────────────────────────────────

describe('createDefaultCacheAdapter', () => {
  it('returns MemoryCacheAdapter when localStorage is unavailable', () => {
    // In Node.js test environment, localStorage is not defined
    const cache = createDefaultCacheAdapter();
    // Verify it works (MemoryCacheAdapter behavior)
    cache.set('key', RULESET);
    expect(cache.get('key')).toEqual(RULESET);
  });

  it('returns LocalStorageAdapter when localStorage is available', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
    });

    const cache = createDefaultCacheAdapter();
    cache.set('key', RULESET);
    expect(cache.get('key')).toEqual(RULESET);

    vi.unstubAllGlobals();
  });
});
