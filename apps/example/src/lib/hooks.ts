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

  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const handleUpdate = (e: { flagKey: string }) => {
      if (e.flagKey === key) {
        forceUpdate();
      }
    };

    pulseClient.on('flag:updated', handleUpdate);
    return () => {
      pulseClient.off('flag:updated', handleUpdate);
    };
  }, [key, forceUpdate]);

  const value = pulseClient.isEnabled(key, flagContext);
  const variant = pulseClient.getVariant(key, flagContext);

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

  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const handleUpdate = () => {
      forceUpdate();
    };

    pulseClient.on('flag:updated', handleUpdate);
    return () => {
      pulseClient.off('flag:updated', handleUpdate);
    };
  }, [forceUpdate]);

  return KNOWN_FLAGS.map((key) => ({
    key,
    value: pulseClient.isEnabled(key, flagContext),
    variant: pulseClient.getVariant(key, flagContext),
  }));
}

