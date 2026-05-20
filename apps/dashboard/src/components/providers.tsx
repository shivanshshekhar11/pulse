'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { getQueryClient } from '~/lib/query-client';

/**
 * Providers â€” wraps the entire app with:
 * - SessionProvider: Auth.js session context
 * - QueryClientProvider: TanStack Query data fetching
 * - ThemeProvider: next-themes dark/light mode
 * - Toaster: sonner toast notifications for mutation feedback
 *
 * Marked "use client" because all three providers require client context.
 * The children (page content) are still Server Components â€” Next.js streams
 * them into this wrapper.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // getQueryClient() returns the singleton browser client
  const queryClient = getQueryClient();

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12.5px',
              },
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
