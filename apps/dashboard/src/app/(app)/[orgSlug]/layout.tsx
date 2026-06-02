import { notFound } from 'next/navigation';
import { auth } from '~/lib/auth';
import { orgsApi } from '~/lib/api';
import { ApiError } from '~/lib/api/client';

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await auth();
  const token = session?.accessToken;

  try {
    await orgsApi.get(orgSlug, token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    // Re-throw other errors (e.g., 500) so they trigger the closest error boundary
    throw err;
  }

  return <>{children}</>;
}
