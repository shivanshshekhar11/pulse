/**
 * Minimal typed event emitter.
 *
 * Avoids importing Node's `EventEmitter` so the SDK stays browser-compatible
 * without a polyfill. The surface area is intentionally small — only what
 * `PulseClient` needs.
 */

type Listener<T> = (payload: T) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TypedEmitter<Events extends Record<string, any>> {
  private readonly listeners = new Map<keyof Events, Set<Listener<unknown>>>();

  /**
   * Registers a listener for the given event.
   * Returns an unsubscribe function for convenience.
   */
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>);
    return () => this.off(event, listener);
  }

  /** Removes a previously registered listener. */
  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  /** Emits an event, calling all registered listeners synchronously. */
  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      try {
        listener(payload);
      } catch {
        // Listener errors must not crash the SDK
      }
    }
  }

  /** Removes all listeners for all events. */
  removeAllListeners(): void {
    this.listeners.clear();
  }
}
