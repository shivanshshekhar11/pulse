'use client';

import { useEffect, useState } from 'react';
import type { StreamEvent, StreamStatus } from '~/lib/sdk-stream';
import { connectSdkStream } from '~/lib/sdk-stream';
import { useStreamKey } from '~/lib/stream-keys';

export function useSdkStream({
  envId,
  enabled = true,
  onEvent,
}: {
  envId?: string;
  enabled?: boolean;
  onEvent?: (event: StreamEvent) => void;
}) {
  const keyRecord = useStreamKey(envId);
  const apiKey = keyRecord?.apiKey;
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || !envId) {
      setStatus('idle');
      return undefined;
    }

    if (!apiKey) {
      setStatus('missing-key');
      return undefined;
    }

    setStatus('connecting');

    return connectSdkStream(envId, apiKey, {
      onStatus: setStatus,
      onEvent: (event) => {
        setLastEventAt(Date.now());
        onEvent?.(event);
      },
    });
  }, [envId, apiKey, enabled, onEvent]);

  return {
    status,
    lastEventAt,
    hasKey: !!apiKey,
    keyLabel: keyRecord?.label,
  };
}
