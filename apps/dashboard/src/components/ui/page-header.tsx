/**
 * PageHeader — consistent page title block used across all pages.
 * Server Component — no interactivity needed here.
 */
export function PageHeader({
  crumb,
  title,
  command,
  meta,
  children,
  blink = false,
}: {
  crumb: string;
  title: string;
  command?: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  blink?: boolean;
}) {
  return (
    <div className="px-10 pt-8 pb-6 border-b border-border">
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim mb-2">
            // {crumb}
          </div>
          <h1 className={blink ? 'cursor-blink text-[28px]' : 'text-[28px]'}>
            {title}
          </h1>
          {command && (
            <p className="font-mono text-[12.5px] text-muted-foreground mt-2.5">
              <span className="text-primary">$</span> {command}
            </p>
          )}
        </div>
        {children && (
          <div className="shrink-0 flex items-center gap-2">{children}</div>
        )}
      </div>
      {meta && <div className="mt-7">{meta}</div>}
    </div>
  );
}
