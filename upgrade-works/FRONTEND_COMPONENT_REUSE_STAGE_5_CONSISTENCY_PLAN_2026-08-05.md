# Frontend Component Reuse Stage 5 Consistency Review Plan

**Date:** 2026-08-05  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Planning revision:** `9b9a696`  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Prior checkpoint:** `FRONTEND_COMPONENT_REUSE_STAGE_5_CLEANUP_EXECUTION_2026-08-04.md`  
**Scope:** Stage 5 Day 40 — representative desktop/mobile consistency review and evidence-backed corrections  
**Status:** Completed locally; two bounded Family C corrections passed  
**Authorization boundary:** Local frontend review and behavior-preserving corrections only; no deployment, GitHub Actions, backend, API contract, route-definition, permission, persistence, dependency, business validation, status, workflow, or broad redesign changes

## 1. Purpose

Day 40 verifies that the component reuse work completed in Stages 3–4 produces a coherent user experience in its actual consumers. It is not a general redesign, a pixel-perfect sweep of all 98 frontend routes, or a reason to normalize legitimate domain differences.

The review starts from real user tasks, not isolated component appearance. Every reviewed screen must make it reasonably clear:

1. where the user is
2. what the user can do now
3. what will happen next
4. how the user can cancel, recover, or return

No production source may change until an observed mismatch is recorded, classified, assigned to the correct shared or local owner, and given a bounded validation path.

## 2. Required Outcomes

By the end of Day 40:

- the five component families changed in Stages 3–4 have representative desktop and mobile consumer evidence
- reviewers distinguish shared-contract defects, consumer-local defects, intentional domain differences, and no-change observations
- high-value inconsistencies are corrected through the smallest correct owner
- shared-source corrections are made only when every consumer should inherit the change
- domain-specific corrections remain local when the difference is intentional or workflow-specific
- orientation, hierarchy, action prominence, responsive layout, standard states, dialogs, keyboard use, touch targets, and focus recovery are checked proportionately
- no business logic, API payload, validation, permission, route, persistence, or workflow sequence changes
- findings, corrections, deferred low-value polish, tests, build evidence, commits, and rollback points are recorded
- Day 41 can run one final complete code-quality checkpoint without unresolved Day 40 application changes

## 3. Review Principles

### 3.1 Real-user sequence

Review each selected journey in this order:

1. **Entry and orientation:** heading, active section, task context, and return path
2. **Next action:** primary action discoverability, secondary-action hierarchy, and disabled/loading explanation
3. **Task execution:** responsive content order, filters, states, forms, dialogs, and action feedback
4. **Exit and recovery:** cancel/close behavior, Escape, focus restoration, Back behavior, and retained task context

### 3.2 Evidence before preference

A difference is not a defect merely because two screens look different. A finding requires at least one of:

- the same shared component contract renders inconsistently for the same purpose
- a consumer overrides the established contract without a semantic reason
- the difference obscures location, next action, system status, or recovery
- the difference causes clipping, overflow, reordering, inaccessible naming, focus loss, or an undersized touch target
- equivalent actions use conflicting labels, hierarchy, disabled behavior, or dismissal behavior
- an established design token or shared class is bypassed without a domain requirement

### 3.3 Smallest correct owner

- Fix the shared source when all consumers should change in the same way.
- Fix one consumer locally when its domain semantics differ.
- Document an intentional difference when changing it would reduce clarity or alter workflow meaning.
- Record no change when the current implementation is already coherent.

Do not add a shared prop solely to make two semantically different consumers appear identical.

Representative browser evidence can identify a shared candidate, but it does not by itself authorize a shared edit. Before changing a shared component, enumerate every production consumer and its prop/class variants. If an unreviewed consumer may rely on the current behavior, correct the representative consumer locally or defer the shared change. This is especially important for the confirmation facade and `ResponsiveRecordCollection`, whose consumer sets are broader than the Day 40 journey sample.

## 4. User Lenses and Jobs

| User lens                          | Assumed role                  | Concrete job                                                                                                | Main risk                                                           |
| ---------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Goal-driven returner               | Human Resources administrator | Scan holidays and overtime records, understand state, and act without relearning the layout                 | table/card divergence or ambiguous states                           |
| Low-confidence administrator       | System administrator          | Configure shifts or add a role assignment without triggering the wrong action                               | weak hierarchy, unclear disabled state, or unsafe form behavior     |
| Mobile operational user            | Report/Inspection operator    | Move between module home and task detail, then configure an ERCO action                                     | hidden context, clipped actions, or unreliable Back/drawer behavior |
| Interrupted manager                | Staff manager                 | Open a terminate/rehire confirmation, cancel safely, and resume at the originating control                  | focus loss, unclear destructive action, or changed context          |
| Keyboard/assistive-technology user | Any authorized role above     | Understand headings and named controls, traverse actions, use a dialog, and recover focus without a pointer | inaccessible names, focus trap, or missing status context           |

These are review assumptions, not authorization to modify role permissions or seed production-like data.

## 5. Component Families and Representative Consumers

### Family A — Confirmation foundation

Shared surface:

- `src/components/ActionConfirmModal.js`
- compatibility facade `src/views/shared/ActionConfirmModal.js`

Representative consumers:

- Staff terminate and rehire actions in `StaffActionModals`
- one existing Reports confirmation through the retained shared-path facade

Review:

- title and consequence clarity
- primary/destructive versus cancel hierarchy
- form-safe button types
- mobile drawer at `max-width: 575.98px` and desktop modal above it
- Escape/close behavior and focus restoration
- loading lock and repeated-submit protection already exposed by the consumer

The 31 compatibility-facade consumers are not migration targets on Day 40.

### Family B — Mobile module Back action

Shared surface:

- `src/components/MobileModuleBackAction.js`

Representative consumers:

- Reports detail/task context
- Inspection module header actions

Review:

- mobile-only visibility below the Bootstrap `md` boundary
- consistent icon, label, outline hierarchy, touch comfort, and placement
- preserved consumer-specific handlers and destinations
- no duplicate browser/module Back controls in the same action region
- orientation after returning to the module surface

### Family C — Responsive record collection

Shared surface:

- `src/components/ResponsiveRecordCollection.js`
- existing `MobileRecordList`, `PageState`, and `TableLoader` presentation contracts

Representative consumers:

- `HolidaysTab`
- `OvertimeRecordsTab`
- Custom Shifts in `WorkShift`

Review states:

- loading
- populated
- empty
- error when the consumer owns an error path
- pagination/footer when applicable
- enabled and disabled row/card actions

Review parity:

- the desktop table and mobile cards represent the same records in the same meaningful order
- status and action meaning match even when layouts differ
- filters/search describe their scope
- footer and pagination remain after the collection shell
- long labels and values wrap without horizontal overflow

### Family D — Role-assignment Add action

Shared surface:

- `src/components/users/RoleAssignmentAddButton.js`

Representative consumers:

- `CreateStaffForm`
- `UserRoleModal`

Review:

- identical purpose, icon, label, hierarchy, and form-safe `type="button"`
- loading/disabled behavior
- placement relative to role/scope fields
- keyboard name and focus sequence
- no accidental form submission when adding an assignment

Role rules, available scopes, validation, and persistence remain consumer-owned.

### Family E — ERCO responsive action shell

Shared surface:

- `src/views/report/erco/erco-form-components/ErcoResponsiveActionModal.js`

Representative consumers:

- `ChronologyStartModeModal`
- `PreMobModeModal`

Review:

- mobile drawer versus desktop modal presentation
- title/body/action order
- consistent footer wrapping and button reachability
- consumer-specific copy, colors, and callbacks
- Escape/close behavior and trigger focus restoration
- long content fit, vertical scrolling, and no horizontal clipping

Chronology initialization and PreMob state transitions remain domain-owned.

## 6. Viewport, Theme, and Input Matrix

### Required primary reviews

| Profile       |         Size | Purpose                                                          |
| ------------- | -----------: | ---------------------------------------------------------------- |
| Narrow mobile |  `320 × 700` | stress wrapping, footer fit, card width, and horizontal overflow |
| Common mobile |  `390 × 844` | primary touch and drawer/card journey evidence                   |
| Desktop       | `1440 × 900` | primary table, modal, hierarchy, and spacing evidence            |

### Targeted breakpoint probes

| Width pair  | Contract under test                                                           |
| ----------- | ----------------------------------------------------------------------------- |
| `575 / 576` | confirmation drawer-to-modal boundary                                         |
| `767 / 768` | ERCO drawer/modal, mobile Back visibility, and table/card responsive boundary |
| `1024`      | tablet/compact desktop action wrapping and shell spacing                      |

Do not capture every consumer at every width. Run the three primary profiles on each representative family and use breakpoint pairs only for the family whose contract changes there.

Required presentation/input modes:

- light mode for every representative journey
- dark mode for at least one consumer in each family and every corrected shared source
- keyboard-only path for every interactive family
- coarse-pointer/touch measurements on common mobile
- reduced-motion verification only when a correction changes animation, transition, loader, or drawer behavior

## 7. Consistency Rubric

Record each item as `pass`, `finding`, `intentional difference`, `not applicable`, or `blocked by fixture`.

### 7.1 Orientation and hierarchy

- one clear page-level heading
- active module/section is understandable
- Back action appears only where it has a meaningful destination
- one primary action is visually dominant where the task has a primary action
- secondary and destructive actions do not compete with the primary action

### 7.2 Spacing and responsive composition

- header, action region, filters, content, and footer follow a predictable vertical sequence
- no horizontal overflow at required widths
- long labels/values wrap without hiding context
- mobile cards do not omit desktop-only meaning
- desktop tables do not inherit mobile-only spacing or controls
- shared actions align and wrap consistently without forced equal widths when labels differ

### 7.3 Loading, empty, error, and disabled states

- loading state identifies what is loading where useful
- empty state explains the absent record set rather than implying an error
- error state is distinguishable and offers an existing recovery path when supported
- disabled actions remain understandable and cannot be triggered
- state transitions do not reorder context unexpectedly

### 7.4 Forms, confirmations, and dialogs

- labels and instructions precede decisions
- button labels describe the action
- Cancel/Close is predictable
- destructive actions state their consequence
- focus enters the overlay, remains operable, and returns to the trigger
- Escape and explicit close have equivalent safe outcomes
- mobile drawers and desktop modals preserve action meaning and order

### 7.5 Accessibility and mobile ergonomics

- controls have accessible names and correct effective button type
- headings and dialog names expose useful structure
- focus indicators remain visible
- keyboard order follows visual/task order
- coarse-pointer interactive controls meet the established 44px target where the application contract requires it
- status is not conveyed by color alone
- existing contrast and typography contracts are not weakened

## 8. Evidence Capture

### 8.1 Static/code evidence

Before browser review:

- map each shared component prop/default to its representative consumers
- record consumer overrides, extra classes, wrapper order, and conditional visibility
- confirm responsive breakpoints and source/style ownership
- map each journey to existing unit/integration tests
- identify unsupported states rather than inventing fake production behavior

### 8.2 Browser evidence

Use controlled local origins from `playwright.config.mjs`. Confirm frontend and API health before authentication. Browser activity is read-only by default:

- login only with existing local smoke personas
- navigate, filter, open, cancel, close, resize, change theme, and use keyboard controls
- do not submit create/edit/delete/terminate/rehire actions
- do not alter permissions, workflows, settings, or persisted records
- exercise destructive confirmation presentation by opening and cancelling only

Temporary screenshots and measurements belong under ignored `.codex-run/day40-consistency/` or Playwright output, not `upgrade-works/`, `src/`, or tracked `build/`.

If local services, smoke personas, or required records are unavailable, mark the browser item `blocked by fixture`; use existing component tests for deterministic states and do not weaken authentication, seed persistent data, or substitute production access.

### 8.3 Finding record

Every finding must include:

- severity: Blocker, High, Medium, or Low
- affected user and journey step
- component family and exact consumer(s)
- viewport/theme/input mode
- observed evidence
- user impact
- shared, local, intentional-difference, or deferred classification
- proposed smallest correction
- affected tests and rollback boundary

Verified observations and inferences must be labelled separately.

## 9. Finding Severity and Disposition

| Severity | Meaning                                                                           | Day 40 disposition                                                                       |
| -------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Blocker  | prevents task completion, causes data loss, or creates serious accessibility risk | stop the affected journey; correct within boundary or revert/defer with explicit blocker |
| High     | likely wrong action, abandonment, or persistent uncertainty in a primary journey  | correct if behavior-preserving and testable within the approved family                   |
| Medium   | avoidable friction or material inconsistency                                      | correct only when ownership is clear and the change remains small                        |
| Low      | cosmetic polish, wording preference, or minor coherence                           | normally document for later; do not broaden Day 40                                       |

Disposition rules:

- A shared correction requires evidence that all affected consumers should inherit it.
- A consumer-local correction must not fork the shared contract unnecessarily.
- An intentional difference requires a semantic reason, not visual preference.
- A blocked fixture is not a product failure and cannot be silently treated as passed.
- A no-finding result is acceptable and requires no application commit.

## 10. Execution Tasks

### Task 40.1 — Establish the clean baseline

1. Confirm branch and clean worktree at or descended from the plan commit.
2. Record current component/consumer paths and relevant tests.
3. Confirm Day 39 removed-symbol searches remain empty.
4. Confirm no generated `build/`, screenshots, or Playwright evidence is staged.
5. If browser review is attempted, check the controlled local frontend/API origins without modifying either service.

Gate: no overlapping user edits, stale removal residue, or uncontrolled environment.

### Task 40.2 — Build the static consistency matrix

For Families A–E:

1. compare shared defaults and consumer props
2. compare wrapper/class ownership and breakpoint behavior
3. map required journey states to existing tests
4. identify likely differences and record whether they are semantic or unexplained
5. do not edit source during this task

Gate: every candidate difference has a stated user impact or is dismissed as preference/intentional behavior.

### Task 40.3 — Walk representative user journeys

Run the primary viewport, theme, keyboard, touch, and targeted breakpoint checks in Sections 4–7. Capture only enough temporary evidence to reproduce a finding.

For each journey record:

- entry/orientation result
- next-action result
- task/overlay result
- cancel/recovery result
- responsive parity result
- accessibility/mobile result

Gate: findings distinguish verified behavior from inference and fixture blockers.

### Task 40.4 — Approve the correction ledger

Before editing:

1. rank findings by user harm
2. assign shared versus local ownership
3. reject aesthetic-only normalization
4. identify the exact maximum file boundary per correction
5. identify characterization/regression coverage
6. split unrelated families into independently reversible commits

If the ledger has no Blocker, High, or clearly bounded Medium issue, make no application change and proceed to documentation.

### Task 40.5 — Characterize and correct

For each approved correction:

1. add or strengthen a focused test against untouched source when behavior is not already characterized
2. run the focused test and record its baseline result
3. apply the smallest source/style correction
4. run changed-file Prettier and ESLint
5. rerun the focused regression
6. repeat the relevant viewport/theme/input check
7. inspect the diff before starting another family

Do not combine code cleanup, renaming, or unrelated formatting with a correction.

### Task 40.6 — Proportional checkpoint

If no application source changed:

- validate documentation formatting, links, claims, and clean worktree only
- do not rerun the complete unit suite or production build merely to record no change

If application source changed:

- run changed-file Prettier and ESLint
- run the directly affected shared and consumer tests
- run contrast/typography audit only when semantic color or type styles changed
- run the relevant focused browser journey when local fixtures are available
- run one production build after the last Day 40 correction
- restore tracked build output and clean only previewed, path-validated untracked `build/` output
- defer full repository lint and the complete unit suite to the planned Day 41 checkpoint unless a cross-cutting change makes them necessary sooner

### Task 40.7 — Record and hand over

Create:

```text
upgrade-works/FRONTEND_COMPONENT_REUSE_STAGE_5_CONSISTENCY_EXECUTION_2026-08-05.md
```

Record:

- review matrix and journey results
- strengths before findings
- findings ranked by user harm
- intentional differences and fixture blockers
- exact corrections and no-change decisions
- validation commands/results
- changed-file and forbidden-boundary audit
- commits and independent rollback points
- Day 41 readiness

## 11. Maximum Initial File Boundary

Review is read-only across the frontend. Application corrections are initially limited to the following Stage 3–4 shared surfaces, their representative consumers, and direct tests:

```text
src/components/ActionConfirmModal.js
src/components/MobileModuleBackAction.js
src/components/ResponsiveRecordCollection.js
src/components/users/RoleAssignmentAddButton.js
src/views/report/erco/erco-form-components/ErcoResponsiveActionModal.js

src/components/staff/StaffActionModals.js
src/views/report/Reports.js
src/views/inspection/app/InspectionModuleHeaderActions.js
src/views/staff/leave-management/components/HolidaysTab.js
src/views/staff/leave-management/components/OvertimeRecordsTab.js
src/views/settings/components/WorkShift.js
src/views/users/CreateStaffForm.js
src/components/users/UserRoleModal.js
src/views/report/erco/erco-form-components/ChronologyStartModeModal.js
src/views/report/erco/erco-form-components/PreMobModeModal.js

src/components/__tests__/ActionConfirmModal.test.jsx
src/components/__tests__/MobileModuleBackAction.test.jsx
src/components/__tests__/ResponsiveRecordCollection.test.jsx
src/components/staff/__tests__/StaffActionModals.test.jsx
src/components/users/__tests__/RoleAssignmentAddButton.test.jsx
src/components/users/__tests__/UserRoleModal.test.jsx
src/views/shared/__tests__/ActionConfirmModal.test.jsx
src/views/report/__tests__/Reports.detailRoute.test.jsx
src/views/inspection/app/__tests__/InspectionModuleHeaderActions.test.jsx
src/views/staff/leave-management/components/__tests__/HolidaysTab.test.jsx
src/views/staff/leave-management/components/__tests__/OvertimeRecordsTab.test.jsx
src/views/settings/components/__tests__/WorkShift.test.jsx
src/views/users/__tests__/CreateStaffForm.test.jsx
src/views/report/erco/__tests__/ErcoResponsiveModals.test.jsx
```

Relevant existing SCSS may be read across `src/scss/`. A stylesheet may enter the correction diff only after the finding identifies its exact owning selector and confirms the selector's consumer breadth. The correction ledger must name that file before editing.

Only existing E2E cases whose implementation has first been inspected and confirmed read-only may be executed. Do not run CRUD, submission, approval, lifecycle, or settings-mutation browser workflows merely because they already exist. Do not add or expand a permanent browser suite unless a confirmed correction cannot be protected proportionately by existing unit/integration coverage. Any application, test, SCSS, or E2E file outside this boundary requires stopping and amending the plan before editing.

Durable records under `upgrade-works/` are separately allowed.

### Execution amendment — 2026-08-05

The read-only static/browser evidence gate identified one reproducible shared containment defect and one consumer-local state inconsistency in Family C. Before application editing, the approved boundary is amended to add:

```text
src/components/MobileRecordList.js
```

Verified evidence:

- a list-group mobile record with realistic long title/status content expanded the document by 301px at a 320px viewport and 231px at 390px
- removing status and actions did not eliminate the overflow; a long user-defined title alone reproduced it
- computed layout showed `.mobile-record-list` constrained to the available width while `.mobile-record-list__section` retained its intrinsic `min-width: auto` and expanded beyond it
- temporarily applying `min-width: 0` to the section reduced document overflow to zero without changing its content order or public API
- `WorkShift` supplies a custom React element as `emptyMessage`, bypassing the standard `PageState` used by the representative Holidays and Overtime consumers

Approved corrections:

1. add only intrinsic-width containment to the section rendered by `MobileRecordList`
2. protect that contract in the already-approved `ResponsiveRecordCollection` test suite
3. pass the Custom Shifts empty copy as a string so the existing shared `PageState` owns its presentation
4. strengthen the already-approved `WorkShift` suite to distinguish the standard empty presentation

No `MobileRecordList` prop, item shape, ordering, action, breakpoint, or consumer callback may change. `RecordCard`, all other consumers, shared status semantics, and E2E data remain outside this correction.

## 12. Explicitly Out of Scope

- repository-wide UI/UX audit or redesign
- enforcing identical layouts across different business domains
- new design system, component library, token migration, Storybook, visual snapshot service, or dependency
- migration of the 31 compatibility-facade confirmation consumers
- deletion of retained adapters, aliases, components, or historical records
- route, navigation model, permission, role, workflow, validation, API, persistence, calculation, or status changes
- new product copy or feature behavior unrelated to a verified consistency defect
- broad SCSS cleanup, selector renaming, specificity refactor, or formatting sweep
- permanent screenshots, traces, browser output, or generated build artifacts
- destructive browser actions or persistent test-data creation
- full Day 41 validation or Day 42 catalogue/handover work
- deployment, GitHub Actions, cPanel configuration, or release qualification

## 13. Stop and Revert Conditions

Stop before editing or revert the affected family commit when:

- the observed difference is semantic rather than inconsistent
- a shared correction would make any active consumer worse or require consumer-specific branching
- a correction changes route choice, API data, validation, permission, stored state, calculation, workflow order, or status meaning
- browser evidence requires production access, uncontrolled origins, permission weakening, or persistent record mutation
- a fixture cannot reproduce a state and the result would rely on guesswork
- focus, Escape, dismissal, Back destination, or action order changes unexpectedly
- a stylesheet selector has broader consumers than the correction ledger recorded
- the changed-file boundary expands to an unapproved module
- a test or build failure cannot be attributed and corrected inside the approved family
- unrelated worktree changes overlap the selected files

When stopped, restore or retain the last known behavior, document the reason, and continue only with independently proven families.

## 14. Commit and Rollback Strategy

Preferred commits:

1. Day 40 consistency-review plan and tracker checkpoint
2. optional characterization for one approved family
3. one behavior-preserving correction commit per independent family
4. Day 40 execution record and tracker completion

Do not create empty application commits when the review finds no issue. Each correction commit must identify its focused regression and may be reverted without reverting another family.

No backend or stored-data rollback is authorized or expected.

## 15. Mishap Prevention Controls

- Start with a clean status and record the plan commit.
- Keep browser review read-only; open and cancel destructive dialogs without confirming.
- Use local loopback origins and existing smoke identities only.
- Never use live production or shared-hosting data for visual consistency review.
- Capture temporary evidence outside tracked source and durable planning records.
- Classify findings before changing code.
- Add characterization before changing under-tested interaction behavior.
- Measure breakpoint and touch behavior rather than judging screenshots alone.
- Preserve domain-specific labels, ordering, callbacks, and state ownership.
- Inspect selector consumers before any shared SCSS change.
- Keep corrections small and independently reversible.
- Do not broaden shared APIs to absorb one-off presentation preferences.
- Run the production build at most once after the final Day 40 correction; Day 41 owns the complete checkpoint.
- Use guarded, path-validated cleanup for generated `build/` output.
- Preserve unrelated user changes and stop on overlap.

## 16. Definition of Done

Day 40 is complete when:

- Families A–E have representative journey evidence at the required modes and applicable breakpoints
- every finding has severity, user impact, evidence, ownership, disposition, and validation
- strengths, intentional differences, no-change decisions, and fixture blockers are recorded
- approved corrections are minimal, behavior-preserving, and independently reversible
- affected focused tests and proportional quality gates pass
- no prohibited behavior, dependency, backend, route, API, permission, persistence, workflow, generated output, or unrelated file enters the diff
- the execution record and programme trackers agree
- the worktree is clean and Day 41 can start from a documented checkpoint

## 17. Execution Result

Day 40 completed locally on 2026-08-05. Families A, B, D, and E required no application change. The two approved Family C corrections were implemented in independent commits:

- `dab6a0e` contains long mobile record content without changing the shared API or record behavior
- `a6bbadf` routes the unchanged Custom Shifts empty copy through the standard shared empty-state presentation

Changed-file formatting and lint, 15 focused files / 105 tests, the representative breakpoint/theme fixture, implementation-boundary checks, and a 6,493-module production build passed. Authenticated browser journeys remain explicitly fixture-blocked because the local PostgreSQL service was unavailable; no environment or persisted data was changed to bypass it.

Full evidence, cleanup, rollback, and Day 41 handover are recorded in `FRONTEND_COMPONENT_REUSE_STAGE_5_CONSISTENCY_EXECUTION_2026-08-05.md`.
