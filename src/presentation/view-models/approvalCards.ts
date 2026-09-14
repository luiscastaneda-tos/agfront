import type { ApprovalPreviewField, ApprovalRequest } from "../../contracts/approval";
import type { ApprovalDecisionState } from "../../application/state/conversationApprovals";

export interface ApprovalCardRow {
  readonly id: ApprovalRequest["id"];
  readonly taskId: ApprovalRequest["taskId"];
  readonly action: ApprovalRequest["action"];
  readonly summary: ApprovalRequest["summary"];
  readonly status: ApprovalRequest["status"];
  readonly decisionStatus: ApprovalDecisionState["status"] | null;
  readonly createdAt: ApprovalRequest["createdAt"];
  readonly expiresAt: ApprovalRequest["expiresAt"];
  readonly inputPreview: readonly Readonly<ApprovalPreviewField>[];
}

/** Project only declared display data, preserving snapshot statuses and previews. */
export function createApprovalCards(
  conversationId: string,
  approvals: readonly ApprovalRequest[],
  decisions: ReadonlyMap<string, ApprovalDecisionState>,
): readonly ApprovalCardRow[] {
  const rows: ApprovalCardRow[] = [];
  const seenApprovalIds = new Set<string>();

  for (const approval of approvals) {
    if (approval.conversationId !== conversationId || seenApprovalIds.has(approval.id)) continue;
    seenApprovalIds.add(approval.id);
    rows.push({
      id: approval.id,
      taskId: approval.taskId,
      action: approval.action,
      summary: approval.summary,
      status: approval.status,
      decisionStatus: decisions.get(approval.id)?.status ?? null,
      createdAt: approval.createdAt,
      expiresAt: approval.expiresAt,
      inputPreview: approval.inputPreview.map((field) => {
        const preview: ApprovalPreviewField = {
          label: field.label,
          value: field.value,
        };
        if ("emphasis" in field) preview.emphasis = field.emphasis;
        return preview;
      }),
    });
  }

  return rows;
}
