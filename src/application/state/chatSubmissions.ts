import type { AgentTransport } from '../ports/AgentTransport';

interface SubmissionContent {
  clientMessageId: string;
  content: string;
}

export type ChatSubmission = SubmissionContent & (
  | { status: 'pending' }
  | { status: 'accepted'; messageId: string }
  | { status: 'failed'; failureDescription: string }
);

export interface ChatSubmissionController {
  /** Publishes pending synchronously; resolves with its ID after settlement.
   * Blank content resolves with null and makes no request.
   */
  submit(content: string): Promise<string | null>;
  getSnapshot(): ChatSubmission[];
  subscribe(listener: () => void): () => void;
}

/** In-memory history for one existing conversation. Acceptance acknowledges
 * only the message request, not completion of any background work.
 */
export function createChatSubmissionController(
  conversationId: string,
  transport: AgentTransport,
): ChatSubmissionController {
  const submissions = new Map<string, ChatSubmission>();
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        listener();
      } catch {
        // An observer must not prevent sending or change a request's outcome.
      }
    }
  }

  return {
    async submit(content) {
      if (content.trim().length === 0) return null;

      const clientMessageId = crypto.randomUUID();
      const entry: SubmissionContent = { clientMessageId, content };
      submissions.set(clientMessageId, { ...entry, status: 'pending' });
      notify();

      try {
        const response = await transport.sendMessage(conversationId, {
          content,
          clientMessageId,
        });
        submissions.set(clientMessageId, {
          ...entry,
          status: 'accepted',
          messageId: response.messageId,
        });
      } catch {
        submissions.set(clientMessageId, {
          ...entry,
          status: 'failed',
          failureDescription: 'The message could not be submitted.',
        });
      }
      notify();
      return clientMessageId;
    },
    // Entries contain only primitives, so copying each entry is defensive.
    getSnapshot: () => [...submissions.values()].map((entry) => ({ ...entry })),
    subscribe(listener) {
      const subscription = () => listener();
      listeners.add(subscription);
      return () => { listeners.delete(subscription); };
    },
  };
}
