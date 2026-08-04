# Frontend Component Reuse Stage 4 Actions and Status Execution Record

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Batch:** Stage 4 Days 29–32 — actions, status, and workflow presentation  
**Planning baseline:** `cee1d0a`  
**Execution starting revision:** `136872b`  
**Characterization revision:** `de4528a`  
**Implementation revision:** `cbf90c5`  
**Status:** Passed locally; Days 33–36 may begin  
**Authorization boundary:** Local, behavior-preserving frontend work only; no deployment, GitHub Actions, backend, API, route-definition, permission, persistence, dependency, status-definition, workflow-transition, or global-style changes

## 1. Outcome

The Days 29–32 inventory confirmed that the frontend already has broad shared adoption for action, confirmation, record-state, and workflow-presentation primitives. The review therefore rejected a broad action/status rewrite and selected one exact, low-risk duplicate: the secondary outlined Add Assignment control rendered by Create Staff and Manage User Roles.

The duplicate presentation now lives in the feature-local `RoleAssignmentAddButton`. Both consumers retain their own assignment state, callbacks, loading ownership, role and scope rules, validation, modal/form structure, and save behavior. The shared component owns only the stable button presentation: `type="button"`, small secondary-outline styling, the 14-pixel Plus icon with existing spacing, label, disabled state, click callback, and normal button attributes.

Leave, Team, Inspection, Payroll, report, notification, and workflow statuses remain domain-owned because their vocabularies and color or state meanings are not interchangeable. Existing workflow summaries, approval gates, transition actions, confirmation wrappers, edit controls, and bulk-selection behavior were retained.

The bounded change passed untouched-source characterization, component and consumer regressions, user-management integration coverage, changed-file quality checks, source-boundary review, and a production build. Full repository lint and the complete unit suite were not repeated because none of the plan's broader-check triggers fired: no global primitive/default, permission, role policy, workflow, status meaning, form submission, route, API, or dependency changed, and the implementation remained within the approved two-consumer pair.

## 2. Day 29 — Inventory and Dispositions

### Shared adoption snapshot

The production import inventory was regenerated before source edits. Counts include barrel exports where present and are evidence, not migration targets.

| Primitive                | Production imports | Disposition                                                                         |
| ------------------------ | -----------------: | ----------------------------------------------------------------------------------- |
| `CreateActionButton`     |                 51 | Retained unchanged; extending it would create unnecessary global blast radius       |
| `FormActionGroup`        |                 15 | Retained; no equivalent bypass was approved in this batch                           |
| `ButtonLoader`           |                 30 | Retained; local loading controls differ in icon, density, copy, or layout           |
| `RowActions`             |                 28 | Retained; ordering, permissions, callbacks, and workflow behavior stay caller-owned |
| `RowActionCell`          |                 14 | Retained; no table-cell migration approved                                          |
| `RecordStateBadge`       |                  3 | Retained for its draft/published/queued vocabulary only                             |
| `WorkflowStatusSummary`  |                  9 | Retained; caller-owned labels and gates remain domain-specific                      |
| `WorkflowStageActions`   |                  5 | Retained; no workflow controller moved                                              |
| `ApprovalGates`          |                 14 | Retained; approval meaning remains caller-owned                                     |
| `ActionConfirmModal`     |                 32 | Retained as the canonical shell; compatibility cleanup remains Stage 5 work         |
| `EditControls`           |                 15 | Retained; no equivalent edit cluster was approved                                   |
| `BulkSelectionActionBar` |                  4 | Retained; selection and business actions remain caller-owned                        |

### Candidate dispositions

| Candidate                                              | Final disposition           | Reason                                                                                                    |
| ------------------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Create Staff Add Assignment                            | Migrate with exact pair     | Same purpose, appearance, event callback, non-submit behavior, disabled lock, and responsive placement    |
| Manage User Roles Add Assignment                       | Migrate with exact pair     | Same contract; only caller-supplied label differs                                                         |
| Page-level create actions                              | Retain current adoption     | Existing `CreateActionButton` coverage is broad; no compatible bypass justified a global change           |
| Repeatable-row and inline Add controls                 | Retain local                | They add objectives, references, workflow items, rules, or fields rather than role assignments or records |
| AI and icon-only toolbar actions                       | Retain local                | Accessible names, density, tooltips, and interaction purpose differ                                       |
| Manual loading buttons                                 | Retain local                | Migrating solely by loading text would alter icons, markup, or control density                            |
| Leave `StatusBadge`                                    | Retain Leave-owned          | Leave vocabulary and color mapping carry domain meaning                                                   |
| Team `StatusPill`                                      | Retain Team-owned           | On-duty, next, and unscheduled presentation is scheduling-specific                                        |
| Inspection, Payroll, report, and notification statuses | Retain domain-owned         | Lifecycle, compliance, financial, delivery, and review meanings are not a universal record state          |
| Workflow summaries, stages, and approval gates         | Retain current boundaries   | Shared presentation already exists; permissions and transition rules remain in domain controllers         |
| Confirmation wrappers                                  | Defer compatibility cleanup | The canonical shell is already shared; wrapper removal needs a separate Stage 5 reference audit           |

## 3. Day 30 — Contract Decision

Untouched-source characterization proved both selected buttons had the same effective contract:

- rendered HTML type is `button`, so clicking inside Create Staff never submits the enclosing form
- CoreUI presentation is small, secondary, and outline in both consumers
- the Plus icon is size 14 with `me-1` spacing
- each click forwards the browser event exactly once to its caller
- the existing loading flag disables the button and suppresses the callback
- DOM position and surrounding role-assignment layout remain caller-owned
- the only intentional variation is label text: `Add` in Create Staff and default `Add assignment` in Manage User Roles

The feature-local extraction was approved because the stable presentation is smaller than either consumer and requires no permission, role-policy, route, workflow, form-state, or persistence knowledge. Extending the 51-importer global `CreateActionButton` was explicitly rejected.

## 4. Day 31 — Characterization and Implementation

### Untouched-source characterization

Revision `de4528a` added direct tests before production source changed:

- `CreateStaffForm.test.jsx` protects rendered type, style, icon, event forwarding, non-submission, and loading lock
- `UserRoleModal.test.jsx` protects the same presentation, event, and loading behavior

The untouched implementation passed 4 files / 29 tests, including the shared UI-debt primitive suite and existing user-management row-action/modal integration coverage.

### Production change

Revision `cbf90c5`:

- added `src/components/users/RoleAssignmentAddButton.js`
- added a direct component suite protecting its default and caller-label contracts, forwarded accessibility attributes, disabled behavior, and fixed invariants
- replaced only the duplicated button markup in `CreateStaffForm.js` and `UserRoleModal.js`
- removed only the now-unused local Plus imports

Forwarded props are applied before the fixed button props, so callers cannot accidentally change type, size, color, or variant. No CSS, barrel export, global primitive, domain constant, state model, validation rule, callback, modal action, or API call changed.

## 5. Day 32 — Audit and Validation

| Check                              | Result                                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Untouched-source expanded baseline | Passed — 4 files / 29 tests                                                                                                                                          |
| Final focused regression           | Passed — 5 files / 31 tests                                                                                                                                          |
| Changed-file Prettier              | Passed                                                                                                                                                               |
| Changed-file ESLint                | Passed                                                                                                                                                               |
| `git diff --check 136872b..HEAD`   | Passed                                                                                                                                                               |
| Duplicate and import searches      | Passed; the local duplicate is gone from both consumers and the shared component has only the approved two production consumers                                      |
| Boundary diff                      | Passed; no package, lockfile, route, API/service, role constant, permission, workflow, status-definition, CSS, GitHub Actions, deployment, or committed build change |
| Production build                   | Passed — Vite transformed 6,494 modules and completed in 11.16 seconds                                                                                               |
| Generated build cleanup            | Passed — tracked output restored; 111 previewed untracked paths were resolved under `build/` before removal; `git status --short -- build` is clean                  |

The final focused command covered:

```text
src/components/__tests__/uiDebtPrimitives.test.jsx
src/components/users/__tests__/RoleAssignmentAddButton.test.jsx
src/views/users/__tests__/CreateStaffForm.test.jsx
src/components/users/__tests__/UserRoleModal.test.jsx
src/views/users/user-management/components/__tests__/UserManagementRowActionsModal.test.jsx
```

Vite emitted the existing mixed dynamic/static import advisory for `WorkflowNotifications.js` and the existing large-chunk advisory. Compilation completed successfully; neither advisory was introduced by this feature-local button extraction.

### Functional boundary confirmation

- Create Staff still uses label `Add`, cannot submit its form through this control, and disables the action during submit
- Manage User Roles still uses label `Add assignment` and disables the action while updating
- both callers receive the original click event exactly once
- assignment state, role and scope options, validation, permissions, modal behavior, and persistence remain unchanged
- all status meanings, approval gates, and workflow transitions remain in their existing domain owners
- generated production output did not enter the committed source diff

## 6. Rollback

If the extraction causes a regression:

1. Revert implementation revision `cbf90c5` to restore both local button implementations.
2. Retain characterization revision `de4528a` unless the original behavior is intentionally changed later.
3. Re-run the five final focused suites listed in Section 5.

No backend or stored-data rollback is required because the batch changed presentation composition only.

## 7. Remaining Risks and Next Boundary

- Browser-level visual comparison was not required because the CoreUI props, icon markup, class, DOM placement, and responsive containers are unchanged and directly characterized.
- Other controls that happen to contain a Plus icon remain intentional domain controls, not automatic reuse candidates.
- Domain status components remain visually diverse where their vocabulary or meaning differs; consistency must not erase business semantics.
- Existing Vite bundle-size and mixed-import advisories remain outside this batch.

Days 33–36 may begin with a fresh forms-and-dialogs plan. That batch must separately assess form layout, validation feedback, submit/discard groups, modal shells, focus entry and return, Escape behavior, loading locks, double-submit prevention, and mobile layout. This execution record does not authorize those changes.
