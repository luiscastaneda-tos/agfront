import type { ActivityTimelineGroup } from "../../view-models/activityTimeline";

interface ActivityTimelineProps {
  groups: readonly ActivityTimelineGroup[];
}

export function ActivityTimeline({ groups }: ActivityTimelineProps) {
  return (
    <section aria-labelledby="activity-timeline-heading">
      <h2 id="activity-timeline-heading">Activity timeline</h2>
      {groups.length === 0 ? <p>No activity yet.</p> : (
        <ol>
          {groups.map((group) => (
            <li key={group.taskId === undefined ? "conversation" : `task:${group.taskId}`}>
              <h3>
                {group.taskId === undefined ? "Conversation activity" : <>Task {group.taskId}</>}
              </h3>
              <ol>
                {group.rows.map((row) => (
                  <li key={row.seq}>
                    <p>{row.label}</p>
                    <p>Sequence: {row.seq}</p>
                    <p><time dateTime={row.occurredAt}>{row.occurredAt}</time></p>
                    {row.agentName !== undefined ? <p>Agent: {row.agentName}</p> : null}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
