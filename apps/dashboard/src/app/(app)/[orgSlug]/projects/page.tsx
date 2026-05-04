import type { Metadata } from 'next';
import { ProjectsPage } from '~/components/pages/projects/projects-page';

export const metadata: Metadata = { title: 'Projects' };

export default async function Page({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  return <ProjectsPage orgSlug={orgSlug} />;
}
