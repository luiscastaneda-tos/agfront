import type {
  AgentDescriptor,
  AgentEvent,
  AgentTask,
  ApprovalRequest,
  ChatResponse,
  Conversation,
} from '../src/contracts';

export const recordedConversation = {
  id: '10000000-0000-4000-8000-000000000001',
  userId: 'fictional-user-001',
  title: 'Fictional conference lodging',
  createdAt: '2026-09-11T15:00:00.000Z',
  updatedAt: '2026-09-11T15:00:01.000Z',
  state: {
    preferences: {},
    pendingUserNotes: [],
  },
} satisfies Conversation;

export const recordedChatResponse = {
  messageId: '20000000-0000-4000-8000-000000000001',
  conversationId: recordedConversation.id,
  accepted: true,
  createdTaskIds: [
    '30000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
  ],
  assistantMessage: 'I started a fictional lodging search and will share operational updates here.',
} satisfies ChatResponse;

export const recordedTasks = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    conversationId: recordedConversation.id,
    agentName: 'supervisor',
    goal: 'Coordinate the fictional lodging request.',
    status: 'running',
    authContextId: '40000000-0000-4000-8000-000000000001',
    createdAt: '2026-09-11T15:00:01.000Z',
    startedAt: '2026-09-11T15:00:02.000Z',
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    conversationId: recordedConversation.id,
    parentTaskId: '30000000-0000-4000-8000-000000000001',
    agentName: 'lodging-specialist',
    goal: 'Prepare a fictional lodging option for review.',
    status: 'awaiting_human_approval',
    authContextId: '40000000-0000-4000-8000-000000000002',
    activeApprovalId: '50000000-0000-4000-8000-000000000001',
    createdAt: '2026-09-11T15:00:03.000Z',
    startedAt: '2026-09-11T15:00:04.000Z',
  },
] satisfies AgentTask[];

export const recordedAgents = [
  {
    name: 'supervisor',
    displayName: 'Supervisor',
    description: 'Coordinates fictional travel tasks.',
    kind: 'supervisor',
    toolNames: [],
    status: 'busy',
  },
  {
    name: 'lodging-specialist',
    displayName: 'Lodging Specialist',
    description: 'Finds fictional lodging options.',
    kind: 'specialist',
    toolNames: ['search_lodging', 'reserve_lodging'],
    status: 'busy',
  },
] satisfies AgentDescriptor[];

export const recordedApprovals = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    conversationId: recordedConversation.id,
    taskId: '30000000-0000-4000-8000-000000000002',
    action: 'reserve_lodging',
    actionVersion: 1,
    requestedByAgent: 'lodging-specialist',
    status: 'pending',
    summary: 'Review the fictional lodging reservation.',
    inputPreview: [
      { label: 'Traveler', value: 'Avery Example' },
      { label: 'Hotel', value: 'Northstar Demo Hotel' },
      { label: 'Dates', value: 'October 20-23, 2026' },
      { label: 'Price', value: 'USD 540 total', emphasis: 'warning' },
    ],
    payloadHash: 'fictional-payload-hash-0001',
    createdAt: '2026-09-11T15:00:07.000Z',
    expiresAt: '2026-09-11T15:10:07.000Z',
  },
] satisfies ApprovalRequest[];

export const recordedEvents = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    seq: 1,
    type: 'conversation.message.received',
    conversationId: recordedConversation.id,
    correlationId: 'fictional-request-001',
    occurredAt: '2026-09-11T15:00:01.000Z',
    payload: { messageId: recordedChatResponse.messageId },
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    seq: 2,
    type: 'task.created',
    conversationId: recordedConversation.id,
    taskId: '30000000-0000-4000-8000-000000000001',
    agentName: 'supervisor',
    correlationId: 'fictional-request-001',
    occurredAt: '2026-09-11T15:00:02.000Z',
    payload: { status: 'queued' },
  },
  {
    id: '60000000-0000-4000-8000-000000000003',
    seq: 3,
    type: 'supervisor.delegated',
    conversationId: recordedConversation.id,
    taskId: '30000000-0000-4000-8000-000000000001',
    agentName: 'supervisor',
    correlationId: 'fictional-request-001',
    occurredAt: '2026-09-11T15:00:03.000Z',
    payload: { childTaskId: '30000000-0000-4000-8000-000000000002' },
  },
  {
    id: '60000000-0000-4000-8000-000000000004',
    seq: 4,
    type: 'task.started',
    conversationId: recordedConversation.id,
    taskId: '30000000-0000-4000-8000-000000000002',
    agentName: 'lodging-specialist',
    correlationId: 'fictional-request-001',
    occurredAt: '2026-09-11T15:00:04.000Z',
    payload: { status: 'running' },
  },
  {
    id: '60000000-0000-4000-8000-000000000005',
    seq: 5,
    type: 'agent.started',
    conversationId: recordedConversation.id,
    taskId: '30000000-0000-4000-8000-000000000002',
    agentName: 'lodging-specialist',
    correlationId: 'fictional-request-001',
    occurredAt: '2026-09-11T15:00:05.000Z',
    payload: { status: 'busy' },
  },
  {
    id: '60000000-0000-4000-8000-000000000006',
    seq: 6,
    type: 'tool.completed',
    conversationId: recordedConversation.id,
    taskId: '30000000-0000-4000-8000-000000000002',
    agentName: 'lodging-specialist',
    correlationId: 'fictional-request-001',
    occurredAt: '2026-09-11T15:00:06.000Z',
    payload: { action: 'search_lodging', outcome: 'option_found' },
  },
  {
    id: '60000000-0000-4000-8000-000000000007',
    seq: 7,
    type: 'approval.requested',
    conversationId: recordedConversation.id,
    taskId: '30000000-0000-4000-8000-000000000002',
    agentName: 'lodging-specialist',
    correlationId: 'fictional-request-001',
    occurredAt: '2026-09-11T15:00:07.000Z',
    payload: {
      approvalId: '50000000-0000-4000-8000-000000000001',
      status: 'pending',
    },
  },
] satisfies AgentEvent[];
