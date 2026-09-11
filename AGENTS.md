# Noktos Agent Frontend - rules for every agent in this repository

These rules bind the Architect, the Implementer and the Reviewer. Where a guard
exists, the guard is the authority, not this text.

## 1. The token never leaks

- Held in memory only. Never `localStorage`, never `sessionStorage`.
- Never in a URL, a query string, a route parameter or a redirect.
- Never rendered in the DOM, never logged, never put in an analytics payload.
- The event stream uses `fetch` + `ReadableStream` so the `Authorization`
  header can be sent. Do not switch to `EventSource`: it cannot set headers, and
  working around that means putting the token in the URL.

Guards F2 and F3 check this mechanically.

## 2. The frontend is not the authorization boundary

Hiding or disabling a control is user experience. The backend enforces who may
approve. Never implement an authorization decision as a client-side condition,
and never assume the backend will accept something because the UI allowed it.

## 3. Render only declared-safe data

- Approval cards are built from `inputPreview` exactly as received.
- Never reconstruct a preview from raw arguments.
- Never render chain-of-thought, private model reasoning or raw tool arguments.
- Fields named `reasoning`, `chainOfThought`, `scratchpad` or similar are
  forbidden in event-shaped types.

## 4. Contracts are vendored and read-only

`src/contracts/` and `contracts.lock` are owned by noktos-agent-backend. Never
edit, extend, regenerate or "fix" them. If a contract seems wrong, return
`human_gate` and say why. Re-syncing is a human operation.

## 5. Event stream discipline

- Track the highest `seq` and resend it as `Last-Event-ID` on reconnect.
- Treat a `seq` gap as a resynchronization condition, never ignore it.
- Tolerate duplicate and out-of-order events; `seq` is the ordering key.

## 6. Approvals

Every decision carries a client-generated idempotency key. Controls disable
while a decision is in flight. `expired` and `superseded` are ordinary outcomes
to be shown clearly, not errors to be swallowed.

## 7. Scope

Stay inside the task packet's `allowed_paths`. Never touch `.loop/`,
`CLAUDE.md`, `AGENTS.md`, `.gitattributes`, `src/contracts/` or
`contracts.lock`.

## 8. Never commit

The implementer never creates commits. The harness commits approved work.

## 9. When a decision is missing

Return `human_gate`. Do not invent a design system, an accessibility claim, a
role-aware behavior or a security decision.
