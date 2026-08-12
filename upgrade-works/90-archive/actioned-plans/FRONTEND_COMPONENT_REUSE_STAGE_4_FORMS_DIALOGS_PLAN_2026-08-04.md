# Frontend Component Reuse Stage 4 Forms and Dialogs Plan

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Planning revision:** `402a36d`  
**Stage 4 application baseline:** `cc05d1a`  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Prior checkpoint:** `FRONTEND_COMPONENT_REUSE_STAGE_4_ACTIONS_STATUS_EXECUTION_2026-08-04.md`  
**Scope:** Stage 4 Days 33–36 — forms and dialogs only  
**Status:** Completed locally on 2026-08-04; all Days 33–36 and Stage 4 gates passed  
**Authorization boundary:** Local, behavior-preserving frontend work only; no deployment, GitHub Actions, backend, API, route-definition, permission, persistence, dependency, business validation, submitted-value, status-definition, workflow-transition, or global-style changes

## 1. Purpose

This plan covers the final Stage 4 pattern-family batch: form structure, validation feedback, submit/discard presentation, confirmation and action-dialog shells, modal/drawer responsiveness, focus behavior, dismissal locks, and double-submit protection.

The objective is to consolidate only presentation with the same structure and interaction contract. It is not to create a universal form builder, universal modal, schema system, validation framework, or workflow controller. Field meaning, validation rules, payload construction, permission checks, destructive safeguards, API calls, and transition logic remain in their current domains.

The repository already contains heavily reused form and dialog foundations. A no-change source outcome remains acceptable if the selected pair does not prove exact behavioral equivalence under untouched-source characterization.

## 2. Required Outcomes

By the end of Day 36:

- production form and dialog implementations reviewed in this batch have an evidence-backed reuse, retain, or defer disposition
- form layout is distinguished from field meaning, validation ownership, submitted values, and domain workflow
- dialog presentation is distinguished from title/body copy, action semantics, close locks, destructive safeguards, and callback ownership
- responsive breakpoint, modal-versus-drawer behavior, mount/unmount timing, focus restoration, Escape behavior, backdrop dismissal, and footer order are captured for any shortlisted dialog
- submit buttons preserve effective type, disabled conditions, loading lock, callback arguments, and double-submit protection
- no global primitive receives a domain-specific flag or changed default
- at most one exact two-component presentation pair is migrated
- the complete Stage 4 checkpoint passes full lint, the complete unit suite, applicable repository audits, a production build, generated-output cleanup, and a cumulative Stage 4 boundary review
- execution evidence, exceptions, rollback commits, and Stage 5 readiness are recorded under `upgrade-works/`

## 3. In Scope

### 3.1 Existing shared foundations to audit but not redesign

- `src/components/FormActionGroup.js`
- `src/components/ActionConfirmModal.js`
- `src/components/MobileBottomDrawer.js`
- `src/components/workflow/ResponsiveWorkflowActionDialog.js`
- `src/components/ButtonLoader.js`
- `src/components/users/UserFormModal.js`
- `src/components/users/UserConfirmModal.js`
- compatibility confirmation exports and wrappers

### 3.2 Approved pilot investigation

- `src/views/report/erco/erco-form-components/ChronologyStartModeModal.js`
- `src/views/report/erco/erco-form-components/PreMobModeModal.js`
- `src/views/report/erco/erco-form-components/useIsMobile.js`
- `src/views/report/erco/__tests__/ErcoResponsiveModals.test.jsx`
- `src/components/__tests__/MobileBottomDrawer.test.jsx`

### 3.3 Durable records

- this plan
- a Days 33–36 execution record
- the active upgrade plan and `upgrade-works/README.md`

## 4. Explicitly Out of Scope

- backend controllers, serializers, validation, database fields, migrations, or authorization
- API endpoints, request shapes, payload construction, upload handling, and persistence timing
- routes, guards, navigation destinations, or unsaved-change policy
- role, permission, module-activation, status, approval, or workflow-transition rules
- changing field labels, required/optional meaning, limits, defaults, normalization, error copy, or validation timing
- changing submitted values, save/discard behavior, destructive confirmation wording, or post-submit destinations
- creating a schema-driven form renderer or global field abstraction
- merging auth, Leave, Overtime, Payroll, Team, User, Inspection, and report forms by visual resemblance
- changing CoreUI, React, or other dependencies
- changing shared breakpoints, SCSS, global styles, or responsive policy
- changing `FormActionGroup`, `ActionConfirmModal`, `MobileBottomDrawer`, or `ResponsiveWorkflowActionDialog` without a separately approved plan amendment and blast-radius review
- deployment, shared-cPanel configuration, GitHub Actions, staging, production data, or release qualification
- deleting compatibility wrappers; that requires the Stage 5 unreferenced-code audit
- broad formatting, renaming, directory restructuring, or barrel-export cleanup

## 5. Current Shared Contract Ownership

### 5.1 `FormActionGroup`

Owns reusable action-row layout, accessible group semantics, leading content, mobile in-flow/sticky/compact-sticky presentation, optional status text, and spacer behavior. It does not own button order, submit type, save/discard semantics, loading state, validation, or callbacks.

### 5.2 `ActionConfirmModal`

Owns the standard two-action confirmation shell, mobile drawer adaptation at its fixed breakpoint, cancel locking, desktop keyboard/backdrop protection, button presentation, and caller-provided copy/actions. It does not own permission checks, destructive eligibility, status transitions, or business wording.

### 5.3 `MobileBottomDrawer`

Owns the mobile bottom overlay, accessible close control, exit-transition mounting, body-scroll cleanup, Escape delegation through CoreUI, close locking, and focus restoration. Consumers own content, footer actions, business state, and whether a responsive drawer is appropriate.

### 5.4 `ResponsiveWorkflowActionDialog`

Owns one workflow-specific 575.98px modal/drawer presentation. Consumers own body and footer composition, action labels, validation, and workflow behavior. Its current breakpoint, mobile classes, mount behavior, and desktop flags are part of its contract and must not be changed to fit ERCO.

### 5.5 Field validation and submission

CoreUI field primitives provide presentation only. Domains remain authoritative for touched state, `invalid` conditions, error copy, cross-field rules, payloads, submit locks, retries, and success handling. Repeated use of `CFormInput`, `CFormFeedback`, or a Bootstrap class is not proof of a shared domain contract.

## 6. Planning Evidence Snapshot

The following production-only search was captured at planning revision `402a36d`. Counts are evidence, not migration targets, and Day 33 must regenerate them before source work.

| Pattern                                    |              Production evidence | Interpretation                                                                  |
| ------------------------------------------ | -------------------------------: | ------------------------------------------------------------------------------- |
| Files rendering `CModal`                   | 60 files / 65 render occurrences | Modal shells are widespread but semantically diverse                            |
| Files rendering `CForm`                    |                               10 | Most application forms use composition rather than a single form wrapper        |
| Files using `CFormFeedback`                |                                7 | Validation feedback is currently domain-owned                                   |
| Files with an `invalid` prop               |                               36 | Similar field state does not imply identical validation                         |
| `FormActionGroup` renderers                |                               15 | Shared action-row adoption is established                                       |
| `ActionConfirmModal` renderers             |                               32 | Canonical confirmation adoption is broad, including compatibility paths         |
| `MobileBottomDrawer` renderers             |                               48 | Shared drawer behavior is already widely reused                                 |
| `ResponsiveWorkflowActionDialog` renderers |                                7 | Workflow-responsive presentation is already centralized where its contract fits |
| Files containing both `CModal` and `CForm` |                                3 | Team duty coverage, team editing, and role transfer are business-heavy forms    |

The exact `CForm` inventory comprises authentication, Leave, Overtime, Team, and Create Staff flows. The `CFormFeedback` inventory spans Leave, Overtime, Drill, ERCO, and Fitness Test validation. Their rules and payloads are not interchangeable.

### Planning baseline

The existing responsive foundation and ERCO responsive-modal coverage passed before this plan was written:

```text
npx vitest run \
  src/views/report/erco/__tests__/ErcoResponsiveModals.test.jsx \
  src/components/__tests__/MobileBottomDrawer.test.jsx \
  --reporter=dot
```

Result: 2 files / 12 tests passed. This is a planning health check, not the untouched-source characterization required by Day 35.

## 7. Candidate Disposition Matrix

| Candidate                                                 | Evidence                                                                                                                   | Risk                        | Planning disposition                                                                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| ERCO `ChronologyStartModeModal` + `PreMobModeModal` shell | Exact breakpoint, hook, drawer body/footer classes, modal flags, close contract, and three-button structure                | Low when presentation-only  | Approve for untouched characterization                                                                                                           |
| Other ERCO modals                                         | Similar responsive shells but contain editing, generation stages, errors, loading locks, retries, and changing action sets | Medium/high                 | Retain; do not expand the pair                                                                                                                   |
| Payroll `ClaimLeaveModal` + `ClaimPostSubmitModal`        | Similar responsive shells                                                                                                  | Medium                      | Defer; they have different exit/post-submit semantics and intentionally different desktop/mobile title casing; the approved ERCO pair is smaller |
| Payroll claim forms                                       | Two forms already reuse local leave/post-submit/submit components                                                          | High                        | Retain; payloads, item models, validation, and persistence differ                                                                                |
| Staff message + feedback report modals                    | Both contain a textarea and cancel/submit actions                                                                          | High false-abstraction risk | Retain; recipient semantics, minimum length, error feedback, loading copy, and enablement differ                                                 |
| Create Team + Edit Team modals                            | Both are Team forms                                                                                                        | High                        | Retain; multi-create selection differs from member/image editing and nested deletion                                                             |
| Leave + Overtime application forms                        | Both use `CForm`, feedback, and `FormActionGroup`                                                                          | High                        | Retain shared presentation already in use; entitlement, date, duration, and submit rules remain domain-owned                                     |
| Create Staff action row                                   | Manual submit/cancel row inside a card form                                                                                | Medium                      | Retain for this batch; `FormActionGroup` mobile behavior would change layout without an exact peer                                               |
| User form, role, and confirmation modals                  | Feature-local shared components already exist                                                                              | Medium                      | Retain current boundaries; Days 29–32 already extracted the only approved action duplicate                                                       |
| Holiday + assignment create modals                        | Similar CoreUI modal anatomy                                                                                               | High                        | Retain; fields, validation, save locks, and data ownership differ                                                                                |
| Workflow action modals                                    | Seven consumers already reuse `ResponsiveWorkflowActionDialog`                                                             | High workflow risk          | Retain current shared contract and domain actions                                                                                                |
| Confirmation wrappers                                     | Canonical shell already broadly adopted                                                                                    | Medium compatibility risk   | Defer removal to Stage 5 reference audit                                                                                                         |
| Attachment preview modals                                 | Similar file preview shells                                                                                                | High privacy/media risk     | Retain domain-specific download, visibility, and privacy safeguards                                                                              |
| Navigation guard + PWA install dialogs                    | Modal presentation with lifecycle side effects                                                                             | High                        | Retain; browser/install/navigation behavior is not a generic form dialog                                                                         |
| Authentication forms                                      | Login/register/reset/forgot forms                                                                                          | High                        | Retain; credentials, tokens, validation, and navigation require separate security review                                                         |
| Inline feedback and manual action rows                    | Repeated classes and labels across many domains                                                                            | High false-positive rate    | Retain unless a future exact contract is independently proved                                                                                    |

## 8. Provisional Pilot Contract

### 8.1 Selected pair

The only source candidate authorized for Day 35 investigation is the ERCO pair:

- `ChronologyStartModeModal`
- `PreMobModeModal`

Both currently use:

- ERCO `useIsMobile` and its 767.98px maximum-width rule
- `MobileBottomDrawer` on mobile
- identical mobile body classes: `inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body`
- identical mobile footer classes: `mobile-bottom-drawer__footer d-flex flex-wrap align-items-center justify-content-end gap-2`
- desktop `CModal` with `alignment="center"`, `fullscreen="sm"`, and `scrollable`
- the same `visible` and `onClose` contract
- identical header/body/footer ordering
- three explicit `type="button"` actions in Cancel/secondary/terminal order

The title, body, button labels, button colors, and callbacks remain in each consumer.

### 8.2 Allowed feature-local contract

A feature-local component such as `ErcoResponsiveActionModal` may own only:

- `visible`
- `title`
- presentational `body`
- presentational `actions`
- `onClose`

It must keep the breakpoint hook, mobile classes, desktop flags, and shell order fixed. It must not accept permission, stage, loading, error, save, form, route, API, or domain-record props.

No `variant`, breakpoint, class-name, fullscreen, scrollable, close-lock, or mobile-behavior prop is authorized. If the pair needs one, stop and retain the local implementations.

### 8.3 Why existing global dialogs are not the pilot

`ResponsiveWorkflowActionDialog` uses a 575.98px breakpoint, different mobile classes, different footer wrapping/alignment, a visible short-circuit, and no desktop `fullscreen="sm"`. Reusing it would change ERCO behavior or require broadening a seven-consumer global contract. Neither is authorized.

`ActionConfirmModal` owns a two-action confirmation contract and a different breakpoint. The ERCO dialogs are three-action choice dialogs, so using it would be a false abstraction.

## 9. Day 33 — Inventory and Behavioral Classification

### Task 33.1 — Reconfirm the execution boundary

1. Confirm `HEAD` is at or descended from the plan commit.
2. Record `git status --short`; stop for overlapping source edits.
3. Verify `build/`, `.codex-run/`, screenshots, traces, and temporary logs are not staged.
4. Re-read the Days 29–32 execution record and Stage 4 cumulative baseline.

### Task 33.2 — Regenerate production evidence

Regenerate production-only file lists and counts for:

- `CModal`, `CForm`, `CFormFeedback`, and `invalid` usage
- `FormActionGroup`, `ActionConfirmModal`, `MobileBottomDrawer`, and `ResponsiveWorkflowActionDialog`
- manual submit/cancel, save/discard, and destructive action rows
- local mobile-drawer/desktop-modal branches
- form-modal combinations
- compatibility form/dialog wrappers

Exclude tests from production counts but map direct and integration tests to every shortlisted candidate.

### Task 33.3 — Record contracts, not appearances

For each plausible candidate, capture:

- user purpose and authoritative domain
- modal/drawer breakpoint, mount timing, focus behavior, Escape/backdrop/header-close behavior, and close locks
- title/body/footer semantics and action order
- actual button types, callback arguments, disabled/loading conditions, and double-submit protection
- field labels, values, defaults, validation timing, error feedback, and payload ownership
- responsive classes and document order
- test coverage and missing characterization
- reuse, retain, or defer disposition

### Day 33 gate

Day 33 passes only when visual similarities are separated from validation, payload, workflow, focus, and dismissal contracts. The ERCO pair remains provisional until untouched-source tests prove every fixed shell invariant.

**Result:** Passed. Production counts matched the planning snapshot, all reviewed candidates received a final disposition, and the ERCO pair remained the only exact presentation candidate.

## 10. Day 34 — Contract Review and Pilot Approval

### Task 34.1 — Audit shared tests

Confirm existing tests protect:

- `MobileBottomDrawer` close request, Escape behavior, exit transition, body-scroll cleanup, and focus restoration
- `ActionConfirmModal` desktop/mobile dismissal locks and focus restoration
- `FormActionGroup` role, mobile behavior, leading content, status, and spacer contracts
- ERCO modal switching at the ERCO breakpoint

### Task 34.2 — Compare the selected pair

Create a side-by-side contract table covering:

- 767.98px breakpoint behavior, including widths immediately below and above the boundary
- hidden, opening, visible, and closing render behavior
- desktop centered, scrollable, fullscreen-sm modal classes
- mobile drawer title, body classes, footer classes, and action order
- close button, Escape, and backdrop callback behavior
- focus entry and focus return
- action labels, colors, effective `type="button"`, click events, and no form submission
- DOM order and accessibility names

### Task 34.3 — Approve or reject

Approve source work only if the wrapper needs exactly the five props in Section 8.2 and both callers retain their body/actions. Reject the pilot if any behavior requires a variant prop, breakpoint override, close-lock option, workflow awareness, or global primitive change.

### Day 34 gate

Day 34 passes when exact shell equivalence is proven and the feature-local wrapper is smaller and clearer than the duplicate branches. A documented no-change result is a valid pass.

**Result:** Passed. Breakpoint, mobile classes, desktop flags, shell order, close behavior, button type/order, callback behavior, form safety, Escape dismissal, and focus restoration were proved equivalent without requiring a variant or global primitive change.

## 11. Day 35 — Untouched Characterization and Bounded Implementation

### Task 35.1 — Commit characterization before production edits

Extend the ERCO responsive-modal coverage or add a direct feature-local suite against untouched source. Protect:

- both mobile and desktop shells for each candidate
- exact titles and body content
- mobile and desktop action order
- actual button type and non-submission inside a form harness
- each action callback exactly once with unchanged event behavior
- close through header/close button, Escape, and backdrop where CoreUI supports it
- mobile focus restoration and exit-transition behavior through the shared drawer
- desktop centered/scrollable/fullscreen-sm classes
- the ERCO breakpoint boundary
- `visible={false}` behavior

The expanded tests must pass before any production source is changed. Commit them independently.

### Task 35.2 — Implement only the approved shell reuse

If the Day 34 gate passes:

1. Add one feature-local ERCO responsive action-modal component.
2. Replace only the duplicated responsive shell branches in the two selected modals.
3. Keep title, body, buttons, colors, labels, order, and callbacks in the two consumers.
4. Keep explicit `type="button"` on all actions.
5. Preserve the absence of close/loading locks; do not invent a new policy.
6. Preserve mount/unmount and closing-transition behavior; do not add an early visibility return.
7. Remove only imports made obsolete by the extraction.
8. Add no CSS, dependency, barrel export, or unrelated cleanup.

### Task 35.3 — Immediate audit

- run changed-file Prettier and ESLint
- run direct wrapper, both consumer, ERCO responsive integration, and `MobileBottomDrawer` tests
- inspect actual callback arguments and form submission behavior
- compare rendered class lists at mobile and desktop widths
- search for the exact duplicate branches in the two consumers
- confirm no global primitive, ERCO hook/controller, workflow, or form domain changed

### Day 35 gate

Day 35 passes only when one feature-local shell replaces the exact pair, both responsive and interaction contracts remain protected, and all titles, bodies, actions, callbacks, and ERCO state ownership stay in their consumers.

**Result:** Passed. Untouched characterization revision `fdc4441` preceded implementation revision `dedef52`; the implementation stayed within three production files and passed 5 focused files / 68 tests.

## 12. Day 36 — Full Stage 4 Checkpoint

### Task 36.1 — Focused regression

At minimum run:

```text
src/views/report/erco/__tests__/ErcoResponsiveModals.test.jsx
the new direct ERCO responsive action-modal test, if created
src/components/__tests__/MobileBottomDrawer.test.jsx
src/components/__tests__/ActionConfirmModal.test.jsx
src/components/__tests__/uiDebtPrimitives.test.jsx
relevant ERCO form/workflow tests coupled to the two choice callbacks
```

### Task 36.2 — Full Stage 4 validation

Because Day 36 is the Stage 4 exit checkpoint, run the broad checks regardless of the final pilot size:

1. `npm run lint`
2. `npx vitest run`
3. `npm run audit:system-inventory`
4. `npm run audit:staff-hardcoded`
5. `npm run audit:contrast`
6. `npm run audit:typography`
7. `npm run audit:production-config`
8. `npm run audit:router-advisory`
9. `npm run test:payroll-hook-order`
10. `npm run build`

Hosted GitHub Actions and deployment are not required.

### Task 36.3 — Guarded build cleanup

After the production build:

1. Inspect `git status --short -- build`.
2. Restore tracked build output with `git restore --worktree -- build`.
3. Preview untracked output with `git clean -nd -- build`.
4. Resolve every preview path and verify it is inside the repository's resolved `build/` directory.
5. Remove only the validated preview paths with `git clean -fd -- build`.
6. Confirm `git status --short -- build` is empty.

Do not use a broad clean command or delete through an unresolved variable.

### Task 36.4 — Cumulative Stage 4 review

Review application changes from Stage 4 application baseline `cc05d1a` through the final implementation:

- Days 21–24 structure/navigation extraction
- Days 25–28 data-list collection reuse
- Days 29–32 role-assignment action reuse
- Days 33–36 forms/dialogs result

Confirm no package, lockfile, route, API/service, permission, role policy, persistence, status-definition, workflow-transition, GitHub Actions, deployment, or committed build file entered the application boundary. Review changed shared APIs for accidental consumer-specific props and search for stale local duplicates.

### Task 36.5 — Durable record

Create:

```text
upgrade-works/02-completed/FRONTEND_COMPONENT_REUSE_STAGE_4_FORMS_DIALOGS_EXECUTION_2026-08-04.md
```

Record inventory counts, candidate dispositions, characterization revision, implementation revision or no-change decision, exact files, focused and full validation totals, build result, advisories, build cleanup, cumulative Stage 4 boundary, rollback, and Stage 5 readiness.

### Day 36 gate

Days 33–36 and Stage 4 pass only when:

- each reviewed form/dialog candidate has a semantic disposition
- any extraction preserves responsive shell, mount timing, focus, dismissal, action type/order, callback, form, validation, loading, and accessibility behavior
- no business validation, submitted value, destructive safeguard, permission, or workflow ownership moved
- full lint, complete unit tests, applicable audits, and production build pass
- cumulative Stage 4 diff and generated output are clean
- the execution record and programme trackers are current

**Result:** Passed. Full lint, 324 files / 1,779 tests, all applicable repository audits, the 6,495-module production build, guarded cleanup, and cumulative Stage 4 boundary review passed. See the [Days 33–36 execution record](../../02-completed/FRONTEND_COMPONENT_REUSE_STAGE_4_FORMS_DIALOGS_EXECUTION_2026-08-04.md).

## 13. Approved File Boundary

The maximum application-source boundary for an implementation result is:

```text
src/views/report/erco/erco-form-components/ErcoResponsiveActionModal.js
src/views/report/erco/erco-form-components/ChronologyStartModeModal.js
src/views/report/erco/erco-form-components/PreMobModeModal.js
src/views/report/erco/__tests__/ErcoResponsiveModals.test.jsx
src/views/report/erco/erco-form-components/__tests__/ErcoResponsiveActionModal.test.jsx
```

The direct test path is optional; characterization may stay in the existing ERCO responsive suite if that produces a clearer boundary. No barrel export is required because both consumers can import the feature-local component directly.

Durable documentation changes under `upgrade-works/` are separately allowed. Any other production file requires stopping, documenting the reason, and amending the plan before proceeding.

## 14. Stop and Revert Conditions

Stop before editing, or revert the implementation commit, when:

- the worktree contains overlapping unexplained edits
- the pair differs in breakpoint, modal flags, mount timing, close behavior, focus behavior, action order, or form submission
- a wrapper prop beyond `visible`, `title`, `body`, `actions`, and `onClose` is needed
- an existing global primitive or shared default must change
- a permission, workflow stage, domain record, loading policy, validation result, or route is needed by the wrapper
- any action loses explicit button type or begins submitting a surrounding form
- callback arguments, invocation count, event propagation, or close timing change
- focus is lost, Escape/backdrop behavior changes, or the mobile exit transition is shortened/bypassed
- desktop/mobile title, body, footer class, fullscreen, centered, or scrollable behavior changes
- CSS, dependency, route, API, persistence, or business logic enters the diff
- the application diff exceeds the approved source boundary
- focused tests fail for reasons not understood and attributable
- full Stage 4 validation exposes a regression

When stopped, retain the existing local implementations, record the semantic difference, and complete Day 36 as a no-change checkpoint if the repository remains healthy.

## 15. Commit and Rollback Boundaries

Preferred commits:

1. Days 33–36 plan
2. untouched-source ERCO characterization
3. feature-local shell and two-consumer migration
4. Stage 4 checkpoint audit, execution record, and programme trackers

Rollback order:

1. Revert only the implementation commit to restore the two local responsive branches.
2. Retain untouched-source characterization unless original behavior is intentionally changed.
3. Re-run the focused ERCO/modal regression set.
4. Re-run the full Stage 4 checkpoint if rollback occurs after the completion record.

No database, backend, cache, or stored-data rollback should be necessary because those changes are prohibited.

## 16. Mishap Prevention Controls

- Use explicit file paths; do not bulk-replace all `CModal`, `CForm`, or action-row markup.
- Inspect `git diff` after characterization and after each production consumer.
- Keep tests committed before production source so the behavioral baseline is auditable.
- Do not use formatter or lint autofix across the repository.
- Do not delete compatibility wrappers during the pilot.
- Do not normalize title casing, button colors, labels, or class names while extracting.
- Do not add an early `visible` return that changes overlay exit timing.
- Do not add optional flags for unselected ERCO or non-ERCO dialogs.
- Do not claim focus, Escape, or dismissal parity solely from visual output; protect it with shared/direct tests.
- Treat full Stage 4 checks as a checkpoint, not an excuse for unrelated repairs. Any unrelated failure is recorded and handled separately.
- Keep generated QA inventory in its ignored evidence location and generated Vite output out of commits.
- Preserve unrelated user changes and stop on overlap rather than restoring them.

## 17. Definition of Done

Days 33–36 are complete when:

- refreshed evidence and all candidate dispositions are durable
- the ERCO pair is either safely extracted or explicitly rejected after characterization
- any wrapper is feature-local, stable, and smaller than the duplicate branches
- form values, validation, payloads, workflows, callbacks, dismissal, focus, and responsive behavior are unchanged
- focused checks and the full Stage 4 checkpoint pass
- no unrelated, generated, backend, deployment, or release file enters the diff
- rollback is commit-scoped and tested
- the execution record, master plan, and directory index agree

## 18. Next Boundary

After the Day 36 gate passes, Stage 5 Days 37–39 may begin with an unreferenced-code and compatibility-wrapper inventory. No deletion is authorized by this plan.

Stage 5 must prove candidates are unreferenced before removing obsolete components, styles, exports, wrappers, or imports, and must retain adapters that still have consumers.
