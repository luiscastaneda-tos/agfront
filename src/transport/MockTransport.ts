import {
  recordedAgents,
  recordedApprovals,
  recordedChatResponse,
  recordedConversation,
  recordedEvents,
  recordedTasks,
} from '../../fixtures/recorded';
import type {
  AgentDescriptor,
  AgentEvent,
  AgentTask,
  ApprovalDecision,
  ApprovalRequest,
  ChatRequest,
  ChatResponse,
  Conversation,
} from '../contracts';
import type { AgentTransport, StreamLifecycleStatus, StreamOptions } from '../application/ports/AgentTransport';

const MAX_EVENT_DELAY_MS = 1_000;
const DEFAULT_EVENT_DELAY_MS = 25;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function boundedDelay(delayMs: number | undefined): number {
  if (delayMs === undefined || !Number.isFinite(delayMs)) {
    return DEFAULT_EVENT_DELAY_MS;
  }

  return Math.min(MAX_EVENT_DELAY_MS, Math.max(0, Math.trunc(delayMs)));
}

function waitForDelay(delayMs: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) {
    return Promise.resolve(false);
  }

  if (delayMs === 0) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const finish = (completed: boolean) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve(completed);
    };
    const onAbort = () => finish(false);
    const timer = setTimeout(() => finish(true), delayMs);

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export interface MockTransportOptions {
  eventDelayMs?: number;
}

export class MockTransport implements AgentTransport {
  private readonly eventDelayMs: number;
  private readonly approvalOutcomes = new Map<string, ApprovalRequest>();
  private readonly decisionsByIdempotencyKey = new Map<string, ApprovalRequest>();

  constructor(options: MockTransportOptions = {}) {
    this.eventDelayMs = boundedDelay(options.eventDelayMs);
  }

  async createConversation(): Promise<Conversation> {
    return clone(recordedConversation);
  }

  async sendMessage(
    conversationId: string,
    req: ChatRequest,
  ): Promise<ChatResponse> {
    void conversationId;
    void req;
    return clone(recordedChatResponse);
  }

  async listTasks(conversationId: string): Promise<AgentTask[]> {
    return clone(
      recordedTasks.filter((task) => task.conversationId === conversationId),
    );
  }

  async listApprovals(conversationId: string): Promise<ApprovalRequest[]> {
    return recordedApprovals
      .filter((approval) => approval.conversationId === conversationId)
      .map((approval) =>
        clone(this.approvalOutcomes.get(approval.id) ?? approval),
      );
  }

  async decideApproval(
    approvalId: string,
    d: ApprovalDecision,
  ): Promise<ApprovalRequest> {
    const priorDecision = this.decisionsByIdempotencyKey.get(d.idempotencyKey);
    if (priorDecision) {
      return clone(priorDecision);
    }

    const current = this.approvalOutcomes.get(approvalId);
    const recorded = recordedApprovals.find(
      (approval) => approval.id === approvalId,
    );
    const approval = current ?? recorded;

    if (!approval) {
      throw new Error('Recorded approval not found');
    }

    if (approval.status !== 'pending') {
      return clone(approval);
    }

    const updated: ApprovalRequest = {
      ...clone(approval),
      status: d.decision === 'approve' ? 'approved' : 'rejected',
      resolvedAt: '2026-09-11T15:01:00.000Z',
      ...(d.decision === 'reject' && d.reason
        ? { rejectionReason: d.reason }
        : {}),
    };

    this.approvalOutcomes.set(approvalId, updated);
    this.decisionsByIdempotencyKey.set(d.idempotencyKey, updated);
    return clone(updated);
  }

  async listAgents(): Promise<AgentDescriptor[]> {
    return clone(recordedAgents);
  }

  async *streamEvents(
    conversationId: string,
    opts: StreamOptions,
  ): AsyncIterable<AgentEvent> {
    const report = (status: StreamLifecycleStatus) => {
      if (opts.signal.aborted) return;
      try {
        opts.onLifecycle?.(status);
      } catch {
        // Observers cannot interrupt fixture replay.
      }
    };
    report('connecting');
    report('connected');
    const lastEventId = opts.lastEventId ?? 0;
    const events = recordedEvents.filter(
      (event) =>
        event.conversationId === conversationId && event.seq > lastEventId,
    );

    for (const event of events) {
      if (!(await waitForDelay(this.eventDelayMs, opts.signal))) {
        return;
      }

      yield clone(event);
    }
  }
}
