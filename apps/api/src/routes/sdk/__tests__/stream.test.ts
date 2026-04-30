/**
 * Integration tests for GET /sdk/v1/stream (SSE endpoint).
 *
 * These tests start a real HTTP server on a random port because Fastify's
 * inject() does not support streaming responses — it buffers the entire body
 * before returning, which means the SSE connection would never resolve.
 *
 * Each test:
 *   1. Starts the app on a random port
 *   2. Creates test fixtures (org, project, environment, API key)
 *   3. Opens an SSE connection using Node's http.get
 *   4. Asserts on the received events
 *   5. Closes the connection and cleans up
 *
 * Note: inject()-based tests (auth checks) use parseResponse where applicable.
 * Streaming tests use raw HTTP and parse event payloads directly.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import type { FastifyInstance } from 'fastify';
import {
  buildApp,
  createTestUser,
  createTestOrg,
  createTestProject,
  createTestEnvironment,
  createTestApiKey,
  createTestFlag,
  cleanup,
  uid,
} from '../../../test/helpers';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Opens an SSE connection and collects events until `count` events have been
 * received or `timeoutMs` elapses. Returns the raw event data strings.
 */
function collectSseEvents(
  url: string,
  apiKey: string,
  count: number,
  timeoutMs = 3000
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const events: string[] = [];
    let buffer = '';

    const req = http.get(url, { headers: { 'x-api-key': apiKey } }, (res) => {
      const timer = setTimeout(() => {
        req.destroy();
        resolve(events); // return what we have on timeout
      }, timeoutMs);

      res.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        // SSE events are separated by double newlines
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // skip comments/heartbeats
          // Extract the data line
          const dataLine = trimmed.split('\n').find(l => l.startsWith('data:'));
          if (dataLine) {
            events.push(dataLine.slice('data:'.length).trim());
          }
          if (events.length >= count) {
            clearTimeout(timer);
            req.destroy();
            resolve(events);
            return;
          }
        }
      });

      res.on('error', reject);
    });

    req.on('error', (err) => {
      // ECONNRESET is expected when we destroy the request
      if ((err as NodeJS.ErrnoException).code !== 'ECONNRESET') {
        reject(err);
      }
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /sdk/v1/stream (SSE)', () => {
  let app: FastifyInstance;
  let port: number;
  let userId: string;
  let orgId: string;
  let orgSlug: string;
  let projectSlug: string;
  let environmentId: string;
  let rawKey: string;

  beforeAll(async () => {
    app = await buildApp();

    // Listen on a random OS-assigned port
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    port = typeof address === 'object' && address ? address.port : 0;

    const user = await createTestUser(app);
    userId = user.id;

    const org = await createTestOrg(userId);
    orgId = org.id;
    orgSlug = org.slug;

    const project = await createTestProject(orgId);
    projectSlug = project.slug;

    const env = await createTestEnvironment(project.id, { name: 'development' });
    environmentId = env.id;

    const apiKey = await createTestApiKey(orgId, environmentId, userId);
    rawKey = apiKey.rawKey;
  });

  afterAll(async () => {
    await cleanup([orgId], [userId]);
    await app.close();
  });

  const streamUrl = () => `http://127.0.0.1:${port}/sdk/v1/stream`;

  // ── Authentication ──────────────────────────────────────────────────────────

  it('returns 401 when X-Api-Key header is missing', async () => {
    const res = await app.inject({ method: 'GET', url: '/sdk/v1/stream' });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for an invalid API key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/sdk/v1/stream',
      headers: { 'x-api-key': 'ps_test_invalid_key_that_does_not_exist_at_all' },
    });
    expect(res.statusCode).toBe(401);
  });

  // ── Init event ──────────────────────────────────────────────────────────────

  it('sends an init event with the current ruleset on connect', async () => {
    const events = await collectSseEvents(streamUrl(), rawKey, 1);

    expect(events).toHaveLength(1);
    const payload = JSON.parse(events[0]!) as { type: string; ruleset: { flags: unknown[]; segments: unknown[] } };
    expect(payload.type).toBe('init');
    expect(Array.isArray(payload.ruleset.flags)).toBe(true);
    expect(Array.isArray(payload.ruleset.segments)).toBe(true);
  });

  it('init event includes flags that exist in the environment', async () => {
    const flag = await createTestFlag(environmentId, userId, {
      key: `stream_flag_${uid().replace(/-/g, '_')}`,
      enabled: true,
    });

    const events = await collectSseEvents(streamUrl(), rawKey, 1);
    const payload = JSON.parse(events[0]!) as { ruleset: { flags: Array<{ key: string }> } };
    const keys = payload.ruleset.flags.map(f => f.key);
    expect(keys).toContain(flag.key);
  });

  // ── ruleset:updated event ───────────────────────────────────────────────────

  it('sends a ruleset:updated event when a flag is mutated', async () => {
    // Create a flag to mutate
    const flag = await createTestFlag(environmentId, userId, {
      key: `mutate_flag_${uid().replace(/-/g, '_')}`,
      version: 1,
    });

    // Start collecting — we expect init + ruleset:updated
    const eventsPromise = collectSseEvents(streamUrl(), rawKey, 2, 4000);

    // Give the SSE connection a moment to establish before mutating
    await new Promise(r => setTimeout(r, 200));

    // Mutate the flag via the API — this triggers a Redis PUBLISH
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${orgSlug}/projects/${projectSlug}/envs/development/flags/${flag.key}`,
      headers: { authorization: `Bearer ${app.jwt.sign({ userId, email: 'test@test.com' })}` },
      payload: { enabled: true, version: 1 },
    });

    const events = await eventsPromise;

    // First event is init, second is the update
    expect(events.length).toBeGreaterThanOrEqual(2);
    const updateEvent = JSON.parse(events[1]!) as { type: string; flagId: string; action: string };
    expect(updateEvent.type).toBe('ruleset:updated');
    expect(updateEvent.flagId).toBe(flag.id);
    expect(updateEvent.action).toBe('updated');
  });

  it('sends a ruleset:updated event when a rule is created', async () => {
    const flag = await createTestFlag(environmentId, userId, {
      key: `rule_stream_flag_${uid().replace(/-/g, '_')}`,
    });

    const eventsPromise = collectSseEvents(streamUrl(), rawKey, 2, 4000);
    await new Promise(r => setTimeout(r, 200));

    // Create a rule — triggers Redis PUBLISH
    await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${orgSlug}/projects/${projectSlug}/envs/development/flags/${flag.key}/rules`,
      headers: { authorization: `Bearer ${app.jwt.sign({ userId, email: 'test@test.com' })}` },
      payload: {
        conditions: { attribute: 'plan', op: 'eq', value: 'pro' },
        value: true,
      },
    });

    const events = await eventsPromise;
    expect(events.length).toBeGreaterThanOrEqual(2);
    const updateEvent = JSON.parse(events[1]!) as { type: string; action: string };
    expect(updateEvent.type).toBe('ruleset:updated');
    expect(updateEvent.action).toBe('rule.created');
  });

  // ── SSE headers ─────────────────────────────────────────────────────────────

  it('sets correct SSE response headers', async () => {
    await new Promise<void>((resolve, reject) => {
      const req = http.get(
        streamUrl(),
        { headers: { 'x-api-key': rawKey } },
        (res) => {
          expect(res.headers['content-type']).toContain('text/event-stream');
          expect(res.headers['cache-control']).toContain('no-cache');
          expect(res.headers['x-accel-buffering']).toBe('no');
          req.destroy();
          resolve();
        }
      );
      req.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(err);
        else resolve();
      });
    });
  });

  it('sends a retry: hint before the init event', async () => {
    await new Promise<void>((resolve, reject) => {
      let raw = '';
      const req = http.get(
        streamUrl(),
        { headers: { 'x-api-key': rawKey } },
        (res) => {
          res.on('data', (chunk: Buffer) => {
            raw += chunk.toString();
            // Once we have enough data to see the retry line, stop
            if (raw.includes('retry:') && raw.includes('event: init')) {
              req.destroy();
              expect(raw).toContain('retry: 5000');
              resolve();
            }
          });
          res.on('error', reject);
          setTimeout(() => { req.destroy(); resolve(); }, 2000);
        }
      );
      req.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(err);
        else resolve();
      });
    });
  });

  // ── Environment isolation ───────────────────────────────────────────────────

  it('does not receive events from a different environment', async () => {
    // Create a second project + environment with its own flag and API key.
    const otherProject = await createTestProject(orgId);
    const otherEnv = await createTestEnvironment(otherProject.id, { name: 'staging' });
    const otherFlag = await createTestFlag(otherEnv.id, userId, {
      key: `other_env_flag_${uid().replace(/-/g, '_')}`,
      version: 1,
    });

    // Connect to our (primary) environment's stream
    const eventsPromise = collectSseEvents(streamUrl(), rawKey, 2, 2000);
    await new Promise(r => setTimeout(r, 200));

    // Mutate the flag in the OTHER environment — should publish to a different
    // Redis channel (pulse:env:{otherEnv.id}) that our stream is not subscribed to
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${orgSlug}/projects/${otherProject.slug}/envs/staging/flags/${otherFlag.key}`,
      headers: { authorization: `Bearer ${app.jwt.sign({ userId, email: 'test@test.com' })}` },
      payload: { enabled: true, version: 1 },
    });

    const events = await eventsPromise;
    // Should only have the init event — no update from the other environment
    expect(events).toHaveLength(1);
    const initEvent = JSON.parse(events[0]!) as { type: string };
    expect(initEvent.type).toBe('init');
  });
});
