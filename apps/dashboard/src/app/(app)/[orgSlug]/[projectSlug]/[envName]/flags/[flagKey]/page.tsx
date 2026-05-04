import type { Metadata } from 'next';
import { FlagDetailPage } from '~/components/pages/flags/flag-detail-page';

export const metadata: Metadata = { title: 'Flag Detail' };

export default async function Page({
  params,
}: {
  params: Promise<{
    orgSlug: string;
    projectSlug: string;
    envName: string;
    flagKey: string;
  }>;
}) {
  const { orgSlug, projectSlug, envName, flagKey } = await params;
  return (
    <FlagDetailPage
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      envName={envName}
      flagKey={flagKey}
    />
  );
}
