import type { Metadata } from 'next';
import { LiveStreamPage } from '~/components/pages/live-stream/live-stream-page';

export const metadata: Metadata = { title: 'Live Stream' };

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return <LiveStreamPage orgSlug={orgSlug} />;
}
