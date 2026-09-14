import type { ChatSubmission } from "../../../application/state/chatSubmissions";

interface ChatWorkspaceProps {
  status: "pending" | "ready" | "failed";
  submissions: readonly ChatSubmission[];
  draft: string;
  canSubmit: boolean;
  onDraftChange: (draft: string) => void;
  onSubmit: () => void;
}

export function ChatWorkspace({
  status,
  submissions,
  draft,
  canSubmit,
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
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </section>
  );
}
