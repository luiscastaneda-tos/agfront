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

## D-011 - Supabase sign-in mechanism (V1)

Frozen by the human while resolving the FE-004 HUMAN_GATE, after D-001..D-010.

Sign-in uses Supabase email + password via `signInWithPassword`. The following
are forbidden in V1: OAuth, magic-link redirects, URL fragments, and any token
in a query string. V1 is a simple demo login with no redirects, which is what
keeps it compatible with the invariant that no token ever appears in a URL.

The Supabase client is configured explicitly with:

```text
persistSession     = false
autoRefreshToken   = false
detectSessionInUrl = false
```

The access token returned by `signInWithPassword` is held only in memory,
through the application's auth/session boundary. Persisting it is forbidden in
`localStorage`, `sessionStorage`, IndexedDB, cookies, and any URL, query string
or hash. It must never be rendered and never appear in a log.

On reload V1 loses the session and requires logging in again. That is accepted
for the demo.

Configuration reaches the frontend exclusively through `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`, documented in `.env.example` with no real values.
URLs and keys are never hardcoded. `VITE_SUPABASE_ANON_KEY` is the public client
key; a `service_role` key must never be used or accepted by the frontend.

The demo uses test users created in the existing Supabase project.

#### Clarification - placeholder form in `.env.example`

Recorded while resolving the F1 guard violation on the first FE-004 attempt.
This clarifies D-011; it changes no architecture.

Example values in `.env.example` must use placeholders that do NOT begin with an
alphanumeric character:

```text
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Forms such as `fictional-public-anon-key`, `example-key`, `test-key` or `abc123`
are forbidden, because the F1 secret-leakage guard correctly treats a
credential-shaped assignment with an alphanumeric value as a possible secret.
The guard is not relaxed to accommodate placeholders.

#### Clarification - detecting a sensitive value without writing its literal

Recorded while resolving the F1 guard violation on the second FE-004 attempt.
This clarifies D-011; it changes no architecture.

A runtime defence may legitimately need to DETECT a value that the F1
secret-leakage guard treats as sensitive, such as rejecting a service-role key
supplied where the public anon key belongs. That protection must be kept, and
the guard must not be relaxed or given path exclusions.

When this happens, build the value deterministically at runtime instead of
writing the complete literal in source:

```ts
const forbiddenRole = ["service", "role"].join("_");
```

and compare against that. The defence stays; the literal does not appear.

### D-012 — Clean Architecture and Atomic Design in presentation

Recorded per agreement in session handoff before FE-005.

- Clear separation between domain/application, infrastructure and presentation.
- Atomic Design lives inside the presentation layer only:
  `presentation/components/{atoms,molecules,organisms,templates}` plus
  `presentation/pages`, `presentation/hooks`, `presentation/view-models`.
- Target structure:
  - `src/app/{providers,router,bootstrap}`
  - `src/domain/{conversation,tasks,approvals,agents}`
  - `src/application/{use-cases,ports,state}`
  - `src/infrastructure/{auth,api,sse,supabase,mappers}`
  - `src/presentation/…`
  - `src/contracts/`
- `presentation` must never call Supabase or the backend directly; the UI consumes
  hooks/use-cases/view-models. Supabase, fetch, SSE and HTTP details live in `infrastructure`.
  Business types and conceptual rules live in `domain`. Use cases and state orchestration live
  in `application`.
- Atomic Design components stay primarily visual and composable. No business logic inside
  atoms, molecules or organisms. Avoid giant components mixing fetching, auth, data
  transformation and rendering.
- Dependencies point inward: presentation and infrastructure depend on contracts/application,
  never the reverse.
- `src/contracts/` remains the protected vendored contract and must NOT be reorganized by
  this decision.
- No preventive mass refactor. From the next tasks onward the Architect respects the structure
  and moves existing code gradually when it touches it.

## OPEN - escalate, never invent

### Q-001 - Visual design system
No design system is frozen. Choosing one is a human decision; do not invent a
brand.

### Q-002 - Role-aware UI
Any UI that varies by role depends on the unresolved role matrix in noktos-auth.

### Q-003 - Accessibility target
No WCAG level has been committed to. Do not claim conformance.
