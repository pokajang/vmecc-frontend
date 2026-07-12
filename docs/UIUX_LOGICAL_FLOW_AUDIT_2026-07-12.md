# VMECC Frontend Logical UI/UX Flow Audit

Date: 2026-07-12

Scope: `vmecc-frontend` page structure, action hierarchy, workflow sequencing, responsive layout, navigation context, and common web-application conventions.

Original audit policy: Audit only. The audit pass changed no product code; the later P1 implementation is recorded in the closure update below.

P1 closure update (2026-07-13): UX-01, UX-02, UX-04, and UX-05 were implemented and verified. UX-03 was revalidated as a working redirect/active-state design and demoted to P2 information architecture.

Post-P1 closure update (2026-07-13): UX-03 and UX-07 through UX-14 were implemented. Records/configuration remain separate destinations with clearer language; global PWA promotion was removed from the shell; onboarding is route-aware; shared heading, search, touch-target, mobile-copy, action-hierarchy, and sidebar conventions are now explicit.

Completion re-audit (2026-07-13): browser verification exposed and closed two residual implementation gaps: the mobile filter trigger's inline minimum dimensions had overridden the coarse-pointer 44x44 contract, and a wrapped Leave-record surface still supplied a long placeholder without forwarding its collection-specific search label. The pass also completed legacy action-level migration, added a mobile Leave Management selector, normalized `Overtime Rules` and `Roster Schedule`, and hardened narrow card-header wrapping. The corrected authenticated sweep covered 29 persona-route combinations with zero failures.

## Executive verdict

VMECC has a sound UI foundation and is substantially more consistent than a typical organically grown operations application. Shared page headers, route-backed navigation, responsive record collections, filter drawers, row actions, and mobile-specific inspection/roster views are already present.

The main remaining problem is not visual styling. It is **competing navigation and action models**:

- some creation tasks are both a primary button and a peer tab;
- salary records and salary settings are split into closely related sidebar modules;
- long tab rails conceal destinations on phones;
- fixed mobile form actions compete with the persistent bottom navigation and cover the form being completed;
- small inline actions do not always receive the same hierarchy or touch treatment as primary actions.

No P0 issue was found. Three P1 UI workflow issues and one P1 reliability issue should be addressed before another broad visual-polish pass.

## Evidence and coverage

- Reviewed all 96 route declarations in `src/routes.js`, including redirects, detail pages, and legacy aliases.
- Reviewed sidebar information architecture and active-route logic in `src/_nav.js` and `src/components/AppSidebarNav.js`.
- Audited shared page, navigation, form-action, filter, record-list, row-action, and responsive primitives.
- Searched 695 JavaScript files under `src/views` for locally implemented tables, button groups, navigation, forms, and action placement.
- Ran the authenticated Playwright role/route sweep across ten configured personas.
- Attempted 60 representative captures at 1440x1000 and 390x844; 56 rendered successfully.
- Captured focused completed form layouts for Leave and Overtime on desktop and touch-emulated mobile.
- Inspected loading, empty, list, create, settings, dashboard, directory, roster, inspection, and management page archetypes.

The Messages page and the Admin persona's Shift Settings route did not satisfy the audit harness's semantic-heading readiness condition. Messages was inspected statically; the Shift Settings timeout appears permission/persona-related and is not treated as a visual defect.

## Strengths to preserve

1. Desktop Leave and Overtime forms place `Clear form`, `Save draft`, and `Submit request` together after the final field. Submit placement is correct.
2. Desktop multi-action groups generally stay in one row. Phone layouts deliberately adapt rather than blindly inheriting desktop tables.
3. `ModulePageHeader`, `FormActionGroup`, `CreateActionButton`, `TableFilters`, `ResponsiveRecordCollection`, and `MobileRecordList` provide a credible consistency layer.
4. Leave and Overtime type selection is clear: descriptive desktop cards become compact two-column phone choices.
5. List pages generally follow a recognizable title → navigation → card → filters → records sequence.
6. Destructive workflow actions are normally confirmed and separated from ordinary editing.

## Prioritized findings

### UX-01 — Fixed mobile form actions obscure the form and compete with bottom navigation

Severity: **P1**

Status: **Completed 2026-07-13.** Data-entry forms now use explicit in-flow actions; selection steps opt into sticky behavior; inspection compact-sticky behavior remains explicit.

Affected: Leave application, Overtime application, and any screen using the default mobile `FormActionGroup` behavior.

Evidence: `src/components/FormActionGroup.js`, `src/scss/components/mobile-nav/_action-row.scss`, `src/views/leave/components/LeaveApplySection.js`, `src/views/overtime/components/OvertimeApplySection.js`.

At phone width the action group becomes fixed above the 64px bottom navigation. The two persistent bars consume roughly 120–130px of an 844px viewport and float over fields while the user is still entering dates, times, reasons, and evidence. The controls are logically at the bottom of the DOM but visually appear halfway through the form throughout scrolling.

This makes commitment actions visible before the user has reached or understood later inputs and fragments the reading flow. The spacer only protects the end of the document; it does not prevent mid-form content from passing behind the fixed bars.

Recommendation:

- Keep one persistent dock rather than two competing layers.
- Prefer an in-flow form footer for ordinary forms.
- If a sticky action is required, dock it as part of the mobile shell, reserve its full height continuously, and show only the primary action plus one secondary action.
- Move `Clear form` into an overflow/secondary area or show it only once the form is dirty.

Acceptance criteria:

- No input, label, validation message, upload control, or modal trigger is hidden by either dock at 320px and 390px.
- Users can see the current field and its error while actions remain available.
- The form has one visually dominant submit action.

### UX-02 — Creation tasks are presented as both tabs and primary buttons

Severity: **P1**

Status: **Completed 2026-07-13.** Leave and Overtime command tabs were removed; Payroll retains only Claim Records and Payslips peer tabs and hides them during claim creation.

Affected: `/leave`, `/overtime`, `/payroll`; similar duplication should be checked in Inspection.

Evidence: `src/views/leave/Leave.js`, `src/views/overtime/Overtime.js`, `src/views/payroll/Payroll.js`, `src/views/payroll/components/PayrollNav.js`.

Examples:

- `Apply Leave` is a primary header button and `Apply leave` is a tab.
- `Apply Overtime` is a primary header button and `Apply overtime` is a tab.
- `Apply Claim` is a primary header button and `Apply Claim` is a tab.

Tabs communicate switching between peer information views. Apply/Create is a task transition. Showing the same transition in both places creates redundant emphasis and makes the selected tab row change meaning from navigation to workflow progress.

Recommendation:

- Keep `Leave records`/`Payslips`-style destinations as tabs.
- Keep Apply/Create as the single primary page action.
- Once inside creation, replace the tab-active treatment with a form title and breadcrumb/back link.

Acceptance criteria:

- Each creation workflow has one obvious entry point per page.
- No visible region contains duplicate Apply/Create labels for the same transition.
- Tabs represent peer destinations rather than commands.

### UX-03 — Salary navigation ownership is split across closely related modules

Severity: **P2 information architecture**

Status: **Completed 2026-07-13.** The functional and permission split is preserved, while visible destinations are now `Payroll Records` and `Payroll Configuration`; legacy URLs remain stable.

Affected: Salary records and settings.

Evidence: `src/_nav.js`, `src/routes.js`, `src/components/AppSidebarNav.js`, `src/views/staff/salary-claims-management/components/SalaryClaimsTabsNav.js`.

The sidebar splits `Salary & Claims` and `Salary Settings`, while both route groups render `SalaryClaimsManagement` and use closely related tabs and page language. This makes the product boundary less obvious than the code boundary.

Deeper route validation confirmed that active-state handling is correct: legacy `/staff/salary-claims/set-*` URLs redirect to canonical `/staff/set-salary/*` URLs, and `Salary Settings` becomes active. This is therefore not an active-route defect and should not trigger P1 route refactoring.

Recommendation:

- Keep the existing redirects and active-state behavior.
- During terminology cleanup, either make the two page shells more distinct (`Salary & Claims` versus `Salary Configuration`) or consolidate them only if user research shows the split is confusing.
- Do not combine this optional information-architecture cleanup with the P1 remediation unless the product owner explicitly chooses a new module boundary.

Acceptance criteria:

- Existing redirects and sidebar activation remain covered by tests.
- Page title, sidebar label, and tab grouping more clearly distinguish records from configuration.

### UX-04 — Long mobile tab rails conceal destinations without an overflow cue

Severity: **P1** for administrative workflows; **P2** elsewhere.

Status: **Completed for the reproduced P1 surfaces on 2026-07-13.** Settings and Salary Settings now use labeled mobile section selectors while retaining desktop underline tabs.

Affected examples: Settings and Salary settings at 390px and narrower.

Evidence: `src/components/ModuleNavTabs.js` uses `flex-nowrap overflow-auto`; Settings has four tabs and Salary settings has four long labels.

Rendered examples visibly cut off `Dashboard Visibility`, `Company Legal Info`, and following destinations. Horizontal scrolling technically works, but there is no fade, partial-card affordance, scrollbar, chevron, or compact alternative telling users more destinations exist.

Recommendation:

- At phone widths use a select/menu for four or more long administrative tabs, or show a scroll affordance and automatically bring the active item into view.
- Keep short two- or three-item tabs unchanged.

Acceptance criteria:

- A first-time user can discover every destination at 320px without guessing that the label row scrolls.
- The active destination is fully visible after direct navigation or refresh.

### UX-05 — Dashboard route sweep emits permission errors for most operational roles

Severity: **P1 reliability investigation**

Status: **Completed 2026-07-13.** The denied request was global message polling, not dashboard stats. Polling now waits for hydrated module activation and `self.messages`; the ten-persona route sweep passes without denied API responses.

Affected: Dashboard for System Administrator, Contract Manager, Human Resource, Admin, Incident Commander, Assistant Incident Commander, and Tactical Response Team in the configured smoke data.

The authenticated route sweep completed navigation but failed because dashboard visits emitted 403 resource errors for seven personas. Initial captures also showed multiple module cards in loading states. This may be an expected permission probe rather than user-visible failure, but expected denials should not surface as console errors or leave ambiguous loading UI.

Recommendation:

- Identify the denied endpoint per role.
- Do not request dashboard modules the user cannot view.
- Convert recoverable module failures into explicit unavailable/hidden states and ensure every loader settles.

Acceptance criteria:

- Allowed dashboard visits produce no unexpected 403 console errors.
- Every visible card resolves to content, empty state, or an intentional error state.

### UX-06 — Mobile form buttons have inconsistent heights in the same action row

Severity: **P2**

Affected: Leave and Overtime forms.

Evidence: the Save Draft button is wrapped in a `span` while its siblings are direct flex children.

In touch-emulated form captures, `Clear form` and `Submit request` stretch to the two-line row height while `Save draft` remains shorter and vertically floats between them. This is the exact kind of locally odd button grouping that makes an otherwise polished page look unfinished.

Recommendation:

- Give all action items the same wrapper contract and minimum height.
- Avoid a span solely for a test anchor; put the test identifier on the button or use a wrapper that participates consistently in the grid.

Acceptance criteria:

- All buttons in the action group share the same height, baseline, and vertical alignment at 320px and 390px.

### UX-07 — Mobile top chrome delays access to the actual task

Severity: **P2**

Status: **Completed 2026-07-13.** Global install promotion was removed from the application shell, navigation retains the install action, and selected high-use module headers now use concise mobile subtitles.

Affected: first-run mobile sessions across most modules.

The PWA install banner occupies about 94px and duplicates `Install VMECC` already available in navigation. Verbose module subtitles then wrap to three or four lines, followed by tabs. On several 390x844 screens, roughly the first third of the viewport is chrome before the record search or task content begins.

Recommendation:

- Persist dismissal reliably and apply a conservative frequency cap.
- Do not show both a persistent banner and equally prominent navigation action in the same session.
- Shorten or conditionally reduce generic subtitles on phones, especially after repeat visits.

Acceptance criteria:

- On a returning phone session, the first task control appears without a promotional banner.
- Module context remains understandable when subtitles are reduced.

### UX-08 — Touch-target treatment is incomplete for inline and header actions

Severity: **P2**

Status: **Completed 2026-07-13.** Stable primitive classes now receive 44x44 minimum coarse-pointer targets without globally increasing desktop button density.

Affected examples: `Apply Leave`, `Apply Claim`, `Assign Salary`, `Edit`, filter trigger, Back, and PWA dismissal.

The coarse-pointer stylesheet correctly enforces 44px on selected navigation, drawer, row-action, and form-action controls. It does not cover all `CreateActionButton`, `EditControls`, Back, or inline card-header actions. Several default implementations use compact 29–38px heights.

Recommendation:

- Apply a shared coarse-pointer minimum target to all interactive button primitives.
- Keep compact visual styling by increasing the hit area rather than necessarily increasing text size.

Acceptance criteria:

- All primary, edit, create, filter, dismiss, and back controls provide at least a 44x44 CSS-pixel hit area on coarse pointers, except where a documented accessibility exception applies.

### UX-09 — Mobile search fields rely on clipped placeholder text for scope

Severity: **P2**

Status: **Completed 2026-07-13.** High-use record searches now use short placeholders and persistent collection-specific accessible names; search behavior is unchanged.

Affected: User Management, Set Leaves, Salary Assignments, and other filter-drawer record lists.

At phone width, placeholders such as `Search assignment ID, employee, leave type, or team` are clipped before communicating the full search scope. The adjacent funnel button explains filtering but not what the search covers. Because no persistent label remains after typing, context is lost.

Recommendation:

- Use a short stable label such as `Search assignments` or `Search users`.
- Put supported fields in helper text or the filter drawer rather than a long placeholder.

Acceptance criteria:

- Search purpose remains clear when the field contains text and at 320px width.

### UX-10 — The onboarding prompt has too many overlapping dismissal paths

Severity: **P2**

Status: **Completed 2026-07-13.** Automatic prompting is limited to Dashboard and Profile/Security entry points, with `Complete profile` and one time-bound `Remind me later` path; modal close maps to defer.

Affected: incomplete Tactical Response Team profiles and potentially other first-run roles.

The welcome modal can be dismissed via the header close icon, `Remind me later`, or `Skip for now`. These choices are not clearly different, and the modal can interrupt entry into an unrelated task such as applying overtime.

Recommendation:

- Keep one primary action and one explicit defer action.
- Remove the duplicate close/skip semantics or explain the persistence difference.
- Trigger onboarding at a predictable entry point rather than during a task transition.

Acceptance criteria:

- Every dismissal choice has a distinct, understandable consequence.
- Onboarding does not unexpectedly cover an in-progress operational task.

### UX-11 — Messages lacks a semantic page heading

Severity: **P2 accessibility/structure**

Status: **Completed 2026-07-13.** The compact card title is now the unique page-level `h1`.

Affected: `/messages`.

Evidence: `src/views/messages/components/MessagesLayout.js` renders `Messages` in a generic `span` inside `CCardHeader` and does not use `ModulePageHeader` or an `h1`–`h3` heading.

The visual card title is understandable, but the page does not expose the same navigable heading structure as other modules. This also prevented a generic page-readiness audit from recognizing the screen.

Recommendation:

- Render the card title as an `h1` or `h2` with visually appropriate classes, or add a visually hidden page `h1` when the full-height messaging layout cannot accommodate a normal module header.

Acceptance criteria:

- The page exposes a unique `Messages` heading in the accessibility tree without changing the compact layout.

### UX-12 — Terminology mixes destinations, tasks, and configuration concepts

Severity: **P2**

Status: **Completed 2026-07-13.** Navigation and tabs use noun destinations such as `Leave Entitlements`, `Salary Assignments`, `Overtime Rates`, `Company Information`, and `Reporting Workflow`; action controls retain verb language.

Affected examples: `Set Leaves`, `Set Salary`, `Salary Settings`, `Salary & Claims`, and `Reporting Settings`.

`Set Leaves` actually manages entitlement assignments, while `Salary Settings` opens a page titled `Salary & Claims Management`. Some tabs use nouns (`Workflow Rules`, `Company Legal Info`) and others use commands (`Set Salary`, `Set OT Rate`). The mixed grammar makes module boundaries harder to learn.

Recommendation:

- Prefer stable noun destinations: `Leave Entitlements`, `Salary Assignments`, `Overtime Rates`, `Workflow Rules`, `Company Information`.
- Reserve verbs for buttons: `Assign entitlement`, `Assign salary`, `Update rate`.

Acceptance criteria:

- Sidebar and tab labels describe destinations; buttons describe actions.
- A concept uses the same name in navigation, heading, card title, and confirmation messages.

### UX-13 — Contextual creation actions use inconsistent visual hierarchy

Severity: **P3**

Status: **Completed 2026-07-13.** `CreateActionButton` supports page-primary, section-primary, and inline levels with legacy compatibility; high-value page and configuration actions were migrated.

Affected examples: `Create User` is a filled primary header action, while `Assign entitlement`, `Configure holidays`, `Assign Salary`, and several Add actions use small link-like controls in card headers.

Context sometimes justifies a quieter inline action, but the current default depends more on which helper was used than on task importance. On empty configuration pages, the only way forward can look like tertiary text.

Recommendation:

- Define explicit action levels: page-primary, section-primary, inline-add, and overflow.
- Use section-primary styling when the card is empty or the action is required to make progress.

### UX-14 — The desktop sidebar is long and repeats low-information icons

Severity: **P3**

Status: **Completed 2026-07-13.** Sidebar destinations are regrouped by user task, the install action is at the bottom, and ambiguous repeated icons were replaced while routes and permission filtering remain unchanged.

Affected: broad-access roles.

The sidebar is internally scrollable and contains several Settings-like destinations across different groups. Repeated gear, flag, and clipboard icons provide little extra information scent. This is not a blocker, but it increases scanning time for administrators.

Recommendation:

- Resolve the Salary/Settings ownership issue first.
- Then consider consolidating configuration destinations or using nested module settings while keeping frequent operational destinations top-level.

## Recommended remediation order

### Pass 1 — Workflow semantics and route ownership

1. Remove Apply/Create commands from tab rails where a primary button already exists.
2. Normalize destination terminology.
3. Treat Salary module-boundary cleanup as a separate P2 product decision; preserve current redirects during P1 work.

### Pass 2 — Mobile action and navigation geometry

1. Redesign the interaction between `FormActionGroup` and bottom navigation.
2. Fix equal-height action rendering.
3. Add a discoverable long-tab mobile pattern.
4. Complete coarse-pointer target coverage.

### Pass 3 — Page-level cleanup

1. Reduce first-screen mobile chrome.
2. Shorten search labels/placeholders.
3. Simplify onboarding dismissal.
4. Add the Messages semantic heading.

### Pass 4 — Reliability validation

1. Resolve dashboard permission probes/403 console errors.
2. Re-run the role sweep and capture settled content states.
3. Add focused visual regression coverage for shared mobile action bars and long tab rails.

## Suggested implementation boundaries

Most issues should be fixed through shared components rather than page-by-page CSS:

- `ModuleNavTabs`: mobile overflow strategy and active-item visibility.
- `FormActionGroup` plus `_action-row.scss`: dock ownership, spacing, equal-height children, and action priority.
- `CreateActionButton`, `EditControls`, and `BackButton`: coarse-pointer target contract.
- route/navigation metadata: preserve canonical redirects and active-state coverage while simplifying task navigation.

Page-specific changes should be limited to removing duplicate creation tabs, simplifying copy, correcting terminology, and supplying semantic headings.

## Verification notes

- The authenticated route sweep did not pass cleanly because of the dashboard 403 console responses described in UX-05.
- Four screenshot attempts timed out on the semantic-heading readiness condition; these were not counted as successful visual captures.
- No full unit, lint, or production build was run because this pass changed only documentation and audit harness files, not application code.
