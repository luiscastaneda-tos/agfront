import { createChatSubmissionController } from "../../application/state/chatSubmissions";
import { MockTransport } from "../../transport/MockTransport";

export async function createMockChatSession() {
  const transport = new MockTransport();
  const conversation = await transport.createConversation();
  return createChatSubmissionController(conversation.id, transport);
}
