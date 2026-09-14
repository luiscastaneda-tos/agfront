import type { AgentEvent, AgentEventType } from "../../contracts/events";

const eventLabels: Readonly<Record<AgentEventType, string>> = {
  "conversation.message.received": "Conversation message received",
  "conversation.state.updated": "Conversation state updated",
  "supervisor.started": "Supervisor started",
  "supervisor.delegated": "Supervisor delegated",
  "supervisor.result.received": "Supervisor result received",
  "task.created": "Task created",
  "task.queued": "Task queued",
  "task.started": "Task started",
  "task.completed": "Task completed",
  "task.failed": "Task failed",
  "task.cancelled": "Task cancelled",
  "agent.started": "Agent started",
  "agent.completed": "Agent completed",
  "agent.failed": "Agent failed",
  "tool.called": "Tool called",
  "tool.completed": "Tool completed",
  "approval.requested": "Approval requested",
  "approval.approved": "Approval approved",
  "approval.rejected": "Approval rejected",
  "approval.expired": "Approval expired",
  "approval.superseded": "Approval superseded",
};

export interface ActivityTimelineRow {
  readonly seq: number;
  readonly type: AgentEventType;
  readonly label: string;
  readonly occurredAt: string;
  readonly taskId?: string;
  readonly agentName?: string;
}

export interface ActivityTimelineGroup {
  readonly taskId?: string;
  readonly rows: readonly ActivityTimelineRow[];
}

export function createActivityTimeline(
  conversationId: string,
  events: readonly AgentEvent[],
): readonly ActivityTimelineGroup[] {
  const rowsBySequence = new Map<number, ActivityTimelineRow>();
  for (const event of events) {
    if (event.conversationId !== conversationId || rowsBySequence.has(event.seq)) continue;
    rowsBySequence.set(event.seq, {
      seq: event.seq,
      type: event.type,
      label: eventLabels[event.type],
      occurredAt: event.occurredAt,
      taskId: event.taskId,
      agentName: event.agentName,
    });
  }

  const rows = [...rowsBySequence.values()].sort((a, b) => a.seq - b.seq);
  const groups = new Map<string | undefined, ActivityTimelineRow[]>();
  // Insertion order establishes group order by earliest sequence. Undefined
  // keeps conversation-level events separate from every task identifier.
  for (const row of rows) {
    const group = groups.get(row.taskId);
    if (group) group.push(row);
    else groups.set(row.taskId, [row]);
  }

  return [...groups].map(([taskId, groupRows]) => ({ taskId, rows: groupRows }));
}
