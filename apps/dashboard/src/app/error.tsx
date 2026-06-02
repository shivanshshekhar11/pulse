'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@pulse-flags/ui';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log to error reporting service
    console.error('Unhandled app boundary error:', error);
  }, [error]);

  return (
    <div className="size-full flex bg-background text-foreground bg-grid scanlines min-h-screen items-center justify-center">
      <div className="flex flex-col items-center text-center p-8 max-w-[500px]">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim mb-4">// error 500</div>
        
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        
        <h2 className="text-[28px] leading-tight mb-4">
          Something went wrong!
        </h2>
        <p className="font-mono text-[13px] text-muted-foreground mb-6">
          An unexpected error occurred in the application.
        </p>
        
        {error.message && (
          <div className="w-full mb-8 rounded-md border border-destructive/20 bg-destructive/10 p-4 text-left">
            <p className="font-mono text-[12px] text-destructive leading-relaxed break-words">{error.message}</p>
          </div>
        )}

        <Button 
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-md font-mono text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          try again
        </Button>
      </div>
    </div>
  );
}
