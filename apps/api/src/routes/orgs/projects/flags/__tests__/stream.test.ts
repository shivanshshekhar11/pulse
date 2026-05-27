/**
 * Integration tests for GET /api/v1/orgs/:orgSlug/projects/:projectSlug/envs/:envName/flags/stream
 * 
 * Tests the Dashboard Real-time Flag Updates (SSE) endpoint.
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
  createTestFlag,
  cleanup,
  uid,
} from '../../../../../test/helpers';

// ── Helpers ───────────────────────────────────────────────────────────────────

function collectSseEvents(
  url: string,
  count: number,
  timeoutMs = 3000
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const events: string[] = [];
    let buffer = '';

    const req = http.get(url, (res) => {
      const timer = setTimeout(() => {
        req.destroy();
        resolve(events);
      }, timeoutMs);

      res.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // skip comments
          
          if (trimmed.startsWith('event: flag:updated')) {
            const dataLine = trimmed.split('\n').find(l => l.startsWith('data:'));
            if (dataLine) {
              events.push(dataLine.slice('data:'.length).trim());
            }
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
      if ((err as NodeJS.ErrnoException).code !== 'ECONNRESET') {
        reject(err);
      }
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/.../flags/stream (Dashboard SSE)', () => {
  let app: FastifyInstance;
  let port: number;
  let userId: string;
  let orgId: string;
  let orgSlug: string;
  let projectSlug: string;
  let environmentId: string;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
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

    token = app.jwt.sign({ userId, email: 'test@test.com' });
  });

  afterAll(async () => {
    await cleanup([orgId], [userId]);
    await app.close();
  });

  const streamUrl = (t: string = token) => 
    `http://127.0.0.1:${port}/api/v1/orgs/${orgSlug}/projects/${projectSlug}/envs/development/flags/stream?token=${t}`;

  // ── Authentication ──────────────────────────────────────────────────────────

  it('returns 401 when token query param is missing', async () => {
    const res = await app.inject({ 
      method: 'GET', 
      url: `/api/v1/orgs/${orgSlug}/projects/${projectSlug}/envs/development/flags/stream` 
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/orgs/${orgSlug}/projects/${projectSlug}/envs/development/flags/stream?token=invalid`,
    });
    expect(res.statusCode).toBe(401);
  });

  // ── Stream Connection & Events ────────────────────────────────────────────────

  it('sets correct SSE response headers', async () => {
    await new Promise<void>((resolve, reject) => {
      const req = http.get(streamUrl(), (res) => {
        if (!res.headers['content-type']?.includes('text/event-stream')) {
          let body = '';
          res.on('data', d => { body += d; });
          res.on('end', () => reject(new Error('Invalid content-type, body: ' + body)));
          return;
        }
        try {
          expect(res.headers['content-type']).toContain('text/event-stream');
          expect(res.headers['x-accel-buffering']).toBe('no');
          req.destroy();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(err);
        else resolve();
      });
    });
  });

  it('sends a flag:updated event when a flag is mutated in the environment', async () => {
    const flag = await createTestFlag(environmentId, userId, {
      key: `dash_stream_flag_${uid().replace(/-/g, '_')}`,
      version: 1,
    });

    const eventsPromise = collectSseEvents(streamUrl(), 1, 4000);
    await new Promise(r => setTimeout(r, 200));

    // Mutate the flag to trigger a Redis PUBLISH
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${orgSlug}/projects/${projectSlug}/envs/development/flags/${flag.key}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { enabled: true, version: 1 },
    });

    const events = await eventsPromise;
    expect(events).toHaveLength(1);
    
    const updateEvent = JSON.parse(events[0]!) as { flagId: string; action: string };
    expect(updateEvent.flagId).toBe(flag.id);
    expect(updateEvent.action).toBe('updated');
  });
});
