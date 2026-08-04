# Frontend Component Reuse Stage 4 Actions and Status Plan

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Starting revision:** `cee1d0a`  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Prior checkpoint:** `FRONTEND_COMPONENT_REUSE_STAGE_4_DATA_LISTS_EXECUTION_2026-08-04.md`  
**Scope:** Stage 4 Days 29–32 — actions, status, and workflow presentation only  
**Status:** Planned; Days 29–32 application source work has not started  
**Authorization boundary:** Local, behavior-preserving frontend work only; no deployment, GitHub Actions, backend, API, route-definition, permission, persistence, dependency, status-definition, or workflow-transition changes

## 1. Purpose

This plan covers the third Stage 4 pattern-family batch: create/add actions, form action groups, button loading presentation, row actions, record-state badges, workflow summaries, approval-gate presentation, confirmation shells, edit controls, and bulk-selection action bars.

The objective is to consolidate only controls with the same purpose, appearance, callback contract, disabled behavior, and responsive placement. It is not to centralize business actions, invent a universal status system, rename statuses, redesign workflow controls, or move permissions and transitions into shared components.

Existing shared adoption is already broad. A no-change result is acceptable when apparent duplicates have different business meaning or interaction context.

## 2. Required Outcomes

By the end of Day 32:

- every apparent action/status/workflow bypass reviewed in this batch has a documented disposition
- button purpose, type, label, icon, appearance, callback arguments, disabled reason, loading lock, and responsive placement are captured for shortlisted actions
- status labels, colors, icons, fallbacks, and domain ownership are classified before any badge reuse
- permission, approval, transition, validation, confirmation, and workflow decisions remain in their current domain owners
- no global shared component gains user-, leave-, payroll-, report-, inspection-, or workflow-specific branching
- at most one exact two-consumer presentation pair is migrated unless Day 29 proves a smaller one-consumer adoption opportunity
- characterization passes against untouched source before production edits
- focused validation passes for every changed component and consumer
- the execution outcome, deferrals, rollback boundary, and readiness for Days 33–36 are recorded

## 3. Frozen Scope

### 3.1 In scope

Shared presentation primitives and their focused tests:

- `src/components/CreateActionButton.js`
- `src/components/FormActionGroup.js`
- `src/components/ButtonLoader.js`
- `src/components/RowActions.js`
- `src/components/RowActionCell.js`
- `src/components/RecordStateBadge.js`
- `src/components/WorkflowStatusSummary.js`
- `src/components/ApprovalGates.js`
- `src/components/ActionConfirmModal.js`
- `src/components/EditControls.js`
- `src/components/BulkSelectionActionBar.js`
- `src/components/report-workflow/WorkflowStageActions.js`
- `src/components/workflow/WorkflowDetailActions.js`
- applicable direct tests and assertions in `uiDebtPrimitives.test.jsx`, `RowActions.test.jsx`, workflow primitive suites, and affected consumer suites

The preliminary feature-local pilot may include:

- `src/views/users/CreateStaffForm.js`
- `src/components/users/UserRoleModal.js`
- a smallest-possible user-domain Add Assignment presentation component
- direct characterization for both consumers and the extracted presentation

Documentation in scope:

- this plan
- a Days 29–32 execution record under `upgrade-works/`
- master plan and directory-index status updates

### 3.2 Explicitly out of scope

- permission checks, role policy, module activation, or action visibility decisions
- status values, normalization, colors with business meaning, labels, transition states, or database fields
- approval-stage definitions, workflow ordering, gates, recommendations, declarations, or sign-off rules
- API calls, payloads, state persistence, calculations, exports, navigation, or backend behavior
- confirmation wording with legal, safety, destructive, payroll, or workflow meaning
- changing button purpose, order, type, color, icon, label, callback arguments, or disabled reason merely for visual consistency
- adding loading spinners where an existing text-only compact state is intentional
- replacing inline form-row Add controls, icon-only tools, repeatable-field controls, or mobile workflow actions with page-level create buttons
- merging Leave `StatusBadge`, Team `StatusPill`, Inspection semantics, workflow summaries, and `RecordStateBadge` into one universal status component
- converting workflow-specific action components into generic action arrays
- deleting `UserConfirmModal`, compatibility façades, or dormant exports; zero-use cleanup belongs to Stage 5
- new dependencies, framework/CoreUI changes, global CSS redesign, GitHub Actions, build configuration, or deployment work
- repository-wide formatting, naming cleanup, or unrelated refactors

## 4. Existing Shared Contracts

### 4.1 `CreateActionButton`

Current stable responsibility:

- inline, section-primary, and page-primary create/add presentation
- caller-owned label, icon, disabled state, importance, size, classes, and click behavior
- default Plus icon and accessible name
- removal of click handling while disabled

Do not change its defaults to absorb secondary-outline form-row Add controls. Its current adoption is too broad for a consumer-specific appearance change.

### 4.2 `FormActionGroup`

Current stable responsibility:

- group caller-owned leading and action content
- in-flow, sticky, compact-sticky, and legacy mobile behaviors
- status-message presentation, spacer management, alignment, and group semantics

It must not decide which business action is available, primary, destructive, or permitted.

### 4.3 `ButtonLoader`

Current stable responsibility:

- compact spinning Loader icon plus caller-owned loading label
- caller-owned button type, disabled lock, submission prevention, and final label

Do not bulk-replace text-only `Saving…`, `Deleting…`, or `Processing…` states when adding an icon or wrapper would change density or semantics.

### 4.4 Row-action primitives

`RowActions` owns an accessible overflow menu, portal behavior, non-bubbling interactions, one-menu-at-a-time visibility, disabled reasons, and caller callbacks. `RowActionCell` owns table-cell placement. Row navigation, permission filtering, action ordering, destructive confirmation, and workflow rules remain caller-owned.

### 4.5 Status and approval presentation

- `RecordStateBadge` is intentionally narrow: draft, published, and queued record state.
- `WorkflowStatusSummary` presents caller-owned status/next-action text and optional approval gates.
- `ApprovalGates` presents caller-built gates against caller-owned approval history.

Do not broaden these components to interpret Leave, Overtime, Payroll, Team scheduling, Inspection lifecycle, or report-workflow states.

### 4.6 Confirmation, edit, and bulk-action presentation

- `ActionConfirmModal` provides a common confirmation shell while callers own copy, severity, loading, and action behavior.
- `EditControls` owns edit/save/cancel presentation and loading display while callers own data and validation.
- `BulkSelectionActionBar` presents caller-owned selection text and actions without owning selection or workflow state.

## 5. Preliminary Evidence Snapshot

The 2026-08-04 planning scan found:

| Primitive                |               Production import evidence | Preliminary interpretation                                               |
| ------------------------ | ---------------------------------------: | ------------------------------------------------------------------------ |
| `CreateActionButton`     | 51 importers including the barrel export | Strong adoption; manual Plus buttons require contextual review           |
| `FormActionGroup`        |                             15 consumers | Existing action-layout foundation is broadly reused                      |
| `ButtonLoader`           |                             30 consumers | Loading presentation is shared where an icon-and-label state is intended |
| `RowActions`             |                             28 consumers | Strong table/card action adoption                                        |
| `RowActionCell`          |                             14 consumers | Strong table placement adoption                                          |
| `RecordStateBadge`       |                              3 consumers | Deliberately narrow record-state vocabulary                              |
| `WorkflowStatusSummary`  |  9 importers including the barrel export | Workflow labels/gates remain caller-defined                              |
| `WorkflowStageActions`   |                              5 consumers | Report/Inspection stage flows already share a presentation contract      |
| `ApprovalGates`          |                             14 consumers | Approval history meaning remains domain-owned                            |
| `ActionConfirmModal`     |                             32 consumers | Stage 3 already established canonical shell ownership                    |
| `EditControls`           |                             15 consumers | Strong settings/profile adoption                                         |
| `BulkSelectionActionBar` |                              4 consumers | Correctly limited to bulk-capable management views                       |

These are planning counts, not targets. Day 29 must regenerate exact production-only file lists from `cee1d0a` and distinguish barrel/compatibility imports from rendered consumers.

Manual searches also found:

- most Plus buttons outside `CreateActionButton` add an item inside a form, workflow step, icon toolbar, or repeatable list rather than creating a module record
- many text-only loading labels occur in compact or specialized controls where `ButtonLoader` would alter markup
- status badges are distributed across Leave, Team, Inspection, Payroll, Reports, notifications, and dashboards with different status vocabularies

## 6. Decision Rules

Classify each candidate as one of:

1. **Reuse as-is** — an existing component preserves the exact contract.
2. **Extract feature-local presentation** — two consumers in one domain have the same control, but changing a global component would be broader than the value.
3. **Improve existing** — a generic capability is required by at least two current consumers and does not change existing defaults.
4. **Retain specialized** — purpose, semantics, placement, or callback behavior differs.
5. **Defer/remove later** — the work depends on another decision or proven zero-use cleanup.

Feature-local reuse is preferred over a new global prop when the repeated control has one domain purpose. A feature-local component must not own business state merely because its name is domain-specific.

## 7. Preliminary Candidate Matrix

| Candidate                             | Evidence                                                                             | Risk                        | Day 29–30 question                                                                               | Default position           |
| ------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------- |
| Create Staff Add role assignment      | Secondary-outline small button, Plus 14, disabled during submission, direct callback | Low–medium                  | Is it presentation-identical to Manage User Roles apart from label?                              | Strongest pilot pair       |
| Manage User Roles Add assignment      | Same purpose, appearance, icon, disabled condition, and callback contract            | Low–medium                  | Can a feature-local component preserve type, event forwarding, name, location, and loading lock? | Strongest pilot pair       |
| Global `CreateActionButton` extension | Could theoretically add a secondary-outline variant                                  | High blast radius           | Is a new global appearance justified for only one domain pair?                                   | Reject by default          |
| Approval Rules Add Rule               | Similar secondary-outline Plus button but edits a rule collection inside settings    | Medium                      | Does it share role-assignment purpose or only visual styling?                                    | Retain local               |
| Repeatable/form-row Add controls      | Numerous Add row/objective/reference/item controls                                   | High false-abstraction risk | Are these record creation actions? No                                                            | Retain form/workflow-local |
| AI Helper New Chat                    | Icon-only toolbar action with tooltip                                                | High false-abstraction risk | Is it a labeled create button? No                                                                | Retain feature-specific    |
| Text-only loading labels              | Manual Saving/Deleting/Processing text in specialized controls                       | Medium                      | Would `ButtonLoader` preserve density, icon presence, and accessible output?                     | No bulk migration          |
| Leave `StatusBadge`                   | Domain map from leave status to CoreUI color                                         | High semantic risk          | Does draft/published/queued mean the same thing? No                                              | Retain Leave-owned         |
| Team `StatusPill`                     | On-duty/next/unscheduled schedule meaning and custom dot presentation                | High semantic risk          | Is it a record-state badge? No                                                                   | Retain Team-owned          |
| Inspection/status badges              | Lifecycle, compliance, upload, offline, and review meanings                          | High semantic risk          | Can meaning move without domain rules? No                                                        | Retain Inspection-owned    |
| Workflow summaries/actions            | Existing shared presentation plus domain-built labels/actions                        | High workflow risk          | Is any duplicate only presentation? Audit, do not merge controllers                              | Retain current boundaries  |
| Confirmation components               | Canonical shell widely adopted; local wrappers carry business copy and flow          | High wording/workflow risk  | Is a wrapper genuinely obsolete and unreferenced?                                                | Defer cleanup to Stage 5   |

The matrix authorizes investigation only. Day 30 may reject the role-assignment pair if characterization finds different type, callback, focus, or form-submission behavior.

## 8. Day 29 — Inventory and Behavior Classification

### Task 29.1 — Reconfirm the starting boundary

1. Confirm `HEAD` is at or descended from `cee1d0a`.
2. Record `git status --short` and stop for overlapping unrelated edits.
3. Confirm generated builds and temporary evidence are not staged.
4. Re-read the Days 25–28 execution record and Stage 3 confirmation-shell decisions.

### Task 29.2 — Regenerate usage evidence

Record production-only file lists for:

- every primitive in Section 3.1
- manual Plus/create/add buttons outside `CreateActionButton`
- local form action rows outside `FormActionGroup`
- loading labels/spinners outside `ButtonLoader`
- manual row overflow/action menus outside `RowActions`
- status `CBadge`, pill, dot, and local mapping implementations
- local workflow summaries, gate displays, and stage action rows
- confirmation wrappers and compatibility façades
- edit/save/cancel clusters outside `EditControls`
- selection/bulk action bars outside `BulkSelectionActionBar`

Exclude tests from production counts but list focused and integration coverage separately.

### Task 29.3 — Capture candidate contracts

For every shortlisted candidate, record:

- user purpose and domain
- label, accessible name, tooltip, icon, size, color, variant, type, and classes
- callback arguments and event propagation
- disabled/hidden/loading conditions and reasons
- placement in a form, modal, page header, table row, mobile toolbar, or workflow stage
- focus and keyboard behavior
- permission and workflow ownership
- existing tests and missing characterization
- final disposition from Section 6

For statuses, additionally record vocabulary, normalization, fallback, color/icon meaning, and authoritative owner.

### Day 29 gate

Day 29 passes when candidates are classified by purpose and semantic ownership, not by common labels, Plus icons, badge shapes, or colors.

## 9. Day 30 — Contract Review and Pilot Approval

### Task 30.1 — Audit shared tests

Confirm current tests protect:

- create-button importance, accessible name, disabled behavior, and default icon
- FormActionGroup mobile behaviors, group semantics, leading content, status, and spacer
- ButtonLoader label/icon presentation where used
- RowActions portal, event containment, disabled reason, and callback behavior
- record-state fallback and label override
- workflow status/next-action ordering and gate presentation
- WorkflowStageActions loading locks, feedback, primary/back/reset/save behavior, and mobile placement
- confirmation shell loading and confirm/cancel behavior

Do not change production code to make missing tests pass. Add characterization to the untouched implementation first.

### Task 30.2 — Evaluate the role-assignment pair

Characterize both consumers for:

- `type="button"` behavior inside and outside a form
- exact secondary outlined small appearance
- Plus icon size and spacing
- label and accessible name
- disabled behavior under loading/submission
- click event forwarding and callback count
- action location relative to role rows
- no accidental form submission

### Task 30.3 — Approve the maximum source batch

Default maximum:

- one new feature-local presentation component under `src/components/users/`
- exactly two consumers: `CreateStaffForm.js` and `UserRoleModal.js`
- no change to `CreateActionButton`
- no global style or shared-default change
- no role constants, assignment state, validation, modal, permission, or save behavior change

The component contract should contain only label, disabled state, click callback, and necessary normal button attributes. It must keep fixed type, secondary outlined appearance, small size, and Plus icon presentation.

### Day 30 gate

Source work may begin only when both consumers are behaviorally equivalent and the feature-local component is clearer than duplicating the button. If equivalence fails, perform no action migration and record the difference.

## 10. Day 31 — Characterization and Bounded Implementation

### Task 31.1 — Establish the untouched baseline

Likely test anchors:

```text
src/components/__tests__/uiDebtPrimitives.test.jsx
src/views/users/__tests__/CreateStaffForm.test.jsx
src/components/users/__tests__/UserRoleModal.test.jsx
```

The two consumer suites may need to be created. They must pass against untouched production source before extraction.

### Task 31.2 — Implement only the approved presentation reuse

Implementation rules:

- use a feature-local name that reflects role-assignment presentation rather than a global action type
- preserve button type, size, color, variant, label, icon size/class, and callback event
- spread normal button attributes without allowing callers to override fixed invariants
- preserve disabled behavior and accessible naming
- keep role arrays, scope logic, form state, callbacks, modal actions, validation, and loading ownership in existing consumers
- remove only replaced imports and markup
- add no CSS and no dependency

### Task 31.3 — Immediate audit

- run changed-file ESLint and Prettier
- run new component/consumer characterization plus relevant user-management integration tests
- compare the diff with the approved file list
- inspect callback arguments and form submission behavior
- search for the exact duplicate in the two selected consumers
- confirm no global primitive or role/workflow controller changed

### Day 31 gate

Day 31 passes only when the pair uses one smaller feature-local presentation contract, both consumer behaviors remain protected, and no role-assignment business logic moves.

## 11. Day 32 — Pattern-Family Checkpoint

### Task 32.1 — Proportional validation

Always run for a source migration:

- changed-file ESLint and Prettier
- new presentation-component tests
- both direct consumer tests
- applicable user-management/modal integration tests
- import, render-site, duplicate-markup, and invariant-prop searches
- `git diff --check`
- full diff review from `cee1d0a`

Run full repository lint and the complete unit suite only when:

- a global shared primitive or default changed
- more consumers were affected than the approved pair
- permission, role state, workflow, status meaning, form submission, route, or API behavior changed
- focused tests reveal broader coupling

Run `npm run build` when production source changed. Documentation-only or rejected-pilot outcomes do not require lint, unit, or build repetition after the passing Days 25–28 checkpoint.

Do not run hosted GitHub Actions. Do not deploy.

### Task 32.2 — Generated-build safety

If a build runs:

1. Run `npm run build`.
2. Inspect `git status --short -- build`.
3. Restore tracked output with `git restore --worktree -- build`.
4. Preview `git clean -nd -- build`.
5. Verify every previewed path is inside the resolved repository `build/` directory.
6. Remove only those previewed generated files with `git clean -fd -- build`.
7. Confirm no build diff remains.

### Task 32.3 — Boundary audit

Confirm no changes entered:

- global component defaults unless separately approved
- role, permission, module-activation, workflow, or status domain modules
- APIs, services, persistence, routes, packages, or lockfiles
- unrelated CSS
- GitHub Actions or deployment configuration
- committed generated output

### Task 32.4 — Record the outcome

Create:

```text
upgrade-works/FRONTEND_COMPONENT_REUSE_STAGE_4_ACTIONS_STATUS_EXECUTION_2026-08-04.md
```

Record evidence, decisions, characterization, exact source files, validation, intentional status/workflow exceptions, rollback commits, and readiness for Days 33–36.

### Day 32 gate

The Days 29–32 batch passes when:

- every reviewed action/status/workflow outlier has a disposition
- any extraction preserves presentation, callback, disabled, loading, responsive, form, and accessibility behavior
- status meaning and workflow ownership remain domain-local
- no false universal abstraction was introduced
- required validation passes
- generated output and worktree are clean
- the execution record is complete

## 12. Stop Conditions

Stop or revert when:

- the component needs permission, role-policy, status, workflow-stage, or route awareness
- callback arguments or event propagation change
- a form begins submitting or stops submitting unexpectedly
- disabled/loading behavior or reason changes
- label, icon, color, size, order, focus, or responsive access changes unintentionally
- statuses with different meaning would share one mapping
- a global component needs a consumer-specific flag
- the diff expands beyond the approved pair and test boundary

Retain the local implementation and document the semantic difference.

## 13. Commit and Rollback Boundaries

Preferred commits:

1. Days 29–32 plan
2. untouched-source consumer characterization
3. bounded feature-local component and two-consumer migration
4. checkpoint audit and execution record

Rollback order:

1. revert the implementation commit to restore both local buttons
2. retain characterization unless the original behavior is intentionally changed
3. run the direct component/consumer and user-management integration suites

No stored-data rollback should be necessary because API and persistence changes are prohibited.

## 14. Definition of Done

Days 29–32 are complete when:

- usage evidence and semantic ownership are documented
- each candidate has an evidence-backed disposition
- any extracted component is smaller and more stable than the duplicate pair
- actions preserve purpose, callback, form, disabled, loading, responsive, and accessibility behavior
- statuses and workflows retain their authoritative domain meaning
- focused checks pass and broader validation follows Section 11
- no unrelated or generated files enter the diff
- the execution record and programme index are current

## 15. Next Boundary

After the Days 29–32 gate passes, the final Stage 4 pattern family is Days 33–36: forms and dialogs.

That later batch must separately assess form layout, validation feedback, submit/discard groups, confirmation dialogs, focus entry/return, Escape behavior, loading locks, double-submit prevention, and mobile layout. This plan does not authorize those changes.
