# VMECC Post-P1 UI/UX Working Plan

Date: 2026-07-13

Source audit: `docs/UIUX_LOGICAL_FLOW_AUDIT_2026-07-12.md`

Predecessor: `docs/UIUX_P1_REMEDIATION_PLAN_2026-07-12.md`

Status: Implemented; verification recorded below

Scope: Remaining P2 and P3 findings after P1 closure.

## Decision register and implementation outcome

Implemented on 2026-07-13 with the following decisions:

- remove the global PWA install banner and retain the navigation install action;
- limit automatic profile onboarding to Dashboard and Profile/Security, using one time-bound defer action and no ambiguous permanent skip;
- preserve separate payroll records and configuration destinations, permissions, and legacy URLs;
- adopt the terminology table in Phase 3 for visible labels;
- regroup the sidebar without adding collapsible navigation state.

All six delivery phases are implemented. Focused component and workflow coverage passed after the changes. Final lint/build and route-sweep results are recorded at the end of this document.

## Current baseline

The P1 remediation is complete. The following findings should not be reopened unless regression evidence appears:

- UX-01: mobile data-entry action overlap;
- UX-02: duplicated Apply/Create tabs;
- UX-04: undiscoverable long administrative tab rails on reproduced surfaces;
- UX-05: pre-hydration message polling and dashboard-route 403 noise;
- UX-06: uneven Leave/Overtime mobile form-action heights, fixed as part of UX-01.

The remaining work is primarily consistency, accessibility, information architecture, and interruption reduction. It should be delivered incrementally rather than as a redesign.

## Remaining finding map

| Finding                                     | Priority | Proposed phase | Relative effort | Product decision required     |
| ------------------------------------------- | -------- | -------------- | --------------- | ----------------------------- |
| UX-11 Messages semantic heading             | P2       | Phase 1        | Small           | No                            |
| UX-08 touch-target coverage                 | P2       | Phase 1        | Medium          | No                            |
| UX-09 search-field scope and labels         | P2       | Phase 1        | Medium          | No                            |
| UX-07 mobile top-chrome density             | P2       | Phase 2        | Medium          | Yes: install-promotion policy |
| UX-10 onboarding dismissal/trigger behavior | P2       | Phase 2        | Medium          | Yes: permanent skip policy    |
| UX-03 Salary module ownership               | P2 IA    | Phase 3        | Medium          | Yes                           |
| UX-12 destination/task terminology          | P2       | Phase 3        | Medium          | Yes: label sign-off           |
| UX-13 contextual action hierarchy           | P3       | Phase 4        | Medium          | Limited                       |
| UX-14 desktop sidebar density/icons         | P3       | Phase 5        | Medium          | Yes                           |

## Delivery principles

1. Preserve URLs, permissions, API contracts, and business workflows unless a phase explicitly requires otherwise.
2. Prefer shared primitive improvements over local CSS patches.
3. Keep desktop power-user density where it helps operations; mobile simplification should not remove capabilities.
4. Separate product-language decisions from engineering implementation.
5. Do not mix sidebar restructuring, route changes, and permission changes in one patch.
6. Use real coarse-pointer emulation for phone checks, not viewport resizing alone.
7. Update the audit only after a phase meets its acceptance criteria.

## Explicit non-goals

- No brand redesign, theme rewrite, or full design-token migration.
- No dark-mode launch.
- No changes to payroll calculations, workflow authorization, leave entitlements, roster rules, or inspection business logic.
- No replacement of CoreUI.
- No broad route renaming solely to match new display labels; stable URLs may retain historical slugs.
- No sidebar consolidation until Phase 3 terminology and Salary ownership are decided.
- No automatic promotion of every inline Add/Edit action to a filled primary button.

---

## Phase 0 — Baseline and decision register

Purpose: prevent later phases from implementing contradictory product assumptions.

Priority: Required before Phases 2, 3, and 5.

Expected effort: Small.

### Tasks

1. Capture settled screenshots for these roles and widths:
   - System Administrator: Dashboard, Settings, User Management;
   - Human Resource: Staff Leave, Salary Records, Salary Settings;
   - Tactical Response Team: Leave, Overtime, Payroll;
   - Representative: Messages, Team Directory;
   - widths: 320, 390, 768, 1024, and 1440.
2. Record current first-content position, visible actions, and navigation labels for the affected pages.
3. Create a short decision register covering:
   - whether global PWA banner promotion remains;
   - whether onboarding supports permanent dismissal;
   - whether Salary & Claims and Salary Settings remain separate modules;
   - approved destination terminology;
   - whether sidebar groups may become collapsible.
4. Confirm analytics or operational feedback sources, if any, before navigation restructuring.
5. Preserve the existing ten-persona route sweep as the functional baseline.

### Deliverable

Add a `Decision register` section to this plan or a short linked document. Do not encode unresolved decisions as comments scattered across components.

### Gate

Phases 2, 3, and 5 do not begin until their relevant decisions have an explicit recommended choice or product-owner answer.

---

## Phase 1 — Accessibility and field clarity

Findings: UX-08, UX-09, UX-11

Priority: First implementation phase.

Expected effort: Medium.

Product dependency: None.

This phase contains low-risk improvements that can ship independently of information-architecture decisions.

### Workstream 1A — Add a semantic Messages heading

Primary files:

- `src/views/messages/components/MessagesLayout.js`
- `src/views/messages/components/__tests__/MessagesLayout.test.jsx`

Implementation:

1. Change the visual `Messages` card title from a generic `span` to a semantic heading.
2. Prefer an `h1` with compact utility classes such as `h6 mb-0` because the card is the page shell.
3. If heading-level hierarchy elsewhere requires `h2`, add a visually hidden `h1` named `Messages` and keep the card title as `h2`. Use exactly one page-level `h1`.
4. Preserve unread badge alignment and the full-height messaging layout.
5. Give the create-chat action a clear relationship to the heading region.

Tests:

- page exposes one `Messages` heading;
- unread badge remains visible when count is non-zero;
- Create Chat remains keyboard reachable;
- mobile thread Back behavior is unchanged.

Acceptance criteria:

- `/messages` exposes a unique page heading in the accessibility tree;
- no height, overflow, or two-pane-layout regression occurs at 390, 768, or 1440 widths.

Rollback boundary: semantic markup only; no messaging data or polling changes.

### Workstream 1B — Complete coarse-pointer touch-target coverage

Primary files:

- `src/scss/components/_touch-targets.scss`
- `src/components/CreateActionButton.js`
- `src/components/EditControls.js`
- `src/components/BackButton.js`
- `src/components/TableFilters.js`
- `src/components/PwaInstallBanner.js`
- component tests under `src/components/__tests__`.

Implementation approach:

1. Add stable primitive classes rather than selecting controls by English labels:
   - `create-action-button`;
   - `edit-controls__action`;
   - existing `back-button`;
   - existing filter trigger class;
   - existing PWA dismiss class.
2. Under `@media (pointer: coarse)`, enforce a minimum 44x44 CSS-pixel hit area for these primitives.
3. Keep compact visual appearance by using transparent hit padding where appropriate; do not enlarge typography merely to meet target size.
4. Ensure adjacent targets retain at least a small gap and do not overlap.
5. Verify icon-only controls still have accessible names.
6. Check card-header actions where increasing height could enlarge the whole header; use alignment and hit-area wrappers if necessary.
7. Do not apply a global `.btn { min-height: 44px }`, which would make dense desktop/admin surfaces unnecessarily large.

Consumer review:

- primary Apply/Create actions;
- section actions such as Assign Salary and Configure Holidays;
- Edit/Save/Cancel controls in settings;
- Back buttons in detail/form pages;
- filter drawer triggers;
- PWA banner dismissal;
- row-action menus, which already have coverage and should not change.

Tests:

- primitive class tests verify the stable class contract;
- a coarse-pointer Playwright context measures bounding boxes of representative controls;
- keyboard focus remains visible;
- no header wrapping at 320 and 390 widths.

Acceptance criteria:

- representative create, edit, back, filter, and dismiss controls have at least a 44x44 hit area on coarse pointers;
- desktop fine-pointer controls retain their current density;
- target enlargement creates no horizontal overflow at 320px.

Rollback boundary: each primitive class can be reverted independently; avoid one broad selector whose rollback affects unrelated buttons.

### Workstream 1C — Replace clipped search placeholders with stable search scope

Primary files:

- `src/components/TableFilters.js`
- User Management table section;
- Staff Leave records/assignments/holidays;
- Staff Overtime records;
- Salary records/claims/assignments;
- Payroll and self-service Leave/Overtime lists;
- relevant TableFilters and module tests.

Shared API recommendation:

```text
searchLabel="Search assignments"
searchPlaceholder="Name, ID, team, or leave type"
searchHelp="Searches assignment ID, employee, leave type, and team."
```

Implementation:

1. Extend `TableFilters` with an accessible, stable `searchLabel`.
2. On desktop, the label may be visually compact or visually hidden where card context is sufficient.
3. In the mobile filter/search layout, show a short label or ensure it remains available to assistive technology after typing.
4. Shorten placeholders to task nouns:
   - `Search users`;
   - `Search leave records`;
   - `Search assignments`;
   - `Search holidays`;
   - `Search claims`;
   - `Search overtime records`.
5. Move the detailed list of searchable fields into helper text, tooltip, or filter-drawer copy only where users need it.
6. Do not change backend search semantics or query parameters.
7. Apply terminology consistently with the approved Phase 3 glossary when possible; if Phase 3 is not yet approved, use neutral existing nouns and avoid premature renaming.

Tests:

- `TableFilters` associates label and input correctly;
- purpose remains available when the input contains text;
- 320px screenshot shows no clipped primary search label;
- debouncing and filter behavior remain unchanged.

Acceptance criteria:

- every high-use record search has a persistent accessible name describing the collection;
- placeholders are short enough to be useful at 320px;
- users can still discover supported fields without relying on placeholder text.

### Phase 1 merge gate

- focused component/module tests pass;
- touched-file ESLint passes;
- Messages, search, and touch-target screenshots pass at 320/390/768/1440;
- no API or route changes;
- keyboard walkthrough completed for Messages and one representative filter surface.

---

## Phase 2 — Reduce mobile interruption and top-chrome density

Findings: UX-07, UX-10

Priority: Second.

Expected effort: Medium.

Product dependency: install-promotion and permanent-skip decisions.

### Workstream 2A — Simplify PWA install promotion

Current behavior:

- a global mobile banner appears until permanently dismissed;
- `Install VMECC` also remains available in navigation;
- the banner can consume roughly 94px before task content.

Recommended policy:

1. Keep `Install VMECC` in navigation while the app is not installed.
2. Remove the global banner from every module page.
3. If proactive promotion is still required, show it only on Dashboard after the first successful visit and only when:
   - the device is mobile-like;
   - the app is not installed;
   - the user has not dismissed or deferred it;
   - no onboarding or other blocking modal is active.
4. Prefer a compact single-line dashboard card/banner rather than a global shell banner.
5. Keep iOS manual instructions and native Android install handling in the existing provider/modal.

Alternative if the global banner must remain:

- introduce `lastShownAt`, `dismissedAt`, and a conservative cooldown;
- show at most once per defined period;
- collapse copy and actions into one row at 390px;
- never show simultaneously with onboarding.

Primary files:

- `src/components/PwaInstallBanner.js`
- `src/hooks/usePwaInstallPrompt.js`
- `src/layout/DefaultLayout.js`
- optionally Dashboard if promotion moves there;
- PWA hook/banner tests.

Storage considerations:

- existing `vmecc-pwa-install-dismissed` is a permanent boolean;
- if cooldown is chosen, migrate safely to a versioned record;
- malformed or unavailable storage must fail quietly;
- installation events must clear promotion UI immediately.

Tests:

- installed/standalone mode never promotes;
- dismissed users do not see promotion on returning sessions;
- navigation install action remains available when appropriate;
- iOS and Android instruction flows remain correct;
- banner/card does not appear over onboarding;
- storage migration handles the existing boolean key.

Acceptance criteria:

- returning mobile users reach module content without install-promotion chrome;
- install remains discoverable through navigation;
- the same session never shows two equally prominent install entry points in the content shell.

### Workstream 2B — Shorten mobile module header copy

Primary files:

- `src/components/ModulePageHeader.js`
- module page call sites with subtitles;
- shell/foundation SCSS;
- shared primitive tests.

Recommended API:

```text
subtitle="Full desktop context"
mobileSubtitle="Short mobile context"
```

Implementation:

1. Keep full desktop subtitles where they explain scope.
2. Supply short mobile subtitles only for modules that currently wrap beyond two lines.
3. Do not globally hide all subtitles; some contain important safety or workflow context.
4. Avoid CSS line-clamping meaningful instructions without an expansion path.
5. Keep titles, primary actions, and validation/status messages visible.

Initial candidates:

- Staff Leave Management;
- Salary & Claims Management;
- Settings;
- User Management;
- Payroll, Leave, and Overtime where copy repeats visible tabs/card titles.

Acceptance criteria:

- first task control appears materially earlier at 390x844;
- no mobile subtitle exceeds two lines on the selected high-use pages;
- desktop explanatory copy remains unchanged.

### Workstream 2C — Make onboarding timing and dismissal unambiguous

Primary files:

- `src/components/onboarding/TrtProfileCompletionOnboarding.js`
- `src/onboarding/trtProfileCompletion.js`
- onboarding API/storage helpers;
- onboarding component/domain tests.

Recommended interaction:

- Primary: `Complete profile`.
- Secondary: `Remind me later` with a documented snooze interval.
- Remove `Skip for now` if it means permanent dismissal but is visually indistinguishable from defer.
- If permanent dismissal is a required product capability, label it explicitly (`Don't remind me again`) and place it behind a secondary confirmation or profile setting.

Trigger policy:

1. Show the automatic prompt only on Dashboard or Profile/Security entry points.
2. Do not open it on Leave, Overtime, Payroll, Inspection, Reports, Messages, or record-detail routes.
3. Do not open while another modal, drawer, unsaved-change dialog, or install promotion is active.
4. Keep a visible Profile completion entry point so deferred users can resume intentionally.
5. Map Escape/backdrop/header close to one documented defer behavior; do not silently close without persisting suppression.

State requirements:

- `snoozed` remains time-bound;
- `dismissed` remains permanent only if explicitly selected;
- local fallback and server state keep the same meaning;
- failed persistence should not trap users in a repeatedly reopening modal during the same session.

Tests:

- route eligibility matrix for automatic prompting;
- Complete, Remind Later, and optional permanent-dismiss behavior;
- Escape/backdrop/close mapping;
- server failure with local fallback;
- no prompt during operational routes;
- completed profiles never prompt.

Acceptance criteria:

- every close/defer choice communicates and persists a distinct outcome;
- onboarding never interrupts an operational task route;
- deferred users have a clear manual resume path.

### Phase 2 merge gate

- decision register updated;
- PWA and onboarding tests pass;
- first-screen mobile screenshots show reduced chrome;
- operational-route E2E checks confirm no automatic onboarding;
- route sweep remains clean.

---

## Phase 3 — Terminology and module-boundary clarification

Findings: UX-03, UX-12

Priority: Third.

Expected effort: Medium.

Product dependency: required.

### Decision: preserve or consolidate Salary modules

Recommended choice for this phase: **preserve the existing functional split and clarify it through language**.

Rationale:

- canonical routes and sidebar activation already work;
- records and configuration have different permissions and user goals;
- consolidating them would create avoidable route, active-state, and authorization risk;
- clearer names can solve most of the observed ambiguity.

Recommended display model:

| Current            | Recommended destination label | Action language                      |
| ------------------ | ----------------------------- | ------------------------------------ |
| Salary & Claims    | Payroll Records               | Review claims / View salary record   |
| Salary Settings    | Payroll Configuration         | Assign salary / Update overtime rate |
| Set Salary         | Salary Assignments            | Assign salary                        |
| Set OT Rate        | Overtime Rates                | Add or update rate                   |
| Set Leaves         | Leave Entitlements            | Assign entitlement                   |
| Set Holidays       | Holidays                      | Configure holidays                   |
| Company Legal Info | Company Information           | Edit company information             |
| Reporting Settings | Reporting Workflow            | Configure workflow                   |

The final wording requires product-owner sign-off before implementation.

### Implementation tasks

Primary files:

- `src/_nav.js`
- `src/routes.js` route display names only;
- Leave Management tab configuration;
- `SalaryClaimsTabsNav.js`;
- Salary/Claims page headings and card titles;
- Reporting Settings headings/navigation;
- confirmation messages, empty states, and tests that assert labels.

Tasks:

1. Create a terminology map in one test fixture or documentation section before editing strings.
2. Change visible labels consistently across:
   - sidebar;
   - mobile menu;
   - page heading/subtitle;
   - tabs/mobile selectors;
   - card title;
   - primary action;
   - empty state;
   - confirmation modal;
   - exported UI labels where user-facing.
3. Preserve URLs such as `/staff/set-salary` and `/staff/leave-management/set-leaves` unless there is a separately approved migration.
4. Preserve legacy redirects.
5. Do not change permission keys or module-activation keys to match display terminology.
6. Verify breadcrumb names derived from `routes.js`.
7. Update tests and E2E selectors to prefer stable `data-testid` values rather than visible text where wording is not the behavior under test.

Tests:

- sidebar/mobile-menu visibility and active-state tests;
- Salary records/configuration route tests;
- Leave Management tab routing tests;
- legacy redirect tests;
- breadcrumb/page heading assertions;
- ten-persona route sweep.

Acceptance criteria:

- destination labels are nouns; buttons are verbs;
- records and configuration are clearly distinguishable;
- one concept has one display name across navigation and content;
- no URL, permission, or module-activation regression.

Rollback boundary: display-label changes should be separable from any optional sidebar regrouping.

---

## Phase 4 — Standardize contextual action hierarchy

Finding: UX-13

Priority: Fourth.

Expected effort: Medium.

Product dependency: limited to deciding which actions are essential.

### Shared action model

Extend `CreateActionButton` from the current binary `primary/inline` model to explicit semantic levels:

```text
importance="page-primary" | "section-primary" | "inline"
```

Suggested behavior:

- `page-primary`: filled primary button in `ModulePageHeader`;
- `section-primary`: outlined or softly filled button in a card header;
- `inline`: link-like Add/Edit control inside an already populated section;
- destructive actions continue to use dedicated danger/confirmation patterns, not CreateActionButton.

### Consumer classification

Inventory all current `CreateActionButton` consumers and classify by task:

1. Page creation: Create User, Apply Leave, Apply Claim, New Inspection.
2. Section configuration: Assign Entitlement, Configure Holidays, Assign Salary.
3. Repeated inline additions: Add Allowance, Add Location, Add Type.
4. Empty-state recovery: the only action available when a collection is empty.

Rules:

- only one page-primary action per page region;
- section-primary is used when the section cannot be useful without the action;
- inline remains quiet for repeated row/item additions;
- secondary exports/imports remain secondary;
- overflow menus contain rare or administrative actions.

### Implementation tasks

- update `CreateActionButton` API and backwards compatibility;
- add stable semantic classes;
- migrate high-value section actions first;
- align icon sizing and loading/disabled behavior;
- ensure empty-state calls to action use section-primary;
- document examples in component tests rather than creating a separate design-system site.

Tests:

- primitive renders correct hierarchy and accessible state;
- representative page headers contain at most one page-primary action;
- empty collection action remains discoverable;
- phone wrapping and coarse-pointer targets pass.

Acceptance criteria:

- action prominence reflects task importance, not whichever helper a module happened to use;
- empty configuration sections have an obvious next step;
- populated dense sections do not become visually noisy.

Rollback boundary: migrate consumers in small batches; keep compatibility mapping for existing `importance="primary"` until all callers are updated.

---

## Phase 5 — Simplify broad-access desktop navigation

Finding: UX-14

Priority: Fifth.

Expected effort: Medium.

Product dependency: terminology and navigation-structure approval.

### Preconditions

- Phase 3 terminology is complete.
- Active-route coverage exists for all sidebar destinations.
- Role-specific screenshots are available.

### Recommended direction

Do not immediately collapse everything into a single Settings destination. Preserve task proximity but reduce scanning cost through clearer grouping and icon differentiation.

Proposed groups:

1. Home: Dashboard, Messages.
2. Reporting: Inspection, ERCO, Drill, Fitness Test.
3. People and Operations: Staff Directory, Leave Management, Overtime Management.
4. Payroll: Payroll Records, Payroll Configuration.
5. Teams and Scheduling: Team Directory, Roster Management, Shift Settings.
6. Administration: Users, Audit, Ask AI administration, Feedback, System Settings.

Place `Install VMECC` as an action at the bottom or in the account/menu area rather than between core Home destinations if Phase 2 retains it.

### Implementation tasks

1. Update `_nav.js` grouping and ordering only after product sign-off.
2. Replace repeated low-information icons with distinct existing Lucide icons where a meaningful match exists.
3. Avoid inventing decorative icons solely to make every row unique.
4. Consider collapsible groups only for broad-access roles and only if expanded-state persistence is reliable.
5. Preserve role/module filtering in `getVisibleNavigationWithOptions`.
6. Preserve PWA action handling and active-prefix logic.
7. Ensure mobile menu grouping mirrors the sidebar mental model.
8. Test narrow desktop heights, because internal sidebar scrolling remains necessary for System Administrator.

Tests:

- role visibility matrix for all configured personas;
- exactly one active item per route;
- group titles with no visible children are removed;
- PWA action still invokes install experience;
- keyboard navigation and sidebar scrolling;
- desktop heights 600, 768, and 1000px;
- mobile menu parity.

Acceptance criteria:

- frequent operational destinations require no additional click;
- records and configuration destinations are distinguishable;
- broad-access users scan fewer ambiguous Settings/clipboard/flag rows;
- no empty navigation headings or inaccessible destinations appear.

Rollback boundary: grouping/order and icon changes should be separate commits so visual icon issues can be reverted without undoing information architecture.

---

## Phase 6 — Regression harness and audit closure

Priority: Required after Phases 1–5.

Expected effort: Small–medium.

### Automated coverage

1. Add a focused UI/UX Playwright spec covering:
   - page heading existence;
   - coarse-pointer target measurements;
   - mobile search label visibility;
   - PWA/onboarding mutual exclusion;
   - terminology and active navigation;
   - absence of horizontal document overflow.
2. Use stable roles, accessible names, and test IDs. Avoid pixel-perfect full-page snapshots for highly dynamic data.
3. Keep selected visual reference captures for shared primitives and high-risk routes.
4. Continue capturing unexpected denied API responses in the full route sweep.

### Manual coverage

- keyboard-only pass for Messages, filters, onboarding, and sidebar;
- screen-reader heading/label spot check;
- touch pass at 320 and 390 widths;
- desktop scan at 1440 width and 600px height;
- returning-session check for PWA and onboarding suppression.

### Closure criteria

- each remaining audit finding has evidence and status;
- no new P1 issue is introduced;
- focused tests, lint, build, and route sweep pass;
- product decisions are recorded;
- the audit document reflects completed versus deferred work accurately.

---

## Recommended change sequence

### Change 1 — Semantic heading and primitive touch targets

- UX-11 plus the shared portion of UX-08.
- Low product risk; establishes primitives used by later phases.

### Change 2 — Search-label migration

- UX-09.
- Migrate shared TableFilters first, then high-use modules in batches.

### Change 3 — PWA promotion policy

- UX-07 install portion.
- Requires decision-register entry before code.

### Change 4 — Onboarding trigger and dismissal semantics

- UX-10.
- Keep separate from PWA work even though mutual exclusion is tested together.

### Change 5 — ModulePageHeader mobile copy

- remaining UX-07 copy density.
- Small module batches to avoid broad copy churn.

### Change 6 — Terminology normalization

- UX-03 and UX-12.
- Display labels only; preserve routes and permissions.

### Change 7 — Action hierarchy

- UX-13.
- Shared API, then consumer batches.

### Change 8 — Sidebar grouping and icons

- UX-14.
- Last structural phase because it depends on approved terminology.

### Change 9 — Closure regression suite

- Phase 6 automation, final sweep, and audit status update.

## Verification matrix

| Surface                      | 320              | 390              | 768      | 1024      | 1440      | Keyboard | Role                   |
| ---------------------------- | ---------------- | ---------------- | -------- | --------- | --------- | -------- | ---------------------- |
| Messages                     | Required         | Required         | Required | Optional  | Required  | Required | Representative         |
| User Management filters      | Required         | Required         | Required | Optional  | Required  | Required | System Administrator   |
| Leave entitlements/records   | Required         | Required         | Required | Optional  | Required  | Required | Human Resource         |
| Salary records/configuration | Required         | Required         | Required | Required  | Required  | Required | HR/Finance             |
| PWA promotion                | Required         | Required         | Optional | No banner | No banner | Required | Any installable user   |
| TRT onboarding               | Required         | Required         | Required | Optional  | Required  | Required | TRT incomplete profile |
| Sidebar                      | N/A; mobile menu | N/A; mobile menu | Required | Required  | Required  | Required | System Administrator   |

## Proportional verification commands

Use focused tests per change, followed by shared checks at phase boundaries:

```text
npx vitest run src/views/messages/components/__tests__/MessagesLayout.test.jsx
npx vitest run src/components/__tests__/uiDebtPrimitives.test.jsx
npx vitest run src/components/__tests__/PwaInstallBanner.test.jsx
npx vitest run src/hooks/__tests__/usePwaInstallPrompt.test.jsx
npx vitest run src/components/onboarding/__tests__/TrtProfileCompletionOnboarding.test.jsx
npx vitest run src/utils/__tests__/navigation.test.js
```

At the end of each phase:

1. run ESLint on touched files;
2. run the relevant coarse-pointer/keyboard Playwright checks;
3. visually inspect changed surfaces;
4. run the production build when shared primitives or SCSS changed.

At final closure:

1. run the ten-persona authenticated route sweep;
2. run focused Leave/Overtime/Payroll/Settings/Messages E2E coverage;
3. run the broader frontend test suite if shared-component changes show cross-module coupling;
4. restore generated build artifacts if they are verification-only and not intended for delivery.

## Definition of done

Post-P1 work is complete when:

- all P2 items are completed or explicitly deferred by product decision;
- P3 action/sidebar work is completed or recorded as accepted debt;
- mobile users reach task content without avoidable promotional or explanatory obstruction;
- controls, headings, and search fields meet the documented accessibility contract;
- records, settings, destinations, and actions use consistent language;
- navigation remains permission-aware and route-correct;
- focused tests, lint, production build, visual checks, and route sweep pass;
- pre-existing unrelated worktree changes remain untouched.

## Verification record — 2026-07-13

- Focused UI/UX, onboarding, sidebar, mobile-menu, salary-navigation, and navigation utility suites: **47 tests passed across 7 files**.
- ESLint on all post-P1 implementation files: **passed**.
- Production Vite build: **passed**; only the existing dynamic/static import and large-chunk advisory warnings remain.
- `git diff --check`: **passed**.
- The initial broader Vitest sample exposed Inspection snapshot changes from the new semantic action classes. Those intended baselines were updated and the final repository-wide release run passed, as recorded below.
- The initial implementation pass did not rerun the authenticated browser sweep. The completion re-audit below subsequently ran it against local frontend/backend services and recorded a clean 29-route result.
- Generated build artifacts were restored/removed after verification. Pre-existing unrelated worktree deletions were not modified.

### Completion re-audit and polish

The implementation was re-audited against each finding after the initial closure. The following residual issues were found and fixed:

- removed inline filter-trigger minimum dimensions that prevented the coarse-pointer stylesheet from producing a true 44x44 target;
- forwarded stable search labels through both Leave record wrappers and replaced the remaining long Leave placeholder;
- changed Staff Leave Management's long phone navigation set to a labeled mobile selector;
- migrated the final `importance="primary"` consumers to explicit page-primary or section-primary levels;
- allowed Leave Entitlements, Holidays, and Salary Assignments card headers to wrap safely at narrow widths;
- normalized the remaining command-style destinations to `Overtime Rules` and `Roster Schedule`;
- added `tests/e2e/uiux-post-p1-polish.spec.js` for touch geometry, search clarity, horizontal overflow, operational-route onboarding, global PWA-banner absence, payroll terminology, active navigation, and Messages heading coverage when the module is enabled.

Final evidence:

- focused component coverage: **35 tests passed across 4 files**;
- focused post-P1 browser coverage: **3 passed, 1 conditionally skipped** because Messages is disabled in the current local module-activation fixture;
- Messages semantic heading component coverage remains passing;
- authenticated UI route sweep: **29 persona-route combinations, 0 failures**;
- touched-file ESLint: **passed**;
- production Vite build: **passed** with only existing bundle advisory warnings;
- `git diff --check`: **passed**.

### Deployment release gate

The `DEPLOYMENT.md` frontend release workflow was executed before commit:

- `npm ci`: **passed**;
- full ESLint: **passed**;
- repository-wide Vitest run using the Windows-stable thread pool: **424 suites, 1,227 tests, and 64 snapshots passed**;
- `npm audit --audit-level=high`: **passed** with no high-severity findings; npm reports one low-severity development-server advisory in `esbuild`;
- `npm run build -- --mode production`: **passed**;
- production `build/.htaccess`: **present**;
- production API asset check: **passed** with `https://vmecc-api.amiosh.com/api` present and no `localhost:8000` or `127.0.0.1:8000` references.
