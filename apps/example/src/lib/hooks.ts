'use client';

import { useState, useEffect, useCallback } from 'react';
import { pulseClient } from './pulse';

export function usePulseFlag(key: string, context: { userId: string; [k: string]: unknown } = { userId: 'anonymous' }) {
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
    const handleState = (e: { state: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'STALE' }) => {
      setState(e.state);
    };
    pulseClient.on('state:changed', handleState);
    return () => {
      pulseClient.off('state:changed', handleState);
    };
  }, []);

  return state;
}
