'use client';

import { useState, useEffect, useCallback } from 'react';
import { pulseClient } from './pulse';
import { useUserContext } from './user-context';

/**
 * Evaluates a feature flag using the current global user context.
 * Automatically re-evaluates when:
 *  - the SDK receives an SSE 'flag:updated' event
 *  - the user context (userId / plan / isBeta) changes in the Demo Lab
 */
export function usePulseFlag(key: string) {
  const { flagContext } = useUserContext();

  // Stable hash of the context so we can adjust state during render when context changes
  const contextHash = JSON.stringify(flagContext);

  const [value, setValue] = useState(() => pulseClient.isEnabled(key, flagContext));
  const [variant, setVariant] = useState(() => pulseClient.getVariant(key, flagContext));
  const [prevHash, setPrevHash] = useState(contextHash);

  // Sync state if context changes (standard React state-from-props pattern)
  if (contextHash !== prevHash) {
    setPrevHash(contextHash);
    setValue(pulseClient.isEnabled(key, flagContext));
    setVariant(pulseClient.getVariant(key, flagContext));
  }

  useEffect(() => {
    const handleUpdate = (e: { flagKey: string }) => {
      if (e.flagKey === key) {
        setValue(pulseClient.isEnabled(key, flagContext));
        setVariant(pulseClient.getVariant(key, flagContext));
      }
    };

    pulseClient.on('flag:updated', handleUpdate);
    return () => {
      pulseClient.off('flag:updated', handleUpdate);
    };
  }, [key, contextHash, flagContext]);

  return { value, variant };
}

/** Reflects the SDK's live connection state (CONNECTED / RECONNECTING / STALE …) */
export function usePulseState() {
  const [state, setState] = useState(() => pulseClient.getState());

  useEffect(() => {
    const handleState = (e: {
      state: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'STALE';
    }) => {
      setState(e.state);
    };

    pulseClient.on('state:changed', handleState);
    return () => {
      pulseClient.off('state:changed', handleState);
    };
  }, []);

  return state;
}

/**
 * Returns current evaluated values for all known flags.
 * Used by the Demo Lab to show a live flag evaluation table.
 */
export const KNOWN_FLAGS = [
  'new_homepage_hero',
  'pricing_cta_text',
  'new_analytics_widget',
  'beta_export_feature',
  'theme_config',
] as const;

export type KnownFlag = (typeof KNOWN_FLAGS)[number];

export function useAllFlags() {
  const { flagContext } = useUserContext();

  const contextHash = JSON.stringify(flagContext);

  const evaluate = useCallback(() => {
    return KNOWN_FLAGS.map((key) => ({
      key,
      value: pulseClient.isEnabled(key, flagContext),
      variant: pulseClient.getVariant(key, flagContext),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextHash]);

  const [flags, setFlags] = useState(evaluate);
  const [prevHash, setPrevHash] = useState(contextHash);

  // Sync state if context changes
  if (contextHash !== prevHash) {
    setPrevHash(contextHash);
    setFlags(evaluate());
  }

  useEffect(() => {
    const handleUpdate = () => {
      setFlags(evaluate());
    };

    pulseClient.on('flag:updated', handleUpdate);
    return () => {
      pulseClient.off('flag:updated', handleUpdate);
    };
  }, [contextHash, evaluate]);

  return flags;
}
