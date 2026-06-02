import { Suspense } from 'react';
import { AppSidebar } from './app-sidebar';
import { TopBar } from './top-bar';

/**
 * AppShell — the persistent chrome around every authenticated page.
 *
 * AppSidebar and TopBar are "use client" components that call usePathname().
 * In Next.js 16, usePathname() is considered dynamic data during prerender.
 * Wrapping them in <Suspense> tells Next.js to defer their render to the
 * client, avoiding the "uncached data outside Suspense" build error while
 * keeping the page content (children) server-rendered.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="size-full flex bg-background text-foreground bg-grid relative scanlines min-h-screen">
      <Suspense fallback={<div className="w-[240px] shrink-0 border-r border-border bg-surface-0" />}>
        <AppSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0">
        <Suspense fallback={<div className="h-14 border-b border-border bg-surface-0 shrink-0" />}>
          <TopBar />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
