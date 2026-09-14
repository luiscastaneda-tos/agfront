import type { ApprovalDecision, ApprovalRequest } from '../../contracts';
import type { AgentTransport } from '../ports/AgentTransport';

export type ConversationApprovalsLoadState =
  | { status: 'idle' | 'loading' | 'ready' }
  | { status: 'failed'; failureDescription: string };

export type ApprovalDecisionState =
  | { status: 'submitting' | 'succeeded'; decision: ApprovalDecision['decision'] }
  | { status: 'failed'; decision: ApprovalDecision['decision']; failureDescription: string };

export interface ConversationApprovalsSnapshot {
  conversationId: string;
  approvals: ApprovalRequest[];
  load: ConversationApprovalsLoadState;
  decisions: Map<string, ApprovalDecisionState>;
  disposed: boolean;
}

export interface ConversationApprovalsController {
  /** Starts once; an earlier refresh also counts as the initial load. */
  start(): void;
  /** Loads again, coalescing calls while a request is pending. */
  refresh(): void;
  /** Submits a known approval; concurrent submissions for that approval are ignored. */
  decideApproval(approvalId: string, decision: ApprovalDecision['decision']): Promise<void>;
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
  const decisions = new Map<string, ApprovalDecisionState>();
  const intents = new Map<string, ApprovalDecision>();
  const decisionRevisions = new Map<string, number>();
  let revision = 0;

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

  async function fetchApprovals(listRevision: number): Promise<void> {
    try {
      // A loading subscriber may have disposed synchronously.
      if (disposed) return;
      const response = await transport.listApprovals(conversationId);
      if (disposed) return;

      const seen = new Set<string>();
      const nextApprovals: ApprovalRequest[] = [];
      // Keep decisions completed after this load began, even if omitted by the list.
      const newerApprovals = new Map(approvals
        .filter(approval => (decisionRevisions.get(approval.id) ?? 0) > listRevision)
        .map(approval => [approval.id, approval]));
      for (const approval of response) {
        if (approval.conversationId !== conversationId || seen.has(approval.id)) continue;
        seen.add(approval.id);
        // Preserve preview fields and statuses without retaining transport-owned references.
        nextApprovals.push(newerApprovals.get(approval.id) ?? structuredClone(approval));
        newerApprovals.delete(approval.id);
      }
      nextApprovals.push(...newerApprovals.values());
      approvals = nextApprovals;
      load = { status: 'ready' };
    } catch {
      if (disposed) return;
      load = {
        status: 'failed',
        failureDescription: 'The approval list could not be loaded.',
      };
    } finally {
      if (!disposed) pending = false;
    }
    if (!disposed) notify();
  }

  function refresh(): void {
    if (disposed || pending) return;
    started = true;
    // Guard before notifying because observers can call start or refresh.
    pending = true;
    const listRevision = revision;
    load = { status: 'loading' };
    notify();
    void fetchApprovals(listRevision);
  }

  async function decideApproval(
    approvalId: string,
    decision: ApprovalDecision['decision'],
  ): Promise<void> {
    if (disposed || decisions.get(approvalId)?.status === 'submitting') return;
    // This is a local UX guard; the backend remains the authorization boundary.
    if (!approvals.some(approval => approval.id === approvalId)) return;

    const previousState = decisions.get(approvalId);
    const previousIntent = intents.get(approvalId);
    const retry = previousState?.status === 'failed' && previousIntent?.decision === decision;
    if (!retry) intents.delete(approvalId);
    // Set synchronously before invoking transport or notifying reentrant observers.
    decisions.set(approvalId, { status: 'submitting', decision });
    try {
      const intent: ApprovalDecision = retry ? previousIntent : {
        decision,
        idempotencyKey: crypto.randomUUID(),
      };
      intents.set(approvalId, intent);
      notify();
      if (disposed) return;
      const response = await transport.decideApproval(approvalId, { ...intent });
      if (disposed) return;
      if (response.id !== approvalId || response.conversationId !== conversationId) {
        throw new Error('Mismatched approval response.');
      }
      const updated = structuredClone(response);
      const index = approvals.findIndex(approval => approval.id === approvalId);
      // A concurrent refresh may have removed the approval while submission ran.
      if (index === -1) approvals = [...approvals, updated];
      else approvals = approvals.map(approval => approval.id === approvalId ? updated : approval);
      decisionRevisions.set(approvalId, ++revision);
      decisions.set(approvalId, { status: 'succeeded', decision });
      intents.delete(approvalId);
    } catch {
      if (disposed) return;
      decisions.set(approvalId, {
        status: 'failed',
        decision,
        failureDescription: 'The approval decision could not be submitted.',
      });
    }
    if (!disposed) notify();
  }

  return {
    start() {
      if (disposed || started) return;
      refresh();
    },
    refresh,
    decideApproval,
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
        decisions: structuredClone(decisions),
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
