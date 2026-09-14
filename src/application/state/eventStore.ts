import type { AgentEvent } from '../../contracts';

/** Inclusive bounds of a missing portion of conversation history. */
export interface MissingSequenceRange {
  from: number;
  to: number;
}

export interface EventStore {
  ingest(event: AgentEvent): void;
  ingestBatch(events: readonly AgentEvent[]): void;
  getConversationEvents(conversationId: string): AgentEvent[];
  getTaskEvents(conversationId: string, taskId: string): AgentEvent[];
  getAgentEvents(conversationId: string, agentName: string): AgentEvent[];
  /** Zero for an empty history; does not imply that history is complete. */
  getHighestSequence(conversationId: string): number;
  getMissingSequenceRanges(conversationId: string): MissingSequenceRange[];
  subscribe(listener: () => void): () => void;
  /** Omit the conversation ID to clear all history. Subscriptions remain active. */
  clear(conversationId?: string): void;
}

interface ConversationIndex {
  events: Map<number, AgentEvent>;
  tasks: Map<string, Map<number, AgentEvent>>;
  agents: Map<string, Map<number, AgentEvent>>;
  highestSequence: number;
}

function snapshot(events?: Map<number, AgentEvent>): AgentEvent[] {
  return structuredClone(
    events ? [...events.values()].sort((a, b) => a.seq - b.seq) : [],
  );
}

function addToIndex(
  index: Map<string, Map<number, AgentEvent>>,
  key: string | undefined,
  event: AgentEvent,
): void {
  if (key === undefined) return;
  let events = index.get(key);
  if (!events) {
    events = new Map();
    index.set(key, events);
  }
  events.set(event.seq, event);
}

/**
 * Instance-local operational history. Payloads remain opaque, structured-cloneable
 * wire data. Ingestion and selector results never share references with storage.
 */
export function createEventStore(): EventStore {
  const conversations = new Map<string, ConversationIndex>();
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of [...listeners]) {
      if (listeners.has(listener)) listener();
    }
  }

  function ingestBatch(events: readonly AgentEvent[]): void {
    // Stage copies first, so invalid sequences or unclonable payloads cannot
    // leave a partially applied batch without notifying subscribers.
    const pending = new Map<string, Map<number, AgentEvent>>();
    for (const event of events) {
      if (!Number.isSafeInteger(event.seq) || event.seq < 1) {
        throw new RangeError('Event sequence must be a positive safe integer');
      }
      if (conversations.get(event.conversationId)?.events.has(event.seq)) continue;
      let batch = pending.get(event.conversationId);
      if (!batch) {
        batch = new Map();
        pending.set(event.conversationId, batch);
      }
      if (!batch.has(event.seq)) batch.set(event.seq, structuredClone(event));
    }

    if (pending.size === 0) return;
    for (const [conversationId, batch] of pending) {
      let index = conversations.get(conversationId);
      if (!index) {
        index = {
          events: new Map(),
          tasks: new Map(),
          agents: new Map(),
          highestSequence: 0,
        };
        conversations.set(conversationId, index);
      }
      for (const event of batch.values()) {
        index.events.set(event.seq, event);
        addToIndex(index.tasks, event.taskId, event);
        addToIndex(index.agents, event.agentName, event);
        index.highestSequence = Math.max(index.highestSequence, event.seq);
      }
    }
    notify();
  }

  return {
    ingest: (event) => ingestBatch([event]),
    ingestBatch,
    getConversationEvents: (conversationId) =>
      snapshot(conversations.get(conversationId)?.events),
    getTaskEvents: (conversationId, taskId) =>
      snapshot(conversations.get(conversationId)?.tasks.get(taskId)),
    getAgentEvents: (conversationId, agentName) =>
      snapshot(conversations.get(conversationId)?.agents.get(agentName)),
    getHighestSequence: (conversationId) =>
      conversations.get(conversationId)?.highestSequence ?? 0,
    getMissingSequenceRanges(conversationId) {
      const index = conversations.get(conversationId);
      if (!index) return [];
      const ranges: MissingSequenceRange[] = [];
      let previous = 0;
      for (const seq of [...index.events.keys()].sort((a, b) => a - b)) {
        if (seq - previous > 1) ranges.push({ from: previous + 1, to: seq - 1 });
        previous = seq;
      }
      return ranges;
    },
    subscribe(listener) {
      // Each registration owns its unsubscribe, even for the same callback.
      const subscription = () => listener();
      listeners.add(subscription);
      return () => { listeners.delete(subscription); };
    },
    clear(conversationId) {
      if (conversationId !== undefined) {
        if (!conversations.delete(conversationId)) return;
      } else {
        if (conversations.size === 0) return;
        conversations.clear();
      }
      notify();
    },
  };
}
