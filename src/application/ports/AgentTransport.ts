import type {
  AgentDescriptor,
  AgentEvent,
  AgentTask,
  ApprovalDecision,
  ApprovalRequest,
  ChatRequest,
  ChatResponse,
  Conversation,
} from '../../contracts';

export interface AgentTransport {
  createConversation(): Promise<Conversation>;
  sendMessage(conversationId: string, req: ChatRequest): Promise<ChatResponse>;
  listTasks(conversationId: string): Promise<AgentTask[]>;
  listApprovals(conversationId: string): Promise<ApprovalRequest[]>;
  decideApproval(
    approvalId: string,
    d: ApprovalDecision,
  ): Promise<ApprovalRequest>;
  listAgents(): Promise<AgentDescriptor[]>;
  streamEvents(
    conversationId: string,
    opts: { lastEventId?: number; signal: AbortSignal },
  ): AsyncIterable<AgentEvent>;
}
