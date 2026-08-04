# Frontend Component Reuse Execution Plan

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Baseline revision:** `0bc64a4`  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Scope:** Stage 2 Days 7–10 and Stage 3 Days 11–20  
**Status:** In progress — Stage 2 Days 7–10 complete; Days 11–13 authorized  
**Authorization boundary:** Local, behavior-preserving frontend work only; no deployment, backend, API-contract, permission, persistence, or workflow changes

## 1. Purpose

This plan converts the completed Day 6 component audit into the next bounded work packages. It prioritizes reuse and consistency where repository evidence shows a stable shared purpose. It does not authorize a broad redesign or a repository-wide replacement campaign.

The intended outcomes are:

- one reviewed pattern matrix covering the audited candidates
- two or three approved shared contracts, without domain logic
- one shared-foundation implementation batch
- two representative consumer migrations
- targeted regression evidence during each batch and one full checkpoint on Day 20

Day numbers indicate sequence, not mandatory calendar deadlines.

## 2. Governing Evidence and Constraints

Use these records as the source of truth:

- `upgrade-works/FRONTEND_COMPONENT_REUSE_AUDIT_2026-08-04.md`
- `upgrade-works/FRONTEND_UPGRADE_PLAN_2026-08-03.md`
- the current source and tests at baseline revision `0bc64a4`

The Day 6 audit established these priority candidates, in order:

1. confirmation shell
2. responsive record collection shell
3. page and collection states
4. zero-production-import component disposition
5. attachment preview shell
6. create-action and status semantics
7. compatibility-façade cleanup as a separate concern

The following remain explicit non-goals:

- a universal data-table component
- a universal status component
- merging rich forms or workflow dialogs into a plain confirmation shell
- moving attachment loading, object-URL, zoom, or download controllers into a generic presentation component
- replacing inline, modal, camera, scanner, validation, toast, or dashboard-card states with full-page state components
- deleting compatibility façades merely because their implementation is a re-export
- mounting `PwaInstallBanner` merely to eliminate a zero-import result

## 3. Execution Rules

1. Complete and review the pattern matrix before changing application source.
2. Change one pattern family per implementation commit where practical.
3. Add a canonical implementation and compatibility path before migrating consumers; delete old code only after the final import search and passing tests.
4. Preserve labels, confirmation wording, callbacks, callback arguments, event timing, disabled/loading behavior, routes, permissions, API requests, persistence, and workflow order.
5. Keep domain data fetching, transformations, calculations, and status transitions outside shared presentation components.
6. Do not add a new UI, CSS, state, form, or testing dependency.
7. Stop and reassess if a proposed contract needs more than two consumer-specific modes or if its call site becomes less clear than the local implementation.
8. Do not mix zero-import cleanup, compatibility-import cleanup, or unrelated formatting into a component migration.
9. Use focused tests while iterating. Run the full lint, unit suite, audits, and production build only at the Day 20 checkpoint or earlier if a change affects shared exports, CSS entry points, routing, state, or persistence.
10. Record a visual change only when it is an approved consistency correction; otherwise preserve the existing result.

## 4. Deliverables

Create only the durable records needed to trace decisions and completed batches:

| Deliverable | Timing | Purpose |
| --- | --- | --- |
| `FRONTEND_COMPONENT_REUSE_PATTERN_MATRIX_2026-08-04.md` | Days 7–10 | Evidence, dispositions, contracts, selected pilots, and deferrals |
| `FRONTEND_COMPONENT_REUSE_STAGE_3_EXECUTION_2026-08-04.md` | Days 11–20 | Changed files, compatibility notes, tests, removals, rollback, and checkpoint outcome |

Do not create a separate document for every day or minor component edit. Update the matrix while Stage 2 is active and the execution record while Stage 3 is active.

## 5. Stage 2 — Days 7–10: Decisions Before Source Changes

### Day 7 — Repeated Pattern Matrix

Create the matrix with one row per candidate and these mandatory fields:

- user purpose
- current implementations and canonical candidates
- production consumers and import count
- normal, loading, empty, error, disabled, and read-only differences where applicable
- desktop and mobile behavior
- keyboard, focus, accessible-name, and announcement behavior
- styling and CSS ownership
- domain-specific rules that must remain local
- disposition: reuse as-is, improve existing, extract shared shell, keep domain-specific, remove after verification, or defer
- migration risk and affected tests
- compatibility and rollback boundary
- removal candidates and their removal condition

#### Task 7.1 — Confirmation shell comparison

Compare:

- `src/views/shared/ActionConfirmModal.js`
- `src/components/users/UserConfirmModal.js`
- representative consumers from each import family
- `src/views/shared/__tests__/ActionConfirmModal.test.jsx`

Determine:

- whether a general component belongs under `src/components/`
- whether stacked-modal z-index and portal behavior is a bounded named option or must remain in a compatibility wrapper
- how React-node messages, confirm/cancel labels, busy/disabled behavior, test hooks, and mobile drawer behavior remain compatible
- which Inspection-specific CSS classes must become generic without altering rendered layout

Exclude rich forms, workflow dialogs, and Team deletion flows whose content or action model is materially different.

#### Task 7.2 — Responsive record collection comparison

Compare the five production manual compositions and the zero-import legacy candidate:

- `src/views/staff/leave-management/components/HolidaysTab.js`
- `src/views/staff/leave-management/components/OvertimeRecordsTab.js`
- `src/views/staff/leave-management/components/LeaveRecordsSection.js`
- `src/views/staff/leave-management/components/AssignmentsTab.js`
- `src/views/staff/salary-claims-management/components/SalarySettingsTab.js`
- `src/views/staff/leave-management/components/RecordsTab.js`

Compare them against `ResponsiveRecordCollection`, including filters, loaders, empty states, desktop rendering, mobile sections, footer placement, selection, grouping, bulk actions, and action availability.

Classify each file independently. Do not expand `ResponsiveRecordCollection` with domain flags merely to make all six appear compatible.

#### Task 7.3 — Page and collection states

Compare `PageState`, `TableLoader`, and the state behavior inside `ResponsiveRecordCollection` with true page-level and collection-level loading, error, and empty implementations.

Exclude compact dashboard cards, validation feedback, toasts, inline operation states, modal details, camera/scanner states, and messages whose wording conveys domain meaning.

Add a compact named variant only if at least two semantically equivalent embedded-state consumers need it.

#### Task 7.4 — Zero-import confirmation

Perform a final import, export, lazy-load, route, test, and stylesheet search for:

- `src/components/PwaInstallBanner.js`
- `src/views/overtime/components/GroupedHeaderLabels.js`
- `src/views/payroll/components/ClaimTypeSwitch.js`
- `src/views/staff/leave-management/components/RecordDetailCard.js`
- `src/views/staff/leave-management/components/RecordsTab.js`
- the unused default component in `DashboardHeader.js`

Assign one of: intentionally dormant, product decision required, helper split required, or safe removal candidate. No deletion occurs on Day 7.

#### Task 7.5 — Secondary candidate disposition

Record, but do not yet implement, decisions for:

- attachment preview presentation shell versus domain-owned controllers
- page-level or section-level create actions versus inline “add item” controls
- status definitions that truly share meaning versus domain-owned statuses
- compatibility façades whose removal is import cleanup rather than component consolidation

### Day 8 — Focused Style-Source Audit

Audit styles only for the two or three families likely to proceed. Record findings in the pattern matrix.

#### Task 8.1 — Lock the evidence baseline

- Confirm the worktree is clean and record `a0cd8ed` as the unchanged application-source baseline; record the then-current documentation commit separately.
- Re-run exact consumer searches for `ActionConfirmModal`, `UserConfirmModal`, `ResponsiveRecordCollection`, `MobileRecordList`, `PageState`, and `TableLoader`.
- Confirm no application source changed during Days 6–7.
- Treat count changes as new evidence that must be reconciled before continuing.

Output: a short Day 8 baseline subsection appended to `FRONTEND_COMPONENT_REUSE_PATTERN_MATRIX_2026-08-04.md`.

#### Task 8.2 — Map confirmation-shell style dependencies

Inspect together:

- `src/views/shared/ActionConfirmModal.js`
- `src/components/users/UserConfirmModal.js`
- `src/components/MobileBottomDrawer.js`
- `src/scss/features/inspection/core/_setup-drawers.scss`
- `src/scss/components/_touch-targets.scss`
- `src/scss/style.scss`

Record every selector that affects the generic confirmation shell, including:

- `mobile-bottom-drawer*`
- `inspection-mobile-setup-drawer*`
- `inspection-mobile-detail-drawer-body`
- `inspection-equipment-detail-drawer-body`
- `mobile-bottom-drawer--confirm`

For each selector, record its source file, computed purpose, current value, other consumers, and whether it is generic, an Inspection compatibility alias, or genuinely Inspection-specific. Pay particular attention to body padding, body gap, footer margin, drawer height, scrolling, phone breakpoint, touch targets, focus presentation, and z-index.

Decision required: identify the smallest generic selector set and canonical SCSS location. A likely destination is a component-level stylesheet, but Day 8 must verify load order and existing ownership before naming it canonical.

#### Task 8.3 — Map responsive-collection style ownership

Inspect:

- `ResponsiveRecordCollection.js`
- `MobileRecordList.js`
- `RecordCard.js`
- `DataTableFooter.js`
- the five live manual consumers from the Day 7 matrix
- relevant rules in `foundation/_base.scss`, `components/_workflow-module.scss`, `components/_mobile-workflow-home.scss`, and CoreUI responsive utilities

Record:

- which component owns `d-md-none` and `d-none d-md-*` behavior
- whether the mobile/desktop switch occurs at one consistent breakpoint
- card/list spacing and grouped-section spacing
- desktop table shell classes repeated by consumers
- footer grid behavior and touch-target rules on small screens
- whether any shared selector depends on a workflow, report, or Inspection ancestor

Do not propose a universal table shell. The audit may recommend a semantic class only when it replaces an identical repeated presentation rule without taking over table behavior.

#### Task 8.4 — Map state-presentation style ownership

Inspect `PageState`, `TableLoader`, their production contexts, `.icon-spin`, typography utilities, alert styling, and current minimum heights.

Record separately:

- loading: spinner animation, reduced-motion handling, status announcement, and height
- empty: icon, message hierarchy, action placement, and height
- error: CoreUI alert, `role="alert"`, title/message/action spacing

Confirm whether existing utility classes and tokens are sufficient. Do not add a compact variant or new token unless at least two equivalent consumers require it.

#### Task 8.5 — Produce the proposed style change set

Append to the pattern matrix:

- selectors to keep unchanged
- selectors to move or duplicate temporarily as compatibility aliases
- generic selectors to add
- old selectors eligible for later removal and their remaining consumers
- exact `style.scss` load-order requirement
- expected visual delta, which should normally be “none” for the confirmation foundation
- leakage and rollback risks

No SCSS or component file is edited on Day 8.

#### Day 8 acceptance gate

- Every cross-domain selector used by the three priority families has an owner.
- Inspection aliases are distinguished from genuinely Inspection-specific rules.
- Proposed generic selectors preserve current computed behavior.
- No broad selector, reset, token redesign, or unrelated responsive change is proposed.
- The pattern matrix identifies exact later source edits and rollback selectors.
- The worktree contains documentation changes only.

### Day 9 — Contract Decisions

Approve at most three contracts. Each approved contract must state:

- stable purpose and intended consumers
- exact required and optional props
- named variants and why each is semantically stable
- deliberately unsupported customization
- normal and applicable non-happy-path behavior
- mobile/desktop and accessibility behavior
- current defaults that must remain compatible
- test cases, compatibility adapter, migration order, and rollback boundary

Expected decision order:

1. canonical confirmation shell
2. responsive record collection adoption rules
3. page/collection state adoption rules

Attachment preview can replace the third item only if the shell/controller boundary is clearer and lower risk. Create-action, status, and compatibility-façade work should remain deferred unless the matrix identifies a stronger bounded opportunity.

Contract rejection is a valid outcome. Keep implementations separate if consumer differences require hidden branching or domain-specific props.

#### Task 9.1 — Approve the canonical confirmation contract

Review and either approve or narrow this proposed contract:

| Concern | Proposed contract |
| --- | --- |
| Purpose | Plain cancel/confirm action prompt only |
| Required behavior | Controlled visibility, title/message, cancel then confirm actions, guarded close, responsive modal/drawer |
| Candidate props | `visible`, `title`, `message`, `confirmLabel`, `confirmColor`, `cancelLabel`, `confirmDisabled`, `cancelDisabled`, `mobileDrawer`, `mobileDrawerQuery`, `testId`, `bodyTestId`, `onClose`, `onConfirm` |
| Content | `message` accepts text or a React node but the component does not interpret it |
| Responsive behavior | Centered modal above the phone breakpoint; `MobileBottomDrawer` below it when enabled |
| Unsupported | API calls, permission checks, loading state ownership, workflow declarations, arbitrary portals, z-index control, and domain-specific styling |
| Compatibility | Old `src/views/shared/ActionConfirmModal` path re-exports the canonical component; `UserConfirmModal` remains until its consumers migrate |

Explicitly decide:

- whether `bodyTestId` belongs in the canonical contract or remains adapter-only
- whether test IDs standardize on the root element even though `UserConfirmModal` currently places one on the desktop header
- whether busy text remains caller-owned through `confirmLabel` plus disabled props
- whether unused `zIndex`, `style`, and `className` props are rejected rather than preserved speculatively

Required test contract:

- initially closed desktop and mobile cases
- desktop modal and mobile drawer selection
- default and custom mobile breakpoint
- string and React-node content
- cancel and confirm callbacks
- confirm-disabled and cancel-disabled behavior, including close controls
- stable test hooks
- accessible title/label and focus return provided by the shared primitives
- absence of Inspection-specific classes from the canonical shell

#### Task 9.2 — Approve responsive collection adoption rules

Keep the existing component compositional. Decide only:

- whether to add generic `loadingMessage` and, only if evidenced, `loadingMinHeight`
- whether simple string empty messages always receive `PageState`
- whether action-bearing empties must be passed as an explicit `PageState` element
- where consumer-owned overlay modals render relative to the collection
- whether desktop-only controls belong inside `renderDesktop` to preserve visual and DOM order

Reject props for filters, sorting, selection, groups, bulk actions, table columns, API errors, retry controllers, permissions, or domain workflows.

Required contract tests:

- loading takes precedence over empty/content
- empty takes precedence over mobile/desktop/footer content
- string empty message uses `PageState`
- element empty message is preserved
- children, mobile sections, desktop render, and footer appear in the documented order
- mobile variant passes through unchanged
- any approved loading message/minimum height passes to `TableLoader`

#### Task 9.3 — Approve page/collection state rules

The expected decision is to reuse `PageState` and `TableLoader` without creating another state component.

Define:

- which collection empties adopt the standard 160-pixel minimum height
- when the consumer may supply a different documented minimum height
- when an empty action uses `PageState.action`
- which embedded, modal, dashboard, chat, validation, and inline states remain local
- whether any visible consistency change is approved for the selected pilots

#### Task 9.4 — Write the compatibility and test map

For each approved contract, record:

- canonical file
- old import paths and current consumer counts
- adapter behavior
- unchanged defaults
- focused tests to create or update
- affected consumer tests
- removal condition
- implementation and rollback commit boundaries

#### Day 9 acceptance gate

- No approved prop represents a business domain.
- No contract requires more than two stable presentation variants.
- Unsupported behavior is explicit.
- Existing defaults and adapter mappings are unambiguous.
- Mobile, accessibility, standard states, tests, and rollback are contractual.
- Rejected candidates remain local with a written reason.

### Day 10 — Review, Backlog, and Pilot Gate

Review the matrix and select two pilots:

- Pilot 1: a straightforward consumer with a small diff and existing or easily added characterization tests
- Pilot 2: a responsive or workflow-sensitive consumer with meaningful direct test coverage

The confirmation family is the preferred shared-foundation batch. Day 7 found that `OvertimeRecordsTab` fits the existing collection contract and has direct tests, but Day 10 must still compare its workflow risk with the lower-risk `HolidaysTab` and the alternative `LeaveRecordsSection` candidate.

Before Stage 3 begins, record:

- exact files for both pilots
- current behavior that tests protect
- approved visual consistency changes, if any
- files explicitly excluded from each batch
- commit and rollback boundaries

#### Task 10.1 — Challenge the abstractions

Re-read the Day 8 style map and Day 9 contracts against representative consumers. Reject or narrow a contract when:

- a consumer-specific flag is required
- DOM order, focus, action availability, or wording would change unexpectedly
- the shared layer would need permission, API, selection, or workflow knowledge
- a compatibility adapter cannot preserve the current import behavior
- the proposed source diff cannot be reviewed and rolled back independently

#### Task 10.2 — Select the confirmation canary

Rank these candidates using diff size, current coverage, number of confirmation instances, and business impact:

- `ChatThread`: one simple delete confirmation; small source diff but characterization coverage must be added
- `StaffActionModals`: two confirmations; test identifiers must remain stable
- `UserManagement`/`UserActionModals`: strong row-action coverage but many confirmation instances
- `UserProfile`: strong delete-flow coverage but many account actions and higher impact

Select one canary only. Record why the others remain on the later migration backlog.

#### Task 10.3 — Select the responsive pilot

Rank:

- `HolidaysTab`: lowest structural risk; direct tests exist but need explicit loading/empty/mobile assertions
- `OvertimeRecordsTab`: strongest complex-pilot coverage; selection, grouping, pagination, actions, and workflow modal must remain unchanged
- `LeaveRecordsSection`: strong workflow coverage; mode-dependent bulk behavior increases scope
- `AssignmentsTab`: two desktop table variants and mobile detail behavior increase structural risk
- `SalarySettingsTab`: defer until characterization exists and the loading-message decision is settled

Choose one straightforward collection pilot and one later complex pilot, or record why the confirmation canary satisfies the straightforward-pilot slot. Do not select a file merely to meet a quota.

#### Task 10.4 — Freeze the implementation backlog

For each selected canary/pilot, record:

- exact source and test files
- current import path
- current loading, empty, normal, disabled, mobile, and desktop behavior
- callbacks, labels, test IDs, DOM-order constraints, and actions that must not change
- approved visual consistency changes
- targeted commands
- files excluded from the diff
- implementation commit and one-command Git revert boundary

Create no application source changes on Day 10.

#### Day 10 acceptance gate

- Day 8 style decisions and Day 9 contracts are complete in the pattern matrix.
- One confirmation canary and the two pilot slots have explicit dispositions.
- Every selected item has sufficient existing tests or a characterization-test task before refactoring.
- Exact source, test, style, compatibility, and rollback files are named.
- The Stage 2 exit criteria below pass without exception.

### Stage 2 Exit Gate

Stage 3 may begin only when:

- every candidate has an evidence-backed disposition
- no approved shared contract contains business rules
- the confirmation and collection boundaries include mobile and accessibility behavior
- both pilots and their targeted tests are named
- removal candidates have explicit verification and deletion conditions
- the working tree contains no application-source changes from the audit stage

If any condition fails, keep Stage 2 active and narrow or defer the affected candidate.

## 6. Stage 3 — Days 11–20: Foundation and Two Pilots

The exact source edits depend on the Day 9 decisions. The sequence below is authorized only for contracts approved at the Stage 2 exit gate.

### Days 11–13 — Shared Foundation Batch

Preferred batch: canonical confirmation shell.

### Day 11 — Baseline and Canonical Component

#### Task 11.1 — Reconfirm the implementation baseline

- Require a clean worktree at the approved Day 10 documentation revision.
- Re-run exact production importer and render-instance searches.
- Run the existing confirmation component test and the selected canary's current tests before editing.
- Record unexpected failures as baseline failures; do not repair unrelated tests in this batch.

#### Task 11.2 — Add the canonical component safely

Implement only the Day 9-approved contract:

- add `src/components/ActionConfirmModal.js`
- preserve the existing default title, message, button order, colors, disabled behavior, mobile breakpoint behavior, and callbacks
- use generic Day 8-approved classes
- keep `src/views/shared/ActionConfirmModal.js` as a re-export or thin compatibility wrapper
- do not rewrite its 31 current importer paths in this batch
- do not change `UserConfirmModal` yet

If Day 8 requires a new generic stylesheet, add one narrowly scoped component stylesheet and load it at the approved position. Retain old selectors as compatibility aliases while other consumers still require them.

#### Task 11.3 — Review the source diff before tests

Confirm:

- no consumer, API, route, permission, state, persistence, or dependency file changed
- no domain-specific prop entered the canonical component
- old import behavior resolves to the same default export
- SCSS selectors cannot affect unrelated modal/drawer consumers

Day 11 stop condition: if compatibility requires changing all old importers together, restore the previous structure and return to Day 9.

### Day 12 — Contract Tests and Compatibility Proof

#### Task 12.1 — Add focused canonical tests

Create or relocate tests according to the Day 9 map. Cover every approved contract case, not implementation internals. Keep a small old-path compatibility test so future cleanup cannot silently break existing imports.

#### Task 12.2 — Validate styles and accessibility

- Assert the canonical mobile shell uses the approved generic class and no Inspection body class.
- Verify cancel-disabled prevents close from cancel, header close, backdrop/Escape, and drawer close paths that the primitives expose.
- Verify accessible button names and dialog/drawer title.
- Verify focus return for the mobile drawer without duplicating CoreUI's internal test suite.
- Confirm reduced-motion behavior still applies to loading icons if a shared state stylesheet was touched.

#### Task 12.3 — Run focused validation

Run:

- canonical confirmation tests
- old-path compatibility test
- existing `ActionConfirmModal` tests if retained separately
- ESLint for changed JavaScript and JSX files
- `npm run build` at the Days 11–13 gate when a stylesheet or `style.scss` entry changes

Command shapes, finalized with the Day 10-selected filenames:

```text
npx eslint <changed JavaScript and JSX files>
npx vitest run <canonical test> <old-path compatibility test> <selected canary test>
npm run build
```

The build command is conditional on CSS/build-input changes during this batch; the focused tests and changed-file lint are mandatory.

Do not run or modify unrelated suites merely to inflate evidence.

Day 12 stop condition: any default behavior, callback, disabled close path, focus behavior, or computed style differs without explicit Day 9 approval.

### Day 13 — Canary Migration and Foundation Gate

#### Task 13.1 — Characterize the selected canary

If Day 10 selected a canary without direct confirmation coverage, add the characterization test first and verify it fails only when the protected behavior is intentionally disturbed.

Protect:

- exact title and message
- cancel and confirm results
- destructive/positive color semantics
- disabled/loading lock
- test identifier where relied upon
- desktop and mobile access

#### Task 13.2 — Migrate one canary only

- Change only the selected consumer's import from `UserConfirmModal` to the canonical component.
- Map existing props without changing the caller's state or handler code.
- Do not convert `UserConfirmModal` into a wrapper yet, because that would switch all five importers and 20 render instances at once.
- Do not migrate adjacent confirmations in other files.

#### Task 13.3 — Validate and review

Run canonical/compatibility tests and the selected consumer tests. Then search for:

- remaining `UserConfirmModal` importers
- old `src/views/shared/ActionConfirmModal` importers
- Inspection-named classes in the new canonical component
- unapproved source or style files in the diff

Review the API after the real consumer. If the canary exposes a genuine semantic difference, revert only the canary commit and revise or reject the contract; do not add a domain flag immediately.

#### Days 11–13 commit boundaries

1. canonical component, old-path compatibility, generic styles, and focused tests
2. selected confirmation canary migration and its characterization/consumer tests
3. Stage 3 execution-record update only after validation

Do not combine canonical relocation, all consumer import rewrites, `UserConfirmModal` deletion, dormant-component cleanup, and responsive collection work.

#### Days 11–13 validation gate

- Focused confirmation and compatibility tests pass.
- Selected consumer tests pass before and after migration.
- Old import paths remain operational.
- Remaining `UserConfirmModal` consumers are listed, not silently switched.
- No confirmed visual or functional behavior changed outside the Day 8–10 approvals.
- No Inspection-specific class remains in the new canonical component.
- The diff contains no backend, API, route, permission, persistence, dependency, generated build, or unrelated formatting change.
- Rollback can restore the canary without removing the canonical component.

Stop if the component starts accepting user-, payroll-, inspection-, or workflow-specific props.

### Days 14–16 — Pilot 1: Straightforward Migration

Migrate the selected low-risk consumer to the approved component contract.

Required checks:

- characterize untested current behavior before editing
- preserve copy, callbacks, action order, disabled/loading behavior, and responsive access
- keep data and permission decisions in the consumer
- search for superseded local imports and styles after the migration
- run the shared-component tests and affected consumer tests

Do not broaden the migration to adjacent modules simply because they are in the same file tree.

### Days 17–19 — Pilot 2: Responsive or Workflow-Sensitive Migration

Migrate the selected responsive record consumer only if its Day 7 disposition is “reuse as-is” or “improve existing” with a bounded contract.

Required checks:

- preserve filtering, sorting, pagination, selection, grouping, bulk actions, row actions, and empty/loading wording
- ensure every desktop action remains available on mobile
- preserve table semantics and existing privacy or permission restrictions
- verify keyboard interaction and modal/drawer focus where applicable
- run `ResponsiveRecordCollection` tests and the pilot module’s direct tests

If the pilot needs consumer-specific flags or render branches beyond the approved contract, restore the prior composition and record it as an intentional domain implementation.

### Day 20 — Full Checkpoint

Run and record:

- full lint
- complete unit suite
- applicable repository audits already used by the project
- production build
- final import searches for old paths and removed candidates
- diff review for business behavior, CSS leakage, unrelated formatting, and dependency changes

Compare both pilots with their recorded pre-migration behaviors on desktop and mobile. Any unapproved behavior difference blocks completion even if automated checks pass.

### Stage 3 Exit Gate

Stage 3 is complete only when:

- the approved shared contracts have focused tests
- two representative consumers are migrated, or a documented pilot failure proves that one should remain domain-specific
- no confirmed route, permission, API, calculation, persistence, or workflow behavior changed
- compatibility wrappers list their remaining consumers and removal condition
- superseded code is either safely removed or explicitly retained
- full checkpoint validation passes
- the Stage 3 execution record contains commands, outcomes, residual risks, and rollback commits

## 7. Validation Matrix

| Work item | During implementation | Batch completion |
| --- | --- | --- |
| Pattern matrix and contract decisions | Link, path, import-count, and diff checks | Stage 2 exit review |
| Confirmation foundation | Focused component tests; lint changed files | Affected consumer tests |
| Straightforward pilot | Shared component and direct consumer tests | Import/style cleanup search |
| Responsive pilot | `ResponsiveRecordCollection` and direct module tests | Desktop/mobile behavior review |
| Day 20 checkpoint | Full lint and unit suite | Audits and production build |

Existing likely regression anchors include:

- `src/views/shared/__tests__/ActionConfirmModal.test.jsx`
- `src/components/__tests__/uiDebtPrimitives.test.jsx`
- `src/components/__tests__/DataTableFooter.test.jsx`
- `src/views/staff/leave-management/components/__tests__/OvertimeRecordsTab.test.jsx`
- salary and claim record-tab tests under `src/views/staff/salary-claims-management/components/__tests__/`

Test filenames are anchors, not proof of coverage. Read assertions before relying on them and add characterization tests when the intended behavior is absent.

## 8. Commit and Rollback Boundaries

Preferred sequence:

1. Stage 2 matrix and decision record
2. canonical component plus compatibility adapters and focused tests
3. Pilot 1 migration
4. Pilot 2 migration
5. verified dead-code or old-style removal
6. Stage 3 execution record and checkpoint evidence

Do not combine a canonical move, all consumer import rewrites, and deletion of the old path in one commit.

For a regression:

- revert the affected pilot commit first
- retain or restore the compatibility wrapper when other consumers use the new canonical component
- revert the shared-foundation commit only when its contract itself is defective
- rerun focused shared and affected consumer tests after rollback
- do not revert unrelated completed upgrade work

## 9. Immediate Next Action

Begin Day 11 at the approved Stage 2 exit boundary: establish the focused confirmation baseline, add the canonical component behind the existing shared import path, and apply only the generic styles approved in the pattern matrix.
