import { redirect } from 'next/navigation';

/**
 * Org overview — redirects to the projects list.
 * A dedicated org overview page (activity feed, stats) is a Phase 4+ enhancement.
 * For now, the natural landing point after selecting an org is the projects list.
 */
export default async function OrgPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/projects`);
}
