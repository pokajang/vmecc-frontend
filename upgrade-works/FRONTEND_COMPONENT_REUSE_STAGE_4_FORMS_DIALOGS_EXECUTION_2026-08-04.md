# Frontend Component Reuse Stage 4 Forms and Dialogs Execution Record

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Batch:** Stage 4 Days 33–36 — forms and dialogs  
**Stage 4 application baseline:** `cc05d1a`  
**Execution starting revision:** `5d9b3f9`  
**Characterization revision:** `fdc4441`  
**Implementation revision:** `dedef52`  
**Status:** Passed locally; Stage 4 is complete and Stage 5 Days 37–39 may be planned  
**Authorization boundary:** Local, behavior-preserving frontend work only; no deployment, GitHub Actions, backend, API, route-definition, permission, persistence, dependency, business validation, submitted-value, status-definition, workflow-transition, or global-style changes

## 1. Outcome

The Days 33–36 review confirmed that the frontend already has broad shared adoption for form action groups, confirmations, responsive workflow dialogs, mobile drawers, and loading presentation. A broad form or modal rewrite was rejected.

One exact feature-local pair was approved and migrated: ERCO `ChronologyStartModeModal` and `PreMobModeModal` now reuse `ErcoResponsiveActionModal` for their identical mobile-drawer and desktop-modal shell. Titles, body content, buttons, colors, action order, callbacks, and ERCO chronology state remain in the two consumers.

The shared shell has exactly five props: `visible`, `title`, `body`, `actions`, and `onClose`. It retains the ERCO 767.98px breakpoint, existing mobile classes, desktop centered/scrollable/fullscreen-sm flags, header/body/footer order, and existing mount/close behavior. No optional variants or domain flags were added, and no existing global primitive changed.

Untouched-source characterization was committed before production edits. The implementation then passed focused regressions and the mandatory full Stage 4 checkpoint: repository lint, 324 unit-test files / 1,779 tests, all applicable local audits, a 6,495-module production build, guarded generated-output cleanup, and the cumulative Stage 4 boundary review.

## 2. Day 33 — Refreshed Inventory and Dispositions

### Production evidence

The planning counts were regenerated at execution revision `5d9b3f9` and matched exactly.

| Pattern                                    |       Production evidence | Final disposition                                              |
| ------------------------------------------ | ------------------------: | -------------------------------------------------------------- |
| Files rendering `CModal`                   | 60 files / 65 occurrences | Retain domain modals; migrate only the exact ERCO pair         |
| Files rendering `CForm`                    |                        10 | Retain domain form ownership                                   |
| Files using `CFormFeedback`                |                         7 | Retain domain validation feedback                              |
| Files with an `invalid` prop               |                        36 | Retain validation timing and rules locally                     |
| `FormActionGroup` renderers                |                        15 | Retain existing shared contract                                |
| `ActionConfirmModal` renderers             |                        32 | Retain canonical confirmation and compatibility paths          |
| `MobileBottomDrawer` renderers             |                        48 | Reuse unchanged inside the feature-local ERCO shell            |
| `ResponsiveWorkflowActionDialog` renderers |                         7 | Retain unchanged; its breakpoint and classes do not match ERCO |

### Final candidate dispositions

| Candidate                                                                | Disposition              | Reason                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| ERCO chronology-initialization + PreMob-mode shells                      | Characterize and migrate | Exact breakpoint, hook, mobile classes, modal flags, close contract, order, and three-button structure |
| Other ERCO modals                                                        | Retain                   | Editing, generation stages, loading locks, retries, errors, and changing actions differ                |
| Payroll leave + post-submit modals                                       | Defer                    | Exit semantics and responsive title casing differ; second pilot was unnecessary                        |
| Payroll claim forms                                                      | Retain                   | Existing local reuse already separates different payload and validation models                         |
| Staff message + feedback report modals                                   | Retain                   | Recipient, minimum length, feedback, loading, and enablement contracts differ                          |
| Create + Edit Team modals                                                | Retain                   | Multi-create selection differs from member/image editing and nested deletion                           |
| Leave + Overtime forms                                                   | Retain                   | Shared action presentation already exists; entitlement, date, duration, and submission rules differ    |
| Create Staff action row                                                  | Retain                   | Adopting the shared action group would change mobile layout without an exact peer                      |
| User, holiday, assignment, auth, attachment, navigation, and PWA dialogs | Retain                   | Domain validation, security, privacy, lifecycle, or workflow responsibilities differ                   |
| Confirmation compatibility wrappers                                      | Defer to Stage 5         | Removal requires proof that each wrapper/export is unreferenced                                        |

## 3. Day 34 — Contract Approval

The selected consumers were equivalent across every shell invariant:

| Contract              | `ChronologyStartModeModal`          | `PreMobModeModal`                   | Decision                  |
| --------------------- | ----------------------------------- | ----------------------------------- | ------------------------- |
| Responsive hook       | ERCO `useIsMobile`                  | ERCO `useIsMobile`                  | Fixed in shared shell     |
| Mobile threshold      | 767.98px                            | 767.98px                            | Fixed in shared shell     |
| Mobile overlay        | `MobileBottomDrawer`                | `MobileBottomDrawer`                | Fixed in shared shell     |
| Mobile body classes   | Exact match                         | Exact match                         | Fixed in shared shell     |
| Mobile footer classes | Exact match                         | Exact match                         | Fixed in shared shell     |
| Desktop modal flags   | centered, scrollable, fullscreen-sm | centered, scrollable, fullscreen-sm | Fixed in shared shell     |
| Shell order           | title, body, actions                | title, body, actions                | Fixed in shared shell     |
| Close contract        | direct `onClose`                    | direct `onClose`                    | Caller callback forwarded |
| Actions               | three explicit button actions       | three explicit button actions       | Remain consumer-owned     |
| Close/loading lock    | none                                | none                                | No new policy introduced  |
| Domain awareness      | none in shell                       | none in shell                       | No domain props required  |

`ResponsiveWorkflowActionDialog` was not changed or reused because its 575.98px breakpoint, mobile classes, footer layout, visible short-circuit, and desktop flags differ. `ActionConfirmModal` was rejected because it owns a two-action confirmation contract, not a three-action choice shell.

## 4. Day 35 — Characterization and Implementation

### Untouched-source characterization

The planning health check passed 2 files / 12 tests. Revision `fdc4441` then expanded `ErcoResponsiveModals.test.jsx` before any production edit to protect:

- exact desktop centered, scrollable, fullscreen-sm shells
- exact desktop and mobile titles/body content
- mobile drawer body and footer classes
- action order, effective button type, colors, callback event, and invocation count
- non-submission when rendered from a form harness
- the 767/768px responsive boundary
- mobile Escape dismissal and focus restoration

The expanded untouched implementation passed 2 files / 18 tests, including the shared `MobileBottomDrawer` suite.

### Production change

Revision `dedef52`:

- added `src/views/report/erco/erco-form-components/ErcoResponsiveActionModal.js`
- replaced only the duplicated responsive branches in `ChronologyStartModeModal.js`
- replaced only the duplicated responsive branches in `PreMobModeModal.js`
- removed only imports made obsolete by that extraction

The shared component contains the unchanged ERCO hook, mobile drawer markup/classes, and desktop CoreUI modal markup/flags. The consumers still build their own title, body, buttons, colors, labels, order, and callbacks.

No ERCO hook/controller, chronology state, form field, validation, payload, callback, route, API, workflow, CSS, dependency, or barrel export changed.

### Immediate validation

| Check                         | Result                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| Changed-file Prettier         | Passed                                                            |
| Changed-file ESLint           | Passed                                                            |
| Focused regression            | Passed — 5 files / 68 tests                                       |
| Approved application boundary | Passed — three production files, below the five-file ceiling      |
| Duplicate search              | Passed — both consumers now render the feature-local shell        |
| Global primitive check        | Passed — existing shared primitive sources and defaults unchanged |

## 5. Day 36 — Full Stage 4 Checkpoint

### Validation results

| Validation                     | Result                                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full repository ESLint         | Passed                                                                                                                                                                            |
| Complete unit suite            | Passed — 324 files / 1,779 tests in 357.07 seconds                                                                                                                                |
| System QA inventory            | Generated in ignored `.codex-run`; 98 frontend routes, 321 backend routes, 50 modules, 707 views, 127 components, 9 jobs, 44 commands, 4 notifications, and 89 navigation records |
| Hardcoded staff audit          | Passed; no hardcoded staff literals found                                                                                                                                         |
| Contrast audit                 | Passed                                                                                                                                                                            |
| Typography audit               | Passed; 176 semantic and 62 direct font-size declarations, with 777 legacy small references tracked                                                                               |
| Production configuration audit | Passed                                                                                                                                                                            |
| React Router advisory audit    | Passed; `7.18.1` remains locked and the existing exception remains valid through 2026-09-03                                                                                       |
| Payroll hook-order check       | Passed                                                                                                                                                                            |
| Production build               | Passed — Vite transformed 6,495 modules and completed in 10.55 seconds                                                                                                            |
| Generated build cleanup        | Passed — tracked output restored; 111 previewed untracked paths resolved under `build/` before removal; final build status clean                                                  |
| Cumulative Stage 4 diff check  | Passed — no whitespace error or prohibited boundary change                                                                                                                        |

The complete unit suite emitted three non-failing jsdom notices for unsupported pseudo-element `getComputedStyle`; all assertions passed. The first full-suite invocation reached its 184-second command cap before returning buffered output. The same complete suite was rerun unchanged with a longer cap and passed; this was an execution-cap correction, not a product-code failure.

The production build retained the existing mixed dynamic/static import advisory for `WorkflowNotifications.js` and the existing large-chunk advisory. Compilation completed successfully.

### Cumulative Stage 4 boundary

Application changes from baseline `cc05d1a` through `dedef52` comprise:

- structure/navigation: one shared compact mobile Back presentation and its Reports/Inspection consumers
- data lists/states: Custom Shifts reuse of `ResponsiveRecordCollection`
- actions/status: one feature-local role-assignment Add presentation and its two consumers
- forms/dialogs: one feature-local ERCO responsive action shell and its two consumers
- characterization and regression tests for those bounded changes

The cumulative source boundary contains 10 production files and 9 test files. No package, lockfile, route, API/service, permission, role policy, persistence, status-definition, workflow-transition, CSS, GitHub Actions, deployment, or committed build file changed. Existing global `FormActionGroup`, `ActionConfirmModal`, `MobileBottomDrawer`, `ResponsiveWorkflowActionDialog`, `CreateActionButton`, and `ResponsiveRecordCollection` contracts remained unchanged during Stage 4.

## 6. Functional Compatibility Confirmation

- ERCO continues to use a drawer at widths through 767px and a modal from 768px
- both choice dialogs retain exact titles, body copy, button labels, colors, and action order
- every action remains `type="button"`, forwards the click event once, and does not submit a surrounding form
- mobile Escape dismissal, exit-transition mounting, body-scroll cleanup, and focus restoration remain delegated to the unchanged shared drawer
- desktop dialogs remain centered, scrollable, and fullscreen below the small breakpoint
- ERCO chronology initialization, append, replacement, close callbacks, and state remain caller-owned
- all non-selected forms and dialogs remain unchanged
- all earlier Stage 4 migrated behaviors remain covered by the passing full suite

## 7. Rollback

If the ERCO extraction causes a regression:

1. Revert implementation revision `dedef52` to restore both local responsive branches.
2. Retain characterization revision `fdc4441` unless the original behavior is intentionally changed.
3. Re-run `ErcoResponsiveModals.test.jsx`, `ErcoForm.smoke.test.jsx`, `MobileBottomDrawer.test.jsx`, `ActionConfirmModal.test.jsx`, and `uiDebtPrimitives.test.jsx`.
4. Re-run the full Stage 4 checkpoint before recording a replacement completion decision.

No backend or stored-data rollback is required because the batch changed presentation composition only.

## 8. Remaining Risks and Next Boundary

- The full unit suite covers DOM contracts and callbacks but is not a browser screenshot comparison. The extraction preserves exact markup classes and passed both responsive branches.
- Existing bundle-size and mixed-import advisories remain outside this component-reuse programme.
- Compatibility wrappers have not been deleted; Stage 5 must prove they are unreferenced first.
- Domain forms and dialogs remain intentionally separate where their validation, payload, privacy, lifecycle, or workflow meaning differs.

Stage 4 is complete locally. Stage 5 Days 37–39 may be planned as a bounded unreferenced-code and compatibility-wrapper audit. No deletion is authorized by this execution record.
