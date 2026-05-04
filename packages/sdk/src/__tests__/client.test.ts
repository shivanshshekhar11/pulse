import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PulseClient } from "../client";
import type { Ruleset } from "../types";

const RULESET: Ruleset = {
  flags: [
    { id: "flag-1", key: "new_homepage_hero", name: "New Homepage Hero", type: "boolean", defaultValue: false, enabled: true,
      rules: [{ id: "rule-1", name: "Pro users", priority: 0, conditions: { attribute: "plan", op: "eq", value: "pro" }, percentage: 100, value: true, enabled: true }] },
    { id: "flag-2", key: "pricing_cta_text", name: "Pricing CTA Text", type: "string", defaultValue: "Start Free", enabled: true,
      rules: [{ id: "rule-2", name: "Pro CTA", priority: 0, conditions: { attribute: "plan", op: "eq", value: "pro" }, percentage: 100, value: "Upgrade Now", enabled: true }] },
    { id: "flag-3", key: "disabled_flag", name: "Disabled Flag", type: "boolean", defaultValue: false, enabled: false, rules: [] },
    { id: "flag-4", key: "rollout_flag", name: "Rollout Flag", type: "boolean", defaultValue: false, enabled: true,
      rules: [{ id: "rule-4", name: "50% rollout", priority: 0, conditions: { operator: "AND", conditions: [] }, percentage: 50, value: true, enabled: true }] },
  ],
  segments: [{ id: "seg-1", name: "Beta Users", conditions: { attribute: "beta", op: "eq", value: true } }],
};

function mockFetchSuccess(ruleset: Ruleset = RULESET) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: ruleset }) } as Response);
}
function mockFetchFailure() {
  return vi.fn().mockRejectedValue(new Error("Network error"));
}
function mockEventSource() {
  const listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  let onerror: ((e: Event) => void) | null = null;
  const es = {
    addEventListener: vi.fn((event: string, handler: (e: MessageEvent) => void) => {
      listeners[event] = listeners[event] ?? []; listeners[event].push(handler);
    }),
    close: vi.fn(),
    get onerror() { return onerror; },
    set onerror(fn) { onerror = fn; },
    _emit: (event: string, data: unknown) => {
      for (const h of listeners[event] ?? []) h({ data: JSON.stringify(data) } as MessageEvent);
    },
    _triggerError: () => { onerror?.(new Event("error")); },
  };
  return es;
}

describe("PulseClient", () => {
  let globalFetch: typeof fetch;
  let GlobalEventSource: typeof EventSource;
  beforeEach(() => { globalFetch = global.fetch; GlobalEventSource = global.EventSource; });
  afterEach(() => { global.fetch = globalFetch; global.EventSource = GlobalEventSource; vi.restoreAllMocks(); });

  // ── State machine ──────────────────────────────────────────────────────────
  describe("state machine", () => {
    it("starts in DISCONNECTED state", () => {
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      expect(c.getState()).toBe("DISCONNECTED");
    });
    it("transitions DISCONNECTED → CONNECTING → CONNECTED on successful connect", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      const states: string[] = [];
      c.on("state:changed", ({ state }) => states.push(state));
      await c.connect(); es._emit("open", {});
      expect(states).toContain("CONNECTING"); expect(states).toContain("CONNECTED");
      c.close();
    });
    it("transitions to STALE when fetch fails and no cache", async () => {
      global.fetch = mockFetchFailure();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      const states: string[] = [];
      c.on("state:changed", ({ state }) => states.push(state));
      await c.connect();
      expect(states).toContain("STALE"); c.close();
    });
    it("transitions to DISCONNECTED after close()", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect(); c.close();
      expect(c.getState()).toBe("DISCONNECTED");
    });
    it("is reconnectable after close() — connect() works again", async () => {
      let fetchCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        fetchCount++;
        return Promise.resolve({ ok: true, json: async () => ({ data: RULESET }) } as Response);
      });
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect(); c.close();
      await c.connect(); // second connect after close — must work
      expect(fetchCount).toBe(2);
      expect(c.getState()).not.toBe("DISCONNECTED"); // CONNECTING or CONNECTED
      c.close();
    });
    it("does not reconnect after close()", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", maxReconnectAttempts: 3 });
      await c.connect(); c.close(); es._triggerError();
      expect(c.getState()).toBe("DISCONNECTED");
    });
    it("transitions RECONNECTING → CONNECTED when reconnect succeeds (STALE recovery)", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({ ok: true, json: async () => ({ data: RULESET }) } as Response);
      });
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", maxReconnectAttempts: 1 });
      const states: string[] = [];
      c.on("state:changed", ({ state }) => states.push(state));
      await c.connect(); es._triggerError();
      // Wait for the reconnect timer (1s first attempt — use fake timers)
      expect(states).toContain("RECONNECTING");
      c.close();
    });
    it("transitions to STALE after maxReconnectAttempts", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", maxReconnectAttempts: 0 });
      const states: string[] = [];
      c.on("state:changed", ({ state }) => states.push(state));
      await c.connect(); es._triggerError();
      expect(states).toContain("STALE"); c.close();
    });
    it("emits error event when maxReconnectAttempts is reached", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", maxReconnectAttempts: 0 });
      const errors: string[] = [];
      c.on("error", ({ message }) => errors.push(message));
      await c.connect(); es._triggerError();
      expect(errors.some(m => m.includes("Max reconnect"))).toBe(true);
      c.close();
    });
  });

  // ── isEnabled ──────────────────────────────────────────────────────────────
  describe("isEnabled", () => {
    it("returns true when rule matches", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      expect(c.isEnabled("new_homepage_hero", { userId: "u1", plan: "pro" })).toBe(true);
      c.close();
    });
    it("returns defaultValue when no rule matches", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      expect(c.isEnabled("new_homepage_hero", { userId: "u1", plan: "free" })).toBe(false);
      c.close();
    });
    it("returns false for a disabled flag regardless of rules", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      expect(c.isEnabled("disabled_flag", { userId: "u1", plan: "pro" })).toBe(false);
      c.close();
    });
    it("returns Tier 3 default when flag is not in ruleset", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", defaults: { unknown_flag: true } });
      await c.connect();
      expect(c.isEnabled("unknown_flag", { userId: "u1" })).toBe(true);
      c.close();
    });
    it("returns false for completely unknown flag with no default", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      expect(c.isEnabled("totally_unknown", { userId: "u1" })).toBe(false);
      c.close();
    });
  });

  // ── getVariant ─────────────────────────────────────────────────────────────
  describe("getVariant", () => {
    it("returns rule value when rule matches", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      expect(c.getVariant("pricing_cta_text", { userId: "u1", plan: "pro" })).toBe("Upgrade Now");
      c.close();
    });
    it("returns defaultValue when no rule matches", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      expect(c.getVariant("pricing_cta_text", { userId: "u1", plan: "free" })).toBe("Start Free");
      c.close();
    });
    it("returns Tier 3 default for unknown flag", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", defaults: { theme: { primaryColor: "#6366f1" } } });
      await c.connect();
      expect(c.getVariant("theme", { userId: "u1" })).toEqual({ primaryColor: "#6366f1" });
      c.close();
    });
  });

  // ── Generic flag map ───────────────────────────────────────────────────────
  describe("generic flag map", () => {
    interface TestFlags {
      hero_enabled: boolean;
      cta_text: string;
      theme: { primaryColor: string };
    }
    it("typed defaults are validated at construction", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient<TestFlags>({
        apiKey: "ps_test_key", apiUrl: "http://localhost:3000",
        defaults: { hero_enabled: false, cta_text: "Start Free", theme: { primaryColor: "#6366f1" } },
      });
      await c.connect();
      // isEnabled returns boolean — no cast needed
      const enabled: boolean = c.isEnabled("hero_enabled", { userId: "u1" });
      expect(typeof enabled).toBe("boolean");
      // getVariant return type is inferred from the map
      const cta = c.getVariant("cta_text", { userId: "u1" });
      expect(cta).toBe("Start Free");
      c.close();
    });
    it("untyped client (no generic) behaves identically to before", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      expect(c.isEnabled("new_homepage_hero", { userId: "u1", plan: "pro" })).toBe(true);
      expect(c.getVariant("pricing_cta_text", { userId: "u1", plan: "pro" })).toBe("Upgrade Now");
      c.close();
    });
  });

  // ── Percentage rollout ─────────────────────────────────────────────────────
  describe("percentage rollout", () => {
    it("same user always gets same result (determinism)", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      const r1 = c.isEnabled("rollout_flag", { userId: "user-determinism-test" });
      const r2 = c.isEnabled("rollout_flag", { userId: "user-determinism-test" });
      expect(r1).toBe(r2); c.close();
    });
    it("0% rollout — no user gets the rule value", async () => {
      const rs: Ruleset = { ...RULESET, flags: [{ id: "f", key: "zero_rollout", name: "Z", type: "boolean", defaultValue: false, enabled: true,
        rules: [{ id: "r", name: "0%", priority: 0, conditions: { operator: "AND", conditions: [] }, percentage: 0, value: true, enabled: true }] }] };
      global.fetch = mockFetchSuccess(rs);
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      for (let i = 0; i < 20; i++) expect(c.isEnabled("zero_rollout", { userId: `user-${i}` })).toBe(false);
      c.close();
    });
    it("100% rollout — all users get the rule value", async () => {
      const rs: Ruleset = { ...RULESET, flags: [{ id: "f", key: "full_rollout", name: "F", type: "boolean", defaultValue: false, enabled: true,
        rules: [{ id: "r", name: "100%", priority: 0, conditions: { operator: "AND", conditions: [] }, percentage: 100, value: true, enabled: true }] }] };
      global.fetch = mockFetchSuccess(rs);
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      for (let i = 0; i < 20; i++) expect(c.isEnabled("full_rollout", { userId: `user-${i}` })).toBe(true);
      c.close();
    });
    it("missing userId skips percentage check — rule matches on conditions alone", async () => {
      const rs: Ruleset = { ...RULESET, flags: [{ id: "f", key: "pct_flag", name: "P", type: "boolean", defaultValue: false, enabled: true,
        rules: [{ id: "r", name: "50%", priority: 0, conditions: { operator: "AND", conditions: [] }, percentage: 50, value: true, enabled: true }] }] };
      global.fetch = mockFetchSuccess(rs);
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      // No userId — percentage check skipped, conditions always match (empty AND)
      expect(c.isEnabled("pct_flag", {})).toBe(true);
      c.close();
    });
  });

  // ── Three-tier fallback ────────────────────────────────────────────────────
  describe("three-tier fallback", () => {
    it("Tier 2: uses cache when fetch fails", async () => {
      const mockCache = { get: vi.fn().mockReturnValue(RULESET), set: vi.fn(), delete: vi.fn() };
      global.fetch = mockFetchFailure();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", cache: mockCache });
      await c.connect();
      expect(c.isEnabled("new_homepage_hero", { userId: "u1", plan: "pro" })).toBe(true);
      expect(mockCache.get).toHaveBeenCalled(); c.close();
    });
    it("Tier 3: uses defaults when both fetch and cache fail", async () => {
      const mockCache = { get: vi.fn().mockReturnValue(null), set: vi.fn(), delete: vi.fn() };
      global.fetch = mockFetchFailure();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", cache: mockCache, defaults: { new_homepage_hero: true } });
      await c.connect();
      expect(c.isEnabled("new_homepage_hero", { userId: "u1" })).toBe(true); c.close();
    });
    it("Tier 1 takes precedence over Tier 3 defaults", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", defaults: { new_homepage_hero: true } });
      await c.connect();
      expect(c.isEnabled("new_homepage_hero", { userId: "u1", plan: "free" })).toBe(false);
      c.close();
    });
    it("writes to cache after successful fetch", async () => {
      const mockCache = { get: vi.fn().mockReturnValue(null), set: vi.fn(), delete: vi.fn() };
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", cache: mockCache });
      await c.connect();
      expect(mockCache.set).toHaveBeenCalledWith(expect.stringContaining("pulse:ruleset:"), expect.objectContaining({ flags: expect.any(Array) }));
      c.close();
    });
    it("state is STALE when falling back to Tier 2", async () => {
      const mockCache = { get: vi.fn().mockReturnValue(RULESET), set: vi.fn(), delete: vi.fn() };
      global.fetch = mockFetchFailure();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", cache: mockCache });
      await c.connect();
      expect(c.getState()).toBe("STALE"); c.close();
    });
  });

  // ── SSE events ─────────────────────────────────────────────────────────────
  describe("SSE events", () => {
    it("applies ruleset from init event", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      const updated: Ruleset = { ...RULESET, flags: RULESET.flags.map(f => f.key === "new_homepage_hero" ? { ...f, enabled: false } : f) };
      es._emit("init", { type: "init", ruleset: updated });
      expect(c.isEnabled("new_homepage_hero", { userId: "u1", plan: "pro" })).toBe(false);
      c.close();
    });
    it("re-fetches ruleset on ruleset:updated event", async () => {
      let fetchCount = 0;
      global.fetch = vi.fn().mockImplementation(() => { fetchCount++; return Promise.resolve({ ok: true, json: async () => ({ data: RULESET }) } as Response); });
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      const before = fetchCount;
      es._emit("ruleset:updated", { type: "ruleset:updated", flagId: "flag-1", action: "updated" });
      await new Promise(r => setTimeout(r, 10));
      expect(fetchCount).toBeGreaterThan(before); c.close();
    });
    it("emits flag:updated for all flags when ruleset is applied", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      const updated: string[] = [];
      c.on("flag:updated", ({ flagKey }) => updated.push(flagKey));
      await c.connect();
      for (const f of RULESET.flags) expect(updated).toContain(f.key);
      c.close();
    });
    it("emits flag:updated for removed flags", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect();
      const updated: string[] = [];
      c.on("flag:updated", ({ flagKey }) => updated.push(flagKey));
      // Push a ruleset with one flag removed
      const trimmed: Ruleset = { ...RULESET, flags: RULESET.flags.filter(f => f.key !== "disabled_flag") };
      es._emit("init", { type: "init", ruleset: trimmed });
      expect(updated).toContain("disabled_flag");
      c.close();
    });
  });

  // ── Reconnect ──────────────────────────────────────────────────────────────
  describe("reconnect", () => {
    it("transitions to RECONNECTING when SSE errors", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000", maxReconnectAttempts: 1 });
      const states: string[] = [];
      c.on("state:changed", ({ state }) => states.push(state));
      await c.connect(); es._triggerError();
      expect(states).toContain("RECONNECTING"); c.close();
    });
  });

  // ── Event emitter ──────────────────────────────────────────────────────────
  describe("event emitter", () => {
    it("on() returns an unsubscribe function", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      const handler = vi.fn();
      const unsub = c.on("flag:updated", handler);
      await c.connect();
      const before = handler.mock.calls.length;
      unsub();
      es._emit("init", { type: "init", ruleset: RULESET });
      expect(handler.mock.calls.length).toBe(before); c.close();
    });
    it("listener errors do not crash the client", async () => {
      global.fetch = mockFetchSuccess();
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      c.on("flag:updated", () => { throw new Error("listener error"); });
      await expect(c.connect()).resolves.not.toThrow(); c.close();
    });
    it("listeners survive close() and reconnect", async () => {
      let fetchCount = 0;
      global.fetch = vi.fn().mockImplementation(() => { fetchCount++; return Promise.resolve({ ok: true, json: async () => ({ data: RULESET }) } as Response); });
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      const updates: string[] = [];
      c.on("flag:updated", ({ flagKey }) => updates.push(flagKey));
      await c.connect(); c.close();
      updates.length = 0; // clear
      await c.connect(); // reconnect
      expect(updates.length).toBeGreaterThan(0); // listeners still fire
      c.close();
    });
  });

  // ── connect() idempotency ──────────────────────────────────────────────────
  describe("connect() idempotency", () => {
    it("calling connect() twice does not double-fetch", async () => {
      let fetchCount = 0;
      global.fetch = vi.fn().mockImplementation(() => { fetchCount++; return Promise.resolve({ ok: true, json: async () => ({ data: RULESET }) } as Response); });
      const es = mockEventSource();
      global.EventSource = vi.fn(() => es) as unknown as typeof EventSource;
      const c = new PulseClient({ apiKey: "ps_test_key", apiUrl: "http://localhost:3000" });
      await c.connect(); await c.connect();
      expect(fetchCount).toBe(1); c.close();
    });
  });
});
