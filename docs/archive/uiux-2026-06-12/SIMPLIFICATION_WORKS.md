# Simplification Works

Date: 2026-06-12
Archived: 2026-06-15

Scope: `vmecc-frontend`
Audit type: UI/UX simplification, code-complexity simplification, mobile ERP throughput, and maintainability.

Closure note: All simplification passes in this ledger are complete. Future simplification work should use a new tracker or issue rather than appending to this completed implementation record. The final UI/UX closure status is archived beside this file in `UIUX_POLISH_WORKS.md`.

## Executive Summary

This archived ledger records the simplification work completed for the current release. At the time of the original audit, the frontend had moved beyond basic responsive polish and the main unresolved concern was structural complexity across several workflow-heavy modules.

The highest-value simplification work is not another visual pass. It is reducing workflow density, separating high-risk actions, and extracting repeated table/card/filter/bulk-action patterns into stable primitives.

The strongest simplification targets are:

- Salary & Claims Management
- Payroll claim and payslip detail flows
- Staff Leave and Staff Overtime Management
- Roster Management
- ERCO and Inspection report forms
- Settings and approval-rule matrices
- Shared record/filter/action primitives

This document is no longer an active backlog. It is retained as historical implementation evidence and intentionally avoided backend API, route-schema, permission, payroll-calculation, and workflow-rule changes.

## Completion Status

- [x] Pass 1: Salary Bulk Mode Separation completed on 2026-06-12.
- [x] Pass 2: Shared Record And Bulk Primitives completed on 2026-06-12.
- [x] Pass 3: Payroll Detail Summary completed on 2026-06-12.
- [x] Pass 4: Salary Assignment Step Flow completed on 2026-06-12.
- [x] Pass 5: Staff Leave/Overtime Shared Workflow Records completed on 2026-06-12.
- [x] Pass 6: Roster Mobile Editor And State Reducer completed on 2026-06-12.
- [x] Remaining Pass A: Payroll Claim Form Simplification completed on 2026-06-12.
- [x] Remaining Pass B: Broader Record Primitive Migration completed on 2026-06-12.
- [x] Remaining Pass C: RouteNavTabs Consolidation completed on 2026-06-12.
- [x] Remaining Pass D: Salary Assignment Patch-List Editing completed on 2026-06-12.
- [x] Remaining Pass E / Pass 7: Reports And Inspection Guided Forms completed on 2026-06-12.
- [x] Remaining Pass F / Pass 8: Settings Role-Focused Editors completed on 2026-06-12.
- [x] Remaining Pass G: Dashboard, Messages, And Notifications Throughput completed on 2026-06-12.
- [x] Remaining Pass H: Secondary Admin/Staff/Team Cleanup completed on 2026-06-12.

## Core Simplification Principles

- Separate review, approval, and payment into distinct user modes when the consequence level is different.
- Show the default safe path first; move exception handling, audit detail, and advanced configuration behind progressive disclosure.
- Keep desktop power-user density, but give phones task-specific summaries and focused editors.
- Replace repeated module-specific tables/cards/actions with shared record and workflow primitives.
- Prefer feature-specific route containers over large shell components that branch into many tab/form/detail modes.
- Use reducers or state machines where a screen has draft/edit/submit/cancel/confirm modes.
- Keep full workflow safeguards, disabled reasons, confirmations, and permission checks intact while simplifying presentation.

## Priority Map

| Priority | Area | Why It Comes First |
| --- | --- | --- |
| P0 | Salary & Claims approval/payment simplification | High consequence, high density, and currently mixes approval and payment actions. |
| P0 | Shared record/filter/bulk primitives | Repeated complexity is now slowing every module pass. |
| P1 | Payroll claim/payslip detail simplification | Dense financial breakdowns remain hard to understand on phones. |
| P1 | Staff Leave and Overtime Management simplification | Similar workflow patterns are duplicated and can be unified. |
| P1 | Roster edit-mode simplification | The mobile layout exists, but edit throughput is still too broad. |
| P1 | Report/Inspection form simplification | Forms are full workflows with too many decisions in one path. |
| P2 | Settings/rules matrix simplification | Important, but many matrices can remain advanced desktop-first while role-focused editors are introduced. |
| P2 | Messages/dashboard/notifications throughput | Useful mobile productivity work after high-risk finance/workflow cleanup. |
| P3 | Audit/User/Staff/Team secondary cleanup | Lower risk and mostly maintainability or incremental UX improvements. |

## P0: Salary & Claims Management Simplification

### Current Problem

Salary & Claims is the highest-complexity area by both user experience and implementation.

Affected routes:

- `/staff/salary-claims/claims`
- `/staff/salary-claims/salary`
- `/staff/set-salary`
- `/staff/set-salary/assignment/new`
- `/staff/set-salary/assignment/:assignmentId/edit`
- `/staff/set-salary/workflow-rules`
- `/payroll/claims/new/salary`
- `/payroll/claims/new/expense`
- `/payroll/payslips`

Key files:

- `src/views/staff/SalaryClaimsManagement.js`
- `src/views/staff/salary-claims-management/components/ClaimRecordsTab.js`
- `src/views/staff/salary-claims-management/components/SalaryRecordsTab.js`
- `src/views/staff/salary-claims-management/components/SalaryAssignmentFormPage.js`
- `src/views/staff/salary-claims-management/components/SalaryAssignmentFormSections.js`
- `src/views/staff/salary-claims-management/hooks/useSalaryAssignmentFormController.js`
- `src/views/staff/salary-claims-management/hooks/useSalaryClaimsActions.js`
- `src/views/staff/salary-claims-management/hooks/useSalaryClaimsViewModels.js`
- `src/views/payroll/components/claim-form/SalaryClaimForm.js`
- `src/views/payroll/components/claim-form/SalaryClaimBody.js`
- `src/views/payroll/components/claim-form/ExpenseOtherClaimForm.js`
- `src/views/payroll/components/claim-form/ClaimSubmissionEditorCard.js`
- `src/views/payroll/components/PayslipsSection.js`
- `src/views/payroll/components/SalaryClaimReadonlyView.js`

Observed complexity:

- One management shell owns claim records, salary records, salary assignment, OT rate settings, workflow rules, company legal info, detail views, and route redirects.
- Salary record cards and tables expose approval, rejection, mark paid, and unmark paid in the same selected-action area.
- Salary assignment has nested edit modes for pay components, allowance rows, statutory deductions, remarks, autosave, overwrite warnings, and submit confirmation.
- Salary claim form combines baseline review, period confirmation, adjustments, overtime payout, attachments, draft sync, leave guard, and submit confirmation.
- Expense claim form is over-generalized: mileage, travel, medical, billing, approval, attachments, notes, saved items, exception modes, draft, and submit all live in one flow.
- Payslip cards improved mobile layout, but payroll detail still asks users to inspect many financial rows to understand the result.

### UI Simplification

- Split salary bulk action modes:
  - Approval mode: select records, approve/reject, show workflow declaration.
  - Payment mode: select payable records, mark paid/unpaid, show payment date and total amount.
- On mobile, replace the five-action selected bar with one mode-specific sticky selection tray:
  - selected count
  - selected period
  - selected total payable where relevant
  - one primary action
  - one secondary cancel/clear action
- In confirmation modals, show sampled selected records and totals, not only a count.
- Make salary assignment a three-step flow:
  - Staff and effective month
  - Pay package
  - Review and submit
- Treat remarks as plain optional notes, not a separate dirty sub-editor.
- Make salary claim default path:
  - review assigned salary
  - review final payable
  - submit
- Hide adjustments and overtime calculation under expandable sections unless the user edits them.
- Move exceptional expense claims into a clearly separate path instead of a hidden mode inside the same editor.
- Use category templates for expense claim items so fields appear only after the user chooses the category.
- For payroll read-only details, show a summary first:
  - baseline net
  - adjustments delta
  - approved OT
  - deductions/contributions
  - final payable
  - payment/approval state

### Code Simplification

- Split `SalaryClaimsManagement` into route-level containers:
  - salary/claim records container
  - salary assignment form container
  - salary settings container
  - workflow-rules container
  - company legal info container
- Replace broad `vm` and `handlers` props with feature-specific controller hooks.
- Extract payroll breakdown selectors:
  - `baseline`
  - `adjustments`
  - `deductions`
  - `overtime`
  - `finalPayable`
  - `approvalStatus`
- Reuse the same payroll breakdown view-model in:
  - payslips
  - salary claim read-only view
  - salary assignment preview
  - salary record mobile cards
- Introduce a bulk action registry:
  - `key`
  - `label`
  - `riskLevel`
  - `scope`
  - `requiresRemarks`
  - `requiresDeclaration`
  - `requiresPaymentDate`
  - `eligible(row)`
  - `disabledReason(row)`
- Split salary bulk UI into:
  - `SalaryBulkApprovalBar`
  - `SalaryBulkPaymentBar`
  - shared `BulkSelectionActionBar`
- Replace salary assignment nested local edit state with one reducer/state machine.
- Convert expense item rendering to schema-driven category sections.

### Acceptance Criteria

- Approval and payment actions are not shown side by side in the same generic selected state on phones.
- Mobile salary records show only one primary bulk intent at a time.
- Salary assignment can be completed without opening nested edit modes for remarks and pay components.
- Salary claim submission can follow the default review-and-submit path without expanding calculation details.
- Payroll detail summaries explain final payable before showing audit rows.
- Existing permissions, disabled reasons, confirmation declarations, payment state, and workflow outcomes remain unchanged.

## P0: Shared Record, Filter, Row Action, And Bulk Primitives

### Current Problem

The same implementation pattern repeats across many modules:

- Build mobile card view-models.
- Render `MobileRecordList`.
- Render desktop `CTable`.
- Wire row open behavior.
- Stop row-action propagation.
- Render filter bar and mobile filter drawer.
- Render selected-count/bulk-action bars.

Affected files include:

- `src/components/TableFilters.js`
- `src/components/MobileRecordList.js`
- `src/components/RowActions.js`
- `src/components/FormActionGroup.js`
- `src/components/WorkflowStatusSummary.js`
- `src/views/leave/components/LeaveRecordsSection.js`
- `src/views/overtime/components/OvertimeRecordsSection.js`
- `src/views/payroll/components/ClaimListTable.js`
- `src/views/report/components/ReportRecordsSection.js`
- `src/views/inspection/InspectionRecordsSection.js`
- `src/views/staff/leave-management/components/LeaveRecordsSection.js`
- `src/views/staff/leave-management/components/OvertimeRecordsTab.js`
- `src/views/staff/salary-claims-management/components/ClaimRecordsTab.js`
- `src/views/staff/salary-claims-management/components/SalaryRecordsTab.js`

### UI Simplification

- Standardize mobile record cards around the same hierarchy:
  - identity
  - owner
  - status or next action
  - period/date
  - primary metric
  - compact action menu
- Standardize desktop record tables around the same action and status language.
- Keep full detail pages for metadata instead of overloading record cards.
- Standardize selected-count bars:
  - selected count
  - selection scope
  - primary action
  - secondary actions behind menu if more than two actions exist
- Add quick filters where workflow lists need speed:
  - Needs my action
  - Drafts
  - Returned
  - This month
  - My team
  - Unpaid

### Code Simplification

- Split `TableFilters` into:
  - `useTableFilters`
  - `FilterControls`
  - `ActiveFilterChips`
  - `MobileFilterDrawer`
- Add explicit `defaultValue` per filter instead of inferring active state from the first option.
- Add optional `quickFilters` and `primaryFilters` support.
- Extract lower-level `RecordCard` used by `MobileRecordList`, payslip cards, custom shift cards, and roster day cards where appropriate.
- Introduce `ResponsiveRecordCollection` or `WorkflowRecordsTable` with:
  - loading state
  - empty state
  - grouped sections
  - mobile cards below `md`
  - desktop table from `md` upward
  - row open semantics
  - propagation-safe action cell
  - footer/count support
- Add `RowActionCell` so table/card callers do not repeat event propagation guards.
- Add `BulkSelectionActionBar` and use it across leave, overtime, claims, salary, and user management.
- Create `RouteNavTabs` over `ModuleNavTabs` for route-backed navs with centralized active matching and guards.
- Move global responsive SCSS magic numbers toward component CSS variables where feasible.

### Acceptance Criteria

- New record screens do not hand-roll separate mobile and desktop action semantics.
- Filter active-state logic does not depend on option ordering.
- Row actions never require each caller to remember `stopPropagation`.
- Bulk action bars wrap consistently and present high-risk actions clearly.
- Existing desktop tables remain unchanged where they are already fit for purpose.

## P1: Staff Leave And Staff Overtime Management

### Current Problem

Staff Leave and Staff Overtime Management are functionally strong but structurally repetitive.

Affected routes:

- `/staff/leave-management/records`
- `/staff/leave-management/assignments`
- `/staff/leave-management/holidays`
- `/staff/leave-management/rules`
- `/staff/overtime-management/records`
- `/staff/overtime-management/rules`

Key files:

- `src/views/staff/LeaveManagement.js`
- `src/views/staff/OvertimeManagement.js`
- `src/views/staff/leave-management/components/LeaveManagementTabsContent.js`
- `src/views/staff/leave-management/components/LeaveRecordsSection.js`
- `src/views/staff/leave-management/components/AssignmentsTab.js`
- `src/views/staff/leave-management/components/HolidaysTab.js`
- `src/views/staff/leave-management/components/OvertimeRecordsTab.js`
- `src/views/staff/leave-management/hooks/useLeaveAdminWorkflow.js`

Observed complexity:

- Leave management multiplexes records, entitlements, holidays, workflow rules, detail routes, and legacy paths.
- Overtime management duplicates record grouping, filtering, workflow actions, and bulk action behavior.
- Leave assignment supports matrix/list views, create/edit modal, staff/year selection, inactive staff toggles, history, detail modal, filters, and pagination in one component.
- Overtime records live under staff leave management components even though there is a dedicated overtime management module.

### UI Simplification

- Make Leave Records, Entitlements, Holidays, and Workflow Rules feel like distinct subpages.
- Remove or avoid cross-module overtime records inside leave management where the dedicated overtime module exists.
- Convert leave assignment mobile flow into:
  - employee summary cards
  - one employee/year editor
  - changed-entitlement review
- For leave/overtime manager records, prioritize:
  - employee
  - request ID
  - period/date
  - days/hours
  - next action
  - status
- Collapse advanced filters behind secondary controls and keep status/team/period visible.

### Code Simplification

- Extract per-tab containers instead of passing one large prop surface through `LeaveManagementTabsContent`.
- Reuse `WorkflowRecordsTable` for leave, overtime, claims, and salary records.
- Move grouping and bulk eligibility into shared selectors.
- Create one workflow action builder contract for approve/reject/review/cancel/delete.
- Convert assignment edits into patch lists instead of submitting a full matrix every time.

### Acceptance Criteria

- Leave and overtime records use the same shared workflow-record primitive.
- Entitlement assignment does not require scanning a full matrix on phones.
- Bulk workflow actions and disabled reasons remain unchanged.
- Legacy routes still land correctly.

## P1: Payroll Details And Claim Forms

### Current Problem

Payroll self-service has improved mobile records, but the forms and read-only details still expose calculation complexity directly.

Affected routes:

- `/payroll/claims/new/salary`
- `/payroll/claims/new/expense`
- `/payroll/claims/:claimId`
- `/payroll/payslips`

Key files:

- `src/views/payroll/components/claim-form/SalaryClaimForm.js`
- `src/views/payroll/components/claim-form/SalaryClaimBody.js`
- `src/views/payroll/components/claim-form/ExpenseOtherClaimForm.js`
- `src/views/payroll/components/claim-form/ClaimSubmissionEditorCard.js`
- `src/views/payroll/components/SalaryClaimReadonlyView.js`
- `src/views/payroll/components/PayslipsSection.js`

### UI Simplification

- Salary claim:
  - lead with final payable and confidence state
  - make baseline confirmation implicit unless something changed
  - put adjustments and OT details behind accordions
- Expense claim:
  - start with period and claim category
  - open an add-item drawer using category templates
  - show saved items as a concise list
  - keep attachments near the item they belong to
- Read-only salary detail:
  - summary first
  - details second
  - calculation audit last
- Payslips:
  - keep phone cards
  - reduce initial card amount density if users only need final payable first

### Code Simplification

- Create a shared claim-form controller for:
  - draft persistence
  - attachment preview
  - leave guard
  - submit confirmation
  - post-submit modal
- Define expense category schemas for conditional fields.
- Use a payroll breakdown selector across salary claims, payslips, and salary assignment preview.
- Reduce prop count in `SalaryClaimBody` by passing grouped objects:
  - `period`
  - `baseline`
  - `adjustments`
  - `overtime`
  - `attachments`
  - `actions`
  - `state`

### Acceptance Criteria

- A normal salary claim can be submitted without touching advanced calculation controls.
- Expense claim fields only appear when relevant to the selected category.
- Read-only payroll details are understandable without horizontal table scanning on phones.
- Draft, attachment, and confirmation behavior stays intact.

## P1: Roster Management

### Current Problem

Roster has the right broad direction: desktop matrix and mobile day list. The issue is edit throughput and state complexity.

Affected routes:

- `/roster/overview`
- `/roster/schedule`

Key files:

- `src/views/roster/RosterManagement.js`
- `src/views/roster/useRosterState.js`
- `src/views/roster/RosterFilter.js`
- `src/views/roster/RosterCard.js`
- `src/views/roster/RosterMobileDayList.js`

Observed complexity:

- `useRosterState` owns range, filtering, selected months, edit state, dirty state, save draft, publish, conflict handling, and fetch state.
- `RosterManagement` owns print HTML generation directly.
- Mobile edit mode places per-shift selects inside every day card.
- Conflict feedback is global rather than attached to the affected date/shift.

### UI Simplification

- Keep mobile day list read-only by default.
- Tap a day to open a focused day editor bottom sheet.
- In mobile editor, add:
  - copy previous day
  - assign team to week
  - clear day
  - inline conflicts per shift
- Move multi-month selection into an advanced range drawer.
- Keep print/export in the header but move detailed print behavior out of the main editing mental model.

### Code Simplification

- Replace many `useState` values with a reducer/state machine for:
  - browse
  - edit
  - dirty
  - saving draft
  - publishing
  - confirming cancel
- Move date/range math to pure utilities.
- Move conflict detection to a pure validator returning field-level errors.
- Move print/export rendering to a dedicated service or component.
- Add `RosterMobileDayEditor` as a focused child component.

### Acceptance Criteria

- Phone users edit one day or one focused scope at a time.
- Conflict messages identify the exact shift/date problem.
- Save draft, publish, cancel dirty confirmation, print, and export behavior remains unchanged.
- Desktop matrix remains the primary power-user view.

## P1: Reports And Inspection Forms

### Current Problem

Reports and Inspection contain deep form workflows that are operationally important but cognitively heavy.

Affected routes:

- `/report/erco/new`
- `/report/erco/new/:newSection`
- `/report/drill/new`
- `/report/fitness-test/new`
- `/inspection/new`
- `/inspection/new/:newSection`

Key files:

- `src/views/report/erco/ErcoForm.js`
- `src/views/report/erco/ErcoDetailsStep.js`
- `src/views/report/erco/ErcoRespondingTeamStep.js`
- `src/views/report/erco/erco-form-components/PostIncidentAnalysisSection.js`
- `src/views/report/erco/useChronology.js`
- `src/views/inspection/InspectionForm.js`
- `src/views/inspection/InspectionAiConfirmPanel.js`
- `src/views/inspection/InspectionModule.js`

### UI Simplification

- ERCO:
  - default to guided basic report
  - keep chronology advanced tools optional
  - generate post-incident analysis defaults and let users edit exceptions
  - move title/type management out of the main incident form when possible
- Inspection:
  - convert AI confirmation into one editable draft summary
  - expose `Accept` and `Edit details`
  - move custom location/type management away from the primary inspection creation path
- For all report forms:
  - show progress by meaningful task, not implementation section
  - keep attachments close to the event/finding they support
  - make draft/save state visible but not visually dominant

### Code Simplification

- Extract chronology into its own reducer/module.
- Split post-incident analysis into:
  - resources
  - strengths
  - improvement opportunities
  - photos
- Separate media upload, type management, AI confirmation, and report shell state.
- Use explicit step state instead of deriving many confirmation states independently.
- Keep draft storage behavior isolated behind form-specific controllers.

### Acceptance Criteria

- A basic ERCO/Inspection report can be completed without interacting with advanced tools.
- AI suggestions are presented as editable summary output, not a multi-decision checkpoint.
- Draft and review behavior remains unchanged.

## P2: Settings And Rules Matrices

### Current Problem

Settings and workflow rules are powerful but ask users to reason like implementers.

Affected routes:

- `/settings`
- `/settings/role-permissions`
- `/settings/dashboard-visibility`
- `/staff/leave-management/rules`
- `/staff/overtime-management/rules`
- `/staff/set-salary/workflow-rules`

Key files:

- `src/views/settings/Settings.js`
- `src/views/settings/RolePermissionMatrix.js`
- `src/views/settings/DashboardVisibilityMatrix.js`
- `src/views/settings/components/RolePermissionMatrixSections.js`
- `src/views/settings/components/LeaveApprovalRules.js`
- `src/views/settings/components/OvertimeApprovalRules.js`
- `src/views/settings/components/SalaryWorkflowRules.js`

### UI Simplification

- Default phones to role-focused permission editing.
- Keep full matrices as advanced desktop/tablet tools.
- Dashboard visibility should use:
  - choose role
  - toggle sections/widgets
  - review changed items
- Approval rules should offer presets:
  - single approver
  - review plus approval
  - three-stage approval
- Show plain-language previews:
  - who checks
  - who reviews
  - who approves
  - fallback behavior

### Code Simplification

- Reuse role-focused editor pattern from permissions for dashboard visibility.
- Create shared `ApprovalRulesEditor` for leave, overtime, and salary workflows.
- Extract workflow-rule row validation and preview text into pure helpers.
- Build one reusable matrix component with injected rows, columns, toggles, and changed-state treatment.

### Acceptance Criteria

- Phone users are not forced into role x permission matrices for common edits.
- Admins can preview what a workflow rule means in plain language.
- Existing rule storage and permission behavior remains unchanged.

## P2: Dashboard, Messages, And Notifications Throughput

### Current Problem

These surfaces are responsive but still not fully optimized for mobile ERP task completion.

Affected routes:

- `/dashboard`
- `/messages`
- `/notifications/workflow`

Key files:

- `src/views/dashboard/Dashboard.js`
- `src/views/messages/Messages.js`
- `src/views/messages/components/MessagesLayout.js`
- `src/components/messages/ChatList.js`
- `src/components/messages/ChatThread.js`
- `src/components/NotificationDrawer.js`
- `src/views/notifications/workflow/WorkflowNotifications.js`

### UI Simplification

- Dashboard:
  - mobile order should start with Action Queue
  - show next actionable records, not just module counts
  - keep analytics lower on mobile
- Messages:
  - add inbox presets: unread, drafts, recent, staff
  - make destructive row actions available through explicit overflow menu
  - reduce mobile thread header metadata
- Notifications:
  - group Action Required first
  - then unread
  - then informational
  - keep bulk mark/delete actions visually secondary

### Code Simplification

- Split dashboard into mobile work queue and desktop analytics sections.
- Promote action queue data to normalized actionable entities where available.
- Extract `ChatThreadListItem` with native button/link semantics and separate action menu.
- Add notification grouping selectors before render.
- Extend filter primitives with quick filters so phone users do not always need the drawer.

### Acceptance Criteria

- Mobile dashboard leads with work, not analytics.
- Message delete actions do not depend on hover-style affordances.
- Notification drawer makes urgent work visually and structurally first.

## P3: User, Staff, Team, And Audit Secondary Simplification

### User Management

Affected routes/files:

- `/admin/users`
- `src/views/users/UserManagement.js`
- `src/hooks/useUsers.js`
- `src/views/users/user-management/components/UserManagementTableSection.js`

Simplification:

- Split account management from role/security actions where possible.
- Move destructive actions into profile or action drawer.
- Replace separate modal booleans with an action reducer/registry.
- Reuse one user action model across table, cards, and profile.

### Staff Directory And Profile

Affected routes/files:

- `/staff/details`
- `/staff/profile/:staffId`
- `src/views/staff/StaffDetails.js`
- `src/views/staff/StaffProfile.js`
- `src/hooks/useStaffActions.js`

Simplification:

- Keep directory primarily read-only with `View profile` as the main action.
- Concentrate terminate, rehire, role, and message actions in the profile.
- Centralize staff loading/filtering and role exclusions.
- Reuse profile summary and action components.

### Team Directory And Team View

Affected routes/files:

- `/team/details`
- `/team/:teamId`
- `src/views/team/TeamDetails.js`
- `src/views/team/TeamView.js`
- `src/views/team/components/EditTeamModal.js`

Simplification:

- Keep team cards simple.
- Move member assignment and delete flows into focused modal steps.
- Extract shared team directory/detail data hooks.
- Extract member assignment domain helpers.

### Audit Logs

Affected routes/files:

- `/admin/audit`
- `src/views/audit/AuditLogs.js`
- `src/components/users/UserAuditPanel.js`

Simplification:

- Keep the current screen mostly intact.
- Add concise event-detail drawer when details grow.
- Share audit event formatter/table/mobile renderer.
- Consider server pagination/filtering later if local latest-200 filtering becomes limiting.

## Sequenced Implementation Plan

### [x] Pass 1: Salary Bulk Mode Separation

Goal: reduce the highest-risk mobile workflow confusion.

Work:

- [x] Introduce local bulk summary metadata.
- [x] Split salary selected bars into approval and payment modes.
- [x] Add mode-specific mobile sticky selection tray.
- [x] Improve confirmation modal summary with totals and sampled records.
- [x] Keep existing handlers and backend calls.

Verification:

- Salary approval still approves/rejects only eligible claims.
- Payment actions still mark/unmark paid only eligible salary claims.
- Mobile shows one primary bulk intent at a time.
- Desktop remains functionally equivalent.

### [x] Pass 2: Shared Record And Bulk Primitives

Goal: reduce repeated implementation complexity before more module work.

Work:

- [x] Add `RecordCard`.
- [x] Add `RowActionCell`.
- [x] Add `BulkSelectionActionBar`.
- [x] Start `ResponsiveRecordCollection` with Claim Records and Salary Records.
- [x] Split `TableFilters` internals without changing public behavior.
- [x] Add explicit filter default support and migrate Salary & Claims filters.

Verification:

- [x] Existing Leave, Overtime, Payroll, Reports, Inspection record tests remain green.
- [x] No regression in row action propagation.
- [x] Mobile and desktop record visibility remains breakpoint-correct.

### Pass 3: Payroll Detail Summary

Goal: make payroll details understandable on phones and easier to maintain.

Work:

- [x] Extract payroll breakdown view-model.
- [x] Apply it to payslips and salary claim read-only detail.
- [x] Convert read-only salary/OT tables to mobile stacked rows.
- [x] Reduce visible calculation density on mobile.

Verification:

- [x] Payroll calculations do not change.
- [x] Desktop detail tables remain available.
- [x] Mobile detail summary clearly exposes final payable and contributors.

### Pass 4: Salary Assignment Step Flow

Goal: reduce nested edit-mode friction.

Work:

- [x] Introduce step shell: staff/month, pay package, review.
- [x] Move pay row derivation to pure selectors.
- [x] Replace nested dirty state with reducer/state machine.
- [x] Keep autosave and overwrite warning behavior.

Verification:

- [x] Create/edit salary assignment still saves same payload shape.
- [x] Dirty guards and autosave still work.
- [x] Main submit is not blocked by hidden sub-editor states.

### Pass 5: Staff Leave/Overtime Shared Workflow Records

Goal: unify the repeated manager workflow list pattern.

Status: completed on 2026-06-12.

Work:

- [x] Migrate staff leave and staff overtime records to shared workflow record helpers.
- [x] Extract month/user grouping, mobile section mapping, and bulk selected-state helpers.
- [x] Use shared selected-action bar and row-action cell plumbing for leave/overtime workflow records.
- [x] Simplify leave assignment mobile experience with phone-only employee entitlement summary cards.

Verification:

- [x] Existing approve/reject/review/cancel/delete behavior remains unchanged.
- [x] Group totals remain correct.
- [x] Mobile cards and desktop tables remain equivalent.
- [x] Assignment cards open details while edit actions keep using the existing assignment modal.

Follow-up:

- Full assignment patch-list editing, RouteNavTabs consolidation, Reports/Inspection guided forms,
  and Settings role-focused editors were completed in later passes.

### Pass 6: Roster Mobile Editor And State Reducer

Goal: keep the good mobile day list but simplify editing.

Status: completed on 2026-06-12.

Work:

- [x] Add focused mobile day editor bottom sheet.
- [x] Extract conflict validator.
- [x] Move print/export out of `RosterManagement`.
- [x] Move edit state into reducer/state machine.

Verification:

- [x] Assignments still call existing assignment handlers.
- [x] Conflict validation remains accurate.
- [x] Save draft, publish, cancel, print, and export still work.

Follow-up:

- RouteNavTabs consolidation, Reports/Inspection guided forms, and Settings role-focused editors
  were completed in later passes.

### Pass 7: Reports/Inspection Guided Forms

Goal: reduce field and decision overload in operational reporting.

Status: completed on 2026-06-12.

Work:

- Simplify ERCO basic path.
- Extract chronology and post-analysis modules.
- Convert Inspection AI confirmation into editable summary.
- Move custom type/location management out of primary creation path.

Verification:

- Drafts, edits, review actions, and submissions remain unchanged.
- Users can complete common report paths without advanced sections.

### Pass 8: Settings Role-Focused Editors

Goal: keep matrix power but stop making it the default phone experience.

Status: completed on 2026-06-12.

Work:

- Dashboard visibility role editor.
- Shared approval rules editor.
- Plain-language workflow preview.
- Matrix remains available as advanced view.

Verification:

- Permission/rule storage stays unchanged.
- Role-focused changes match matrix changes.
- Existing settings tests remain green.

## Completed Implementation Reference

This section preserves the implementation-ready reference that guided the completed passes. It is historical. Future agents should not execute these steps as open work; all listed passes were completed and verified for the 2026-06-12 simplification scope.

### Historical Execution Guardrails

- Do not combine passes unless a later plan explicitly names the combined scope and its rollback boundaries.
- Before editing a pass, run a targeted `rg` inventory and read the current component/controller tests for the touched module.
- Keep route paths, backend API calls, local-storage keys, permission checks, workflow declarations, payroll calculations, and payload shapes unchanged.
- Prefer pure selectors/reducers first, then UI wiring, then tests. Avoid changing UI and business derivation in the same untested step.
- For any form simplification, add payload-equivalence tests before changing the visible flow.
- For any navigation simplification, prove dirty/unsaved guards still block navigation before migrating the next module.
- For any mobile replacement, keep the existing desktop/tablet surface from `md` upward unless a specific defect is being fixed.
- After each pass, run focused tests, focused ESLint, `git diff --check`, `npm run build`, then clean generated `build/` churn.
- Update completion status only after tests and audit pass. If partial work lands, mark it as partial with exact remaining items.

### [x] Remaining Pass A: Payroll Claim Form Simplification

Completed on 2026-06-12. Implemented a summary-first salary claim path, moved salary/OT detail
tables behind disclosure sections, added and wired a pure claim-form view-model, grouped
`SalaryClaimBody` props into form-specific adapter objects, made expense item entry category-led,
and added regression coverage for attachment preview, leave guard, and post-submit modal behavior
without changing payloads, autosave keys, submit handlers, routes, or attachment upload behavior.

Goal: make salary and expense claim creation follow a default path first, with advanced calculations and exception fields behind progressive disclosure.

1. Inspect current claim form entry points:
   - `src/views/payroll/components/claim-form/SalaryClaimForm.js`
   - `src/views/payroll/components/claim-form/SalaryClaimBody.js`
   - `src/views/payroll/components/claim-form/ExpenseOtherClaimForm.js`
   - `src/views/payroll/components/claim-form/ClaimSubmissionEditorCard.js`
2. Add pure form view-model helpers under `src/views/payroll/components/claim-form/`:
   - salary claim summary selector
   - expense category schema selector
   - attachment grouping selector
   - default-path validity selector
3. Salary claim UI changes:
   - render final payable, baseline net, adjustments total, approved OT, and confidence/status at the top.
   - keep baseline salary confirmation visible but non-dominant.
   - move adjustments and OT line-level detail into accordions.
   - keep submit/draft/navigation guards exactly as-is.
4. Expense claim UI changes:
   - start with period and category.
   - render category-specific fields only after category is selected.
   - show saved items as concise cards.
   - attach item files near the item that owns them.
5. Controller simplification:
   - group props passed to `SalaryClaimBody` into `period`, `baseline`, `adjustments`, `overtime`, `attachments`, `actions`, and `state`.
   - do not change claim payload shape.
6. Tests:
   - salary claim default path can submit without expanding advanced detail.
   - expanded salary advanced sections still show current calculation rows.
   - expense fields appear only for relevant category.
   - draft restore, attachment preview, leave guard, submit confirmation, and post-submit modal remain unchanged.
7. Gates:
   - focused Vitest for payroll claim-form tests.
   - focused ESLint on changed payroll claim files.
   - `git diff --check`.
   - `npm run build`.
   - clean generated `build/` churn.
8. Misfire guards:
   - do not change `onSaveDraft`, submit handler signatures, upload payloads, or claim route names.
   - do not recompute payroll values differently; use existing helpers/selectors where available.
   - do not remove advanced calculation rows; only move them behind disclosure.
   - do not make expense category schemas own persistence; they should only control visible fields and labels.
   - if prop regrouping creates large churn, keep existing props and add adapter objects locally first.

### [x] Remaining Pass B: Broader Record Primitive Migration

Goal: migrate remaining record screens onto the shared record/action/filter primitives so future screens do not hand-roll mobile cards, row actions, footers, and selected bars.

Status: completed on 2026-06-12. Salary & Claims, self-service Leave/Overtime, Reports/Inspection,
Audit Logs, Staff Directory, User Management, and user profile session/audit panels now use shared
responsive/action primitives where the record model maps cleanly. Login Records remain on a custom
expandable phone card because that interaction is intentionally detail-toggle based rather than a
static record summary. Dense matrices, workflow rule tables, and financial/detail inspection tables
remain intentionally out of scope.

1. Inventory remaining hand-rolled record screens with `rg`:
   - `MobileRecordList`
   - `RowActions`
   - `CTable`
   - `DataTableFooter`
   - manual `stopPropagation`
2. Prioritize migration order:
   - [x] self-service Leave/Overtime records migrated to `ResponsiveRecordCollection` and `RowActionCell`.
   - [x] Reports and Inspection record sections migrated to `ResponsiveRecordCollection` and `RowActionCell`.
   - [x] Audit/User/Staff secondary record panels migrated where record identity/actions are clear.
   - [x] Remaining custom/dense panels documented as intentional exceptions.
3. For each screen:
   - keep desktop table markup from `md` upward unless there is a known bug.
   - keep mobile cards below `md`.
   - replace manual row-action cells with `RowActionCell`.
   - replace repeated selected bars with `BulkSelectionActionBar` where bulk selection exists.
   - use explicit `TableFilters` `defaultValue` for filters that depend on first-option fallback.
4. Do not migrate dense matrices in this pass:
   - role permissions
   - dashboard visibility
   - workflow rule matrices
5. Tests:
   - mobile card opens via click/Enter/Space.
   - row actions do not open records.
   - desktop table remains present from `md`.
   - footer counts remain correct.
   - disabled reasons stay exposed.
6. Gates:
   - focused tests for each migrated module.
   - shared primitive regression tests.
   - focused ESLint.
   - `git diff --check`.
   - `npm run build`.
7. Misfire guards:
   - do not migrate more than two modules in one PR/pass unless all focused tests already exist.
   - do not convert matrices, nested financial tables, or settings editors just because they contain `CTable`.
   - do not introduce new row action eligibility logic; call existing module helpers.
   - preserve test IDs used by current tests unless replacing them with a documented shared primitive test.

### [x] Remaining Pass C: RouteNavTabs Consolidation

Completed on 2026-06-12. Added `RouteNavTabs` over `ModuleNavTabs`, preserved current
underline styling, centralized active-route matching and guarded navigation handling, and migrated
Payroll, Leave Management, Overtime Management, Salary & Claims, Settings, and Roster route-backed
navs without changing route definitions or existing switch/guard state.

Goal: centralize route-backed nav semantics and guard handling so modules stop duplicating active-route logic and avoid tab ARIA misuse.

1. Create `RouteNavTabs` over `ModuleNavTabs`.
2. Required interface:
   - `items`: key, label, to, match, disabled, disabledReason, onBeforeNavigate.
   - `currentPath`.
   - `navigate`.
   - optional `replace`.
3. Behavior:
   - render no `role="tablist"` or `role="presentation"`.
   - active item receives `aria-current="page"`.
   - click calls `onBeforeNavigate`; if it returns false, do not navigate.
   - preserve existing dirty/unsaved guards in salary, overtime, roster, and settings.
4. Pilot modules:
   - Payroll nav.
   - Leave Management tabs.
   - Overtime Management tabs.
   - Salary & Claims tabs.
   - Settings tabs.
   - Roster tabs.
5. Tests:
   - active matching works for exact and prefix routes.
   - dirty guard blocks navigation.
   - disabled items expose reason and do not navigate.
   - no tab roles are rendered.
6. Gates:
   - nav-focused Vitest.
   - `rg 'role="(tablist|presentation)"' src`.
   - focused ESLint.
   - `git diff --check`.
   - `npm run build`.
7. Misfire guards:
   - build and test `RouteNavTabs` with one pilot module before touching all navs.
   - `onBeforeNavigate` must support async confirmation flows and a `false` return.
   - do not replace modal/confirm guard state; route nav should call existing guard handlers.
   - keep current active mapping for detail/create routes, especially Payroll claim detail and Salary assignment routes.
   - after migration, run an `rg` check for stale `role="tablist"` and `role="presentation"` only in route-backed navs; do not remove true ARIA tabs if any are intentionally content tabs.

### [x] Remaining Pass D: Salary Assignment Patch-List Editing

Completed on 2026-06-12. Added pure assignment patch selectors, kept patch lists frontend-only,
wired the Review step to show changed pay components and remarks first, kept unchanged pay rows
behind a disclosure, and preserved the existing full-row submit payload and autosave/dirty guard
flow.

Goal: keep the completed three-step salary assignment flow, but simplify implementation so edits are represented as patches instead of repeatedly mutating or submitting a full matrix mentally.

1. Add pure helpers under salary assignment domain:
   - build baseline row map.
   - build current draft row map.
   - derive changed rows.
   - build submit payload from baseline plus patch list.
2. Keep backend payload shape unchanged.
3. UI changes:
   - Review step shows changed pay components and remarks first.
   - unchanged rows collapse behind `Show unchanged`.
   - autosave state still reflects whole draft state.
4. Controller changes:
   - reducer tracks patch list and baseline snapshot.
   - direct field edits update patch list.
   - clearing a field back to baseline removes that patch.
5. Tests:
   - unchanged draft produces empty patch summary.
   - changed allowance/deduction/basic salary produces expected patch.
   - submit payload is equivalent to current full-row payload.
   - autosave and dirty guard remain unchanged.
6. Misfire guards:
   - do not send patch lists to the backend; patches are internal display/controller state only.
   - do not change `buildSalaryAssignmentRow` arithmetic or field names.
   - do not alter autosave debounce, draft storage key, overwrite warning, or navigation guard semantics.
   - if payload-equivalence fails, stop and fix the selector instead of changing expected payloads.

### [x] Remaining Pass E: Reports And Inspection Guided Forms

Completed on 2026-06-12. ERCO now presents a basic-path summary before dense operational
chronology, with the chronology editor behind progressive disclosure while keeping the same draft
and payload fields. Inspection AI confirmation now supports an `Accept summary` path, reversible
`Edit details`, and secondary custom type management behind disclosure. Drill and Fitness Test
forms remain on their existing simpler guided flows and were not expanded in this pass.

Goal: make common ERCO/Drill/Fitness/Inspection creation paths guided and short, while keeping advanced operational detail available.

1. ERCO first:
   - identify required basic-report fields.
   - create `ErcoBasicPathSummary` view-model.
   - collapse chronology advanced tools by default.
   - split post-incident analysis into resources, strengths, opportunities, and photos components.
2. Chronology:
   - extract `useChronologyReducer`.
   - keep existing chronology payload and draft storage.
   - add tests for add/edit/delete/reorder if supported.
3. Inspection:
   - convert AI confirmation into editable summary.
   - expose `Accept summary` and `Edit details`.
   - keep original fields and draft state.
4. Custom type/location management:
   - move out of primary creation path into secondary drawer/modal.
   - keep current storage/API behavior.
5. Tests:
   - basic ERCO path can submit without opening advanced sections.
   - chronology reducer produces equivalent payload.
   - inspection AI summary accept/edit both preserve current data.
   - drafts, edit mode, review actions, and submissions remain unchanged.
6. Gates:
   - focused report/inspection tests.
   - focused ESLint.
   - `git diff --check`.
   - `npm run build`.
7. Misfire guards:
   - do not change report/inspection route structure or section route params.
   - do not drop any existing draft field; hidden advanced sections must still persist and restore.
   - do not make AI confirmation destructive; accepted summaries should be editable and reversible before submit.
   - implement ERCO and Inspection as separate sub-passes if either diff grows beyond focused form/controller files.
   - keep review/detail screens unchanged unless a test proves creation payload parity.

### [x] Remaining Pass F: Settings Role-Focused Editors

Goal: keep matrices for desktop power users, but give phone/tablet users role-focused editing and plain-language previews.

Completed on 2026-06-12. Role permissions and dashboard visibility have role-focused editing paths
with matrix access retained. Leave, Overtime, and Salary workflow rules now share
`ApprovalRulesEditor`, including presets and plain-language previews that write the existing rule
shapes.

1. Role permissions:
   - create a role selector.
   - show permission groups for one role at a time.
   - keep full matrix as advanced desktop/tablet view.
2. Dashboard visibility:
   - create same role-focused shell.
   - show section/widget toggles for selected role.
   - show changed-item review before save.
3. Workflow approval rules:
   - extract shared `ApprovalRulesEditor`.
   - support presets: single approver, review plus approval, three-stage approval.
   - show plain-language preview: checker, reviewer, approver, fallback.
4. Storage compatibility:
   - write exactly the same rule/permission/dashboard visibility shape as today.
   - do not alter permission semantics.
5. Tests:
   - role-focused edits match matrix edits.
   - advanced matrix remains available.
   - workflow preview text matches selected rules.
   - existing settings save/load tests remain green.
6. Gates:
   - focused settings tests.
   - focused ESLint.
   - `git diff --check`.
   - `npm run build`.
7. Misfire guards:
   - do not change permission identifiers, role names, dashboard widget keys, or workflow role semantics.
   - do not remove the full matrix; role-focused editors are an alternate primary UI, not a replacement.
   - save through existing storage/API functions only.
   - approval-rule presets must compile to the existing rule shape and be previewed before save.
   - if a matrix has no reliable mobile-safe editor path, explicitly mark it desktop-first instead of forcing a weak card conversion.

### [x] Remaining Pass G: Dashboard, Messages, And Notifications Throughput

Goal: improve mobile ERP task completion after high-risk forms and workflow screens are simplified.

Completed on 2026-06-12. Dashboard action queue, notification focus behavior, action-required
workflow notification grouping, and Messages quick filters for All, Unread, and Drafts are in place
using existing frontend state.

1. Dashboard:
   - mobile order becomes action queue, personal KPIs, then analytics.
   - desktop remains analytics-rich.
   - define action queue source and empty states before implementation.
2. Messages:
   - audit compose/reply/thread actions at 320px and 360px.
   - keep below-`md` phone behavior.
   - add quick filters only if they map to existing message state.
3. Notifications:
   - group workflow notifications by action required.
   - preserve drawer focus trap and return focus behavior.
4. Tests:
   - mobile dashboard order.
   - message responsive state.
   - notification keyboard/focus regression.
5. Misfire guards:
   - do not implement dashboard action queue until its data source and priority rules are documented.
   - do not invent new notification categories that backend data cannot support.
   - keep Messages below-`md` breakpoint policy aligned with the mobile audit.
   - preserve notification drawer focus trap, Escape behavior, and return focus.

### [x] Remaining Pass H: Secondary Admin/Staff/Team Cleanup

Completed on 2026-06-12. Audit/user/staff secondary record panels use shared responsive/action
primitives where practical, team cards separate open and edit controls with keyboard access, and
Login Records remains a documented custom expandable-detail exception rather than a forced static
card migration.

Goal: reduce maintenance cost on lower-risk secondary panels after primary workflow simplification.

1. User activity panels:
   - migrate login/session/audit panels to shared record collections where rows are action-oriented.
   - keep export/revoke behavior unchanged.
2. Staff and team secondary views:
   - replace repeated card/table shells with shared primitives.
   - keep profile navigation, team CRUD, member assignment, and export behavior unchanged.
3. Audit logs:
   - continue using mobile cards.
   - remove any remaining mojibake separators when touching files.
4. Tests:
   - row action propagation.
   - mobile card open behavior.
   - export/revoke/modal workflows.
5. Misfire guards:
   - do not touch auth/session revocation API behavior.
   - do not move destructive user actions into primary mobile card open regions.
   - keep exports byte-for-byte compatible where tests or downstream use depend on headers.
   - treat these as cleanup passes; defer if they compete with P1/P2 form and settings work.

## Non-Goals

- No backend API redesign in this simplification backlog.
- No route schema changes unless explicitly planned later.
- No permission model changes.
- No workflow approval rule semantics changes.
- No payroll calculation changes.
- No removal of audit detail; only progressive disclosure.
- No broad visual redesign before structural simplification.

## Suggested Test Strategy

- Add unit tests for new selectors/reducers before UI migration.
- For each migrated record screen, test:
  - mobile cards
  - desktop tables
  - row actions
  - disabled reasons
  - bulk eligibility
  - keyboard activation
  - empty/loading/error states
- For each simplified form, test:
  - default path
  - advanced expanded path
  - draft restore
  - dirty guard
  - submit confirmation
  - payload equivalence
- For mobile workflow simplification, manually verify:
  - 320px
  - 360px
  - 390px
  - 430px
  - 768px
  - 1024px
  - desktop

## Success Definition

The simplification work is successful when:

- High-consequence actions are separated by intent and consequence.
- Phone users can complete the most common task without scanning desktop-shaped detail.
- Developers can add a new workflow record list without hand-writing mobile cards, desktop tables, filter drawers, and bulk bars from scratch.
- Large modules are split by route/task instead of one shell owning many modes.
- Existing workflow safeguards, permissions, declarations, disabled reasons, and calculations remain intact.

Final closure: achieved for the planned 2026-06-12 simplification scope and archived on 2026-06-15.
