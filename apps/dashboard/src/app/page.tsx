import { Landing } from '~/components/landing/landing';

/**
 * Root page.
 *
 * Authenticated users are redirected to their first org's projects page.
 * The orgSlug is stored in the JWT during login (see lib/auth.ts).
 *
 * Unauthenticated users see the public landing page.
 */
export default async function RootPage() {
  // Return the public landing page for everyone. 
  // Authenticated users who specifically navigate to '/' will not be forced back into the dashboard.
  return <Landing />;
}
