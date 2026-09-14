import type { AgentEventType, TaskStatus } from '../../contracts';
import type { EventStore, MissingSequenceRange } from './eventStore';

export interface ObservedTaskStatus {
  /** Latest explicit observation, not a confirmation of current task state. */
  observedStatus: TaskStatus | null;
  sourceSeq: number | null;
  /** Gaps across the entire conversation, including events for other tasks. */
  missingSequenceRanges: MissingSequenceRange[];
  /** When true, history is incomplete and requires resynchronization. */
  requiresResynchronization: boolean;
}

function statusForEvent(type: AgentEventType): TaskStatus | null {
  switch (type) {
    case 'task.queued': return 'queued';
    case 'task.started': return 'running';
    case 'task.completed': return 'completed';
    case 'task.failed': return 'failed';
    case 'task.cancelled': return 'cancelled';
    case 'approval.requested': return 'awaiting_human_approval';
    default: return null;
  }
}

/** Reads fresh snapshots on every call; only event type and sequence set status. */
export function selectObservedTaskStatus(
  store: EventStore,
  conversationId: string,
  taskId: string,
): ObservedTaskStatus {
  let observedStatus: TaskStatus | null = null;
  let sourceSeq: number | null = null;

  // Task snapshots are scoped to the conversation and ordered by ascending seq.
  for (const event of store.getTaskEvents(conversationId, taskId)) {
    const status = statusForEvent(event.type);
    if (status !== null) {
      observedStatus = status;
      sourceSeq = event.seq;
    }
  }

  const missingSequenceRanges = store.getMissingSequenceRanges(conversationId);
  return {
    observedStatus,
    sourceSeq,
    missingSequenceRanges,
    requiresResynchronization: missingSequenceRanges.length > 0,
  };
}
