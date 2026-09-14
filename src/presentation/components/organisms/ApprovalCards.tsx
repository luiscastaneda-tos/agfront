import type { ApprovalCardRow } from "../../view-models/approvalCards";

interface ApprovalCardsProps {
  rows: readonly ApprovalCardRow[];
}

export function ApprovalCards({ rows }: ApprovalCardsProps) {
  return (
    <section aria-labelledby="approval-cards-heading">
      <h2 id="approval-cards-heading">Approvals</h2>
      {rows.length === 0 ? <p>No approvals.</p> : (
        <ol>
          {rows.map((row) => (
            <li key={row.id}>
              <h3>{row.action}</h3>
              <p>Summary: {row.summary}</p>
              <p>Task: {row.taskId}</p>
              <p>Status: {row.status}</p>
              <p>Created at: {row.createdAt}</p>
              <p>Expires at: {row.expiresAt}</p>
              <p>Input preview:</p>
              {row.inputPreview.length === 0 ? <p>No preview fields.</p> : (
                <ul>
                  {row.inputPreview.map((field, index) => (
                    <li key={index}>
                      {field.emphasis === "warning" ? <span>Warning: </span> : null}
                      <span>{field.label}</span>{": "}<span>{field.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
