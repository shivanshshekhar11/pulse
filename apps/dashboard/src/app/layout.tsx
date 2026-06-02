import type { Metadata } from 'next';
import { Providers } from '~/components/providers';
import '~/styles/globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Pulse',
    default: 'Pulse — Feature Flags',
  },
  description: 'Self-hostable, multi-tenant feature flag service.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
