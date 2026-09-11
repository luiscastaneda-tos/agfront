# NOKTOS AGENT FRONTEND - ARCHITECTURE DECISIONS V1

Authoritative for the Architect and for Codex. Every decision was frozen by the
human during Phase 0, BEFORE any agent ran.

If a decision not covered here would change security, the contract or the
approval boundary, stop with HUMAN_GATE.

## D-001 - Stack and scope

React + TypeScript client for the multi-agent demo. Fictional data only. Never
declares production readiness.

## D-002 - Event transport

`fetch` + `ReadableStream`, authenticated with the `Authorization` header.

Explicitly rejected:
- token in a query string - it leaks into access logs and history;
- cookies - out of scope for V1;
- `EventSource` - cannot set headers, which is the whole reason for this choice.

Reconnection and `Last-Event-ID` tracking are implemented manually because that
is the cost of not using `EventSource`.

## D-003 - No test suite in the loop

Cost decision. Deterministic checks are the contract verification and
`npm run build`. Reversing this is a human decision.

## D-004 - Token handling

Held in memory only. Never in `localStorage` or `sessionStorage`, never in a URL
or query string, never rendered, never logged. Guards F2 and F3 enforce this
mechanically.

On `AUTH_CONTEXT_EXPIRED` the UI asks the user to re-authenticate. No refresh
token is stored.

## D-005 - The frontend is not the authorization boundary

Hiding or disabling a control is user experience only. The backend enforces that
only the conversation owner may decide an approval. The UI must remain correct
if a request is forged.

## D-006 - Approval rendering

Cards render `inputPreview` exactly as provided by the backend. The UI never
rebuilds a preview from raw arguments and never invents fields. Decisions carry
an idempotency key. `expired` and `superseded` are ordinary outcomes.

## D-007 - Contracts are vendored and read-only

`src/contracts/` is a copy owned by noktos-agent-backend, pinned by
`contracts.lock` and verified byte-for-byte on every deterministic check. Both
are PROTECTED PATHS.

Re-syncing is a human operation: stop both loops, edit in the backend, bump
`contracts/VERSION`, re-vendor, record the decision in both repositories, commit
separately, resume.

## D-008 - Fixtures first

Everything through FE-011 is built against recorded fixtures and a mock
transport sharing the live interface, so this loop never blocks on backend
progress. FE-013 swaps the implementation without touching feature code.

## D-009 - Operational events only

The UI renders structured events. No chain-of-thought, no private model
reasoning, no raw tool arguments. Guard F4 enforces this on event-shaped types.

## D-010 - No durable client state in V1

A reload starts clean. Matches the backend, which is entirely in-memory.

## OPEN - escalate, never invent

### Q-001 - Visual design system
No design system is frozen. Choosing one is a human decision; do not invent a
brand.

### Q-002 - Role-aware UI
Any UI that varies by role depends on the unresolved role matrix in noktos-auth.

### Q-003 - Accessibility target
No WCAG level has been committed to. Do not claim conformance.
