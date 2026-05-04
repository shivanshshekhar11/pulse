import type { Metadata } from 'next';
import { MembersPage } from '~/components/pages/members/members-page';

export const metadata: Metadata = { title: 'Members' };

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return <MembersPage orgSlug={orgSlug} />;
}
