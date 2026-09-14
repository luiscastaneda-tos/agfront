import type { AgentEvent } from '../../contracts';
import type { AgentTransport } from '../ports/AgentTransport';
import { AuthenticationRequiredError, ResynchronizationRequiredError } from '../ports/streamErrors';
import { createEventStore, type MissingSequenceRange } from './eventStore';

export type ConversationActivityStreamState =
  | { status: 'idle' | 'streaming' | 'ended' }
  | { status: 'authentication-required' }
  | { status: 'failed'; failureDescription: string }
  | { status: 'resynchronization-required'; expected: number; received: number };

export interface ConversationActivitySnapshot {
  conversationId: string;
  events: AgentEvent[];
  highestSequence: number;
  missingSequenceRanges: MissingSequenceRange[];
  requiresResynchronization: boolean;
  stream: ConversationActivityStreamState;
  disposed: boolean;
}

export interface ConversationActivityController {
  /** Starts once. Calls after completion, failure or disposal are no-ops. */
  start(): void;
  /** Terminal; retains the last activity and stream state without notifying. */
  dispose(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ConversationActivitySnapshot;
}

/** In-memory activity for one existing conversation; payloads remain opaque. */
export function createConversationActivityController(
  conversationId: string,
  transport: AgentTransport,
): ConversationActivityController {
  const store = createEventStore();
  const abortController = new AbortController();
  const listeners = new Set<() => void>();
  let stream: ConversationActivityStreamState = { status: 'idle' };
  let disposed = false;

  function notify(): void {
    for (const listener of [...listeners]) {
      if (disposed) return;
      if (!listeners.has(listener)) continue;
      try {
        listener();
      } catch {
        // An observer cannot interrupt consumption or change its outcome.
      }
    }
  }

  const unsubscribeStore = store.subscribe(notify);

  async function consume(): Promise<void> {
    try {
      if (disposed) return;
      for await (const event of transport.streamEvents(conversationId, {
        signal: abortController.signal,
      })) {
        if (disposed) return;
        if (event.conversationId !== conversationId) continue;
        store.ingest(event);
        // A subscriber may dispose synchronously during ingestion.
        if (disposed) return;
      }
      if (disposed) return;
      stream = { status: 'ended' };
      notify();
    } catch (error) {
      if (disposed) return;
      stream = error instanceof AuthenticationRequiredError
        ? { status: 'authentication-required' }
        : error instanceof ResynchronizationRequiredError
        ? {
            status: 'resynchronization-required',
            expected: error.expected,
            received: error.received,
          }
        : {
            status: 'failed',
            failureDescription: 'The activity stream could not be consumed.',
          };
      notify();
    }
  }

  return {
    start() {
      if (disposed || stream.status !== 'idle') return;
      stream = { status: 'streaming' };
      notify();
      void consume();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribeStore();
      listeners.clear();
      abortController.abort();
    },
    subscribe(listener) {
      if (disposed) return () => {};
      const subscription = () => listener();
      listeners.add(subscription);
      return () => { listeners.delete(subscription); };
    },
    getSnapshot() {
      const missingSequenceRanges = store.getMissingSequenceRanges(conversationId);
      return {
        conversationId,
        events: store.getConversationEvents(conversationId),
        highestSequence: store.getHighestSequence(conversationId),
        missingSequenceRanges,
        requiresResynchronization:
          stream.status === 'resynchronization-required' || missingSequenceRanges.length > 0,
        stream: { ...stream },
        disposed,
      };
    },
  };
}
