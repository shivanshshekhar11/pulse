import type { Metadata } from 'next';
import { AuditPage } from '~/components/pages/audit/audit-page';

export const metadata: Metadata = { title: 'Audit Log' };

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return <AuditPage orgSlug={orgSlug} />;
}
