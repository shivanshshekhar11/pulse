'use client';

import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient for the dashboard.
 * Created once per browser session — not per request.
 *
 * Stale time of 30s means data is considered fresh for 30 seconds after
 * fetching, reducing redundant network calls when navigating between pages.
 * SSE invalidation overrides this for flag data.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // Don't retry on 401/403/404 — these are deterministic
          if (error instanceof Error && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status === 401 || status === 403 || status === 404) return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new client
    return makeQueryClient();
  }
  // Browser: reuse the same client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
