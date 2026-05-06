'use client';

import { useSyncExternalStore } from 'react';

type StreamKeyRecord = {
  envId: string;
  apiKey: string;
  label?: string;
  addedAt: number;
};

const store = new Map<string, StreamKeyRecord>();
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function setStreamKey(envId: string, apiKey: string, label?: string) {
  const trimmed = apiKey.trim();
  if (!trimmed) return;
  store.set(envId, { envId, apiKey: trimmed, label, addedAt: Date.now() });
  emitChange();
}

export function clearStreamKey(envId: string) {
  store.delete(envId);
  emitChange();
}

export function getStreamKey(envId: string) {
  return store.get(envId);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStreamKey(envId?: string) {
  const getSnapshot = () => (envId ? store.get(envId) : undefined);
  const getServerSnapshot = () => undefined;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
