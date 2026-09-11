# NOKTOS AGENT FRONTEND - GOAL V1

## Mission

Build the observable client for the multi-agent demo: a chat that stays usable
while work runs in the background, plus live operational views of tasks, agents,
an activity timeline, and approval cards where a human authorizes sensitive
actions.

This is a DEMO running on fictional data. It never claims production readiness.

## What the user must be able to do

- Talk to the Supervisor and keep talking while a task is queued, running or
  awaiting approval. Submitting a message never blocks on a slow search.
- Watch operational activity arrive in near real time.
- See the task queue with parent and child relationships.
- See which agents exist and which are busy.
- Approve or reject a sensitive action from a card showing exactly what will
  happen: action, traveler, hotel, dates, price.

## Invariant 1 - the token never leaks

The Supabase access token is held in memory only. It must never be written to
`localStorage` or `sessionStorage`, never placed in a URL or query string, never
rendered, never logged.

The event stream is consumed with `fetch` + `ReadableStream` precisely so the
`Authorization` header can be sent. `EventSource` is not used because it cannot
set headers.

## Invariant 2 - the frontend is not the authorization boundary

Disabling a button is user experience, never enforcement. The backend decides
who may approve. The UI must behave correctly even if a user forges a request.

## Invariant 3 - render only what the backend declared safe

Approval cards render `inputPreview` as provided. The UI never reconstructs a
preview from raw arguments, and never displays chain-of-thought or private model
reasoning. Only structured operational events are shown.

## Contracts

`src/contracts/` is a vendored, READ-ONLY copy owned by noktos-agent-backend and
verified byte-for-byte against `contracts.lock`. Editing it here is a protected
path violation; re-syncing is a human operation across both repositories.

## Development strategy

Everything through FE-011 is built against recorded fixtures and a mock
transport implementing the same interface as the live client, so this loop never
blocks on backend progress. FE-013 swaps the transport.

## Out of scope for V1

- Durable client state. A reload starts clean.
- WebSockets.
- Real credentials or real traveler PII.
- Any claim of production readiness.

## Definition of Done

This loop does not run test suites. The maximum final state is:

```text
READY_FOR_HUMAN_REVIEW
```
