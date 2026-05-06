import type { Metadata } from 'next';
import { ProjectOverviewPage } from '~/components/pages/projects/project-overview-page';

export const metadata: Metadata = { title: 'Project Overview' };

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  return <ProjectOverviewPage orgSlug={orgSlug} projectSlug={projectSlug} />;
}
