import type { AgentTask } from '../../contracts';
import type { AgentTransport } from '../ports/AgentTransport';

export type ConversationTasksLoadState =
  | { status: 'idle' | 'loading' | 'ready' }
  | { status: 'failed'; failureDescription: string };

export interface ConversationTasksSnapshot {
  conversationId: string;
  tasks: AgentTask[];
  load: ConversationTasksLoadState;
  disposed: boolean;
}

export interface ConversationTasksController {
  /** Starts once; an earlier refresh also counts as the initial load. */
  start(): void;
  /** Loads again, coalescing calls while a request is pending. */
  refresh(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ConversationTasksSnapshot;
  /** Terminal; retains the last tasks and load state without notifying. */
  dispose(): void;
}

/** In-memory transport snapshots for one conversation; task statuses stay intact. */
export function createConversationTasksController(
  conversationId: string,
  transport: AgentTransport,
): ConversationTasksController {
  const listeners = new Set<() => void>();
  let tasks: AgentTask[] = [];
  let load: ConversationTasksLoadState = { status: 'idle' };
  let started = false;
  let pending = false;
  let refreshQueued = false;
  let disposed = false;

  function notify(): void {
    for (const listener of [...listeners]) {
      if (disposed) return;
      if (!listeners.has(listener)) continue;
      try {
        listener();
      } catch {
        // An observer cannot interrupt loading or change its outcome.
      }
    }
  }

  async function fetchTasks(): Promise<void> {
    try {
      // A loading subscriber may have disposed synchronously.
      if (disposed) return;
      const response = await transport.listTasks(conversationId);
      if (disposed) return;

      const seen = new Set<string>();
      const nextTasks: AgentTask[] = [];
      for (const task of response) {
        if (task.conversationId !== conversationId || seen.has(task.id)) continue;
        seen.add(task.id);
        // Result data is nested and opaque; retain no transport-owned references.
        nextTasks.push(structuredClone(task));
      }
      tasks = nextTasks;
      load = { status: 'ready' };
    } catch {
      if (disposed) return;
      load = {
        status: 'failed',
        failureDescription: 'The task list could not be loaded.',
      };
    } finally {
      if (!disposed) {
        // Keep pending through publication so reentrant invalidations coalesce too.
        notify();
        pending = false;
        if (refreshQueued && !disposed) {
          refreshQueued = false;
          refresh();
        }
      }
    }
  }

  function refresh(): void {
    if (disposed) return;
    if (pending) {
      refreshQueued = true;
      return;
    }
    started = true;
    // Guard before notifying because observers can call start or refresh.
    pending = true;
    load = { status: 'loading' };
    notify();
    void fetchTasks();
  }

  return {
    start() {
      if (disposed || started) return;
      refresh();
    },
    refresh,
    subscribe(listener) {
      if (disposed) return () => {};
      const subscription = () => listener();
      listeners.add(subscription);
      return () => { listeners.delete(subscription); };
    },
    getSnapshot() {
      return {
        conversationId,
        tasks: structuredClone(tasks),
        load: { ...load },
        disposed,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      refreshQueued = false;
      listeners.clear();
    },
  };
}
