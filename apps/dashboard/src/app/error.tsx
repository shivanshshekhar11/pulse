'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '~/components/primitives/form';

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
    <div className="flex min-h-screen w-full items-center justify-center bg-black">
      <div className="mx-auto w-full max-w-md p-6">
        <div className="flex flex-col items-center space-y-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
              Something went wrong!
            </h2>
            <p className="text-sm text-zinc-400">
              An unexpected error occurred in the application.
            </p>
            {error.message && (
              <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-left">
                <p className="font-mono text-[11px] text-red-400">{error.message}</p>
              </div>
            )}
          </div>

          <Button 
            onClick={() => reset()}
            variant="outline" 
            className="mt-4 w-full sm:w-auto"
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
