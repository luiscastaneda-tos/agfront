import { createChatSession } from "../../application/use-cases/createChatSession";
import { MockTransport } from "../../transport/MockTransport";

export async function createMockChatSession() {
  return createChatSession(new MockTransport());
}
