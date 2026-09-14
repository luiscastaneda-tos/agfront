import type { ConversationActivityStreamState } from "../../application/state/conversationActivity";
import type { ConversationTasksLoadState } from "../../application/state/conversationTasks";
import type { TaskQueue } from "./taskQueue";

export interface BackgroundWork {
  readonly counts: readonly {
    label: string;
    observed: number;
    snapshot: number;
  }[];
  readonly notices: readonly string[];
}

/** Summarize existing queue observations without reconciling unwatermarked snapshots. */
export function createBackgroundWork(
  queue: TaskQueue | null,
  load: ConversationTasksLoadState | null,
  stream: ConversationActivityStreamState | null,
): BackgroundWork {
  const rows = queue?.rows ?? [];
  const counts = [
    { status: "queued", label: "Queued" },
    { status: "running", label: "Running" },
    { status: "awaiting_human_approval", label: "Awaiting approval" },
  ].map(({ status, label }) => ({
    label,
    observed: rows.filter((row) => row.observedStatus === status).length,
    snapshot: rows.filter((row) => row.snapshotStatus === status).length,
  }));
  const notices: string[] = [];
  if (load?.status === "loading") {
    notices.push("Task data is loading; counts may be incomplete.");
  } else if (load?.status === "failed") {
    notices.push("Task data could not be loaded; any retained counts may be outdated.");
  } else if (!queue || !load || load.status === "idle") {
    notices.push("Task data is unavailable; counts are incomplete.");
  }
  const snapshotOnly = rows.filter((row) => row.observedStatus === null).length;
  if (snapshotOnly > 0) {
    notices.push(`${snapshotOnly} task(s) have snapshot information only, with no event-observed status.`);
  }
  if (queue?.requiresResynchronization) {
    notices.push("Sequence gaps require resynchronization; event observations are incomplete.");
  }
  if (!stream || stream.status === "idle") {
    notices.push("Activity stream is not yet available; event observations are incomplete.");
  } else if (stream.status === "connecting") {
    notices.push("Connecting to activity updates; event observations may be incomplete.");
  } else if (stream.status === "reconnecting") {
    notices.push("Reconnecting to activity updates; retained observations may be incomplete or outdated and work may still be continuing.");
  } else if (stream.status === "ended") {
    notices.push("Activity stream ended; observations may be outdated and work may still be continuing.");
  } else if (stream.status === "failed") {
    notices.push("Activity stream failed; observations may be incomplete or outdated.");
  } else if (stream.status === "authentication-required") {
    notices.push("Authentication is required; activity updates have stopped and retained observations may be outdated.");
  }
  return { counts, notices };
}
