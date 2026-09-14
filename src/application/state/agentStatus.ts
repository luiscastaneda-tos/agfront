import type { AgentEventType } from '../../contracts';
import type { EventStore, MissingSequenceRange } from './eventStore';

export interface ObservedAgentStatus {
  /**
   * Latest explicit observation, not an aggregate assertion about concurrent
   * tasks or a confirmation of the agent's current state.
   */
  observedStatus: 'busy' | 'idle' | null;
  sourceSeq: number | null;
  /** Gaps across the entire conversation, including events for other agents. */
  missingSequenceRanges: MissingSequenceRange[];
  /** When true, history is incomplete and requires resynchronization. */
  requiresResynchronization: boolean;
}

function statusForEvent(type: AgentEventType): ObservedAgentStatus['observedStatus'] {
  switch (type) {
    case 'agent.started': return 'busy';
    case 'agent.completed':
    case 'agent.failed': return 'idle';
    default: return null;
  }
}

/** Reads fresh snapshots on every call; only event type and sequence set status. */
export function selectObservedAgentStatus(
  store: EventStore,
  conversationId: string,
  agentName: string,
): ObservedAgentStatus {
  let observedStatus: ObservedAgentStatus['observedStatus'] = null;
  let sourceSeq: number | null = null;

  // Agent snapshots are scoped to the conversation and ordered by ascending seq.
  for (const event of store.getAgentEvents(conversationId, agentName)) {
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
