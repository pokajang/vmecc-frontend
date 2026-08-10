# Frontend Live UAT Route Matrix

**Date:** 2026-08-10

**Status:** Day 1 baseline; routes have not yet passed live UAT

**Machine-readable source:** `tests/e2e/live-uat/route-manifest.json`

## Baseline

- Source routes: 98
- Public routes added from `src/App.js`: 7
- Canonical manifest rows: 105
- Implemented inspection subtypes: 8
- Report subtypes: 3
- Planned status counts: `testable` 33, `permission-blocked` 0, `data-blocked` 15, `feature-disabled` 0, `redirect-only` 28, `controlled-only` 29

`data-blocked` means a safe representative dynamic record still needs to be discovered with an authorized account. `controlled-only` means opening or completing the primary task could mutate data and belongs in the disposable local environment.

## Route families

| Module family | Routes | Intended personas | Route patterns |
|---|---:|---|---|
| administration | 7 | system-administrator | `/admin/ai-helper-knowledge`<br>`/admin/ai-helper-reports`<br>`/admin/audit`<br>`/admin/feedback-reports`<br>`/admin/users`<br>`/admin/users/:id`<br>`/admin/users/:id/:slug` |
| dashboard | 2 | tactical-response-team | `/`<br>`/dashboard` |
| inspection | 15 | tactical-response-team, incident-commander | `/inspection`<br>`/inspection/:reportId`<br>`/inspection/:reportId/edit`<br>`/inspection/all-extinguishers`<br>`/inspection/all-extinguishers/:extinguisherId`<br>`/inspection/all-extinguishers/new`<br>`/inspection/new`<br>`/inspection/new/:newSection`<br>`/inspection/review`<br>`/inspection/ux-matrix`<br>`/inspection/workflow-settings`<br>`/report/inspection`<br>`/report/inspection/:reportId`<br>`/report/inspection/new`<br>`/report/inspection/new/:newSection` |
| leave-management | 10 | human-resource | `/staff/leave`<br>`/staff/leave-management`<br>`/staff/leave-management/:legacyLeaveId`<br>`/staff/leave-management/leaves`<br>`/staff/leave-management/overtime`<br>`/staff/leave-management/record/:leaveId`<br>`/staff/leave-management/rules`<br>`/staff/leave-management/set-holidays`<br>`/staff/leave-management/set-leaves`<br>`/staff/leave/:leaveId` |
| leave-self-service | 3 | tactical-response-team | `/leave`<br>`/leave/:leaveId`<br>`/leave/new` |
| messages | 1 | authenticated-user | `/messages` |
| notifications | 2 | authenticated-user | `/notifications/leave`<br>`/notifications/workflow` |
| overtime-management | 5 | human-resource, contract-manager, system-administrator | `/staff/overtime-management`<br>`/staff/overtime-management/:legacyOvertimeRouteKey`<br>`/staff/overtime-management/record/:overtimeRouteKey`<br>`/staff/overtime-management/records`<br>`/staff/overtime-management/rules` |
| overtime-self-service | 3 | tactical-response-team | `/overtime`<br>`/overtime/:overtimeId`<br>`/overtime/new` |
| payroll-management | 21 | finance, human-resource | `/staff/salary-claims`<br>`/staff/salary-claims/:legacyClaimId`<br>`/staff/salary-claims/assignment/:assignmentId/edit`<br>`/staff/salary-claims/assignment/:assignmentId/view`<br>`/staff/salary-claims/assignment/new`<br>`/staff/salary-claims/claim/:claimId`<br>`/staff/salary-claims/claims`<br>`/staff/salary-claims/company-legal`<br>`/staff/salary-claims/overtime/:overtimeRouteKey`<br>`/staff/salary-claims/salary`<br>`/staff/salary-claims/set-ot-rate`<br>`/staff/salary-claims/set-salary`<br>`/staff/salary-claims/workflow-rules`<br>`/staff/set-salary`<br>`/staff/set-salary/assignment/:assignmentId/edit`<br>`/staff/set-salary/assignment/:assignmentId/view`<br>`/staff/set-salary/assignment/new`<br>`/staff/set-salary/company-legal`<br>`/staff/set-salary/set-ot-rate`<br>`/staff/set-salary/set-salary`<br>`/staff/set-salary/workflow-rules` |
| payroll-self-service | 7 | tactical-response-team | `/payroll`<br>`/payroll/claims`<br>`/payroll/claims/:claimId`<br>`/payroll/claims/new`<br>`/payroll/claims/new/expense`<br>`/payroll/claims/new/salary`<br>`/payroll/payslips` |
| profile | 2 | authenticated-user | `/profile`<br>`/profile/security` |
| public | 7 | unauthenticated | `/403`<br>`/404`<br>`/500`<br>`/forgot-password`<br>`/login`<br>`/register`<br>`/reset-password` |
| reporting-settings | 2 | system-administrator | `/reporting-settings`<br>`/reporting-settings/:moduleKey` |
| reports | 4 | tactical-response-team, incident-commander | `/report/:reportType`<br>`/report/:reportType/:reportId`<br>`/report/:reportType/new`<br>`/report/:reportType/new/:newSection` |
| roster | 4 | contract-manager | `/roster`<br>`/roster/overview`<br>`/roster/schedule`<br>`/roster/shift-settings` |
| settings | 5 | system-administrator | `/settings`<br>`/settings/dashboard-visibility`<br>`/settings/inspection-workflow`<br>`/settings/modules`<br>`/settings/role-permissions` |
| staff | 3 | human-resource, contract-manager | `/staff/details`<br>`/staff/profile/:id`<br>`/staff/shift-settings` |
| teams | 2 | contract-manager | `/team/details`<br>`/team/details/:id` |

## Inspection subtype states

| Subtype | Required permission | Required states | Production mode | Mutation mode |
|---|---|---|---|---|
| General Inspection | `reports.inspection.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |
| Health Safety Environment | `reports.inspection.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |
| Fire Extinguisher | `reports.inspection.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |
| Fire Truck Daily Readiness | `reports.inspection.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |
| Hydraulic Rescue Tools | `reports.inspection.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |
| High Angle Rescue Equipment | `reports.inspection.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |
| Emergency Response Auxiliary Equipment | `reports.inspection.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |
| SCBA | `reports.inspection.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |

## Report subtype states

| Subtype | Required permission | Required states | Production mode | Mutation mode |
|---|---|---|---|---|
| ERCO | `reports.erco.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |
| Fitness Test | `reports.fitness.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |
| Drill | `reports.drill.view` | home, new-form, review, submitted-detail, image-evidence | read-only-details | controlled-only |

## Day 1 interpretation

- This matrix defines the UAT population; it does not claim visual or functional passes.
- Authentication credentials were not stored in the repository.
- Actual production IDs belong only in ignored local run artifacts.
- Redirect rows are verified for destination and state preservation, not treated as duplicate UI views.
- Permission expectations are expressed through intended personas and required permissions; later UAT must use the operational role, not only SysAdmin.
