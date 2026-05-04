import type { Metadata } from 'next';
import { SettingsPage } from '~/components/pages/settings/settings-page';

export const metadata: Metadata = { title: 'Settings' };

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return <SettingsPage orgSlug={orgSlug} />;
}
