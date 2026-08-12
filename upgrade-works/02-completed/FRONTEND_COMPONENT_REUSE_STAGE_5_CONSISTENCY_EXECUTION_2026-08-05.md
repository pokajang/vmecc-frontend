# Frontend Component Reuse Stage 5 Consistency Review Execution

**Date:** 2026-08-05  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Plan commit:** `8c04768`  
**Correction-ledger amendment:** `f37a42f`  
**Plan:** `FRONTEND_COMPONENT_REUSE_STAGE_5_CONSISTENCY_PLAN_2026-08-05.md`  
**Scope:** Stage 5 Day 40 representative desktop/mobile consistency review  
**Status:** Completed locally; two bounded Family C corrections passed; authenticated browser journeys remain fixture-blocked by the local database service

## 1. Outcome

Day 40 passed its behavior-preserving consistency gate.

- Families A, B, D, and E required no application correction.
- Family C had two reproducible Medium findings with clear ownership.
- Long mobile record content is now contained without changing record data, order, actions, breakpoints, or component APIs.
- Custom Shifts now uses the established shared empty-state presentation used by the other representative record collections.
- Changed-file formatting and lint, 15 focused test files / 105 tests, and a 6,493-module production build passed.
- No dependency, backend, API, route, permission, persistence, validation, calculation, status, or workflow behavior changed.
- Temporary services, screenshots, Playwright artifacts, and generated build output were removed after verification.

The authenticated E2E route check did not pass or fail the frontend: all four inspected read-only journeys were blocked at login because PostgreSQL on `127.0.0.1:5432` was unavailable. No database, identity, seed, or service configuration was changed to bypass that fixture.

## 2. Strengths Observed

- Confirmation consumers retain meaningful domain titles, consequence copy, safe cancellation, focus recovery, responsive drawer/modal presentation, and form-safe actions.
- Reports and Inspection reuse the same compact mobile Back presentation while retaining local navigation handlers.
- Responsive desktop tables and mobile cards retain record order, state meaning, and consumer-owned actions.
- Role-assignment actions share presentation without forcing identical wording where task context differs.
- ERCO chronology and PreMob flows share responsive shell behavior while preserving their separate domain copy, callbacks, colors, and state transitions.
- Existing tests already protect the high-risk interaction contracts: Escape, dismissal, focus restoration, event forwarding, button types, responsive variants, and loading/disabled locks.

## 3. Family Disposition Matrix

| Family                           | Representative evidence                                                                                                    | Disposition                               | Application result                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A — confirmation foundation      | Staff actions and retained Reports facade; `320`, `575/576`, and `1440`; light/dark; keyboard dismissal and focus coverage | Pass; no change                           | Responsive boundary, semantics, cancellation, and consumer-specific variants retained                 |
| B — mobile module Back           | Reports and Inspection; `390`, `767/768`; actual consumer classes                                                          | Pass; no change                           | 44px mobile control at `390` and `767`, hidden at `768`, no overflow; handlers remain local           |
| C — responsive record collection | Holidays, Overtime, and Custom Shifts; `320`, `390`, `767/768`, and `1440`; populated/empty contracts                      | Two bounded Medium findings               | Shared intrinsic-width containment and consumer-local standard empty state implemented                |
| D — role-assignment Add          | Create Staff and Manage User Roles; `320` and `1440`; light/dark                                                           | Intentional wording difference; no change | Contextual `Add` beside the Create Staff section and standalone `Add assignment` modal label retained |
| E — ERCO responsive shell        | Chronology and PreMob; `320`, `767/768`, and `1440`; light/dark; keyboard coverage                                         | Pass; no change                           | Drawer at `320/767`, modal at `768/1440`; order, reachability, semantics, and callbacks retained      |

## 4. Findings and Corrections

### Finding C1 — long mobile record content escaped its collection

- **Severity:** Medium
- **Affected user/journey:** mobile HR administrator scanning a record whose user-provided title or value is long
- **Verified evidence:** at a 320px viewport, the document expanded to 621px, producing 301px horizontal overflow; at 390px it still expanded to 621px, producing 231px overflow
- **Isolation evidence:** removing status and actions did not resolve the defect; a long title alone reproduced it
- **Cause:** the constrained `.mobile-record-list` contained a `.mobile-record-list__section` with the intrinsic default `min-width: auto`, allowing the section to retain content width
- **Impact:** users could lose card content and actions off-screen or require horizontal panning
- **Classification:** shared-source defect; all generic mobile record-list consumers benefit from content containment
- **Correction:** add only `minWidth: 0` to the rendered section in `MobileRecordList`
- **After evidence:** document overflow was zero at both 320px and 390px; content order, public API, item shape, status, actions, and breakpoints were unchanged
- **Rollback:** revert `dab6a0e`

### Finding C2 — Custom Shifts bypassed the standard collection empty state

- **Severity:** Medium
- **Affected user/journey:** administrator opening Custom Shifts when no custom records exist
- **Verified evidence:** Holidays and Overtime supply empty copy as strings, allowing `ResponsiveRecordCollection` to render the standard `PageState`; Work Shift supplied a custom React element and bypassed that presentation contract
- **Impact:** an equivalent record-collection state lost the established spacing and state ownership without a domain reason
- **Classification:** consumer-local inconsistency
- **Correction:** supply `"No custom shifts defined yet."` as the existing `emptyMessage` string
- **After evidence:** the focused test confirms the standard empty-state container, including its 160px minimum height; the copy is unchanged
- **Rollback:** revert `a6bbadf`

## 5. Intentional Differences and No-Change Decisions

- Confirmation titles, colors, and body details vary because their consequences differ; normalizing them would weaken meaning.
- Reports and Inspection Back destinations remain consumer-owned; only the visual action is shared.
- Role assignment uses `Add` where the surrounding Create Staff section supplies the object and `Add assignment` where the modal action stands alone. Both have clear accessible names in context.
- The ERCO consumers retain separate content, button colors, and callbacks because they initiate different workflows.
- A universal 44px minimum was not imposed on every desktop button. Day 40 measured the established coarse-pointer/mobile contract and avoided a broad design-system change.

## 6. Browser and Responsive Evidence

A temporary deterministic Vite fixture rendered the actual shared components and consumer classes without mutating application data. It covered:

- primary widths `320`, `390`, and `1440`
- confirmation boundary `575/576`
- mobile Back, record collection, and ERCO boundary `767/768`
- representative light and dark presentation
- coarse-pointer and reduced-motion media conditions where relevant
- layout measurements and screenshot inspection before and after the Family C containment correction

All reviewed families except the pre-correction collection case had zero horizontal overflow. Confirmation switched from drawer to modal at `575/576`; ERCO switched at `767/768`; the compact Back action remained visible through `767` and hidden at `768`.

The existing `tests/e2e/uiux-post-p1-polish.spec.js` was inspected before execution and used only for read-only login/navigation assertions. Its four cases stopped at login with backend HTTP 500. The Laravel log attributed the response to a refused PostgreSQL connection on `127.0.0.1:5432`. This is recorded as **blocked by fixture**, not a product failure and not passing frontend evidence.

No destructive dialog was confirmed, no record was submitted, and no permission, workflow, setting, or stored data changed.

## 7. Validation Evidence

| Gate                              | Result                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Clean baseline                    | Passed at `8c04768`; no staged/generated output                                                                            |
| Day 39 removed-symbol residue     | Passed; zero `AppBreadcrumb`, `DocsLink`, or `PwaInstallBanner` matches in application/test/public/package scope           |
| Baseline direct suites            | Passed: 14 files / 81 tests                                                                                                |
| Untouched-source characterization | Expected red: 2 failed / 9 passed across the two strengthened suites                                                       |
| Immediate corrected suites        | Passed: 2 files / 11 tests                                                                                                 |
| Changed-file Prettier             | Passed for the four implementation/test files                                                                              |
| Changed-file ESLint               | Passed for the four implementation/test files                                                                              |
| Final focused regression          | Passed: 15 files / 105 tests in 21.29 seconds                                                                              |
| Production build                  | Passed: Vite 7.3.6, 6,493 modules, 10.45 seconds                                                                           |
| Generated build cleanup           | Passed; tracked output restored, no residual `build/` status                                                               |
| Implementation boundary           | Passed; exactly two production files and two direct test files                                                             |
| Forbidden-boundary audit          | Passed; no dependencies, locks, routes, API/services, permissions, workflows, `.github`, backend, or generated build files |
| Worktree before records           | Clean                                                                                                                      |

The build retained its existing non-failing mixed-import and large-chunk advisories. No new bundling or dependency work was introduced.

Full repository lint and the complete unit suite were deliberately not duplicated on Day 40. The approved plan assigns those cross-repository gates to Day 41; the Day 40 changes are narrow and were covered by all direct shared-component and representative-consumer suites.

Contrast, typography, and other repository-wide visual audits were not rerun because neither correction changes colors, typography, tokens, SCSS, or presentation dependencies.

## 8. Exact Implementation Boundary

```text
src/components/MobileRecordList.js
src/components/__tests__/ResponsiveRecordCollection.test.jsx
src/views/settings/components/WorkShift.js
src/views/settings/components/__tests__/WorkShift.test.jsx
```

Durable plan/tracker records are the only other Day 40 files.

## 9. Commits and Independent Rollback

| Commit    | Purpose                                               | Rollback effect                                                         |
| --------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| `8c04768` | Create the bounded Day 40 consistency plan            | Reverts planning only                                                   |
| `f37a42f` | Record evidence and approve the two-correction ledger | Reverts plan/tracker amendment only                                     |
| `dab6a0e` | Contain long mobile record content                    | Reverts only shared intrinsic-width containment and its regression      |
| `a6bbadf` | Standardize the Custom Shifts empty state             | Reverts only the consumer-local empty-state adoption and its regression |

No backend or data rollback is required.

## 10. Cleanup and Handover

- Stopped only the audit Vite listener on `127.0.0.1:4173` and Laravel listener on `127.0.0.1:8000` that this execution started.
- Removed the exact temporary `.codex-run/day40-consistency/` evidence directory.
- Removed only the four failed `uiux-post-p1-polish-*` Playwright result directories and their `.last-run.json` generated by this execution.
- Confirmed no generated build diff remains.

Day 41 may now run the final cross-repository code-quality checkpoint: full lint, complete unit suite, applicable audits, one production build with guarded cleanup, and cumulative boundary/diff review. Day 40 authorizes no deployment or hosted GitHub activity.
