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
  return {
    chat: createChatSubmissionController(conversation.id, transport),
    activity: createConversationActivityController(conversation.id, transport),
    tasks: createConversationTasksController(conversation.id, transport),
    registry: createAgentRegistryController(transport),
    approvals: createConversationApprovalsController(conversation.id, transport),
  };
}
