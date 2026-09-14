# Demo human review

This guide covers the current source through FE-015C, including event-driven
task and approval snapshot refresh. It records expected behavior,
not completed verification. All manual checks below are unperformed. Backend-dependent
checks remain unverified until performed with a running backend and controlled
fictional scenarios. No backend endpoint availability is asserted here.
`READY_FOR_HUMAN_REVIEW` is the maximum final status permitted by this loop,
not a result established by this document. This is a fictional-data-only demo.

## Start locally

Use the variable names and placeholder forms from [.env.example](../.env.example)
in a local Vite environment file, replacing them locally with approved demo
configuration. Use only a public Supabase anon key and a designated demo account;
never add credentials or real traveler data to review evidence.

```dotenv
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_BACKEND_URL=<your-backend-url>
```

From the repository root with dependencies installed:

```sh
./node_modules/.bin/vite --host 127.0.0.1
```

Open the local address printed by Vite. To preview an existing harness-built
`dist/` instead, use `./node_modules/.bin/vite preview --host 127.0.0.1`.
The installed Vite CLI supports both commands. [package.json](../package.json)
has no `dev` or `start` script. Build and contract verification remain harness
responsibilities; this documentation task runs neither checks nor test suites.

## Entry points and boundaries

[src/main.tsx](../src/main.tsx) mounts
[App](../src/app/App.tsx), whose authenticated workspace calls
[`useChatSession(createLiveChatSession)`](../src/presentation/hooks/useChatSession.ts).
The [live factory](../src/app/bootstrap/createLiveChatSession.ts) constructs
[HttpTransport](../src/infrastructure/api/HttpTransport.ts).
The separate [mock factory](../src/app/bootstrap/createMockChatSession.ts)
constructs [MockTransport](../src/transport/MockTransport.ts), which uses recorded
fixtures. There is no implemented mock-mode selector or silent live-to-mock
fallback. Starting Vite alone does not provide a working authenticated workspace.

HttpTransport targets `POST /conversations`,
`POST /conversations/:id/messages`, `GET /conversations/:id/tasks`,
`GET /conversations/:id/approvals`, `GET /agents`,
`GET /conversations/:id/events`, and `POST /approvals/:id/decision`.
These are client targets, not evidence that backend controllers are available.
Missing routes fail explicitly.

For approval decisions, App passes `useChatSession.onDecideApproval` to
[ApprovalCards](../src/presentation/components/organisms/ApprovalCards.tsx).
The hook delegates to the
[approval controller](../src/application/state/conversationApprovals.ts), which
generates client idempotency keys with `crypto.randomUUID()` and calls
`transport.decideApproval`. HttpTransport forwards `decision` and `idempotencyKey`
to `POST /approvals/:id/decision`. Controller snapshots return through the hook
and [card projection](../src/presentation/view-models/approvalCards.ts) to the UI,
keeping submission state separate from the backend-returned approval status.

[Authentication](../src/auth/auth.ts) uses email/password sign-in and a
module-scoped, memory-only access token. Supabase session persistence, automatic
refresh, and URL session detection are disabled. The application keeps no durable
client state: reload requires sign-in and creates a clean conversation session;
it does not restore the prior draft, submissions, or observations.
Tokens must never enter browser storage, URLs, logs, rendered output, or review
artifacts. HTTP and [SSE](../src/infrastructure/sse/SseClient.ts) use the
Authorization header; SSE uses fetch and ReadableStream, with no EventSource or
WebSockets. Backend authorization enforcement is required: frontend controls
cannot grant permission to decide an approval.

## Event-driven snapshot refresh

The [session hook](../src/presentation/hooks/useChatSession.ts) starts the initial
task, approval, and registry loads. In
[createChatSession](../src/application/use-cases/createChatSession.ts), accepted
events for the session's conversation invalidate snapshots as follows:

| Lifecycle events | Authoritative reloads |
| --- | --- |
| `task.created`, `task.queued`, `task.started`, `task.completed`, `task.failed`, `task.cancelled` | `listTasks(conversationId)` |
| `approval.requested`, `approval.approved`, `approval.rejected`, `approval.expired`, `approval.superseded` | `listTasks(conversationId)` and `listApprovals(conversationId)` |

Events trigger reloads; their payloads do not supply reconstructed task or
approval snapshots or previews. Snapshot statuses come from transport responses,
and cards preserve the supplied `inputPreview`. Task event observations remain
separate from snapshot statuses. Successful approval decision responses also
update the affected card; an approval list request that began before that
decision completed preserves the newer decision response.

The session tracks processed sequences separately for task and approval refresh.
Each relevant `seq` invalidates each applicable controller only once, so repeated
activity notifications and duplicate events do not repeatedly reload snapshots.
Tracking individual sequences also permits an unseen earlier event accepted into
activity to invalidate; it does not repair or bypass a transport sequence gap.

The [task controller](../src/application/state/conversationTasks.ts) and
[approval controller](../src/application/state/conversationApprovals.ts) allow
one list request at a time per controller. Refreshes requested during a pending
load coalesce into one follow-up load after it settles, including after failure.
Further events during that follow-up can queue another load. Existing snapshots
are retained while loading and on failure, alongside the fixed panel load error.
Failure alone does not schedule a retry.

Disposal unsubscribes the event refresh listeners, clears queued refreshes, and
prevents further loads or notifications. Results of already pending list requests
are ignored after disposal; those requests are not cancelled by these controllers.
The [registry controller](../src/application/state/agentRegistry.ts) is distinct:
the session initializes it once and does not wire registry reloads to events.
Agent activity observations can still update separately from registry data.

## Locally inspectable review

- [ ] Start Vite and open the page: expect the email/password form in
  [LoginForm](../src/auth/LoginForm.tsx), before workspace initialization.
- [ ] Trace App and both factories above: expect only the live factory to be
  wired into App, with no mock selector or fallback branch.
- [ ] Inspect auth and transport code above: expect memory-only token handling,
  disabled persistence/refresh/URL detection, and header-based authentication.
  Do not copy or print token values while reviewing.
- [ ] Inspect [ApprovalCards](../src/presentation/components/organisms/ApprovalCards.tsx)
  and its [projection](../src/presentation/view-models/approvalCards.ts): expect
  preview labels, values, order, and warning emphasis to be preserved from
  `inputPreview`; no reconstruction from raw arguments. Inspect the
  [timeline projection](../src/presentation/view-models/activityTimeline.ts):
  expect operational labels and envelope metadata, without payload rendering,
  private reasoning, chain-of-thought, or scratchpad output.
- [ ] Trace the approval decision flow above: expect Approve/Reject controls on
  pending cards, per-card submission state, controller-generated idempotency
  keys, and transport forwarding. Controls are UX only; the backend enforces
  authorization. No optimistic approval status change is made.

## Checks requiring services and controlled fictional scenarios

Successful login requires the configured Supabase service. Workspace checks also
require compatible backend responses and a way to arrange the scenarios below
outside this frontend; no scenario controls are implemented in App.

- [ ] Sign in with a designated demo account: expect disabled login controls
  while pending, then workspace initialization. Try an invalid login: expect
  the fixed sign-in failure message. Reload after successful use: expect sign-in
  again and no restored client session.
- [ ] Delay one message response and submit another nonblank message while
  background work runs: expect independent pending entries, a cleared draft
  after each send, and continued activity updates. Acceptance means the request
  was accepted, not that work finished. Blank drafts cannot be sent.
  See [chat submissions](../src/application/state/chatSubmissions.ts) and
  [ChatWorkspace](../src/presentation/components/organisms/ChatWorkspace.tsx).
- [ ] Supply a task snapshot containing parent and child tasks, then explicit
  task events: expect parent IDs in the flat
  [task queue](../src/presentation/components/organisms/TaskQueue.tsx), separate
  snapshot/observed statuses, and source sequences. Background counts cover
  loaded queue rows only; zero observations do not prove completion.
- [ ] After initial snapshots load, create a new fictional task in the controlled
  backend scenario and emit `task.created` with a new sequence: expect a task
  list reload and the new row from its response. Repeat with the other task
  lifecycle events above: expect refreshed snapshot statuses alongside separate
  event observations. Task lifecycle events alone do not reload approvals.
- [ ] Add a new fictional approval to the backend snapshot and emit
  `approval.requested`: expect both task and approval list reloads, with a new
  card showing exactly the returned `inputPreview`. Do not supply raw arguments
  as a substitute for a preview.
- [ ] Arrange approved, rejected, expired, and superseded approval snapshots in
  separate controlled scenarios and emit the corresponding approval lifecycle
  event without a local decision submission: expect both lists to reload and
  cards to show the returned terminal status without decision controls.
- [ ] Delay task and approval snapshot requests and send several relevant events
  with distinct sequences while they are pending: expect no overlapping requests
  within either controller and one follow-up load per invalidated controller
  after its pending request settles. Return updated fictional snapshots from
  the follow-ups and confirm newly appearing rows/cards and terminal updates.
  Replay already processed sequences: expect no additional event-driven reloads.
- [ ] Fail a delayed refresh after queueing another relevant event: expect the
  prior snapshot to remain with its panel load error, then the queued follow-up
  to run. Separately fail a refresh without queued events: expect retained data
  and no retry until another relevant event triggers a reload.
- [ ] Unmount the workspace during delayed snapshot loads using a controlled
  review setup: expect disposal to discard queued refreshes and ignore late
  responses, with no further refresh requests from that disposed session.
- [ ] Supply registry agents and explicit `agent.started`, `agent.completed`,
  and `agent.failed` events: expect busy, idle, and idle observations respectively,
  separate from registry status. An agent without such events has no observed
  status. These are latest explicit observations, not aggregate concurrency
  guarantees. See [agent status](../src/application/state/agentStatus.ts) and
  [AgentPanel](../src/presentation/components/organisms/AgentPanel.tsx).
- [ ] Supply approval snapshots with fictional preview fields and each of
  pending, approved, rejected, expired, and superseded: expect exact supplied
  preview text and visible status, including ordinary expired/superseded outcomes.
- [ ] Click Approve on one pending card and Reject on another: expect each
  request to carry the selected decision and a client-generated idempotency key.
  Inspect only fictional request bodies for decision/key comparisons; do not
  copy authentication headers or export network captures containing tokens.
- [ ] Delay a decision response: expect both controls on that card to disable
  and `Submitting approval decision...` to appear. Other pending cards remain
  actionable, and repeated submissions for the same in-flight card are ignored.
  The displayed approval status stays unchanged while waiting.
- [ ] Fail a decision request: expect `The approval decision could not be
  submitted.` on the affected card, unchanged approval status and preview, and
  re-enabled controls if the card is still pending. Raw error details are not
  displayed. Arrange a backend authorization rejection (including HTTP 401 or
  403): expect the same generic submission failure, with no optimistic approval
  status change or global reauthentication transition. Frontend controls do not
  establish permission.
- [ ] After a failed attempt, retry the same decision on the same card within
  the same session: expect reuse of that attempt's idempotency key. Separately,
  after a failed attempt, choose the opposite decision: expect a fresh key.
  Retry intent is held in memory and cleared after success; reload starts clean.
- [ ] Arrange successful decision responses returning approved, rejected,
  expired, and superseded: expect the affected card to show the returned status
  and exact returned `inputPreview`, with no decision controls for these terminal
  statuses. Expired and superseded are ordinary outcomes, not submission errors;
  the selected decision does not override the returned status. Other cards are
  not updated by that response.
- [ ] Make conversation creation fail, then separately fail each snapshot load:
  expect fixed initialization or panel load errors, without mock data replacing
  the failed request. Fail a message request: expect its entry to become failed.
- [ ] Interrupt an established event connection, then restore it: expect a
  reconnecting notice with retained observations and reconnection with
  `Last-Event-ID` equal to the highest accepted sequence. Duplicate/older events
  must not add duplicate timeline rows. A malformed stream should produce the
  fixed stream failure notice. See [SseClient](../src/infrastructure/sse/SseClient.ts).
- [ ] Send sequence 1 followed by 3 on a fresh stream: expect the activity
  resynchronization warning, retained prior events, and stopped consumption.
  There is no automatic gap repair. The rejected event does not enter the store,
  so task/agent panels need not display a missing range for this transport gap.
  See [activity state](../src/application/state/conversationActivity.ts).
- [ ] Return HTTP 401 during conversation creation: expect reload/sign-in guidance
  across chat and operational regions. Return 401 on the event connection:
  expect activity authentication guidance and stopped updates. Reload and sign
  in again to begin cleanly. Separately return 401 on a message or snapshot load:
  current controllers show generic submission/load failure, not a global
  reauthentication transition.
- [ ] Supply an operational failure whose payload carries `AUTH_CONTEXT_EXPIRED`:
  expect only the operational event label today. The
  [parser](../src/infrastructure/sse/parser.ts) leaves payloads opaque; this code
  does not convert that payload into a reauthentication prompt. Record this
  limitation separately from HTTP 401 handling.

## Remaining limits and human decisions

The [session hook](../src/presentation/hooks/useChatSession.ts) exposes no manual
snapshot refresh controls. Registry data is loaded at initialization only;
registry changes are not fetched in response to activity. Task and approval
refresh depends on accepted relevant events and successful snapshot responses;
missing events or failed loads can leave retained data stale. Backend-dependent
checks above remain unperformed, including event-driven refresh scenarios.
Task relationships are shown as parent IDs, not a nested tree. Chat displays
submission acknowledgments, not assistant response content. Stream authentication
failure does not disable the ready chat composer; later sends can fail generically.
There is no in-place sign-in recovery or resynchronization action.

Visual polish awaits **Q-001**; no design system is selected here. Role-aware UI
awaits **Q-002**, and an accessibility target awaits **Q-003**, as recorded in
[architecture decisions](../.loop/ARCHITECTURE_DECISIONS.md). This guide makes no
production-readiness or accessibility-conformance claim. Current progress is
recorded in [.loop/STATE.json](../.loop/STATE.json); the earlier HANDOFF checkpoint
does not establish present behavior. Completing this documentation slice does
not resolve those decisions or establish that the manual checks passed.
