import type { ChatSubmission } from "../../../application/state/chatSubmissions";
import type { BackgroundWork } from "../../view-models/backgroundWork";
import type { ChatResponseMessage } from "../../view-models/chatResponses";

interface ChatWorkspaceProps {
  status: "pending" | "ready" | "failed" | "authentication-required";
  submissions: readonly ChatSubmission[];
  responses: readonly ChatResponseMessage[];
  draft: string;
  canSubmit: boolean;
  backgroundWork: BackgroundWork;
  onDraftChange: (draft: string) => void;
  onSubmit: () => void;
}

export function ChatWorkspace({
  status,
  submissions,
  responses,
  draft,
  canSubmit,
  backgroundWork,
  onDraftChange,
  onSubmit,
}: ChatWorkspaceProps) {
  return (
    <section aria-labelledby="chat-workspace-heading">
      <h1 id="chat-workspace-heading">Chat workspace</h1>
      {status === "pending" ? <p>Preparing the conversation...</p> : null}
      {status === "failed" ? (
        <p>The conversation could not be initialized. Reload to try again.</p>
      ) : null}
      {status === "authentication-required" ? (
        <p>Authentication is required. Reload and sign in again. Reloading starts a clean demo session.</p>
      ) : null}
      {status === "ready" ? (
        <>
          <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
            <label htmlFor="chat-draft">Message</label>
            <textarea
              id="chat-draft"
              value={draft}
              onChange={(event) => onDraftChange(event.currentTarget.value)}
              rows={4}
            />
            <button type="submit" disabled={!canSubmit}>Send</button>
          </form>
          <section aria-labelledby="background-work-heading">
            <h2 id="background-work-heading">Observed background activity</h2>
            <p>
              Counts cover tasks in the loaded queue only. Snapshot statuses have no
              sequence watermark and are separate from event observations. These
              counts do not establish current state; zero observations do not mean
              all work has finished.
            </p>
            <ul>
              {backgroundWork.counts.map((count) => (
                <li key={count.label}>
                  {count.label}: {count.observed} event-observed; {count.snapshot} in task snapshot.
                </li>
              ))}
            </ul>
            {backgroundWork.notices.map((notice) => <p key={notice}>{notice}</p>)}
          </section>
          <h2>Submission history</h2>
          {submissions.length === 0 ? <p>No messages submitted yet.</p> : (
            <ol>
              {submissions.map((submission) => (
                <li key={submission.clientMessageId}>
                  <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {submission.content}
                  </p>
                  {submission.status === "pending" ? <p>Pending: submitting message...</p> : null}
                  {submission.status === "accepted" ? (
                    <p>Accepted: the request was accepted. Background work may still be continuing.</p>
                  ) : null}
                  {submission.status === "failed" ? <p>Failed: the message could not be submitted.</p> : null}
                  {responses.filter((response) => response.clientMessageId === submission.clientMessageId).map((response) => (
                    <div key={response.id}>
                      <p>{response.status === "completed" ? "Assistant response" : "Task failed"}</p>
                      <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                        {response.content}
                      </p>
                    </div>
                  ))}
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </section>
  );
}
