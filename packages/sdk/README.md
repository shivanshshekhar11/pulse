# @pulse-flags/sdk

TypeScript SDK for the [Pulse](https://github.com/your-org/pulse) feature flag service.

Evaluates flags **locally** — zero network call per evaluation after initialization. Real-time updates arrive via SSE and are applied in-memory without a page reload.

---

## Install

```bash
npm install @pulse-flags/sdk
# or
pnpm add @pulse-flags/sdk
```

---

## Quickstart

```ts
import { PulseClient } from '@pulse-flags/sdk';

// Define your flag map for full type inference (optional but recommended)
interface MyFlags {
  new_homepage_hero:    boolean;
  pricing_cta_text:     string;
  new_analytics_widget: boolean;
  theme_config:         { primaryColor: string; radius: number };
}

const client = new PulseClient<MyFlags>({
  apiKey: 'ps_live_...',          // from the Pulse dashboard
  apiUrl: 'https://api.pulse.dev', // or your self-hosted URL
  defaults: {                      // Tier 3 fallback — type-checked against MyFlags
    new_homepage_hero:    false,
    pricing_cta_text:     'Start Free',
    theme_config:         { primaryColor: '#6366f1', radius: 8 },
  },
});

await client.connect(); // fetches ruleset, opens SSE stream

// Boolean flag — return type is boolean, no cast needed
const showHero = client.isEnabled('new_homepage_hero', {
  userId: 'user-123',
  plan:   'pro',
});

// String flag — return type is string | undefined, inferred from MyFlags
const ctaText = client.getVariant('pricing_cta_text', {
  userId: 'user-123',
});

// JSON flag — return type is { primaryColor: string; radius: number } | undefined
const theme = client.getVariant('theme_config', { userId: 'user-123' });

// React to live updates
client.on('flag:updated', ({ flagKey }) => {
  console.log(`Flag "${flagKey}" may have changed — re-render`);
});

// Cleanup
client.close();
```

---

## API

### `new PulseClient<FlagMap>(options)`

The optional `FlagMap` type parameter maps flag keys to their value types. When provided:
- `defaults` is type-checked as `Partial<FlagMap>` — wrong key names or value types are compile errors
- `isEnabled()` only accepts keys whose value type is `boolean`
- `getVariant()` return type is inferred directly from the map — no manual cast needed
- Typos in flag keys are caught at compile time

Without a type parameter, the client falls back to `Record<string, unknown>` — identical to the untyped behaviour.

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | ✓ | API key from the Pulse dashboard (`ps_live_*` or `ps_test_*`) |
| `apiUrl` | `string` | ✓ | Base URL of the Pulse API |
| `defaults` | `Record<string, unknown>` | | Tier 3 fallback values (see below) |
| `cache` | `CacheAdapter` | | Custom Tier 2 cache (defaults to `localStorage` in browser, in-memory TTL in Node.js) |
| `maxReconnectAttempts` | `number` | | Max SSE reconnect attempts before going STALE (default: `Infinity`) |

### `client.connect(): Promise<void>`

Fetches the ruleset and opens the SSE stream. Resolves once the initial ruleset is loaded (or a fallback is available). Safe to call once — subsequent calls are no-ops.

### `client.isEnabled(flagKey, context): boolean`

Evaluates a boolean flag. Never throws — returns `false` (or the Tier 3 default) on any error.

### `client.getVariant<T>(flagKey, context): T | undefined`

Evaluates a string, number, or JSON flag. Never throws — returns `undefined` (or the Tier 3 default) on any error.

### `client.on(event, handler): () => void`

Registers an event listener. Returns an unsubscribe function.

| Event | Payload | Description |
|---|---|---|
| `flag:updated` | `{ flagKey: string }` | Emitted when the ruleset changes (for every affected flag) |
| `state:changed` | `{ state: ConnectionState }` | Emitted on state machine transitions |
| `error` | `{ message: string; cause?: unknown }` | Emitted on fetch/SSE errors |

### `client.getState(): ConnectionState`

Returns the current connection state: `DISCONNECTED`, `CONNECTING`, `CONNECTED`, `RECONNECTING`, or `STALE`.

### `client.close(): void`

Closes the SSE connection, cancels reconnect timers, and removes all listeners.

---

## Three-Tier Fallback

The SDK is designed to degrade gracefully under network partitions:

```
Tier 1: In-memory ruleset
         Updated on connect and on every SSE ruleset:updated event.
         Zero latency — all evaluations are local.
           ↓ fetch fails or SSE disconnects
Tier 2: Snapshot cache (localStorage in browser / in-process TTL map in Node.js)
         Written after every successful fetch. TTL: 5 minutes.
         Survives page reloads (browser) and brief network outages.
           ↓ cache miss (first boot, cold start, TTL expired)
Tier 3: Developer-provided defaults
         The `defaults` object passed to the constructor.
         Always available — the last line of defense.
```

The SDK **never throws** on flag evaluation. If all three tiers fail for a specific flag, it returns `undefined` and emits a `warn` log.

---

## State Machine

```
DISCONNECTED → connect() → CONNECTING → ruleset fetched + SSE open → CONNECTED
                                       → fetch fails → STALE (uses cache/defaults)
CONNECTED    → SSE closes → RECONNECTING (exponential backoff: 1s → 2s → 4s → max 30s)
RECONNECTING → success    → CONNECTED
RECONNECTING → maxReconnectAttempts reached → STALE
```

---

## Percentage Rollouts

Rollouts use **consistent SHA-256 hashing** on `flagKey:userId`. The same user always lands in the same bucket (0–99), so rollout assignments are sticky without any database lookup.

```ts
// User "user-123" always gets the same bucket for "new_feature"
client.isEnabled('new_feature', { userId: 'user-123' }); // deterministic
```

---

## Custom Cache Adapter

Implement `CacheAdapter` to use your own storage (e.g., Redis, AsyncStorage):

```ts
import { PulseClient, CacheAdapter } from '@pulse-flags/sdk';
import type { Ruleset } from '@pulse-flags/sdk';

class MyCache implements CacheAdapter {
  get(key: string): Ruleset | null { /* ... */ }
  set(key: string, value: Ruleset): void { /* ... */ }
  delete(key: string): void { /* ... */ }
}

const client = new PulseClient<MyFlags>({
  apiKey: 'ps_live_...',
  apiUrl: 'https://api.pulse.dev',
  cache: new MyCache(),
});
```

---

## Testing with `PulseTestClient`

Use `PulseTestClient` in Playwright (or any E2E framework) to set and reset flag state between tests:

```ts
import { PulseTestClient } from '@pulse-flags/sdk';

const pulse = new PulseTestClient({
  apiUrl:       'http://localhost:3000',
  accessToken:  process.env.PULSE_TEST_TOKEN!,
  orgSlug:      'acme',
  projectSlug:  'web',
  envName:      'development',
});

// In beforeEach — reset all flags to disabled
await pulse.resetAll();

// Enable a specific flag for a test
await pulse.enable('new_homepage_hero');

// Set a string variant
await pulse.setDefault('pricing_cta_text', 'Get Started');
```

---

## Low-Level Exports

For server-side evaluation or advanced use:

```ts
import { evaluateCondition, getBucket } from '@pulse-flags/sdk';

// Evaluate a condition tree directly
const matches = evaluateCondition(rule.conditions, userContext, segmentMap);

// Get the consistent hash bucket for a user
const bucket = getBucket('new_feature', 'user-123'); // 0–99
```

---

## License

MIT
