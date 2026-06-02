'use client';

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Singleton QueryClient for the dashboard.
 * Created once per browser session — not per request.
 *
 * Stale time of 30s means data is considered fresh for 30 seconds after
 * fetching, reducing redundant network calls when navigating between pages.
 * Polling and mutations override this.
 */
export function makeQueryClient() {
  const handleAuthError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    if (error instanceof Error && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 401) {
        toast.error('Session expired', { description: 'Please log in again.' });
        if (typeof window !== 'undefined') {
          // Dynamically import signOut so we don't break non-browser environments
          import('next-auth/react').then(({ signOut }) => {
            void signOut({ callbackUrl: '/login' });
          });
        }
      } else if (status === 403) {
        toast.error('Access denied', { description: 'You do not have permission for this action.' });
      } else {
        toast.error(message);
      }
    } else {
      toast.error(message);
    }
  };

  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleAuthError,
    }),
    mutationCache: new MutationCache({
      onError: handleAuthError,
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false, // Prevent aggressive re-fetching
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

/**
 * Recommended per-query options for flag-related queries that need polling.
 * Use by spreading into the `useQuery` options for flags, e.g.
 * `useQuery(key, fn, { ...FLAG_QUERY_OPTIONS })`
 */
export const FLAG_QUERY_OPTIONS = {
  refetchInterval: 5_000, // poll every 5s for flag state updates when enabled
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: false,
  staleTime: 5_000,
};

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
