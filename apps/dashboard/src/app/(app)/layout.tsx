import { redirect } from 'next/navigation';
import { auth } from '~/lib/auth';
import { AppShell } from '~/components/layout/app-shell';

/**
 * App layout — authenticated shell.
 *
 * auth() reads the Auth.js session server-side. If there is no valid
 * session the user is redirected to /login before any page content renders.
 * This is the single auth gate for all dashboard routes.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  return <AppShell>{children}</AppShell>;
}
