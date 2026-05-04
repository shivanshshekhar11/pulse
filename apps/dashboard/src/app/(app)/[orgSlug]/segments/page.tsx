import type { Metadata } from 'next';
import { SegmentsPage } from '~/components/pages/segments/segments-page';

export const metadata: Metadata = { title: 'Segments' };

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return <SegmentsPage orgSlug={orgSlug} />;
}
