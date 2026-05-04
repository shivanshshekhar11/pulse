import type { Metadata } from 'next';
import { ApiKeysPage } from '~/components/pages/api-keys/api-keys-page';

export const metadata: Metadata = { title: 'API Keys' };

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return <ApiKeysPage orgSlug={orgSlug} />;
}
