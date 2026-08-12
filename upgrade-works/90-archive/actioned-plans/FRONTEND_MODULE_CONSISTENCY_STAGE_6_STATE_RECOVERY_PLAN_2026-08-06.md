# Stage 6 State Presentation and Recovery Plan

Date: 2026-08-06  
Stage: 6, Days 59–60  
Status: Executed; Days 59–60 passed locally  
Parent: `FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md`

## Objective

Standardize genuinely equivalent loading, empty, no-results, error, and recovery presentation while
preserving the meaning, lifecycle, permissions, retry behavior, announcements, and focus handling
owned by each workflow.

Reuse the established `PageState`, `TableLoader`, and `ResponsiveRecordCollection` layers before
considering another component. Success is fewer duplicate presentation owners and more predictable
user feedback, not one component covering every state.

## Current architecture baseline

The initial repository scan identifies these established layers:

| Existing layer                 | Current responsibility                                                                              | Planning disposition                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `PageState`                    | Page/region loading, empty, and error presentation with optional title, message, and action         | Canonical state-shell candidate; characterize before extending |
| `TableLoader`                  | Loading adapter over `PageState`                                                                    | Retain for table/collection loading                            |
| `ResponsiveRecordCollection`   | Loading, empty, mobile-list, desktop-table, and footer orchestration                                | Retain for responsive record collections                       |
| `CAlert`                       | Inline, form, workflow, warning, success, permission, and failure messages                          | Broad signal only; never migrate by markup alone               |
| `CSpinner`                     | Button progress, camera/scanner activity, modal generation, background work, and local loading      | Specialist signal; preserve operation-specific uses            |
| Feature-local state components | Messages access, Dashboard empty state, AI/helper state, Inspection recovery, and similar contracts | Retain unless behavior-equivalence evidence proves otherwise   |

The baseline search found `PageState` in 9 source files, `TableLoader` in 40 source/test files,
`ResponsiveRecordCollection` in 19 source/test files, manual `CSpinner` usage in 9 production files,
and `CAlert` usage in 90 production component/view files. These are search counts, not approved
migration counts; definitions, tests, adapters, specialist operations, and false positives must be
classified on Day 59.

## Scope

Inventory and disposition these user-visible states:

- application/page and route loading;
- collection/table loading and initial hydration;
- empty collections before filtering;
- filtered searches with no results;
- first-use and configuration-required guidance;
- missing or deleted detail records;
- recoverable request/load errors and explicit retry actions;
- forbidden, unavailable, disabled-module, and permission-denied states;
- inline form, modal, drawer, notification, and background-operation errors;
- stale-data, offline, queued-sync, conflict, and destructive-operation failures;
- accessible status/alert semantics, live announcements, focus, and keyboard access;
- mobile/desktop sizing, wrapping, overflow, and action placement.

Primary review areas are application routing, shared record collections, Leave, Overtime, Salary,
Reports, Inspection, Team, Users/Staff, Settings, Payroll, Messages, Notifications, Audit, and Admin.

## Explicit exclusions

Do not centralize or normalize:

- data-fetching hooks, API calls, cancellation, stale-response protection, caching, or polling;
- retry timing, automatic retry queues, offline synchronization, conflicts, or persistence;
- permission checks, role decisions, module activation, or confidential-data rules;
- form validation, field errors, destructive-action failure, or submit-button progress;
- toast policy, error logging, telemetry, or backend error translation;
- camera, scanner, upload, AI generation, report generation, or other operation-specific progress;
- domain-specific first-use instructions or recovery actions;
- messages merely because they use the same color, icon, spinner, or `CAlert`; or
- a universal state component with route, module, permission, fetch, or domain switches.

`FormFieldError`, Inspection field errors, edit-state banners, and status/approval presentation are
outside this batch unless the inventory only needs to record their specialist disposition.

## State taxonomy and non-equivalence rules

Every candidate must be assigned one primary contract before comparison:

| Contract                | Meaning                                           | Required distinction                                                   |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| Full-page loading       | Route/application content is not ready            | Must not resemble an empty or forbidden page                           |
| Region loading          | A bounded card, panel, or section is pending      | Must preserve surrounding navigation and context                       |
| Collection loading      | Records are being fetched                         | Must not announce “no records” while pending                           |
| Initial empty           | The collection contains no records                | May include first-use guidance or create action                        |
| Filtered empty          | Records exist or may exist, but none match        | Must preserve filters and clearing/recovery action                     |
| Missing record          | A requested entity cannot be resolved             | Must preserve Back/navigation and distinguish load failure where known |
| Recoverable error       | An operation failed and can be retried            | Retry callback, busy/disabled state, and focus must remain local       |
| Forbidden/unavailable   | Access or module availability prevents the action | Must not be presented as missing data or transient failure             |
| Inline/form error       | A local field or submission needs correction      | Must remain associated with its form/action                            |
| Background/queued state | Work continues, retries, or awaits connectivity   | Must preserve queue, conflict, and persistence meaning                 |

Two surfaces are not duplicates if their messages, action availability, announcement timing,
container ownership, state transitions, or recovery outcomes differ.

## Day 59 — Inventory and evidence gate

### 1. Establish the exact baseline

Record, by production file and symbol:

- all `PageState`, `TableLoader`, and `ResponsiveRecordCollection` adopters;
- manual centered loading shells and bare spinner-only regions;
- manual empty/no-results/missing-record blocks;
- recoverable error shells with buttons or links;
- forbidden and unavailable states;
- feature-local state components and their production importers;
- state-related styles, test selectors, and responsive overrides; and
- tests already covering transitions, messages, retry, permissions, focus, and mobile behavior.

Use semantic searches as leads, then inspect the component state machine. Do not infer equivalence
from string or class matches.

### 2. Build the disposition matrix

For every credible family, record:

| Field          | Required evidence                                                       |
| -------------- | ----------------------------------------------------------------------- |
| State contract | One taxonomy category and why                                           |
| Owner          | Shared, feature-local, or domain consumer                               |
| Trigger        | Exact loading/error/empty/permission condition                          |
| Transition     | Loading-to-success, loading-to-empty, error-to-retry, or terminal state |
| Content        | Heading, message, icon, count, and domain guidance                      |
| Recovery       | Callback, navigation, clear-filter, create action, or none              |
| Accessibility  | Role, live region, accessible name, focus order, and busy state         |
| Layout         | Full-page/region/collection/modal/drawer/inline and mobile behavior     |
| Side effects   | Fetching, logging, toast, queue, persistence, or permission behavior    |
| Decision       | Reuse, extend, retain specialist, defer, or reject                      |

### 3. Candidate scoring

A migration candidate must satisfy all of these:

1. at least two production surfaces have the same state meaning;
2. trigger and transition ordering match;
3. action and retry ownership can remain in the consumer;
4. roles, announcements, focus behavior, and button semantics match;
5. responsive/container behavior matches;
6. an existing primitive can express the contract without domain switches; and
7. each consumer can be reverted independently.

Reject any candidate that needs permission logic, fetching behavior, operation-specific progress,
or message interpretation inside a shared component.

### 4. Initial pilot pools to investigate

These are evidence targets, not pre-approved migrations:

- manual missing-record/detail states in Leave, staff Leave, Overtime, Reports, User, Staff, and
  Team views compared with `PageState`;
- manual centered collection-empty blocks compared with `PageState` or
  `ResponsiveRecordCollection`;
- repeated recoverable load-error shells whose callbacks can remain consumer-owned; and
- manual region loaders compared with `TableLoader` where they are not button, modal, scanner,
  upload, AI, queued-sync, or background-operation progress.

Admin Feedback and Ask AI reports, record collections, application routing, ErrorBoundary, and
mobile report records provide existing-adopter reference contracts.

### 5. Day 59 gate

End Day 59 with:

- exact inventory counts and importer lists;
- a state-contract and disposition matrix;
- one bounded pilot family, or a documented no-code decision;
- exact consumers and rollback boundaries;
- behavior-preservation assertions derived from untouched source; and
- a validation matrix covering every changed state transition.

No production edit begins before this gate is recorded.

## Day 60 — Characterization, implementation, and validation

### 1. Write characterization first

For each approved consumer, capture the applicable pre-change contract:

- pending state suppresses premature empty/error content;
- success replaces loading without duplicate announcements;
- initial empty and filtered empty remain distinguishable;
- missing-record and load-error meanings remain distinguishable;
- retry invokes the same callback exactly once;
- retry disabled/busy behavior and accessible name are preserved;
- forbidden content never exposes protected controls or data;
- Back, clear-filter, create, or retry actions retain order and keyboard access;
- focus remains stable or moves only where the existing contract requires it;
- long messages and actions wrap without horizontal overflow; and
- mobile and desktop container heights do not cause layout traps.

Tests must fail for the intended presentation/semantics reason before migration, not because of a
missing provider, router, API mock, CSS boundary, timer, or browser harness dependency.

### 2. Implement the minimum safe change

Preferred order:

1. adopt an existing primitive without changing it;
2. if essential, add one bounded presentation prop supported by all existing consumers;
3. migrate only the approved pilot family; and
4. stop before adjacent modules or different state contracts.

Keep conditions, messages, callbacks, fetching, navigation, permission checks, retries, error
translation, and domain actions in the consumer. Preserve existing test IDs and class hooks unless
the characterized accessibility contract explicitly replaces them.

### 3. Required validation matrix

Run, as applicable:

| Journey                      | Required assertions                                                               |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Loading → success            | Correct pending announcement; content replaces loader; no stale empty/error state |
| Loading → initial empty      | No premature empty state; correct message/action after completion                 |
| Filter → no results → clear  | Filter state preserved; clear/recovery action works; records return               |
| Load error → retry → success | Error role/message; one retry; busy protection; success replacement               |
| Missing record → Back        | Correct meaning; Back remains keyboard reachable and navigates identically        |
| Forbidden/unavailable        | No protected controls/data; not confused with empty or transient failure          |
| Mobile and desktop           | No horizontal overflow, clipped actions, unreadable message, or trapped focus     |

Use real production-source browser rendering at a narrow 320 px viewport and a representative
desktop viewport for every migrated presentation family. Use controlled loopback data only; do not
depend on or mutate the normal local database.

### 4. Proportional quality gates

Required after implementation:

- direct primitive tests if its contract changes;
- focused characterization/regression tests for every migrated consumer;
- the broader affected feature-family tests;
- targeted ESLint and Prettier;
- controlled Playwright for the applicable transition matrix;
- isolated production build;
- E2E module mapping audit;
- semantic ownership searches for old and new paths;
- `git diff --check` and exact diff review; and
- guarded cleanup of temporary environment, server, build, screenshots, traces, and logs.

The complete Vitest suite and cumulative repository audits remain mandatory on Day 61. Escalate to
them during Day 60 if a broad shared primitive/style contract changes or the migration crosses the
approved pilot boundary.

## Mishap controls

Before editing:

- preserve the existing dirty worktree and identify task-owned files;
- verify exact production importers and state-related tests;
- record trigger precedence so loading, empty, error, and forbidden states cannot overlap; and
- confirm no selected component is an adapter or domain exception.

During editing:

- move presentation only, never the state machine;
- preserve condition order and short-circuit behavior;
- preserve callback identity, argument order, and single-invocation behavior;
- preserve `role`, `aria-live`, `aria-busy`, focus, and disabled behavior;
- do not turn recoverable failures into passive messages;
- do not show empty content before a request completes;
- do not replace operation-specific progress with a generic page loader; and
- stop if a shared prop begins encoding modules, permissions, routes, or error types.

After editing:

- inspect each consumer diff independently;
- run searches for orphaned imports, styles, selectors, and legacy shells;
- attribute every failure to application, fixture, harness, environment, or pre-existing cause;
- verify no listener or generated artifact remains; and
- document deferred specialists and residual risks.

## Acceptance gate

Days 59–60 pass only when:

- every credible state family has a recorded disposition;
- any migration uses an established primitive or a justified bounded extension;
- triggers, precedence, messages, actions, retries, permissions, and focus are preserved;
- loading, initial-empty, filtered-empty, missing, error, and forbidden meanings remain distinct;
- narrow and desktop browser journeys pass without overflow or inaccessible actions;
- focused tests, affected tests, lint, formatting, build, E2E mapping, and diff checks pass;
- cleanup is verified; and
- execution notes provide evidence, failure attribution, deferrals, rollback, and the Day 61 impact.

A no-code outcome passes when the inventory proves that existing reuse is adequate or remaining
similarities are semantic false positives.

## Stop conditions

Stop or reject a candidate if:

- condition precedence or fetch lifecycle must move;
- first-use, filtered-empty, forbidden, missing, or transient-error meaning becomes generic;
- retry, automatic queue, offline, conflict, or destructive-failure behavior must move;
- permissions or protected content would be evaluated by a presentation primitive;
- focus or live announcements regress;
- a shared API needs route, module, permission, or domain switches;
- mobile behavior requires broad unrelated CSS; or
- safe completion requires unrelated consumer churn.

## Rollback

Rollback each consumer independently by restoring its original state shell and removing only the
new primitive import or bounded prop usage. If a shared primitive is extended, revert that extension
only after its migrated consumers are restored.

Do not revert state hooks, requests, permission logic, retry callbacks, persistence, error
translation, or unrelated shared-component work. No dependency, API, backend, database, cPanel,
GitHub Actions, or deployment change is included.

## Planned durable output

After execution, create:

`FRONTEND_MODULE_CONSISTENCY_STAGE_6_STATE_RECOVERY_EXECUTION_2026-08-06.md`

It must record final counts, taxonomy/dispositions, selected consumers, pre-change characterization,
exact implementation, transition/browser evidence, failure attribution, cleanup proof, residual
risk, rollback, and whether Day 61 needs an expanded checkpoint.
