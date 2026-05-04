'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Boxes, Users, Flag, ChevronRight, GitBranch } from 'lucide-react';
import { PageHeader } from '~/components/ui/page-header';
import { ProjectDialog } from '~/components/dialogs/project-dialog';

const PROJECTS = [
  { slug: 'novapay', name: 'NovaPay', description: 'Consumer payments app — flagship product', flags: 47, members: 18, envs: [{ name: 'production', flags: 47, color: '#ff5d5d' }, { name: 'staging', flags: 52, color: '#f0b95a' }, { name: 'development', flags: 61, color: '#6bc5ff' }], updated: '12m ago', active: true },
  { slug: 'lighthouse', name: 'Lighthouse', description: 'Internal admin & ops console', flags: 23, members: 9, envs: [{ name: 'production', flags: 23, color: '#ff5d5d' }, { name: 'staging', flags: 24, color: '#f0b95a' }], updated: 'yesterday', active: false },
  { slug: 'pelican-mobile', name: 'Pelican Mobile', description: 'iOS + Android client SDK consumer', flags: 14, members: 6, envs: [{ name: 'production', flags: 14, color: '#ff5d5d' }, { name: 'staging', flags: 16, color: '#f0b95a' }, { name: 'development', flags: 18, color: '#6bc5ff' }], updated: 'Apr 28', active: false },
];

export function ProjectsPage({ orgSlug }: { orgSlug: string }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <PageHeader
        crumb={`${orgSlug} / projects`}
        title="projects"
        command="pulse projects list --org=acme-corp"
      >
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[12px] bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" strokeWidth={2.5} /> new project
        </button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="grid grid-cols-2 gap-4 max-w-[1200px]">
          {PROJECTS.map((p) => (
            <Link
              key={p.slug}
              href={`/${orgSlug}/${p.slug}/production/flags`}
              className={`rounded-md border bg-surface-1 hover:border-border-strong transition-colors group cursor-pointer overflow-hidden block ${p.active ? 'border-primary/40' : 'border-border'}`}
            >
              <header className="p-5 flex items-start gap-3">
                <div className="size-11 rounded-md bg-gradient-to-br from-primary/30 to-info/20 border border-border grid place-items-center shrink-0">
                  <Boxes className="size-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3>{p.name}</h3>
                    {p.active && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">current</span>
                    )}
                  </div>
                  <div className="font-mono text-[11.5px] text-muted-foreground mb-2">
                    <span className="text-primary/80">/</span>{p.slug}
                  </div>
                  <p className="text-[12.5px] text-muted-foreground">{p.description}</p>
                </div>
                <ChevronRight className="size-4 text-dim group-hover:text-foreground" />
              </header>

              <div className="px-5 pb-3 flex items-center gap-4 font-mono text-[11.5px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Flag className="size-3 text-dim" />
                  <span className="text-foreground">{p.flags}</span> flags
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-3 text-dim" />
                  <span className="text-foreground">{p.members}</span> members
                </span>
                <span className="text-dim ml-auto">updated {p.updated}</span>
              </div>

              <div className="border-t border-border bg-surface-0/40 p-4 space-y-2">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-dim mb-2">// environments</div>
                {p.envs.map((e) => (
                  <div key={e.name} className="flex items-center gap-2.5 px-2.5 py-2 rounded bg-surface-1 border border-border font-mono text-[12px]">
                    <GitBranch className="size-3 text-dim" />
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="flex-1">{e.name}</span>
                    <span className="text-dim">{e.flags} flags</span>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <ProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </main>
  );
}
