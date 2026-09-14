import type { ChatSubmission } from '../../application/state/chatSubmissions';
import type { AgentTask } from '../../contracts/task';

export interface ChatResponseMessage {
  readonly id: `assistant-message:task:${string}`;
  readonly taskId: string;
  readonly clientMessageId: string;
  readonly messageId: string;
  readonly status: 'completed' | 'failed';
  readonly content: string;
}

/** Project safe terminal content from authoritative tasks, in submission order. */
export function createChatResponses(
  conversationId: string,
  submissions: readonly ChatSubmission[],
  tasks: readonly AgentTask[],
): ChatResponseMessage[] {
  const tasksById = new Map<string, AgentTask>();
  for (const task of tasks) {
    if (task.conversationId !== conversationId || tasksById.has(task.id)) continue;
    tasksById.set(task.id, task);
  }

  const responses: ChatResponseMessage[] = [];
  const seenTaskIds = new Set<string>();
  for (const submission of submissions) {
    if (submission.status !== 'accepted') continue;
    for (const taskId of submission.createdTaskIds) {
      if (seenTaskIds.has(taskId)) continue;
      seenTaskIds.add(taskId);
      const task = tasksById.get(taskId);
      if (!task) continue;

      let content: string;
      if (task.status === 'completed' && task.result) {
        content = task.result.summary;
      } else if (task.status === 'failed' && task.failure) {
        // The frozen contract declares failure.message sanitized for display.
        content = task.failure.message;
      } else {
        continue;
      }

      responses.push({
        id: `assistant-message:task:${taskId}`,
        taskId,
        clientMessageId: submission.clientMessageId,
        messageId: submission.messageId,
        status: task.status,
        content,
      });
    }
  }
  return responses;
}
