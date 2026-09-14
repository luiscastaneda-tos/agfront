import { createChatSession } from "../../application/use-cases/createChatSession";
import { HttpTransport } from "../../infrastructure/api/HttpTransport";

export async function createLiveChatSession() {
  return createChatSession(new HttpTransport({
    baseUrl: import.meta.env.VITE_BACKEND_URL,
  }));
}
