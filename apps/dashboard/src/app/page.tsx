import { redirect } from 'next/navigation';
import { auth } from '~/lib/auth';
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
  const session = await auth();

  if (session?.accessToken) {
    const orgSlug = (session as { orgSlug?: string }).orgSlug;
    if (orgSlug) {
      redirect(`/${orgSlug}/projects`);
    }
    // Has a session but no org yet â€” show landing so they can create one
  }

  return <Landing />;
}
