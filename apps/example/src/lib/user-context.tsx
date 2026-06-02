'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Plan = 'free' | 'pro' | 'enterprise';

export interface UserContext {
  userId: string;
  plan: Plan;
  isBeta: boolean;
}

interface UserContextValue extends UserContext {
  setUserId: (id: string) => void;
  setPlan: (plan: Plan) => void;
  setIsBeta: (beta: boolean) => void;
  /** Full context object ready to pass into pulseClient.isEnabled / getVariant */
  flagContext: Record<string, unknown>;
}

const UserCtx = createContext<UserContextValue | null>(null);

export function UserContextProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState('user-1');
  const [plan, setPlan] = useState<Plan>('free');
  const [isBeta, setIsBeta] = useState(false);

  const setUserIdStable = useCallback((id: string) => setUserId(id), []);
  const setPlanStable = useCallback((p: Plan) => setPlan(p), []);
  const setIsBetaStable = useCallback((b: boolean) => setIsBeta(b), []);

  // The context object passed to SDK flag evaluation
  const flagContext = useMemo(
    () => ({
      userId,
      plan,
      // beta attribute used by segment conditions (string 'true'/'false' to match API)
      beta: isBeta ? 'true' : 'false',
    }),
    [userId, plan, isBeta],
  );

  const value = useMemo(
    () => ({
      userId,
      plan,
      isBeta,
      setUserId: setUserIdStable,
      setPlan: setPlanStable,
      setIsBeta: setIsBetaStable,
      flagContext,
    }),
    [userId, plan, isBeta, setUserIdStable, setPlanStable, setIsBetaStable, flagContext],
  );

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>;
}

/** Must be called inside UserContextProvider */
export function useUserContext(): UserContextValue {
  const ctx = useContext(UserCtx);
  if (!ctx) throw new Error('useUserContext must be used inside <UserContextProvider>');
  return ctx;
}
