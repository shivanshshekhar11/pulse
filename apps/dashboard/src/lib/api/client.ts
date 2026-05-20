/**
 * Base fetch client for the Pulse API.
 *
 * All requests go through this function which:
 * - Attaches the Bearer token from the Auth.js session
 * - Wraps errors in a typed ApiError
 * - Returns the unwrapped `data` field from the success envelope
 *
 * Usage:
 *   const flags = await apiGet<FlagResponse[]>('/api/v1/orgs/acme/projects/web/envs/staging/flags', token);
 */

const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000')
    : (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string },
): Promise<T> {
  const { token, ...init } = options;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  // Only set Content-Type for requests that have a body
  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = `HTTP ${res.status}`;
    let requestId: string | undefined;
    try {
      const body = (await res.json()) as {
        error?: { code?: string; message?: string; requestId?: string };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
      requestId = body.error?.requestId;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, code, message, requestId);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const body = (await res.json()) as { data: T };
  return body.data;
}

export function apiGet<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, { method: 'GET', token });
}

export function apiPost<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
    token,
  });
}

export function apiDelete(path: string, token?: string): Promise<void> {
  return request<void>(path, { method: 'DELETE', token });
}
