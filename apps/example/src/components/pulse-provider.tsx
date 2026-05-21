'use client';

import { useEffect } from 'react';
import { pulseClient } from '@/lib/pulse';

export function PulseProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only connect once, the client handles its own reconnection loop
    pulseClient.connect();

    return () => {
      // Optional: disconnect on unmount, or leave it alive for the app lifecycle
      // pulseClient.close();
    };
  }, []);

  return <>{children}</>;
}
