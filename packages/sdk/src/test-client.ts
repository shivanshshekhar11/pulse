/**
 * PulseTestClient — a test helper for Playwright (and other E2E frameworks).
 *
 * Provides a typed interface to set and reset flag state via the Pulse
 * management API. Use this in `beforeEach` / `afterEach` hooks to ensure
 * tests are isolated and do not depend on execution order.
 *
 * @example
 * ```ts
 * import { PulseTestClient } from '@pulse-flags/sdk';
 *
 * const pulse = new PulseTestClient({
 *   apiUrl: 'http://localhost:3000',
 *   accessToken: process.env.PULSE_TEST_TOKEN!,
 *   orgSlug: 'acme',
 *   projectSlug: 'web',
 *   envName: 'development',
 * });
 *
 * test.beforeEach(async () => {
 *   await pulse.resetAll();
 * });
 *
 * test('shows new hero when flag is on', async ({ page }) => {
 *   await pulse.enable('new_homepage_hero');
 *   // ... Playwright assertions
 * });
 * ```
 */

export interface PulseTestClientOptions {
  /** Base URL of the Pulse API (e.g. `http://localhost:3000`). */
  apiUrl: string;
  /** JWT access token for a dashboard user with at least `member` role. */
  accessToken: string;
  /** Organization slug. */
  orgSlug: string;
  /** Project slug. */
  projectSlug: string;
  /** Environment name (e.g. `development`, `staging`). */
  envName: string;
}

interface FlagPatch {
  enabled?: boolean;
  defaultValue?: unknown;
  version: number;
}

interface FlagResponse {
  id: string;
  key: string;
  enabled: boolean;
  defaultValue: unknown;
  version: number;
}

export class PulseTestClient {
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly basePath: string;

  constructor(options: PulseTestClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, '');
    this.accessToken = options.accessToken;
    this.basePath = `/api/v1/orgs/${options.orgSlug}/projects/${options.projectSlug}/envs/${options.envName}/flags`;
  }

  // ── Flag state helpers ──────────────────────────────────────────────────────

  /**
   * Enables a flag (sets `enabled: true`).
   * Fetches the current version first to satisfy optimistic locking.
   */
  async enable(flagKey: string): Promise<void> {
    await this.patchFlag(flagKey, { enabled: true });
  }

  /**
   * Disables a flag (sets `enabled: false`).
   */
  async disable(flagKey: string): Promise<void> {
    await this.patchFlag(flagKey, { enabled: false });
  }

  /**
   * Creates a rule for a flag.
   */
  async createRule(flagKey: string, rule: any): Promise<void> {
    const res = await this.request('POST', `${this.basePath}/${flagKey}/rules`, rule);
    if (!res.ok) {
      throw new Error(`Failed to create rule for flag "${flagKey}" (HTTP ${res.status})`);
    }
  }

  /**
   * Deletes all rules for a flag.
   */
  async clearRules(flagKey: string): Promise<void> {
    const res = await this.request('GET', `${this.basePath}/${flagKey}/rules`);
    if (!res.ok) return;
    const rulesRes = (await res.json()) as any;
    
    await Promise.all(
      rulesRes.data.map((r: any) =>
        this.request('DELETE', `${this.basePath}/${flagKey}/rules/${r.id}`)
      )
    );
  }

  /**
   * Sets the `defaultValue` of a flag.
   * Useful for testing string/number/json flag variants.
   */
  async setDefault(flagKey: string, value: unknown): Promise<void> {
    await this.patchFlag(flagKey, { defaultValue: value });
  }

  /**
   * Resets all flags in the environment to `enabled: false`.
   * Call this in `beforeEach` to ensure test isolation.
   *
   * Fetches the flag list once and patches all flags in parallel — O(n) API calls.
   */
  async resetAll(): Promise<void> {
    const flags = await this.listFlags();
    await Promise.all(
      flags.map(f =>
        this.patchFlagByKey(f.key, { enabled: false, version: f.version })
      )
    );
  }

  // ── Low-level API calls ─────────────────────────────────────────────────────

  /** Lists all flags in the environment. */
  async listFlags(): Promise<FlagResponse[]> {
    const res = await this.request('GET', this.basePath);
    if (!res.ok) {
      throw new Error(`Failed to list flags (HTTP ${res.status})`);
    }
    const body = (await res.json()) as { data: { items: FlagResponse[] } };
    return body.data.items;
  }

  /** Fetches a single flag by key. */
  async getFlag(flagKey: string): Promise<FlagResponse> {
    const res = await this.request('GET', `${this.basePath}/${flagKey}`);
    if (!res.ok) {
      throw new Error(`Flag "${flagKey}" not found (HTTP ${res.status})`);
    }
    const body = (await res.json()) as { data: FlagResponse };
    return body.data;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Fetches the current flag version then patches it.
   * Retries once on a 409 version conflict.
   */
  private async patchFlag(flagKey: string, patch: Omit<FlagPatch, 'version'>): Promise<void> {
    const flag = await this.getFlag(flagKey);
    await this.patchFlagByKey(flagKey, { ...patch, version: flag.version });
  }

  /**
   * Patches a flag directly by key + version.
   * Retries once on a 409 conflict by re-fetching the latest version.
   */
  private async patchFlagByKey(flagKey: string, patch: FlagPatch): Promise<void> {
    const res = await this.request('PATCH', `${this.basePath}/${flagKey}`, patch);

    if (res.status === 409) {
      // Version conflict — re-fetch and retry once
      const fresh = await this.getFlag(flagKey);
      const retryRes = await this.request('PATCH', `${this.basePath}/${flagKey}`, {
        ...patch,
        version: fresh.version,
      });
      if (!retryRes.ok) {
        throw new Error(`Failed to patch flag "${flagKey}" after retry (HTTP ${retryRes.status})`);
      }
      return;
    }

    if (!res.ok) {
      throw new Error(`Failed to patch flag "${flagKey}" (HTTP ${res.status})`);
    }
  }

  private request(method: string, path: string, body?: unknown): Promise<Response> {
    return fetch(`${this.apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}
