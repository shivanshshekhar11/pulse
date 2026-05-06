'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Boxes, Flag, ChevronRight, GitBranch, Loader2 } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { ProjectDialog } from '~/components/dialogs/project-dialog';
import { useProjects, useEnvironments, useCreateProject } from '~/lib/hooks/use-projects';
import type { ProjectResponse, EnvironmentResponse } from '@pulse-flags/types';

const ENV_COLORS: Record<string, string> = {
  production: '#ff5d5d',
  staging: '#f0b95a',
  development: '#6bc5ff',
};

export function ProjectsPage({ orgSlug }: { orgSlug: string }) {
  const { data: projects, isLoading } = useProjects(orgSlug);
  const createProject = useCreateProject(orgSlug);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader crumb={`${orgSlug} / projects`} title="projects" command="pulse projects list --org=acme-corp">
        <button type="button" onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="size-3.5" strokeWidth={2.5} /> new project
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" />
            <span className="font-mono text-[12px]">loading projects…</span>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-20 font-mono text-[12px] text-dim">
            // no projects yet ·{' '}
            <button type="button" onClick={() => setCreateOpen(true)} className="text-primary hover:underline">create one</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-w-[1200px]">
            {projects.map((p) => (
              <ProjectCard key={p.id} orgSlug={orgSlug} project={p} />
            ))}
          </div>
        )}
      </div>

      <ProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        loading={createProject.isPending}
        orgSlug={orgSlug}
        onSubmit={(values) => {
          const environments = values.environments.map((env) => ({
            name: env.name,
            color: env.color,
            isDefault: env.isDefault,
          }));
          createProject.mutate(
            { name: values.name, slug: values.slug, environments },
            { onSuccess: () => setCreateOpen(false) },
          );
        }}
      />
    </main>
  );
}

function ProjectCard({ orgSlug, project }: { orgSlug: string; project: ProjectResponse }) {
  const { data: environments } = useEnvironments(orgSlug, project.slug);
  const defaultEnv = environments?.find((env) => env.isDefault)?.name
    ?? environments?.[0]?.name
    ?? 'staging';

  return (
    <Link
      href={`/${orgSlug}/${project.slug}/${defaultEnv}/flags`}
      className="rounded-md border border-border bg-surface-1 hover:border-border-strong transition-colors group cursor-pointer overflow-hidden block"
    >
      <header className="p-5 flex items-start gap-3">
        <div className="size-11 rounded-md bg-gradient-to-br from-primary/30 to-info/20 border border-border grid place-items-center shrink-0">
          <Boxes className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-0.5">{project.name}</h3>
          <div className="font-mono text-[11.5px] text-muted-foreground">
            <span className="text-primary/80">/</span>{project.slug}
          </div>
        </div>
        <ChevronRight className="size-4 text-dim group-hover:text-foreground" />
      </header>

      <div className="px-5 pb-3 flex items-center gap-4 font-mono text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Flag className="size-3 text-dim" />
          <span className="text-dim">flags</span>
        </span>
        <span className="text-dim ml-auto">
          updated {new Date(project.updatedAt as string | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {environments && environments.length > 0 && (
        <div className="border-t border-border bg-surface-0/40 p-4 space-y-2">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim mb-2">// environments</div>
          {environments.map((e: EnvironmentResponse) => (
            <div key={e.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded bg-surface-1 border border-border font-mono text-[12px]">
              <GitBranch className="size-3 text-dim" />
              <span className="size-1.5 rounded-full" style={{ backgroundColor: e.color ?? ENV_COLORS[e.name] ?? '#6bc5ff' }} />
              <span className="flex-1">{e.name}</span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
