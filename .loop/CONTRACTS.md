# NOKTOS AGENT FRONTEND - INTERNAL CONTRACTS V1

Wire contracts live in `src/contracts/` (vendored from noktos-agent-backend,
version 1.0.0, read-only). This file covers client-internal seams only.

## 1. Transport interface

One interface, two implementations, so the UI never knows which is active.

```ts
interface AgentTransport {
  createConversation(): Promise<Conversation>;
  sendMessage(conversationId: string, req: ChatRequest): Promise<ChatResponse>;
  listTasks(conversationId: string): Promise<AgentTask[]>;
  listApprovals(conversationId: string): Promise<ApprovalRequest[]>;
  decideApproval(approvalId: string, d: ApprovalDecision): Promise<ApprovalRequest>;
  listAgents(): Promise<AgentDescriptor[]>;
  streamEvents(conversationId: string, opts: {
    lastEventId?: number;
    signal: AbortSignal;
  }): AsyncIterable<AgentEvent>;
}
```

- `MockTransport` replays recorded fixtures with realistic delays.
- `HttpTransport` talks to the backend.

## 2. Event stream client

- Built on `fetch` + `ReadableStream`, sending `Authorization`.
- Tracks the highest `seq` seen and resends it as `Last-Event-ID` on reconnect.
- Reconnects with backoff; reconnection is manual because `EventSource` is not
  used.
- Detects a gap in `seq` and surfaces a resynchronization state rather than
  silently continuing with a hole in the timeline.

## 3. Event store

- Indexes events by conversation, task and agent.
- Tolerates duplicates and out-of-order arrival; `seq` is the ordering key.
- Derives task status and agent busy/idle from events, never from guesses.

## 4. Auth context

- The access token lives in a module-scoped holder, not in component state, not
  in any storage API.
- Only the transport reads it, and only to set the `Authorization` header.
- On `AUTH_CONTEXT_EXPIRED` the UI prompts re-authentication.

## 5. Approval rendering

- Cards are built from `inputPreview` only.
- Every decision carries a client-generated `idempotencyKey`.
- Controls disable while a decision is in flight, and handle `expired` and
  `superseded` as ordinary outcomes rather than errors.
