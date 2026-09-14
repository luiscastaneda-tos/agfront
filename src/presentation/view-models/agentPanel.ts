import type { AgentDescriptor } from "../../contracts/agent";
import type { EventStore, MissingSequenceRange } from "../../application/state/eventStore";
import { selectObservedAgentStatus } from "../../application/state/agentStatus";
import type { ObservedAgentStatus } from "../../application/state/agentStatus";

export interface AgentPanelRow {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly kind: AgentDescriptor["kind"];
  readonly toolNames: readonly string[];
  readonly snapshotStatus: AgentDescriptor["status"];
  readonly observedStatus: ObservedAgentStatus["observedStatus"];
  readonly sourceSeq: number | null;
}

export interface AgentPanel {
  readonly rows: readonly AgentPanelRow[];
  readonly missingSequenceRanges: readonly MissingSequenceRange[];
  readonly requiresResynchronization: boolean;
}

/** Registry status has no sequence watermark, so observations stay separate. */
export function createAgentPanel(
  conversationId: string,
  agents: readonly AgentDescriptor[],
  store: EventStore,
): AgentPanel {
  const rows: AgentPanelRow[] = [];
  const seenAgentNames = new Set<string>();

  for (const agent of agents) {
    if (seenAgentNames.has(agent.name)) continue;
    seenAgentNames.add(agent.name);
    const observation = selectObservedAgentStatus(store, conversationId, agent.name);
    rows.push({
      name: agent.name,
      displayName: agent.displayName,
      description: agent.description,
      kind: agent.kind,
      toolNames: [...agent.toolNames],
      snapshotStatus: agent.status,
      observedStatus: observation.observedStatus,
      sourceSeq: observation.sourceSeq,
    });
  }

  // Read conversation gaps independently so an empty registry still exposes them.
  const missingSequenceRanges = store.getMissingSequenceRanges(conversationId)
    .map(({ from, to }) => ({ from, to }));
  return {
    rows,
    missingSequenceRanges,
    requiresResynchronization: missingSequenceRanges.length > 0,
  };
}
