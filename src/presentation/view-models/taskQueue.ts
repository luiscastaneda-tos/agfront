import type { AgentTask, TaskStatus } from "../../contracts/task";
import type { EventStore, MissingSequenceRange } from "../../application/state/eventStore";
import { selectObservedTaskStatus } from "../../application/state/taskStatus";

export interface TaskQueueRow {
  readonly taskId: string;
  readonly parentTaskId?: string;
  readonly agentName: string;
  readonly goal: string;
  readonly snapshotStatus: TaskStatus;
  readonly observedStatus: TaskStatus | null;
  readonly sourceSeq: number | null;
  readonly missingSequenceRanges: readonly MissingSequenceRange[];
  readonly requiresResynchronization: boolean;
}

export interface TaskQueue {
  readonly rows: readonly TaskQueueRow[];
  readonly missingSequenceRanges: readonly MissingSequenceRange[];
  readonly requiresResynchronization: boolean;
}

/** Snapshot status has no sequence watermark, so observations stay separate. */
export function createTaskQueue(
  conversationId: string,
  tasks: readonly AgentTask[],
  store: EventStore,
): TaskQueue {
  const rows: TaskQueueRow[] = [];
  const seenTaskIds = new Set<string>();

  for (const task of tasks) {
    if (task.conversationId !== conversationId || seenTaskIds.has(task.id)) continue;
    seenTaskIds.add(task.id);
    const observation = selectObservedTaskStatus(store, conversationId, task.id);
    rows.push({
      taskId: task.id,
      parentTaskId: task.parentTaskId,
      agentName: task.agentName,
      goal: task.goal,
      snapshotStatus: task.status,
      observedStatus: observation.observedStatus,
      sourceSeq: observation.sourceSeq,
      missingSequenceRanges: observation.missingSequenceRanges.map(({ from, to }) => ({ from, to })),
      requiresResynchronization: observation.requiresResynchronization,
    });
  }

  // Read conversation gaps independently so an empty queue still exposes them.
  const missingSequenceRanges = store.getMissingSequenceRanges(conversationId)
    .map(({ from, to }) => ({ from, to }));
  return {
    rows,
    missingSequenceRanges,
    requiresResynchronization: missingSequenceRanges.length > 0,
  };
}
