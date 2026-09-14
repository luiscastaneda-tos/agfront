import { createChatSubmissionController } from "../../application/state/chatSubmissions";
import { createConversationActivityController } from "../../application/state/conversationActivity";
import { MockTransport } from "../../transport/MockTransport";

export async function createMockChatSession() {
  const transport = new MockTransport();
  const conversation = await transport.createConversation();
  return {
    chat: createChatSubmissionController(conversation.id, transport),
    activity: createConversationActivityController(conversation.id, transport),
  };
}
