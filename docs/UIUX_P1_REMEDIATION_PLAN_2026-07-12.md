# VMECC P1 UI/UX Remediation Working Plan

Date: 2026-07-12

Source audit: `docs/UIUX_LOGICAL_FLOW_AUDIT_2026-07-12.md`

Status: Completed 2026-07-13

Scope: UX-01, UX-02, UX-04, and UX-05. UX-03 was revalidated and demoted to P2 because existing redirects correctly preserve Salary Settings sidebar state.

## Objective

Resolve the P1 issues that materially affect task flow, mobile usability, destination discovery, and dashboard reliability without redesigning the application or replacing the existing component system.

The completed work should produce these user outcomes:

1. Mobile users can complete long forms without action bars covering fields or competing with bottom navigation.
2. Apply/Create workflows have one obvious entry point and do not masquerade as peer navigation tabs.
3. Every administrative tab destination is discoverable on narrow screens.
4. Every allowed dashboard resolves without unexpected permission errors or indefinite loading states.

## Completion evidence

- `FormActionGroup` now exposes explicit `in-flow`, `sticky`, and `compact-sticky` mobile behavior. Leave, Overtime, Payroll, Salary Assignment, and Team data-entry/detail consumers were migrated deliberately.
- Leave and Overtime Apply tabs were removed. Payroll navigation now contains only Claim Records and Payslips and is hidden during claim creation.
- Settings and Salary Settings render labeled mobile section selectors below `md` while preserving desktop tabs.
- Dashboard diagnosis identified `/api/messages/threads?limit=300` as a global pre-hydration poll while Messages was disabled. Message polling now requires hydrated module activation, an enabled Messages module, and `self.messages` permission.
- The authenticated ten-persona route sweep passes with explicit 401/403 endpoint instrumentation.
- Responsive verification passed for mobile/desktop Settings navigation, Leave/Payroll task navigation, and touch-emulated Leave/Overtime forms.
- Focused verification passed: 14 Vitest files / 57 tests, an additional post-layout 3 files / 9 tests, touched-file ESLint, and the Vite production build.

## Confirmed P1 scope

| ID    | Finding                                                                      | Relative effort              | Main risk                                                                      |
| ----- | ---------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| UX-01 | Fixed mobile form actions obscure content and compete with bottom navigation | Medium–high                  | Shared component has many consumers                                            |
| UX-02 | Apply/Create tasks are duplicated as tabs and primary buttons                | Small                        | Route and unsaved-change behavior must remain intact                           |
| UX-04 | Long mobile tab rails conceal destinations                                   | Medium                       | Shared navigation must support text and React-node labels                      |
| UX-05 | Dashboard route sweep emits unexpected 403 responses                         | Medium; possibly cross-stack | Root cause may be frontend permissions, API authorization, or a global request |

## Explicit non-goals

- No visual rebrand or new design system.
- No broad rewrite of Leave, Overtime, Payroll, Dashboard, or Settings.
- No change to business workflow rules, approval states, calculations, or persistence contracts.
- No removal of valid global shortcuts from the mobile menu or account dropdown solely because a page also has a primary action.
- No Salary route consolidation during P1. Existing `/staff/salary-claims/set-*` redirects to `/staff/set-salary/*` are correct and should be preserved.
- No P2 terminology, onboarding, PWA-banner, or general touch-target cleanup unless it is directly required by a P1 component change.

## Engineering approach

Deliver the work as four independently testable changes. Do not combine all P1 work into one large patch.

1. **Mobile form-action contract** — shared primitive plus explicit consumer migration.
2. **Task-versus-tab cleanup** — Leave, Overtime, and Payroll route presentation.
3. **Discoverable mobile module navigation** — shared tabs plus opt-in adoption on long settings rails.
4. **Dashboard permission/reliability remediation** — diagnose exact denied requests, then fix the correct layer.

Each change should preserve desktop behavior unless its acceptance criteria explicitly say otherwise.

---

## Workstream 1 — Mobile form-action contract

Finding: UX-01

Priority: First, because it affects completing operational tasks on phones.

Expected implementation size: Medium–high.

### Problem to solve

`FormActionGroup` defaults to the `action-row-thumb` contract. Below `md`, `_action-row.scss` changes that row to `position: fixed` above the 64px mobile bottom navigation. Long data-entry forms therefore scroll beneath two persistent UI layers.

The same primitive is also used by review, detail, report, inspection, payroll, team, and salary screens. A global CSS change without classifying consumers could fix Leave while breaking inspection or approval throughput.

### Design decision

Make mobile behavior explicit by task type:

- **Data-entry forms:** in-flow footer; actions appear after the final field.
- **Wizard selection steps:** in-flow on desktop; a compact, non-overlapping dock is allowed on phones when the step has only Back and Continue.
- **Review/approval/detail screens:** sticky actions may remain when repeated workflow throughput benefits from them.
- **Inspection field workflows:** retain their specialized compact-sticky behavior until separately validated; do not force them onto the generic form default.

New data-entry screens should not become fixed merely because they use `FormActionGroup`.

### Implementation tasks

#### 1.1 Introduce an explicit component API

Primary files:

- `src/components/FormActionGroup.js`
- `src/scss/components/mobile-nav/_action-row.scss`
- `src/scss/components/_touch-targets.scss`

Add an explicit prop such as:

```text
mobileBehavior="in-flow" | "sticky" | "compact-sticky"
```

Requirements:

- `in-flow` must remain in document flow at every breakpoint and render no spacer.
- `sticky` must be opt-in and reserve the correct shell space.
- `compact-sticky` must preserve the existing inspection-oriented compact behavior.
- Keep `mobileThumb`/`mobileVariant` temporarily as compatibility inputs if removing them would make the patch unnecessarily broad. Document precedence and add a development-time warning only if the repository convention supports it.
- Prefer `in-flow` as the long-term default. If changing the default in one patch is risky, first migrate every current consumer explicitly and change the default only after tests pass.

#### 1.2 Inventory and classify every consumer

Current consumers include:

- Leave and Overtime application forms
- Payroll salary and expense claim forms
- Salary assignment forms
- Report workflow/detail/review screens
- Inspection form/review/detail screens
- Team detail actions
- Company legal settings

Create a short migration table in the implementation PR description with one of:

- `in-flow data entry`
- `sticky review action`
- `compact inspection action`
- `desktop-only/non-mobile`

Do not infer the choice from file name alone; inspect what the action commits and whether fields remain below it.

#### 1.3 Migrate high-risk data-entry forms

At minimum:

- `src/views/leave/components/LeaveApplySection.js`
- `src/views/overtime/components/OvertimeApplySection.js`
- `src/views/payroll/components/claim-form/SalaryClaimBody.js`
- `src/views/payroll/components/claim-form/ExpenseOtherClaimForm.js`
- `src/views/staff/salary-claims-management/components/SalaryAssignmentFormPage.js`

Use `in-flow` for the final form footer. Keep Back near the form heading or as the leading footer action according to the existing page flow.

#### 1.4 Preserve compact selection-step behavior safely

Files to inspect:

- `src/views/leave/components/LeaveTypeSelection.js`
- `src/views/overtime/components/OvertimeApplySection.js`
- `src/views/payroll/components/claim-form/ClaimTypeSelection.js`

If Back/Continue remains docked:

- it must be rendered by the shared primitive rather than hand-written spacer markup;
- it must sit above the bottom navigation without covering selectable cards;
- both actions must have equal height;
- the final selectable item must scroll fully above the dock;
- the dock must account for safe-area inset and the actual bottom-nav CSS variable, not duplicate a hard-coded height.

#### 1.5 Fix action-row child consistency as part of the P1 change

The Leave and Overtime Save Draft test wrapper currently causes unequal button heights.

- Put test IDs on the buttons where possible.
- Otherwise give wrappers an explicit action-item class that stretches consistently.
- Ensure direct buttons and wrapped buttons share height, alignment, disabled behavior, and focus outline.

#### 1.6 Centralize bottom offsets

Replace repeated `64px` assumptions with a shell variable, for example:

```text
--vmecc-mobile-bottom-nav-height
```

The bottom navigation should own the value. Action docks and content padding should consume it.

### Tests to add or update

Component tests:

- `src/components/__tests__/uiDebtPrimitives.test.jsx`
  - in-flow mode has no fixed/sticky class and no spacer;
  - sticky mode includes the correct class and spacer;
  - compact-sticky remains backward-compatible;
  - leading and wrapped actions receive consistent structural classes.

Feature tests:

- `src/views/leave/components/__tests__/LeaveApplySection.test.jsx`
- `src/views/overtime/components/__tests__/OvertimeApplySection.test.jsx`
- relevant Payroll and Salary Assignment component tests
  - final data-entry footer selects in-flow behavior;
  - selection step selects the intended compact behavior;
  - Clear, Save Draft, and Submit order does not change;
  - disabled and busy states remain intact.

Visual/E2E checks:

- 320x568, 390x844, 768x1024, and 1440x1000.
- Leave: type selection and completed form shell.
- Overtime: type selection and completed form shell.
- Payroll: claim type selection and expense/salary form footer.
- Salary assignment: create/edit footer.
- At least one inspection form and one review screen to prove intentional sticky behavior was preserved.

### Acceptance criteria

- No data-entry field, validation message, upload input, or helper text passes behind a persistent action bar.
- Leave, Overtime, Payroll, and Salary Assignment submit actions appear after the final field in normal reading order.
- Phone users can reach the final field and action footer without content being covered by bottom navigation.
- All actions in the same row have equal height and aligned focus outlines.
- Sticky actions exist only on explicitly classified consumers.
- Desktop button order and workflow behavior remain unchanged.

### Rollback boundary

The component API and consumer selections must be reversible independently. If one specialized screen regresses, revert only that consumer to its previous mobile behavior rather than reverting the shared structural fix.

---

## Workstream 2 — Remove Apply/Create commands from peer navigation

Finding: UX-02

Priority: Second; low implementation risk and high clarity benefit.

Expected implementation size: Small.

### Target interaction model

#### Leave

- Records page: title, optional subtitle, one `Apply Leave` primary button, then records content.
- New application: no Apply tab; show Back and a clear `Apply Leave`/selected leave-type form heading.
- Detail page: show Back to Leave Records; no creation tab.
- Because Leave has only one information destination after removing Apply, remove the tab rail rather than leaving a single `Leave records` tab.

#### Overtime

- Follow the same model as Leave.
- Keep one `Apply Overtime` primary button on the records page.
- Remove the two-item `Overtime records / Apply overtime` rail.

#### Payroll

- Retain peer tabs `Claim Records` and `Payslips` on list/detail destinations.
- Remove `Apply Claim` from `PayrollNav`.
- Keep one primary `Apply Claim` button on applicable list destinations.
- Hide the records/payslips tab rail while inside the claim-creation flow if it competes with Back navigation or unsaved-change protection.

### Implementation tasks

Primary files:

- `src/views/leave/Leave.js`
- `src/views/overtime/Overtime.js`
- `src/views/payroll/Payroll.js`
- `src/views/payroll/components/PayrollNav.js`

Tasks:

1. Remove Apply items from module tab definitions.
2. Remove the now-single-item Leave and Overtime tab rails.
3. Preserve route URLs (`/leave/new`, `/overtime/new`, `/payroll/claims/new`) for deep links and browser history.
4. Preserve unsaved-change guards when users click Back, sidebar links, header shortcuts, or browser navigation.
5. Ensure detail pages return to the correct records page and restore filters where the current implementation already does so.
6. Keep global mobile-menu/account shortcuts; they are cross-application shortcuts, not duplicate controls in the same page region.
7. Ensure page titles and breadcrumbs communicate when the user is in creation mode.

### Tests to add or update

- `src/views/payroll/components/__tests__/PayrollNav.test.jsx`
  - only Claim Records and Payslips remain;
  - active-state mapping for claim detail remains correct;
  - no Apply Claim tab is rendered.
- Add focused Leave and Overtime navigation tests if none currently cover the page shell.
  - records page renders one primary Apply button;
  - new route renders no Apply tab and retains Back;
  - clicking Apply enters the expected route;
  - unsaved-change guard still blocks navigation when required.
- Update tests that intentionally expected Apply tabs.
- Update `src/components/header/__tests__/MobileNavSheet.test.jsx` only if wording changes; do not remove valid global shortcuts.

### Acceptance criteria

- `/leave`, `/overtime`, and `/payroll` show only one page-level Apply action for the same task.
- No tab rail contains a command whose primary purpose is creating a record.
- Direct links to each `/new` route still work.
- Back and discard-confirmation behavior is unchanged.
- Payroll continues to switch cleanly between Claim Records and Payslips.
- Desktop and phone use the same navigation semantics.

### Rollback boundary

Each module can be reverted independently. Do not couple the three modules through a new abstraction solely for this cleanup.

---

## Workstream 3 — Discoverable mobile navigation for long tab sets

Finding: UX-04

Priority: Third.

Expected implementation size: Medium.

### Target interaction model

Keep the existing underline tab rail for short sets. For four or more long administrative destinations on screens below `md`, use an explicit compact section selector instead of relying on invisible horizontal overflow.

Recommended shared API:

```text
mobileVariant="scroll" | "select"
mobileLabel="Settings section"
```

- `scroll` remains the default for short user-facing tabs.
- `select` renders a labeled native/CoreUI select below `md` and the existing tab rail from `md` upward.
- The active route must determine the selected option on direct load and browser navigation.

### Why select instead of hidden horizontal scrolling

- All destinations are discoverable at 320px.
- Long labels remain readable.
- Native keyboard and screen-reader behavior is predictable.
- Settings navigation is a destination selector, not a content carousel.

Do not convert every tab rail. Leave short two- and three-item rails unchanged.

### Implementation tasks

Primary files:

- `src/components/ModuleNavTabs.js`
- `src/components/RouteNavTabs.js`
- `src/views/settings/Settings.js`
- `src/views/staff/salary-claims-management/components/SalaryClaimsTabsNav.js`

Tasks:

1. Add opt-in mobile select rendering to `ModuleNavTabs`.
2. Pass the option through `RouteNavTabs` without changing route matching.
3. Require a stable string label for each selectable item. When the desktop label is a React node, support an explicit `mobileLabel`/`accessibleLabel` on the item.
4. Exclude disabled items or render them disabled with the same reason/title semantics.
5. On selection, call the same guarded navigation handler as the desktop tab.
6. Apply the select variant to:
   - Settings: General, Role Permissions, Dashboard Visibility, Module Activation.
   - Salary Settings: Set Salary, Set OT Rate, Workflow Rules, Company Legal Info.
7. Review other four-plus-item administrative rails and adopt only where truncation was reproduced.
8. Ensure the selected option updates after redirects, Back/Forward, and direct URL entry.

### Tests to add or update

- `src/components/__tests__/uiDebtPrimitives.test.jsx`
  - desktop rail remains present;
  - mobile-select structure has a visible/accessible label;
  - selecting an item calls its guarded handler;
  - active and disabled states map correctly;
  - React-node desktop labels use explicit string option labels.
- Settings routing tests:
  - direct route selects the correct mobile option;
  - selection navigates to the canonical route;
  - Back/Forward restores selection.
- `SalaryClaimsTabsNav.test.jsx`:
  - correct settings group options;
  - warnings/badges remain visible on desktop and have meaningful mobile option text where needed.
- Visual checks at 320, 390, 768, and 1440 widths.

### Acceptance criteria

- Every settings and salary-settings destination is visible or explicitly available without horizontal guessing at 320px.
- The active destination is fully named on refresh and direct navigation.
- Desktop underline tabs remain visually unchanged.
- Keyboard and screen-reader users can identify the selector and current destination.
- Unsaved-change guards run for mobile selection exactly as they do for desktop tabs.

### Rollback boundary

The mobile variant is opt-in. A problematic module can revert to `scroll` without removing the shared capability or affecting other modules.

---

## Workstream 4 — Dashboard 403 and loading-state reliability

Finding: UX-05

Priority: Fourth in code sequence, but diagnosis can begin immediately.

Expected implementation size: Medium and potentially cross-stack.

### Important constraint

Do not assume the denied request is `/stats` and do not silence console errors generically. The existing sweep captured generic browser resource errors, not the exact denied URL. Determine the failing endpoint and role before changing authorization or UI behavior.

### Phase 4A — Instrument and reproduce

Primary files/tools:

- `tests/e2e/smoke-full.spec.js`
- existing smoke personas and local backend logs

Tasks:

1. Extend the route sweep's response listener to record 401/403 responses with:
   - URL/path;
   - method where available;
   - persona role;
   - current page;
   - response status;
   - whether the request is expected for that role.
2. Keep sensitive headers, cookies, and response bodies out of artifacts.
3. Re-run only the dashboard route for all ten personas.
4. Produce a role × endpoint matrix before implementation.
5. Confirm whether loaders settle after the denial and which dashboard card or global shell feature initiated the request.

Decision gate:

- **If the request comes from Dashboard module stats:** continue with Phase 4B.
- **If it comes from global notifications/messages/header code:** fix that capability gate instead and add its focused tests.
- **If frontend permissions say allowed but backend denies:** reconcile the permission contract; do not merely hide the error.
- **If the denial is an intentional optional capability probe:** stop making the probe when permission data already answers the question.

### Phase 4B — Correct request eligibility

Likely frontend files if stats are the cause:

- `src/views/dashboard/Dashboard.js`
- `src/views/dashboard/hooks/useDashboardStats.js`
- `src/services/api/dashboardApi.js`
- permission constants/domain used by `DASHBOARD_SECTION_PERMISSIONS`

Tasks:

1. Verify each `DASHBOARD_SECTION_PERMISSIONS` value against backend endpoint authorization.
2. Build `visibleDashboardModules` only from capabilities that authorize the corresponding endpoint.
3. Avoid requesting an empty or unauthorized module set.
4. Preserve module-activation checks independently from permissions.
5. If the batch endpoint rejects the whole request when one module is unauthorized, choose one explicit contract:
   - preferred: backend returns allowed module results plus structured per-module denials; or
   - frontend requests only a proven-authorized set.
6. Do not implement repeated fallback requests that generate additional expected 403s.

Possible backend scope, only if contract mismatch is confirmed:

- stats route/controller authorization;
- batch stats response contract;
- feature/permission mapping tests.

Any backend change requires its own authorization tests and must remain deny-by-default.

### Phase 4C — Guarantee settled UI states

`useDashboardStats` currently races one batch request against a timeout and maps a request-level error to every selected module. Preserve its cancellation and stale-request protections while improving state accuracy.

Requirements:

- Every requested module ends in `loaded` or `error`; none remains loading.
- One module failure must not erase successfully returned module data if the API supports partial results.
- Retry must request only eligible failed/visible modules or intentionally refresh the whole eligible batch.
- Hidden modules must not display loaders or error cards.
- The action queue must distinguish `no work` from `unable to load`.

### Tests to add or update

Frontend unit tests:

- `src/views/dashboard/hooks/__tests__/useDashboardStats.test.js`
  - empty module list makes no request;
  - authorized list is passed exactly;
  - rejection settles all requested loaders;
  - timeout settles all requested loaders;
  - stale/aborted requests cannot overwrite current period data;
  - partial result behavior, if added.
- `src/views/dashboard/__tests__/Dashboard.test.jsx`
  - role capability hides unauthorized modules and prevents them entering the request set;
  - module activation and authorization combine correctly;
  - errors display Retry rather than an indefinite loader;
  - action queue distinguishes empty and error states.
- `src/services/__tests__/dashboardApi.test.js`
  - query contains only selected authorized modules;
  - empty-list behavior matches the chosen contract.

E2E tests:

- Re-run the dashboard portion of `smoke-full.spec.js` for all ten personas.
- Assert no unexpected 401/403/500 responses.
- Assert no `[data-testid^="dashboard-"][data-testid$="-loading"]` remains after readiness timeout.
- Assert at least one of content, empty state, or explicit error state for every visible module.

Backend tests, if touched:

- authorized role/module combinations return 200;
- unauthorized combinations remain denied;
- batch requests cannot expose stats from unauthorized modules;
- partial-result contract cannot leak module data.

### Acceptance criteria

- All ten configured personas can visit their allowed dashboard without unexpected permission errors.
- The browser console and response audit contain no unexplained 403s.
- Every visible dashboard module settles into content, empty, or explicit error UI.
- Unauthorized modules are neither requested nor rendered.
- Authorization remains deny-by-default; UX cleanup does not weaken backend enforcement.

### Rollback boundary

- Instrumentation changes can land independently.
- Frontend eligibility fixes and backend authorization changes must be separate commits/PRs when both are needed.
- Never roll back backend security enforcement to make the UI sweep pass; roll back or correct the frontend request logic instead.

---

## Cross-workstream verification matrix

| Surface                      | 320 phone           | 390 phone           | 768 tablet      | 1440 desktop | Keyboard         | Role coverage                       |
| ---------------------------- | ------------------- | ------------------- | --------------- | ------------ | ---------------- | ----------------------------------- |
| Leave records/new/form       | Required            | Required            | Required        | Required     | Required         | TRT                                 |
| Overtime records/new/form    | Required            | Required            | Required        | Required     | Required         | TRT                                 |
| Payroll records/payslips/new | Required            | Required            | Required        | Required     | Required         | TRT/Finance                         |
| Salary settings tabs         | Required            | Required            | Required        | Required     | Required         | HR/Finance                          |
| System Settings tabs         | Required            | Required            | Required        | Required     | Required         | System Administrator                |
| Inspection sticky actions    | Required regression | Required regression | Required        | Required     | Required         | Contract Manager/Incident Commander |
| Dashboard                    | Smoke               | Smoke               | Optional visual | Smoke        | Basic navigation | All ten smoke personas              |

## Implementation sequence and gates

### Change 1 — Form-action behavior

Gate to merge:

- consumer classification documented;
- targeted component tests pass;
- Leave, Overtime, Payroll, Salary Assignment, and Inspection visual checks pass;
- no content overlap at phone widths.

### Change 2 — Apply/Create navigation cleanup

Gate to merge:

- direct routes and Back behavior pass;
- unsaved-change guards pass;
- no duplicate page-level Apply actions remain;
- Payroll records/payslips tabs remain correct.

### Change 3 — Long-tab mobile selector

Gate to merge:

- Settings and Salary Settings work at 320px;
- active route and disabled-state tests pass;
- desktop tabs are unchanged.

### Change 4 — Dashboard reliability

Gate to start implementation:

- exact 403 endpoints are documented.

Gate to merge:

- focused dashboard unit tests pass;
- ten-persona dashboard sweep passes;
- no loader remains unsettled;
- any backend authorization changes have security tests.

## Proportional test commands

Use the repository's current Vitest/Playwright configuration and run focused tests after each change. Exact commands can be adjusted to the touched files, but the intended coverage is:

```text
npx vitest run src/components/__tests__/uiDebtPrimitives.test.jsx
npx vitest run src/views/leave/components/__tests__/LeaveApplySection.test.jsx
npx vitest run src/views/overtime/components/__tests__/OvertimeApplySection.test.jsx
npx vitest run src/views/payroll/components/__tests__/PayrollNav.test.jsx
npx vitest run src/views/staff/salary-claims-management/components/__tests__/SalaryClaimsTabsNav.test.jsx
npx vitest run src/views/dashboard/hooks/__tests__/useDashboardStats.test.js
npx vitest run src/views/dashboard/__tests__/Dashboard.test.jsx
```

After all four changes:

1. Run ESLint on touched frontend files.
2. Run the Vite production build because shared layout/navigation primitives changed.
3. Run focused Leave, Overtime, Payroll, mobile-bottom-menu, and dashboard persona E2E tests.
4. Run the authenticated UI route sweep once, not after every small patch.
5. Capture settled before/after screenshots for the audit routes.

Run the broader frontend test suite only after the focused checks pass or if shared-component failures indicate wider coupling.

## Definition of done

P1 remediation is complete only when:

- all four P1 findings meet their acceptance criteria;
- the audit document is updated with completion evidence rather than merely marked complete;
- shared component APIs are documented through naming and tests;
- desktop and mobile behavior has been visually inspected with real touch/coarse-pointer emulation;
- no existing business workflow or authorization rule has been weakened;
- route sweep artifacts identify no unexplained dashboard denials;
- existing user-owned worktree changes remain untouched.

## Deferred follow-up

After P1 closure, schedule P2 separately for:

- Salary module terminology and information architecture;
- general touch-target coverage outside the P1 form/navigation changes;
- PWA banner density;
- onboarding dismissal simplification;
- Messages semantic heading;
- search-label and placeholder cleanup.
