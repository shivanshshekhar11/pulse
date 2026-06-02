import { ShieldAlert } from 'lucide-react';

export function PermissionWarning({ permission }: { permission: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-foreground scanlines min-h-[400px]">
      <div className="max-w-md w-full border border-border bg-surface-1 rounded-lg p-8 text-center shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="size-12 rounded-full bg-destructive/10 border border-destructive/30 grid place-items-center text-destructive mb-4">
            <ShieldAlert className="size-6" />
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim mb-2">
            // access denied
          </div>
          <h2 className="text-[20px] font-mono mb-3">Insufficient Permissions</h2>
          <p className="text-[13px] text-muted-foreground font-mono leading-relaxed mb-6">
            You do not have permission to access this resource. The operation requires{' '}
            <span className="text-destructive font-semibold">{permission}</span> access.
          </p>
          <p className="text-[11px] text-dim font-mono">
            Contact your organization administrator to request higher permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
