import { AppShell } from '~/components/layout/app-shell';

/**
 * App layout — full-height shell with sidebar + topbar.
 * Wraps all authenticated dashboard routes.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
