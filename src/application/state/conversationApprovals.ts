import type { ApprovalRequest } from '../../contracts';
import type { AgentTransport } from '../ports/AgentTransport';

export type ConversationApprovalsLoadState =
  | { status: 'idle' | 'loading' | 'ready' }
  | { status: 'failed'; failureDescription: string };

export interface ConversationApprovalsSnapshot {
  conversationId: string;
  approvals: ApprovalRequest[];
  load: ConversationApprovalsLoadState;
  disposed: boolean;
}

export interface ConversationApprovalsController {
  /** Starts once; an earlier refresh also counts as the initial load. */
  start(): void;
  /** Loads again, coalescing calls while a request is pending. */
  refresh(): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ConversationApprovalsSnapshot;
  /** Terminal; retains the last approvals and load state without notifying. */
  dispose(): void;
}

/** In-memory transport snapshots for one conversation; approval statuses stay intact. */
export function createConversationApprovalsController(
  conversationId: string,
  transport: AgentTransport,
): ConversationApprovalsController {
  const listeners = new Set<() => void>();
  let approvals: ApprovalRequest[] = [];
  let load: ConversationApprovalsLoadState = { status: 'idle' };
  let started = false;
  let pending = false;
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

  async function fetchApprovals(): Promise<void> {
    try {
      // A loading subscriber may have disposed synchronously.
      if (disposed) return;
      const response = await transport.listApprovals(conversationId);
      if (disposed) return;

      const seen = new Set<string>();
      const nextApprovals: ApprovalRequest[] = [];
      for (const approval of response) {
        if (approval.conversationId !== conversationId || seen.has(approval.id)) continue;
        seen.add(approval.id);
        // Preserve preview fields and statuses without retaining transport-owned references.
        nextApprovals.push(structuredClone(approval));
      }
      approvals = nextApprovals;
      load = { status: 'ready' };
    } catch {
      if (disposed) return;
      load = {
        status: 'failed',
        failureDescription: 'The approval list could not be loaded.',
      };
    } finally {
      pending = false;
    }
    if (!disposed) notify();
  }

  function refresh(): void {
    if (disposed || pending) return;
    started = true;
    // Guard before notifying because observers can call start or refresh.
    pending = true;
    load = { status: 'loading' };
    notify();
    void fetchApprovals();
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
        approvals: structuredClone(approvals),
        load: { ...load },
        disposed,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
    },
  };
}
