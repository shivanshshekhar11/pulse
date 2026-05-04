import type { Metadata } from 'next';
import { FlagsPage } from '~/components/pages/flags/flags-page';

export const metadata: Metadata = { title: 'Feature Flags' };

// In Next.js 16, params is a Promise — must be awaited before use.
export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; envName: string }>;
}) {
  const { orgSlug, projectSlug, envName } = await params;
  return <FlagsPage orgSlug={orgSlug} projectSlug={projectSlug} envName={envName} />;
}
