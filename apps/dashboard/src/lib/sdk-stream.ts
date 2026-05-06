'use client';

export type StreamStatus =
  | 'idle'
  | 'missing-key'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type StreamEvent = {
  type: 'init' | 'ruleset:updated';
  payload: unknown;
};

type StreamListener = {
  onStatus?: (status: StreamStatus) => void;
  onEvent?: (event: StreamEvent) => void;
};

type StreamInstance = {
  envId: string;
  apiKey: string;
  source: EventSource;
  status: StreamStatus;
  listeners: Set<StreamListener>;
};

const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000')
    : '';

const streams = new Map<string, StreamInstance>();

function notifyStatus(stream: StreamInstance, status: StreamStatus) {
  if (stream.status === status) return;
  stream.status = status;
  stream.listeners.forEach((l) => l.onStatus?.(status));
}

function notifyEvent(stream: StreamInstance, event: StreamEvent) {
  stream.listeners.forEach((l) => l.onEvent?.(event));
}

function parsePayload(data: string) {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function createStream(envId: string, apiKey: string): StreamInstance {
  const url = `${API_URL}/sdk/v1/stream?apiKey=${encodeURIComponent(apiKey)}`;
  const source = new EventSource(url);

  const stream: StreamInstance = {
    envId,
    apiKey,
    source,
    status: 'connecting',
    listeners: new Set(),
  };

  source.onopen = () => {
    notifyStatus(stream, 'connected');
  };

  source.onerror = () => {
    const next = source.readyState === EventSource.CONNECTING
      ? 'reconnecting'
      : 'error';
    notifyStatus(stream, next);
  };

  source.addEventListener('init', (e) => {
    const payload = parsePayload((e as MessageEvent).data);
    notifyEvent(stream, { type: 'init', payload });
  });

  source.addEventListener('ruleset:updated', (e) => {
    const payload = parsePayload((e as MessageEvent).data);
    notifyEvent(stream, { type: 'ruleset:updated', payload });
  });

  return stream;
}

export function connectSdkStream(
  envId: string,
  apiKey: string,
  listener: StreamListener,
) {
  let stream = streams.get(envId);

  if (stream && stream.apiKey !== apiKey) {
    stream.source.close();
    streams.delete(envId);
    stream = undefined;
  }

  if (!stream) {
    stream = createStream(envId, apiKey);
    streams.set(envId, stream);
  }

  stream.listeners.add(listener);
  listener.onStatus?.(stream.status);

  return () => {
    stream?.listeners.delete(listener);
    if (stream && stream.listeners.size === 0) {
      stream.source.close();
      streams.delete(envId);
    }
  };
}
