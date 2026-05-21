'use client';

import { useState, useEffect, useCallback } from 'react';
import { pulseClient } from './pulse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePulseFlag(key: any, context: { userId: string; [k: string]: any } = { userId: 'anonymous' }) {
  const [value, setValue] = useState(() => pulseClient.isEnabled(key, context));
  const [variant, setVariant] = useState(() => pulseClient.getVariant(key, context));

  // The context stringified to watch for changes
  const contextHash = JSON.stringify(context);

  const recompute = useCallback(() => {
    setValue(pulseClient.isEnabled(key, context));
    setVariant(pulseClient.getVariant(key, context));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, contextHash]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recompute();
    const handleUpdate = (e: { flagKey: string }) => {
      if (e.flagKey === key) {
        recompute();
      }
    };
    pulseClient.on('flag:updated', handleUpdate);
    return () => {
      pulseClient.off('flag:updated', handleUpdate);
    };
  }, [key, contextHash, recompute]);

  return { value, variant };
}

export function usePulseState() {
  const [state, setState] = useState(() => pulseClient.getState());

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleState = (e: { state: any }) => {
      setState(e.state);
    };
    pulseClient.on('state:changed', handleState);
    return () => {
      pulseClient.off('state:changed', handleState);
    };
  }, []);

  return state;
}
