# Frontend Component Reuse Execution Plan

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Baseline revision:** `0bc64a4`  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Scope:** Stage 2 Days 7–10 and Stage 3 Days 11–20  
**Status:** In progress — Day 7 complete; Day 8 pending  
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

Required checks:

- generic ownership for confirmation modal and drawer classes
- responsive collection desktop/mobile visibility and spacing rules
- loading, empty, and error-state tokens and semantic classes
- selector scope, breakpoint source, z-index behavior, and possible leakage

Do not create a general token redesign, CSS inventory, or reset. The output is a list of canonical existing sources and narrowly required renames or additions.

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

### Day 10 — Review, Backlog, and Pilot Gate

Review the matrix and select two pilots:

- Pilot 1: a straightforward consumer with a small diff and existing or easily added characterization tests
- Pilot 2: a responsive or workflow-sensitive consumer with meaningful direct test coverage

The current evidence makes the confirmation family the preferred shared-foundation batch. `OvertimeRecordsTab` is a candidate for the responsive pilot because it has direct tests, but it must be selected only if Day 7 proves its selection, grouping, action, and responsive behavior fit the existing collection contract.

Before Stage 3 begins, record:

- exact files for both pilots
- current behavior that tests protect
- approved visual consistency changes, if any
- files explicitly excluded from each batch
- commit and rollback boundaries

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

Safe sequence:

1. Capture a fresh complete consumer list and current test baseline.
2. Add or improve the canonical general component without changing existing import paths.
3. Replace domain-specific class naming with scoped generic classes while preserving computed behavior.
4. Keep `src/views/shared/ActionConfirmModal.js` as a compatibility re-export or thin wrapper if its canonical implementation moves.
5. Keep `UserConfirmModal` as a compatibility wrapper for any bounded stacked-modal option until its consumers are individually reviewed.
6. Add focused tests for desktop and mobile rendering, confirm/cancel callbacks, React-node content, busy/disabled behavior, focus/keyboard behavior supported by the underlying library, and the stacked case if approved.
7. Migrate no more than one representative consumer before reviewing the API.

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

Continue with Day 8's focused style-source audit for the confirmation shell, responsive record collection, and page/collection state families. Append the findings to `FRONTEND_COMPONENT_REUSE_PATTERN_MATRIX_2026-08-04.md`. Do not edit application source until the Stage 2 exit gate is satisfied.
