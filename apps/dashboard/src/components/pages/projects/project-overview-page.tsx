'use client';

import Link from 'next/link';
import { Flag, GitBranch, Plus, Pencil, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import {
  useEnvironments,
  useCreateEnvironment,
  useProject,
  useUpdateProject,
  useDeleteProject,
} from '~/lib/hooks/use-projects';
import { EnvironmentDialog, ProjectDialog } from '~/components/dialogs/project-dialog';
import { useState } from 'react';
import { ConfirmDialog } from '~/components/dialogs/confirm';
import { useRouter } from 'next/navigation';

const ENV_COLORS: Record<string, string> = {
  production: '#ff5d5d',
  staging: '#f0b95a',
  development: '#6bc5ff',
};

export function ProjectOverviewPage({
  orgSlug,
  projectSlug,
}: {
  orgSlug: string;
  projectSlug: string;
}) {
  const router = useRouter();
  const { data: environments, isLoading } = useEnvironments(orgSlug, projectSlug);
  const { data: project } = useProject(orgSlug, projectSlug);
  const createEnvironment = useCreateEnvironment(orgSlug, projectSlug);
  const updateProject = useUpdateProject(orgSlug, projectSlug);
  const deleteProject = useDeleteProject(orgSlug);
  const [envDialogOpen, setEnvDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const envLimitReached = (environments?.length ?? 0) >= 5;

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / ${projectSlug}`}
        title={project?.name ?? projectSlug}
        command={`pulse flags list --project=${projectSlug}`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" strokeWidth={2.5} /> edit project
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] border border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" strokeWidth={2.5} /> delete project
          </button>
          <button
            type="button"
            onClick={() => setEnvDialogOpen(true)}
            disabled={envLimitReached}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-surface-1 border border-border text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="size-3.5" strokeWidth={2.5} /> new environment
          </button>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-[900px] space-y-8">
          {/* Environments */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
                // environments
              </h4>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8">
                <Loader2 className="size-4 animate-spin" />
                <span className="font-mono text-[12px]">loading environments…</span>
              </div>
            ) : !environments || environments.length === 0 ? (
              <div className="rounded-md border border-border bg-surface-1 p-8 text-center">
                <p className="font-mono text-[12px] text-dim mb-4">
                  // no environments yet
                </p>
                <button
                  type="button"
                  onClick={() => setEnvDialogOpen(true)}
                  disabled={envLimitReached}
                  className="font-mono text-[12px] text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  create your first environment →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {environments.map((env) => (
                  <div
                    key={env.id}
                    className="rounded-md border border-border bg-surface-1 overflow-hidden"
                  >
                    {/* Env header */}
                    <div className="flex items-center gap-3 px-5 py-4">
                      <div
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: env.color ?? ENV_COLORS[env.name] ?? '#6bc5ff' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[14px]">{env.name}</span>
                          {env.isDefault && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                              default
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11.5px] text-muted-foreground mt-0.5">
                          <GitBranch className="size-3 inline mr-1 text-dim" />
                          {orgSlug} / {projectSlug} / {env.name}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/${orgSlug}/${projectSlug}/${env.name}/flags`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <Flag className="size-3.5" />
                          view flags
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>

      <EnvironmentDialog
        open={envDialogOpen}
        onClose={() => setEnvDialogOpen(false)}
        loading={createEnvironment.isPending}
        onSubmit={(values) => {
          createEnvironment.mutate(
            { name: values.name, color: values.color, isDefault: values.isDefault },
            { onSuccess: () => setEnvDialogOpen(false) },
          );
        }}
      />
      <ProjectDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        loading={updateProject.isPending}
        orgSlug={orgSlug}
        initial={{ name: project?.name ?? projectSlug, slug: projectSlug }}
        onSubmit={(values) => {
          updateProject.mutate(
            { name: values.name },
            { onSuccess: () => setEditOpen(false) },
          );
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete "${project?.name ?? projectSlug}"`}
        description="This project and all of its environments will be removed."
        confirmLabel="delete project"
        confirmType={projectSlug}
        onConfirm={() => {
          deleteProject.mutate(projectSlug, {
            onSuccess: () => router.push(`/${orgSlug}/projects`),
          });
        }}
        consequences={[
          'All environments and API keys removed',
          'All flags, rules, and segments deleted',
          'SDK clients fall back to defaults immediately',
          'Cannot be undone',
        ]}
      />
    </main>
  );
}
