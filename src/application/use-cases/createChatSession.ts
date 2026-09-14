import type { AgentTransport } from "../ports/AgentTransport";
import { createAgentRegistryController, type AgentRegistryController } from "../state/agentRegistry";
import { createChatSubmissionController, type ChatSubmissionController } from "../state/chatSubmissions";
import { createConversationActivityController, type ConversationActivityController } from "../state/conversationActivity";
import { createConversationApprovalsController, type ConversationApprovalsController } from "../state/conversationApprovals";
import { createConversationTasksController, type ConversationTasksController } from "../state/conversationTasks";

export interface ChatSessionControllers {
  chat: ChatSubmissionController;
  activity: ConversationActivityController;
  tasks: ConversationTasksController;
  registry: AgentRegistryController;
  approvals: ConversationApprovalsController;
}

export async function createChatSession(
  transport: AgentTransport,
): Promise<ChatSessionControllers> {
  const conversation = await transport.createConversation();
  const activity = createConversationActivityController(conversation.id, transport);
  const approvals = createConversationApprovalsController(conversation.id, transport);
  // Track individual sequences so accepted events filling earlier gaps invalidate too.
  const observedApprovalSequences = new Set<number>();
  const unsubscribeActivity = activity.subscribe(() => {
    let invalidated = false;
    for (const event of activity.getSnapshot().events) {
      if (event.conversationId !== conversation.id
        || observedApprovalSequences.has(event.seq)) continue;
      switch (event.type) {
        case 'approval.requested':
        case 'approval.approved':
        case 'approval.rejected':
        case 'approval.expired':
        case 'approval.superseded':
          observedApprovalSequences.add(event.seq);
          invalidated = true;
      }
    }
    if (invalidated) approvals.refresh();
  });

  return {
    chat: createChatSubmissionController(conversation.id, transport),
    activity,
    tasks: createConversationTasksController(conversation.id, transport),
    registry: createAgentRegistryController(transport),
    approvals: {
      ...approvals,
      dispose() {
        unsubscribeActivity();
        observedApprovalSequences.clear();
        approvals.dispose();
      },
    },
  };
}
