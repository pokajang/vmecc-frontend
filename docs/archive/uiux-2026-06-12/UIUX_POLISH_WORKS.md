# UI/UX Polish Works

Date: 2026-06-11
Archived: 2026-06-15

Scope: `vmecc-frontend`
Audit type: UI/UX design, responsive behavior, interaction consistency, and frontend implementation polish.

Archive note: This is the final UI/UX closure ledger for the 2026-06-12 polish and simplification scope. It is archived with the mobile responsiveness audit and simplification ledger. New UI/UX work should use a new tracker rather than reopening this archived closure record.

## Executive Summary

The VMECC frontend UI/UX polish scope is closed for the current release. The app now has a consistent operational shell, aligned phone/tablet breakpoints, shared route navigation semantics, mobile record alternatives for the targeted dense surfaces, stronger page-level hierarchy, shared focus/touch hardening, and simplified workflow-heavy finance, report, roster, settings, dashboard, message, and admin experiences.

This document is now the active closure ledger. Older finding sections remain as historical context for what was fixed or intentionally reclassified. New UI/UX work after this release should be tracked in a new issue or planning document rather than reopening this closure ledger.

## Completion Status

Last updated: 2026-06-15

Final UI/UX closure status:

- [x] Aligned bottom-nav-dependent wrapper spacing and sticky form action behavior to the same below-`md` breakpoint as the mobile bottom navigation.
- [x] Updated mobile form action spacer visibility from below-`lg` patterns to below-`md` where it supports the sticky action bar.
- [x] Made Login and Reset Password auth pages scroll-safe on short mobile heights and keyboard-constrained viewports.
- [x] Removed decorative sidebar check badges and the Dashboard `NEW` badge.
- [x] Renamed `Inspect Area` to `Inspection`.
- [x] Pointed Inspection, ERCO, Drill, and Fitness Test sidebar entries to their module landing/records routes instead of direct create routes.
- [x] Reordered sidebar groups to `Home`, `My Work`, `Operations`, `Teams and Roster`, `Reports and Inspection`, and `Admin`.
- [x] Added a lightweight reusable module page header primitive.
- [x] Applied the new page header to Payroll, Leave, and Overtime.
- [x] Extended `CreateActionButton` with an optional `importance` prop while preserving the existing inline default.
- [x] Used stronger primary action treatment for `Apply Claim`, `Apply Leave`, and `Apply Overtime`.
- [x] Added a reusable mobile record-list/card primitive.
- [x] Applied mobile record cards to Leave and Overtime self-service records.
- [x] Removed incomplete tab ARIA semantics from Leave and Overtime route-backed module navigation.
- [x] Applied mobile record cards to Payroll claim records.
- [x] Removed incomplete tab ARIA semantics from Payroll route-backed module navigation.
- [x] Applied standard module page headers and primary create actions to Reports and Inspection.
- [x] Added a shared route-backed `ModuleNavTabs` primitive and applied it to Reports and Inspection.
- [x] Applied mobile record cards to Reports and Inspection records.
- [x] Replaced Reports and Inspection custom mobile filter modals with the shared `TableFilters` drawer and enabled visible desktop filter labels for those modules.
- [x] Applied standard module page headers to Staff Leave Management, Staff Overtime Management, Salary & Claims Management, Settings, Audit Logs, Staff Directory, and User Management.
- [x] Removed incomplete tab ARIA semantics from Staff Leave Management, Staff Overtime Management, Salary & Claims Management, and Settings route-backed navigation.
- [x] Applied mobile record cards to Staff Leave Management records, Staff Overtime Management records, Salary & Claims claim records, salary records, Audit Logs, and Staff Directory records.
- [x] Enabled visible desktop filter labels on Staff Leave, Staff Overtime, Salary & Claims, Audit Logs, Staff Directory, and User Management record filters.
- [x] Started workflow status readability work with a lightweight `WorkflowStatusSummary` primitive in dense operations record cards.
- [x] Applied standard module page headers to Team Directory, Team Detail, Roster Management, and Shift Settings.
- [x] Removed incomplete tab ARIA semantics from Roster Management route-backed navigation.
- [x] Added a dedicated mobile roster day-list below `md` while preserving the desktop roster matrix from `md` upward.
- [x] Added visible labels and wrapping behavior to Roster filters.
- [x] Added mobile cards for Custom Shifts below `md`.
- [x] Fixed TeamCard accessibility by separating team-open regions from edit buttons and adding keyboard activation.
- [x] Added active filter summaries/chips to shared `TableFilters` and the custom Roster filter.
- [x] Added mobile My Work shortcuts to the mobile navigation sheet while preserving existing permission filtering.
- [x] Added a dashboard action queue and moved dashboard period control to one global selector.
- [x] Added mobile cards for user session and user admin-activity history panels.
- [x] Upgraded single-select `IconOptionGrid` / `IconOptionCard` semantics to radio-group/radio behavior.
- [x] Added a small shared focus/token layer for custom controls and status tones.
- [x] Hardened mobile sticky form action spacing for wrapped action rows and short screens.
- [x] Broadened text-first workflow status summaries to self-service Leave, self-service Overtime, Reports, and Inspection dense record views while keeping full approval gates as secondary detail.
- [x] Added inline disabled-action reasons inside row action menus so touch users are not dependent on browser title tooltips.
- [x] Hardened Role Permission and Dashboard Visibility matrix tables with shared horizontal-scroll, sticky-column, wrapping, focus, and tokenized changed-state treatment while keeping them table-based by design.
- [x] Aligned Messages and notification drawer phone behavior to the shared below-`md` breakpoint policy.
- [x] Added shared focus-trap and return-focus handling to the mobile nav sheet, notification drawer, and shared mobile filter drawer.
- [x] Raised touched phone action targets to the 44px coarse-pointer baseline, including row actions and the shared mobile filter trigger.
- [x] Added a phone-only Payroll Payslips card layout with expandable stacked detail sections while preserving the desktop table from `md` upward.
- [x] Completed the simplification passes that closed dashboard mobile priority, salary read-only/detail stacked summaries, leave assignment phone summaries, settings role-focused editors, manager quick filters where backed by current state, and secondary admin/staff/team cleanup.
- [x] Source audit confirms no route-backed `role="tablist"` / `role="presentation"` strings remain under `src`.
- [x] Sticky action behavior is standardized through the shared phone-only `FormActionGroup` / `.action-row-thumb` pattern with below-`md` breakpoint alignment, safe-area spacing, `dvh` sizing, and spacer support.

Closed as post-release enhancements, not active UI/UX blockers:

- Broader brand/chart/print color token migration beyond the current focus, status, matrix, and control token layer.
- Full dark-mode launch. The first release remains light-first; dark mode should use a dedicated product/design pass.
- External visual-regression harness and wider production UX observation after deployment.

## Closure Verification

Closure date: 2026-06-15

Source verification:

- No unchecked UI/UX checklist markers remain in this active tracker.
- Source audit found no `role="tablist"` / `role="presentation"` route-backed navigation strings under `src`.
- The completed mobile audit and simplification ledger are archived under `docs/archive/uiux-2026-06-12/`.

Quality gates:

- Latest local frontend release gate passed with `npm ci`, `npm run lint`, `npm audit --audit-level=high`, full Vitest, production build, `.htaccess` presence check, production API URL check, and `git diff --check`.
- Production/server gates remain tracked separately in the workspace-level `PENDING_WORKS.md` and `DEPLOYMENT.md`.

## Product Shape Observed

The frontend is a React/Vite admin and operations application using CoreUI v5. Major user surfaces include:

- Dashboard
- Messages
- Payroll and payslips
- Leave self-service
- Overtime self-service
- Inspection
- ERCO, Drill, and Fitness Test reports
- Staff directory and staff management workflows
- Leave, overtime, salary, and claim administration
- Team and roster management
- User, audit, settings, and permission administration

This is an operations system. The correct UI direction is dense, scannable, role-aware, and workflow-first. The current implementation is aligned with that direction, but it needs a stronger design system and tighter responsive rules.

## Strengths To Preserve

### Workflow Completeness

The application already handles complex enterprise workflows better than a basic admin template:

- Draft save and restore are present across multiple modules.
- Submit, cancel, delete, approve, reject, and review actions use confirmation modals.
- Unsaved-change guards exist in workflow forms.
- Row actions are permission and status gated.
- Toast feedback is used for asynchronous operations.
- List/detail/create patterns are repeated across modules.

Preserve this workflow depth during polish. The work should simplify presentation without removing operational safeguards.

### Reusable Primitives Exist

The project already has useful shared primitives:

- `src/components/TableFilters.js`
- `src/components/DataTableFooter.js`
- `src/components/RowActions.js`
- `src/components/CreateActionButton.js`
- `src/components/FormActionGroup.js`
- `src/components/BackButton.js`
- `src/components/IconOptionGrid.js`
- `src/components/IconOptionCard.js`
- `src/components/ApprovalGates.js`

The next step is not to create a completely new UI system. The next step is to harden these primitives and migrate repeated module-specific patterns onto them.

### Mobile Foundation Exists

The app already includes:

- Mobile bottom navigation.
- Mobile menu/account sheet.
- Mobile filter drawer.
- Sticky form action area.
- Responsive table wrappers.
- Mobile-specific back behavior in messages.

This is a good foundation. The main mobile work is consistency, breakpoint correctness, and testing on realistic widths.

## Priority 0: Mobile And Responsive Polish

Mobile responsiveness should be treated as a release-quality issue, not cosmetic polish. This app contains many forms, tables, workflow actions, and approvals that users may need to complete outside a desktop environment.

### Finding 1: Breakpoint Mismatch Between Bottom Nav And Sticky Action Spacing

Severity: High
Status: Completed on 2026-06-11 and broadened on 2026-06-12. Bottom-nav-dependent shell spacing, sticky action behavior, Messages responsive state, Messages layout split, and notification drawer phone behavior now align to the below-`md` phone breakpoint policy.

Evidence:

- Mobile bottom nav is rendered with `d-flex d-md-none` in `src/components/AppHeader.js`.
- Global page bottom padding is applied under `lg` in `src/scss/style.scss`.
- Sticky `.action-row-thumb` behavior is also applied under `lg` in `src/scss/style.scss`.

Impact:

At widths between `md` and `lg`, the app can reserve bottom-nav spacing and float action bars as if mobile nav exists, while the actual bottom nav is not visible. This can make tablet layouts feel awkward: content ends too early, action bars sit unusually high, and forms feel less stable.

Recommendation:

- Align all mobile-bottom-nav-dependent behavior to the same breakpoint.
- If bottom nav is only below `md`, then bottom padding and sticky action bars should also activate below `md`.
- If the product wants tablet bottom nav, render the bottom nav below `lg` and verify the full tablet layout.

Suggested acceptance criteria:

- At 375px, bottom nav appears and form action bars avoid it.
- At 768px, behavior is intentional and consistent.
- At 1024px, desktop/tablet layout does not reserve invisible bottom-nav space.

### Finding 2: Sticky Mobile Action Bars Need Collision Testing

Severity: High
Status: Closed for the shared UI/UX scope on 2026-06-15. Breakpoints, safe-area spacing, shared spacer behavior, a larger wrapped-action spacer, and `dvh`-aware fixed action sizing are standardized through the shared phone-only action pattern. Future device-lab observations should be tracked as production QA findings, not as open polish backlog.

Evidence:

- `FormActionGroup` maps to `.action-row-thumb`.
- `.action-row-thumb` becomes fixed on smaller breakpoints.
- Many forms use `FormActionGroup`, including leave, overtime, payroll claim forms, salary assignment, and company legal info.

Impact:

Fixed action bars are useful, but they can cover validation errors, file upload status, long textareas, confirmation hints, or the last form fields. The current spacer helps, but because each module has different form density, this needs viewport testing.

Recommendation:

- Standardize one sticky action pattern.
- Ensure the sticky bar has a consistent safe-area offset.
- Ensure the spacer height exactly matches the action bar footprint.
- Confirm that the final field, validation feedback, and submit buttons remain visible on phones.

Suggested acceptance criteria:

- On 360px wide screens, no action bar covers field errors.
- On iOS Safari-style viewport heights, submit buttons remain reachable.
- On Android Chrome-style viewport heights, sticky actions do not overlap the keyboard-focused field.

### Finding 3: Dense Tables Are Technically Responsive But Not Always Mobile-Usable

Severity: High
Status: Completed for current known record-list surfaces on 2026-06-11 and expanded on 2026-06-12. A reusable mobile record-card primitive now exists and is used by Leave, Overtime, Payroll claim, Reports, Inspection, Staff Leave Management, Staff Overtime Management, Salary & Claims claim records, salary records, Audit Logs, Staff Directory records, user session history, and user admin-activity history below `md`. Roster has a dedicated mobile day-list below `md`, Custom Shifts have mobile cards, TeamCard accessibility was polished, and Payroll Payslips now has phone-only cards with stacked detail sections. Complex settings matrices remain table-based by design and now have shared horizontal-scroll, sticky-column, wrapping, focus, and tokenized changed-state hardening.

Evidence:

- Many record sections use `CTable responsive`.
- Tables contain many columns: IDs, type, reason, start, end, duration, status, actions, workflow gates.
- Modules affected include overtime, leave, payroll claims, salary records, inspection records, report records, audit logs, users, and roster views.

Impact:

Horizontal scrolling works mechanically, but it is often not the best mobile UX. Users need to inspect status and take action quickly. On a phone, wide tables can hide the most important information off-screen.

Recommendation:

- Use mobile card rows for high-volume workflow record lists.
- Keep desktop tables for desktop.
- For mobile list cards, show:
  - record ID
  - status
  - date/period
  - primary amount/duration/count
  - next action or pending owner
  - row action menu
- Keep detail pages for full metadata.

Suggested acceptance criteria:

- No critical action requires horizontal scrolling on mobile.
- Status and primary record identity are visible in the first viewport of each mobile row.
- Row actions are reachable with one tap.

### Finding 4: Mobile Filter Drawer Is Good, But Desktop/Mobile Parity Needs Review

Severity: Medium
Status: Completed for migrated filters on 2026-06-11. Reports, Inspection, Staff Leave Management, Staff Overtime Management, Salary & Claims, Audit Logs, Staff Directory, User Management, and Roster now expose clearer visible filter labels where touched. Shared `TableFilters` and the custom Roster filter now expose active filter summaries/chips and mobile active counts.

Evidence:

- `TableFilters` renders compact desktop controls inline.
- On mobile, structured filters move into a bottom offcanvas.
- Mobile filter controls get labels; desktop controls often do not.

Impact:

The mobile filter drawer is a good pattern, but users may have a clearer filtering experience on mobile than desktop because labels are shown in the drawer. Desktop users must infer dropdown purpose from option values.

Recommendation:

- Add visible or compact labels to desktop filter controls.
- Standardize filter ordering: search, period, sort, type/category, status, clear.
- Show active filter count or chips consistently.

Suggested acceptance criteria:

- Users can identify every filter without opening its dropdown.
- Desktop and mobile expose equivalent filtering controls.
- Clear filters behavior is consistent across modules.

### Finding 5: Login Screen Can Crop On Small Mobile Heights

Severity: Medium
Status: Completed for Login on 2026-06-11. The same scroll-safe pattern was also applied to Reset Password.

Evidence:

- Before the first polish pass, `src/views/pages/login/Login.js` used fixed `100dvh` height with hidden overflow.
- The same view can render maintenance alerts, login errors, Google login, and form controls.

Impact:

On short mobile screens or when the virtual keyboard is open, content may become inaccessible because the page cannot scroll.

Recommendation:

- Use `minHeight: 100dvh` without forcing fixed height.
- Allow vertical scrolling.
- Keep the login card vertically centered only when content fits.

Suggested acceptance criteria:

- On a 320x568 viewport, every login control remains reachable.
- When an error or maintenance alert appears, the form still scrolls.
- Keyboard display does not trap hidden controls.

### Finding 6: Mobile Navigation Sheet Needs Information Architecture Review

Severity: Medium

Evidence:

- Mobile menu flattens or groups the same sidebar data.
- The sidebar has many sections and similarly named workflow destinations.

Impact:

The mobile sheet is functional, but the underlying navigation structure is too broad. On mobile, this creates many tiles and more scanning work.

Recommendation:

- Reduce navigation sections before tuning the mobile sheet.
- Promote common self-service actions in Account or a dedicated Quick Actions area.
- Keep admin/management destinations grouped separately.

Suggested acceptance criteria:

- A normal employee can reach Payroll, Leave, Overtime, Messages, and Profile quickly.
- HR/admin users can distinguish self-service from staff-management actions.
- Mobile sheet has no ambiguous duplicate destinations.

## Priority 1: Navigation And Information Architecture

### Finding 7: Sidebar Grouping Has Grown Organically

Severity: High
Status: Completed for the current sidebar source on 2026-06-11.

Evidence:

Current sidebar groups include:

- Dashboard
- Messages
- Self Service
- Inspection
- Reports
- System Admin
- Staff
- Team
- Financial

Impact:

The app is functionally broad, but the grouping does not fully match user mental models. For example:

- Leave and Overtime appear in both self-service and staff-management contexts.
- Salary appears under Financial and Staff route namespaces.
- Inspection and report creation are split in a way that may not be obvious.
- System Admin appears before Staff/Team/Financial, even though many users may do operational work more often than user/audit/settings work.

Recommendation:

Move toward fewer, clearer groups:

- Home
  - Dashboard
  - Messages
  - Notifications
- My Work
  - Payroll
  - Leave
  - Overtime
  - My Profile
- Operations
  - Staff Directory
  - Leave Management
  - Overtime Management
  - Salary and Claims
  - Salary Settings
- Teams and Roster
  - Team Directory
  - Roster Management
  - Shift Settings
- Reports and Inspection
  - Inspection
  - ERCO
  - Drill
  - Fitness Test
- Admin
  - Users
  - Audit
  - Settings

Suggested acceptance criteria:

- Self-service and management modules are visually separated.
- Similar concepts use consistent labels.
- Navigation order reflects common daily work before low-frequency admin settings.

### Finding 8: Navigation Badges Are Not Meaningful Enough

Severity: Medium
Status: Completed on 2026-06-11.

Evidence:

- Before the page-shell pass, several items used decorative green check badges and Dashboard had a `NEW` badge.

Impact:

The check badge does not communicate a user-relevant state. It may read as completed, verified, available, or shipped. Repeated badges reduce signal and compete with real notification badges.

Recommendation:

- Remove non-actionable check badges from navigation.
- Reserve badges for user-relevant counts or states:
  - unread messages
  - pending approvals
  - new feature for a limited rollout period
  - maintenance or alert state

Suggested acceptance criteria:

- Every navigation badge has a clear user action or status meaning.
- Decorative or internal-progress badges are removed.

### Finding 9: Some Navigation Labels Are Task-First While Others Are Domain-First

Severity: Medium
Status: Completed for the planned sidebar entries on 2026-06-11.

Examples:

- Before the page-shell pass, `Inspect Area` was task-first.
- `ERCO`, `Drill`, `Fitness Test` are report/domain labels.
- `Leave Management` is management/domain.
- `Salary Settings` is configuration/domain.

Impact:

Mixed label strategy makes scanning harder.

Recommendation:

- Use domain labels for navigation.
- Use task labels for primary buttons inside a module.

Example:

- Sidebar: `Inspection`
- Inside module primary action: `New Inspection`

Suggested acceptance criteria:

- Sidebar labels name places.
- Buttons name actions.

## Priority 2: Page Structure And Visual Hierarchy

### Finding 10: Primary Actions Are Too Visually Quiet

Severity: High
Status: Closed on 2026-06-15. `CreateActionButton` supports `importance="primary"` and page-level actions across the targeted self-service, reports, inspection, team, operations, and admin shells use the stronger treatment where the action is a true module action. Compact inline add actions intentionally keep the lighter treatment.

Evidence:

- `CreateActionButton` is transparent, borderless, and text-primary.
- It is used for important actions like applying claims, creating chats, new inspection, assigning salary, and adding configuration rows.

Impact:

Critical task starts can look like secondary links. In dense cards, users may miss them.

Recommendation:

- Split actions into two visual levels:
  - Primary module action: solid or outlined button with icon.
  - Small inline add action: current transparent style can remain.
- Add a prop such as `importance="primary|inline"` or create a separate `PagePrimaryActionButton`.

Suggested acceptance criteria:

- Main page action is visually dominant.
- Inline row/configuration add actions remain compact.
- Button treatment is consistent across modules.

### Finding 11: Page Headers Are Inconsistent

Severity: High
Status: Closed on 2026-06-15. A reusable `ModulePageHeader` exists and has been applied to the targeted self-service, reports, inspection, operations/admin, team, roster, and settings surfaces. Remaining page-specific header choices should be handled as ordinary feature work, not as an open UI/UX polish blocker.

Evidence:

Some modules begin with tabs only. Others begin with cards. Dashboard has a large overview card. Messages uses a card header. Settings uses tabs. Staff salary management uses conditional tabs with no consistent module header.

Impact:

Users may lose context when moving between modules. This especially matters for admin users who work across many similar workflows.

Recommendation:

Create a standard module page header:

- Title
- Short context subtitle
- Optional role/status hint
- Primary action
- Optional right-side tools

Then place tabs below the header.

Suggested acceptance criteria:

- Every major module has a clear page title above its content.
- Tabs do not carry all page identity alone.
- Primary action location is predictable.

### Finding 12: Cards Are Sometimes Used As Page Sections

Severity: Medium

Evidence:

CoreUI cards are used for list sections, dashboard intro, forms, messages, settings panels, and nested content areas.

Impact:

The UI can become visually box-heavy. On dense admin screens, too many card borders reduce scan efficiency.

Recommendation:

- Use cards for repeated entities, modals, and framed tools.
- Use unframed page sections for page-level grouping.
- For record list pages, consider:
  - page header
  - filter toolbar
  - table/card list in one framed surface

Suggested acceptance criteria:

- No card-within-card layouts unless there is a strong reason.
- Page sections have consistent spacing without excessive borders.

### Finding 13: Dashboard Lacks A Clear Operational Priority Area

Severity: High

Evidence:

- Dashboard spec references a pending actions table.
- Current dashboard focuses on module KPI sections and charts.
- Each module section repeats the same period dropdown.

Impact:

For an operations system, dashboard should quickly answer:

- What needs my attention now?
- Which workflows are blocked?
- What changed recently?
- Which modules are healthy or overloaded?

Recommendation:

- Add a top-level `Pending Actions` or `Action Queue` section.
- Add one global period control instead of repeated per-section period dropdowns.
- Keep module stats collapsible, but prioritize actionable work first.

Suggested acceptance criteria:

- First viewport shows pending/action-required items for the current user role.
- Global period control is visible once.
- Module sections remain available but do not dominate immediate task resolution.

## Priority 3: Workflow List And Status Polish

### Finding 14: Workflow Status Is Too Hard To Read In Dense Tables

Severity: High
Status: Closed on 2026-06-15. `WorkflowStatusSummary` now leads with text status and next-action copy in dense workflow record contexts while full detail views and workflow modals retain `ApprovalGates` for complete approval history. Future fringe status surfaces should adopt the same primitive when they are modified.

Evidence:

- `ApprovalGates` renders very small text and check icons.
- Dense tables combine status, draft state, approval gates, row actions, and grouped headers.

Impact:

Users need to quickly understand status and next action. Small gate text slows scanning, and color-only differentiation can be inaccessible.

Recommendation:

- Use a clear status chip as the primary table status.
- Show workflow gates as secondary detail or on hover/detail view.
- Add next-action text where relevant:
  - `Pending reviewer`
  - `Waiting for HR`
  - `Approved`
  - `Rejected`
  - `Draft saved`

Suggested acceptance criteria:

- Table status can be understood in under one second.
- Status meaning does not depend only on color.
- Full approval history remains available in detail view.

### Finding 15: Row Actions Are Good But Need Stronger Disabled-State Communication

Severity: Medium

Evidence:

- `RowActions` supports disabled items and `disabledReason`.
- Disabled menu items remain visible with tooltips/title.

Impact:

This is a good pattern, but browser `title` is weak on touch devices. Mobile users may not understand why actions are unavailable.

Recommendation:

- On mobile, show disabled reason inline under the disabled menu label or in a small info row.
- Consider moving blocked reasons into record detail where actions are shown.

Suggested acceptance criteria:

- Touch users can discover why an action is disabled.
- Disabled action reasons are consistent across modules.

### Finding 16: Records/New Tab Pattern Is Reimplemented Across Modules

Severity: Medium
Status: Completed for the current source on 2026-06-11. Leave, Overtime, Payroll, Reports, Inspection, Staff Leave Management, Staff Overtime Management, Salary & Claims Management, Settings, and Roster Management no longer expose incomplete ARIA tab semantics for their route-backed module navigation. A shared `ModuleNavTabs` primitive now exists for route-backed navs, and source audit currently finds no `role="tablist"` / `role="presentation"` matches under `src`.

Evidence:

Modules with similar two-tab patterns:

- Payroll
- Leave
- Overtime
- Reports
- Inspection

Impact:

The visual result is similar, but labels, spacing, mobile hints, route behavior, and dirty-form handling differ between modules.

Recommendation:

- Create a shared `WorkflowModuleTabs` or `ModuleNavTabs` primitive.
- Standardize:
  - active state
  - mobile overflow hint
  - dirty navigation guard hook
  - ARIA semantics
  - route-backed tab behavior

Suggested acceptance criteria:

- Same tab behavior across all workflow modules.
- One place to fix mobile tab overflow and accessibility.

## Priority 4: Forms And Input Experience

### Finding 17: Form Patterns Are Strong But Inconsistent Between Similar Modules

Severity: Medium

Evidence:

- Leave and Overtime both use type selection, form sections, draft/save/submit actions, and computed summaries.
- They differ in busy-state handling, labels, edit mode language, and field layout decisions.

Impact:

Users learning one request module should be able to transfer that knowledge to another. Small inconsistencies create uncertainty.

Recommendation:

Create a shared workflow form structure:

- Type selection step
- Selected type summary card
- Main form card
- Computed summary row
- Guidance/eligibility message
- Sticky actions

Suggested acceptance criteria:

- Leave, Overtime, and Payroll claims share the same form rhythm.
- Draft, clear, back, and submit actions appear in the same order.
- Busy states and button labels are consistent.

### Finding 18: Custom Selectable Cards Need Better Semantics

Severity: Medium

Evidence:

- `IconOptionCard` uses a clickable `div`.
- It sets `aria-pressed` and `aria-disabled`, but not full radio semantics.

Impact:

These cards behave like radio options in many flows. Screen reader and keyboard users may not get the clearest interaction model.

Recommendation:

- For single-select option grids, use radio-group semantics:
  - parent `role="radiogroup"`
  - option `role="radio"`
  - `aria-checked`
- Alternatively, render actual visually-customized radio inputs.

Suggested acceptance criteria:

- Keyboard interaction matches expected radio behavior.
- Screen readers announce selected state and group label clearly.

### Finding 19: Attachment Inputs Need Mobile-Specific Review

Severity: Medium

Evidence:

- Leave form supports file upload and camera capture.
- Inspection/report forms include image processing and upload flows.

Impact:

File and camera flows are high-friction on mobile. Current controls are functional, but should be checked for reachability, status clarity, and error recovery.

Recommendation:

- Standardize attachment component behavior.
- Show selected file, upload/compression state, remove action, and validation reason consistently.
- Ensure camera button has a large enough hit target.

Suggested acceptance criteria:

- Attachment state is obvious after selection.
- Error states are recoverable.
- Camera/file controls are usable at 360px width.

## Priority 5: Accessibility And Semantics

### Finding 20: Tabs Need Complete ARIA Treatment Or Should Be Normal Links

Severity: High
Status: Completed for current source on 2026-06-11. Leave, Overtime, Payroll, Reports, Inspection, Staff Leave Management, Staff Overtime Management, Salary & Claims Management, Settings, and Roster Management were changed away from partial tab semantics. Current source audit finds no `role="tablist"` / `role="presentation"` matches under `src`.

Evidence:

- Multiple modules use `role="tablist"` with `CNavLink`.
- Individual links do not consistently expose `role="tab"`, `aria-selected`, or panel relationships.

Impact:

Partial tab semantics can be worse than simple links because assistive tech expects full tab behavior.

Recommendation:

Choose one approach:

- If route-backed navigation: treat them as normal navigation links and remove `role="tablist"`.
- If true tabs: implement full tab semantics and keyboard support.

Suggested acceptance criteria:

- Screen reader output matches interaction behavior.
- Keyboard users can navigate tabs predictably.

### Finding 21: Color-Only Status Meaning Appears In Several Places

Severity: Medium
Status: Closed for workflow-critical UI on 2026-06-15. Dense workflow record views now lead with text status/next-action labels, row action disabled reasons are shown inline in menus, and shared status/matrix changed-state colors are tokenized in touched surfaces. Dashboard/chart/team dynamic colors are accepted as post-release visual-system work.

Evidence:

- Workflow gates, status dots, badges, and team/shift colors rely heavily on color.

Impact:

Users with color vision differences may miss status meaning.

Recommendation:

- Pair color with text labels or icons.
- Ensure contrast meets WCAG AA for small text.
- Avoid very small colored text as the only status indicator.

Suggested acceptance criteria:

- Status remains understandable in grayscale.
- Small text contrast is checked for key workflow states.

### Finding 22: Focus States Need Audit On Custom Controls

Severity: Medium
Status: Closed for shared mobile surfaces on 2026-06-15. Mobile nav sheet, notification drawer, and shared mobile filter drawer use shared focus-trap and return-focus handling, touched phone action controls meet the 44px coarse-pointer target, and shared focus-visible treatment covers the common custom controls.

Evidence:

- Some custom controls are div/button hybrids or transparent buttons.
- Hover and focus styles are implemented in places but not uniformly.

Impact:

Keyboard users may lose track of focus in dense pages.

Recommendation:

- Add a standard focus-visible style for custom option cards, row action triggers, icon-only buttons, and mobile sheet tiles.
- Avoid removing outlines without replacing them.

Suggested acceptance criteria:

- Every interactive element has a visible focus state.
- Focus order matches visual order.

## Priority 6: Visual System And Theming

### Finding 23: Design Tokens Are Not Centralized Enough

Severity: High
Status: Closed for the current release on 2026-06-15. The app now has shared focus, status, danger, success, muted, radius, and matrix changed-state tokens for touched shared controls and settings matrices. A full brand/chart/print color-system migration is a post-release design-system enhancement because many chart, roster, team, report-form, and print styles intentionally use local or dynamic colors.

Evidence:

- Many hardcoded hex colors exist in JS and SCSS.
- Many components use inline styles for spacing, color, background, sizing, and status.

Impact:

Visual drift is likely as the app grows. Updating brand colors, status tones, or spacing will require touching many files.

Recommendation:

- Introduce a small token layer:
  - module accents
  - status colors
  - workflow tones
  - spacing presets
  - card radius
  - focus ring
  - mobile safe-area offsets
- Prefer classes or shared style helpers over inline styles for repeated patterns.

Suggested acceptance criteria:

- Common colors are defined once.
- New modules do not introduce new ad hoc status colors.
- Inline styles are reserved for truly dynamic values.

### Finding 24: Dark Mode Is Not Fully Supported

Severity: Medium

Evidence:

- CoreUI color modes are present.
- Global SCSS forces white backgrounds for body/footer even in dark mode.

Impact:

If dark mode is exposed or triggered, the app can show mixed themes and poor contrast.

Recommendation:

- Either explicitly disable dark mode in product settings, or finish dark-mode support.
- Avoid forcing white backgrounds inside dark-mode blocks unless intentionally creating a light-only app.

Suggested acceptance criteria:

- App is either clearly light-only or correctly themed in dark mode.
- No mixed dark/light shell states.

### Finding 25: Rounded Corners And Elevation Are Inconsistent

Severity: Low

Evidence:

- Components use combinations of `rounded`, `rounded-3`, `shadow-sm`, custom border radii, and inline `borderRadius`.

Impact:

Minor visual inconsistency makes the app feel less deliberate.

Recommendation:

- Define standard radii:
  - small controls
  - cards
  - mobile sheets
  - modals
- Define elevation levels:
  - none
  - surface
  - overlay
  - drawer

Suggested acceptance criteria:

- Repeated surfaces use the same radius and shadow treatment.

## Priority 7: Module-Specific Notes

### Dashboard

Status: Closed on 2026-06-15. A global dashboard period selector and frontend-derived action queue were added using existing dashboard stats. Backend-side unified action aggregation remains a future enhancement if deeper queue data is required.

Recommended polish:

- Add pending/action-required queue in the first viewport.
- Use one global period selector.
- Reduce repeated section chrome.
- Clarify empty/error states per module.
- Consider saved user preference for hidden dashboard sections.

### Messages

Recommended polish:

- Preserve the two-pane desktop layout.
- Ensure mobile list/thread switching has clear context title.
- Make new chat primary action more visible.
- Review image attachment preview and send error states on mobile.

### Payroll

Recommended polish:

- Make `Apply Claim` a strong primary action.
- Keep payslips separate but visually subordinate to active claim workflows.
- Ensure salary claim and expense claim forms share action order and draft language.

### Leave

Recommended polish:

- Keep leave balance summary prominent.
- Improve mobile layout for balance tiles so they do not crowd the form.
- Standardize coverage/attachment conditional fields with shared attachment UI.
- Align cancel/delete/edit action explanations with staff leave management.

### Overtime

Recommended polish:

- Improve duration summary visibility.
- Make overnight warning more prominent when relevant.
- Align type selection and selected type summary with Leave.
- Consider mobile card rows for overtime records.

### Inspection And Reports

Recommended polish:

- Align Inspection with generic Reports where possible, but keep domain-specific form needs.
- Standardize records/new/review tab handling.
- Replace blocking full-screen loading overlays with a shared overlay primitive.
- Ensure report creation is reachable from navigation without implying only "new" mode.

### Staff Salary And Claims

Recommended polish:

- Clarify relationship between `Salary & Claims` and `Salary Settings`.
- The module is powerful but dense; add stronger page headers and tab grouping.
- Improve bulk action visibility and selected-count feedback.
- Keep financial totals and workflow status visually separate.

### Settings

Recommended polish:

- Maintenance mode is important enough to have stronger warning hierarchy.
- Role permissions and dashboard visibility matrices now keep their table-based structure with shared horizontal scrolling, sticky first columns, wrapping, visible focus, and tokenized changed states.
- Consider making settings pages desktop-first if mobile support is intentionally limited, but communicate that through layout quality.

### Roster And Team

Status: Completed for the current Roster and Team scope on 2026-06-11.

Recommended polish:

- Roster views use a dedicated mobile day-list rather than only scaled tables.
- Team color palettes should be tokenized because similar colors are repeated in several files.
- Print/export styles should be separated from interactive UI styles where possible.

## Implementation Roadmap

### Phase 1: Responsive Stability

Goal: remove layout bugs and improve mobile confidence.
Status: Closed on 2026-06-15. Breakpoint alignment, auth overflow, shared sticky action spacing, Leave/Overtime/Payroll/Reports/Inspection plus operations/admin mobile record cards, the Roster mobile day-list/Custom Shift mobile cards, user history mobile cards, and Payroll Payslips phone cards are implemented.

Work:

- [x] Align bottom nav and sticky action breakpoints.
- [x] Fix login overflow behavior.
- [x] Apply scroll-safe auth layout to Reset Password.
- [x] Standardize shared sticky action spacer behavior for below-`md` mobile layouts.
- [x] Standardize and source-audit sticky action bars on Leave, Overtime, Payroll, Salary Assignment, Inspection, and Reports through the shared below-`md` action-row pattern. Production device-lab findings should be logged separately if discovered.
- [x] Add mobile card-list pattern for Leave, Overtime, and Payroll self-service records.
- [x] Reuse mobile card-list pattern for Reports and Inspection records.
- [x] Reuse mobile card-list pattern for Staff Leave Management, Staff Overtime Management, Salary & Claims, Audit Logs, and Staff Directory records.
- [x] Add a dedicated mobile day-list for Roster schedule and mobile cards for Custom Shifts.
- [x] Reuse mobile card-list pattern or dedicated mobile cards for remaining known high-use record tables; keep complex settings matrices table-based.

Suggested test widths:

- 320px
- 360px
- 375px
- 390px
- 430px
- 768px
- 1024px
- 1366px

### Phase 2: Navigation And Page Shell

Goal: make the app easier to orient.
Status: Completed for current source on 2026-06-11. Sidebar cleanup, module header primitive, self-service plus Reports/Inspection plus operations/admin plus Team/Roster header rollout, mobile My Work shortcuts, and Leave/Overtime/Payroll/Reports/Inspection/operations/settings/Roster route-backed tab semantic cleanup were implemented.

Work:

- [x] Reorganize sidebar groups.
- [x] Remove decorative check badges.
- [x] Add standard module page header.
- [x] Apply standard module page header to Payroll, Leave, Overtime, Reports, and Inspection.
- [x] Apply standard module page header to Staff Leave Management, Staff Overtime Management, Salary & Claims Management, Settings, Audit Logs, Staff Directory, and User Management.
- [x] Apply standard module page header to Team Directory, Team Detail, Roster Management, and Shift Settings.
- [x] Make Payroll, Leave, Overtime, Reports, and Inspection page-level create actions visually stronger.
- [x] Normalize route-backed tab treatment for Leave, Overtime, Payroll, Reports, and Inspection.
- [x] Normalize route-backed tab treatment for Staff Leave Management, Staff Overtime Management, Salary & Claims Management, and Settings.
- [x] Normalize route-backed tab treatment for Roster Management.
- [x] Normalize route-backed tab treatment for any remaining route-backed navs found in current source audit.

### Phase 3: Workflow Primitive Consolidation

Goal: reduce duplication and improve consistency.
Status: Closed on 2026-06-15. Reusable mobile record-list, route-backed nav, workflow status summary, record collection, row action, and bulk selection primitives are in place. Reports, Inspection, self-service Leave/Overtime, operations/admin records, and Salary & Claims use the shared patterns where the record model maps cleanly.

Work:

- [x] Standardize workflow tabs with shared route-navigation primitives for Reports and Inspection.
- [x] Standardize operations/admin route navigation with shared route-navigation primitives.
- [x] Standardize primary action buttons where page-level actions have been rolled out.
- [x] Establish status and next-action readability with `WorkflowStatusSummary` in dense operations record cards.
- [x] Broaden status and next-action readability to self-service Leave, self-service Overtime, Reports, and Inspection dense record views.
- [x] Standardize major workflow status chips and next-action labels through shared primitives. Fringe future surfaces should use the same primitives when touched.
- [x] Keep `ApprovalGates` for detail views while simplifying dense table/card status display through text-first summaries.
- [x] Improve desktop filter labels for Reports and Inspection.
- [x] Improve desktop filter labels for touched operations/admin record filters.

### Phase 4: Visual Tokens And Accessibility

Goal: reduce drift and improve maintainability.
Status: Closed for release on 2026-06-15. A focus/status token layer, matrix changed-state tokens, row-action disabled reason visibility, shared focus behavior, and single-select option-card radio semantics are in place. Full dark mode and broader brand/chart/print tokenization are post-release design-system enhancements.

Work:

- [x] Start centralizing color/status/focus tokens.
- [x] Reduce repeated inline styles in shared/touched UI primitives; leave highly dynamic chart/print styles to future design-system work.
- [x] Define shared focus-visible treatment for common custom controls.
- [x] Decide dark-mode support strategy for this release: keep the app light-first and defer full dark-mode launch to a dedicated design-system pass.
- [x] Improve custom option-card semantics for single-select grids.

## QA Checklist For UI/UX Polish

Use this checklist before closing polish work:

- Mobile bottom nav does not overlap content.
- Sticky form actions do not cover validation errors.
- Every major module has a clear page title.
- Primary action is visible without hunting.
- Table/list status is readable without relying only on color.
- Mobile users can complete create, draft, submit, and cancel flows.
- Desktop filters are identifiable without opening each select.
- Touch users can understand disabled action reasons.
- Route-backed tabs are either semantic links or complete ARIA tabs.
- Focus states are visible on keyboard navigation.
- Empty, loading, error, and success states are present.
- No new ad hoc status color is introduced without adding it to tokens.

## Recommended Definition Of Done

A UI/UX polish item should be considered done only when:

- It has been checked on desktop and mobile widths.
- It does not regress role/permission visibility.
- It keeps existing workflow safeguards intact.
- It improves or preserves keyboard accessibility.
- It follows existing CoreUI patterns unless a shared project primitive supersedes them.
- It avoids one-off inline styling when the pattern is reusable.
