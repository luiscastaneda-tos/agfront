import type { TaskQueue as TaskQueueViewModel } from "../../view-models/taskQueue";

interface TaskQueueProps {
  queue: TaskQueueViewModel;
}

export function TaskQueue({ queue }: TaskQueueProps) {
  return (
    <section aria-labelledby="task-queue-heading">
      <h2 id="task-queue-heading">Task queue</h2>
      {queue.requiresResynchronization ? <p>Task queue requires resynchronization.</p> : null}
      {queue.missingSequenceRanges.length > 0 ? (
        <div>
          <p>Missing sequence ranges:</p>
          <ul>
            {queue.missingSequenceRanges.map((range) => (
              <li key={`${range.from}:${range.to}`}>{range.from}–{range.to}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {queue.rows.length === 0 ? <p>No tasks yet.</p> : (
        <ol>
          {queue.rows.map((row) => (
            <li key={row.taskId}>
              <h3>Task {row.taskId}</h3>
              <p>Agent: {row.agentName}</p>
              <p>Goal: {row.goal}</p>
              {row.parentTaskId !== undefined ? <p>Parent task ID: {row.parentTaskId}</p> : null}
              <p>Snapshot status: {row.snapshotStatus}</p>
              <p>Observed status: {row.observedStatus === null ? "No event-derived status available." : row.observedStatus}</p>
              {row.sourceSeq !== null ? <p>Source sequence: {row.sourceSeq}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
