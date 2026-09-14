import type { AgentPanel as AgentPanelViewModel } from "../../view-models/agentPanel";

interface AgentPanelProps {
  panel: AgentPanelViewModel;
}

export function AgentPanel({ panel }: AgentPanelProps) {
  return (
    <section aria-labelledby="agent-panel-heading">
      <h2 id="agent-panel-heading">Agents</h2>
      {panel.requiresResynchronization ? <p>Agent panel requires resynchronization.</p> : null}
      {panel.missingSequenceRanges.length > 0 ? (
        <div>
          <p>Missing sequence ranges:</p>
          <ul>
            {panel.missingSequenceRanges.map((range) => (
              <li key={`${range.from}:${range.to}`}>{range.from}–{range.to}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {panel.rows.length === 0 ? <p>No agents in the registry.</p> : (
        <ol>
          {panel.rows.map((row) => (
            <li key={row.name}>
              <h3>{row.displayName}</h3>
              <p>Name: {row.name}</p>
              <p>Description: {row.description}</p>
              <p>Kind: {row.kind}</p>
              <p>Tools:</p>
              {row.toolNames.length === 0 ? <p>No tools.</p> : (
                <ul>
                  {row.toolNames.map((toolName, index) => (
                    <li key={`${index}:${toolName}`}>{toolName}</li>
                  ))}
                </ul>
              )}
              <p>Snapshot status: {row.snapshotStatus}</p>
              <p>Observed status (latest explicit event): {row.observedStatus === null ? "No event-derived status available." : row.observedStatus}</p>
              {row.sourceSeq !== null ? <p>Source sequence: {row.sourceSeq}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
