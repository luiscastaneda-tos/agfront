# HANDOFF — noktos-agent-frontend

## 1. Repository state

- **repo**: `noktos-agent-frontend`, beside `noktos-agent-backend` and `noktos-auth` under a
  plain `noktos/` folder that is NOT a git repository
- **branch**: `loop/agent-frontend`
- **HEAD**: the docs commit that adds this file, sitting directly on top of `ba31c62`
  (`loop(FE-004): Implement memory-only Supabase login`), the last approved product commit.
  A handoff cannot contain its own hash; verify with `git log --oneline -2`.
- **remote**: `origin` → `https://github.com/luiscastaneda-tos/agfront.git`
- **last confirmed push**: `ba31c62` pushed and in sync; this handoff commit is pushed
  immediately after. Verify with `git status -sb`.
- **expected `git status`**: clean. `node_modules/` exists and is gitignored.
- **no `.loop/HUMAN_GATE.md`**. The loop is at a clean batch boundary, not blocked.
  `.loop/MAX_ITERATIONS_REACHED.md` may exist; it is a receipt, **not** a gate, and the
  harness deletes it at the start of the next batch.

## 2. Purpose

Frontend of an observable multi-agent demo. It shows a conversation with a Supervisor agent
and a specialized HotelSearchAgent, streams operational events live, and renders the
human-in-the-loop approval cards through which a person authorizes or rejects a sensitive
action. React + TypeScript + Vite, no durable client state in V1.

The backend is the authorization boundary. This app is user experience over it, never
enforcement.

## 3. Frozen architecture / decisions

Full text in `.loop/ARCHITECTURE_DECISIONS.md` (D-001..D-011, plus OPEN Q-001..Q-003).
Operational effect of the ones that constrain future work:

- **D-002 event transport**: the stream is consumed with `fetch` + `ReadableStream`, precisely
  so the `Authorization` header can be sent. `EventSource` is not used because it cannot set
  headers.
- **D-003**: no test suite in this loop. The contract hash check and the build are the gates.
- **D-004 token handling**: the access token lives in memory only — never `localStorage`,
  `sessionStorage`, IndexedDB, cookies, a URL, a query string or a hash; never rendered, never
  logged.
- **D-005**: the frontend is **not** the authorization boundary. Disabling a button is UX, not
  enforcement. The UI must behave correctly even if a user forges a request.
- **D-006 approval rendering**: render `inputPreview` as the backend provided it. Never
  reconstruct a preview from raw arguments. Never display chain-of-thought or model reasoning.
- **D-007**: `src/contracts/` is a vendored, READ-ONLY copy owned by `noktos-agent-backend`,
  verified byte-for-byte against `contracts.lock` (**version 1.0.0**). Editing it here is a
  protected-path violation; re-syncing is a human operation across both repositories.
- **D-008 fixtures first**: everything through FE-011 is built against recorded fixtures and a
  mock transport implementing the same interface as the live client, so this loop never blocks
  on backend progress. **FE-013 swaps the transport.**
- **D-010**: no durable client state. A reload starts clean.
- **D-011 Supabase sign-in (governs FE-004 and anything touching auth)**: email + password via
  `signInWithPassword`. Forbidden: OAuth, magic-link redirects, URL fragments, any token in a
  query string. The Supabase client sets `persistSession = false`, `autoRefreshToken = false`,
  `detectSessionInUrl = false`. The token is held only in memory behind the auth/session
  boundary; on reload V1 loses the session and requires logging in again, which is accepted for
  the demo. Configuration arrives exclusively through `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`, documented in `.env.example` with no real values; URLs and keys are
  never hardcoded, and a `service_role` key must never be used or accepted.
  - **Clarification 1** — placeholders in `.env.example` must not begin with an alphanumeric
    character. Use `<your-anon-key>`. Forms like `fictional-public-anon-key`, `example-key`,
    `test-key` or `abc123` are forbidden because the F1 guard correctly treats a
    credential-shaped assignment with an alphanumeric value as a possible secret.
  - **Clarification 2** — when a runtime defence must DETECT a value F1 considers sensitive
    (for example rejecting a service-role key), build it deterministically at runtime, e.g.
    `["service", "role"].join("_")`, instead of writing the complete literal in source. The
    defence stays, the guard is not relaxed, and no path exclusions are added.

OPEN — escalate, never invent: Q-001 visual design system, Q-002 role-aware UI,
Q-003 accessibility target.

## 4. Completed work

Five tasks, each approved by an independent reviewer and committed by the harness.
`.loop/STATE.json` shows `blocked_tasks: []` and `last_review: approve`.

| Task | Result | Commit |
| --- | --- | --- |
| FE-000 | Bootstrap minimal React and TypeScript application | `a553679` |
| FE-001 | Wire vendored contract verification into the application build | `a47091c` |
| FE-002 | Add contract-typed fixtures and mock transport | `6982f0e` |
| FE-003 | Add the application shell and two-column layout scaffolding | `665d1cf` |
| FE-004 | Implement memory-only Supabase login | `ba31c62` |

Harness and decision commits on the same branch: `b162426` init, `80c8991` retarget inherited
role prompts, `0243afd` record D-011, `5259767` D-011 placeholder clarification, `d5bbb22`
D-011 literal-detection clarification, `b62a471` ignore `.npm-cache/`.

## 5. Current / pending work

No task is in flight and nothing is blocked. The loop stopped at a clean batch boundary after
FE-004 was approved.

**Next task**: let a fresh Architect select it from `.loop/BACKLOG.yaml`. The next unstarted
backlog items are FE-005 (resumable event stream client), FE-006 (event store and
correlation), FE-007 (chat interface). Do not pick one by hand — the Architect chooses.

### Two deliberate pendings, agreed but NOT yet done

These were consciously deferred rather than rushed at the end of a session. Do them before
resuming feature work.

**1. Register the Clean Architecture + Atomic Design decision.**
It is agreed but **not yet written into `.loop/ARCHITECTURE_DECISIONS.md`**. Record it as the
next decision id. The agreed content:

- Clear separation between domain/application, infrastructure and presentation.
- Atomic Design lives **inside the presentation layer only**:
  `presentation/components/{atoms,molecules,organisms,templates}` plus `presentation/pages`,
  `presentation/hooks`, `presentation/view-models`.
- Target structure: `src/app/{providers,router,bootstrap}`,
  `src/domain/{conversation,tasks,approvals,agents}`,
  `src/application/{use-cases,ports,state}`,
  `src/infrastructure/{auth,api,sse,supabase,mappers}`, `src/presentation/…`, `src/contracts/`.
- `presentation` must never call Supabase or the backend directly; the UI consumes
  hooks/use-cases/view-models. Supabase, fetch, SSE and HTTP details live in `infrastructure`.
  Business types and conceptual rules live in `domain`. Use cases and state orchestration live
  in `application`.
- Atomic Design components stay primarily visual and composable. No business logic inside
  atoms, molecules or organisms. Avoid giant components mixing fetching, auth, data
  transformation and rendering.
- Dependencies point inward: presentation and infrastructure depend on contracts/application,
  never the reverse.
- `src/contracts/` remains the protected vendored contract and must **not** be reorganized by
  this decision.
- No preventive mass refactor. From the next tasks onward the Architect respects the structure
  and moves existing code gradually when it touches it.

**2. Replicate dependency provisioning from the backend harness.**
`noktos-agent-backend` has `.loop/scripts/provision-dependencies.sh`, a hook in `loop.sh` at
the exit-5 site, `PROVISION_DEPENDENCIES` in `loop.config.sh`, the required
`allowed_dependencies` field in `.loop/schemas/architect.schema.json`, and the matching
DEPENDENCY AUTHORISATION section in `.loop/prompts/architect.md`. **None of that exists here
yet.** Port it before a frontend task needs a new npm package, or that task will gate the way
FE-000 did. See the backend `HANDOFF.md` section 7 for the full rule set.

## 6. Known blockers / incidents

**No active blocker.** The repository is clean and the loop can resume. The incidents below
are resolved and listed only because their causes can recur.

### Resolved — F1 secret-leakage guard fired twice on FE-004, neither a real credential
- First attempt wrote `.env.example` with `VITE_SUPABASE_ANON_KEY=fictional-public-anon-key`.
  The F1 pattern matches any credential-shaped assignment whose value starts with an
  alphanumeric character, so a placeholder tripped it. Resolved by fixing the convention, not
  the guard — see D-011 Clarification 1.
- Second attempt wrote a runtime defence containing the literal `service_role`, which is the
  code that *enforces* D-011's own rule. Resolved by building the value at runtime — see
  D-011 Clarification 2.
- **What NOT to do**: do not relax F1, do not add path exclusions, and do not remove the
  runtime defence.

### Resolved — scope guard fired on an npm housekeeping artifact
The implementer pointed npm at a repo-local `.npm-cache/`, almost certainly to work around the
`EPERM` on the user npm cache. `.gitignore` covered `.npm-task-cache/` but not `.npm-cache/`,
so `_update-notifier-last-checked` stayed visible and fell outside `allowed_paths`. Fixed by
adding one `.gitignore` line (`b62a471`) as an environment change, with the scope guard
untouched and no `allowed_paths` exception. **If a different cache path appears, do not keep
adding exceptions one by one — stop and reconsider the mechanism.**

### Resolved — FE-000 could not install dependencies
The Codex sandbox has no network (`EACCES` on the registry) and cannot read the user npm cache
(`EPERM`). FE-000 was recovered by a manual host-side `npm install`. This is exactly what the
backend's dependency provisioning now automates and what pending item 2 in section 5 asks you
to port here.

### Resolved — a reviewer once gated falsely
On the first FE-001 attempt a reviewer claimed the task packet and verification output were
empty when both were populated on disk. It never read them. The task was rerun fresh and a new
reviewer approved it. If this recurs, verify the artifacts mechanically before spending
another reviewer call, and if it happens twice with non-empty artifacts, harden the reviewer
invocation rather than repeating the task.

### Environment root cause, never fixed
The sandbox's lack of network and cache access is unresolved; on Windows the Codex sandbox
needs an elevated backend for permission profiles. Everything above is mitigation.

## 7. Harness state

- **How to run**: `./.loop/scripts/loop.sh --max-iterations N --max-attempts 2` from the repo
  root, in bash. Never use `plan-next.sh` during normal operation.
- **Providers**: Architect = Codex (read-only), Implementer = Codex (workspace-write, not
  configurable), Reviewer = Codex (read-only, rotating slot). `CLAUDE_REVIEW_EVERY=0`;
  changing it is a human decision. Claude orchestrates and never writes product code.
- **Every role gets a fresh, independent session.** Never reuse a Codex conversation across
  roles or tasks.
- **Exit codes are instructions**: 0 complete · 1 fatal · 2 architect gate · 3 architect
  blocked · 4 implementer committed (forbidden) · 5 implementer gate · 6 guard violation
  (**do NOT auto-revert; a human inspects the diff**) · 7 reviewer gate · 8 failed after all
  attempts · 9 batch boundary (**not a gate**) · 10 provider CLI missing.
- **Guards**, all `exit 6`: F1 secret leakage; F2 no token in `localStorage`/`sessionStorage`;
  F3 no token in a URL or query string; F4 no chain-of-thought; F5 vendored contracts
  unmodified. Plus scope enforcement against the task packet's `allowed_paths`.
- **PROTECTED_PATHS**: `.loop/GOAL.md`, `ARCHITECTURE_DECISIONS.md`, `CONTRACTS.md`,
  `BACKLOG.yaml`, `STATE.json`, `.loop/prompts/`, `.loop/schemas/`, `.loop/scripts/`,
  `CLAUDE.md`, `AGENTS.md`, `.gitattributes`, `src/contracts/`, `contracts.lock`.
- **Deterministic verify**: `.loop/scripts/verify.sh` runs `.loop/scripts/check-contracts.sh`
  (byte-for-byte against `contracts.lock`, failing closed on MODIFIED, MISSING, UNLISTED and
  version drift) and then `npm run build`. No tests, per D-003.
- **Dependency provisioning does NOT exist in this repo yet.** See pending item 2 in section 5.
- **`.loop/MAX_ITERATIONS_REACHED.md` is not a gate** — it is a receipt from a batch that spent
  its budget, and the harness deletes it at the start of the next batch. Only
  `.loop/HUMAN_GATE.md` stops the loop.

## 8. Local environment assumptions

- Node **v22.15.0**, npm **10.9.2** — observed on the machine that produced this handoff.
- `bash` (Git Bash / MSYS on Windows). Loop scripts are LF-only, enforced by `.gitattributes`.
- `jq` on PATH. `loop.sh` normalizes jq output across platforms through `jq_run`.
- `codex` CLI installed and authenticated.
- `node_modules/` is **not** in git (22 top-level packages locally: react, react-dom, vite,
  typescript and their types). On a fresh clone run `npm install` on the host **before**
  starting the loop, or the first task will gate on dependencies — and provisioning is not
  ported here yet.
- Expected env var names, documented in `.env.example` with placeholder values only:
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Placeholders must not start with an
  alphanumeric character (D-011 Clarification 1).
- **No secrets in this repo.** `VITE_SUPABASE_ANON_KEY` is the public client key. A
  `service_role` key must never appear. Demo users are test accounts in the existing Supabase
  project.

## 9. First steps when resuming

```bash
git status                    # expect clean
git branch --show-current     # expect loop/agent-frontend
git log --oneline -2          # expect: docs handoff commit, then ba31c62
git remote -v                 # expect origin -> .../agfront.git
git status -sb                # expect in sync with origin/loop/agent-frontend
ls .loop/HUMAN_GATE.md        # expect ABSENT
cat .loop/STATE.json          # expect 5 completed, blocked_tasks: [], last_review approve
./.loop/scripts/check-contracts.sh   # expect OK, version 1.0.0
```

If all of that matches, this handoff is still valid. Then:

1. Do the two pending items in section 5, in that order: register the Clean Architecture +
   Atomic Design decision, then port dependency provisioning from the backend.
2. Only after that, resume feature work with
   `./.loop/scripts/loop.sh --max-iterations 3 --max-attempts 2` and let a fresh Architect pick
   the next task.
3. If anything does not match, stop and reconcile before touching the loop.

## 10. Stop conditions

Do not continue automatically on any of these:

- a real `HUMAN_GATE` — a decision is genuinely missing
- worktree unexpectedly dirty
- HEAD is not the handoff commit on top of `ba31c62`, with no explanation in the log
- contract drift — `check-contracts.sh` reporting MODIFIED, MISSING, UNLISTED or a version
  other than 1.0.0. Contracts are owned by `noktos-agent-backend`; re-syncing is a human
  operation across both repositories.
- any guard failure (`exit 6`) — do not auto-revert, inspect the diff
- a dependency needs installing and provisioning has not been ported yet
- an architectural change would be required, or an OPEN question (Q-001..Q-003) blocks progress
- `READY_FOR_HUMAN_REVIEW`

`exit 9` on its own is **not** a stop condition.

## 11. Important files

Read in this order:

1. `HANDOFF.md` — this file
2. `.loop/GOAL.md`
3. `.loop/ARCHITECTURE_DECISIONS.md` — especially D-011 and its two clarifications
4. `.loop/STATE.json`
5. `.loop/BACKLOG.yaml`
6. `CONTRACTS.md` and `contracts.lock` — the vendoring rules
7. `CLAUDE.md` and `AGENTS.md` — the supervisor contract
8. `.loop/scripts/check-contracts.sh` and `.loop/scripts/verify.sh`
9. `../noktos-agent-backend/HANDOFF.md` — section 7, for the provisioning rules to port

## 12. One-screen resume summary

```text
STATUS:      5 tasks approved and pushed. No blocker, no gate. Clean batch boundary.
BRANCH:      loop/agent-frontend
HEAD:        docs handoff commit on top of ba31c62 (both pushed)
COMPLETED:   FE-000, FE-001, FE-002, FE-003, FE-004
PENDING:     (1) register the Clean Architecture + Atomic Design decision in
                 .loop/ARCHITECTURE_DECISIONS.md - agreed, not yet written
             (2) port dependency provisioning from noktos-agent-backend - absent here
             then resume feature work; a fresh Architect picks the next task
BLOCKER:     none
NEXT ACTION: verify state per section 9, do the two pendings, then run
             ./.loop/scripts/loop.sh --max-iterations 3 --max-attempts 2
DO NOT:      edit src/contracts/ or contracts.lock; relax the F1 guard or add path
             exclusions; remove the runtime service-role defence; put the token in storage,
             a URL or a log; treat the frontend as the authorization boundary; render
             chain-of-thought; keep adding cache-path exceptions one by one; write product
             code as the supervisor; push without approval
```
