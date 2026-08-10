# Frontend Live UAT - Day 3 Route Schedule

**Date:** 2026-08-10  
**Production mode:** Read-only  
**Coverage contract:** 105/105 canonical routes, 8 inspection types, 3 report types

| Route ID | Pattern | Primary persona | Secondary | Status | Interaction | Fixture |
| --- | --- | --- | --- | --- | --- | --- |
| LIVE-UAT-001 | `/` | trt | - | redirect-only | read-only | - |
| LIVE-UAT-002 | `/403` | unauthenticated | - | testable | read-only | - |
| LIVE-UAT-003 | `/404` | unauthenticated | - | testable | read-only | - |
| LIVE-UAT-004 | `/500` | unauthenticated | - | testable | read-only | - |
| LIVE-UAT-005 | `/admin/ai-helper-knowledge` | sysadmin | - | controlled-only | shell-only | - |
| LIVE-UAT-006 | `/admin/ai-helper-reports` | sysadmin | - | testable | read-only | - |
| LIVE-UAT-007 | `/admin/audit` | sysadmin | - | testable | read-only | - |
| LIVE-UAT-008 | `/admin/feedback-reports` | sysadmin | - | testable | read-only | - |
| LIVE-UAT-009 | `/admin/users` | sysadmin | - | controlled-only | shell-only | - |
| LIVE-UAT-010 | `/admin/users/:id` | sysadmin | - | data-blocked | read-only | managed-user |
| LIVE-UAT-011 | `/admin/users/:id/:slug` | sysadmin | - | data-blocked | read-only | managed-user |
| LIVE-UAT-012 | `/dashboard` | trt | - | testable | read-only | - |
| LIVE-UAT-013 | `/forgot-password` | unauthenticated | - | testable | read-only | - |
| LIVE-UAT-014 | `/inspection` | trt | incidentCommander | testable | read-only | - |
| LIVE-UAT-015 | `/inspection/:reportId` | trt | incidentCommander | data-blocked | read-only | submitted-inspection |
| LIVE-UAT-016 | `/inspection/:reportId/edit` | trt | incidentCommander | controlled-only | shell-only | submitted-inspection |
| LIVE-UAT-017 | `/inspection/all-extinguishers` | trt | incidentCommander | testable | read-only | - |
| LIVE-UAT-018 | `/inspection/all-extinguishers/:extinguisherId` | trt | incidentCommander | data-blocked | read-only | active-fire-extinguisher |
| LIVE-UAT-019 | `/inspection/all-extinguishers/new` | trt | incidentCommander | controlled-only | shell-only | - |
| LIVE-UAT-020 | `/inspection/new` | trt | incidentCommander | controlled-only | shell-only | - |
| LIVE-UAT-021 | `/inspection/new/:newSection` | trt | incidentCommander | controlled-only | shell-only | new-section |
| LIVE-UAT-022 | `/inspection/review` | trt | incidentCommander | testable | read-only | - |
| LIVE-UAT-023 | `/inspection/ux-matrix` | trt | incidentCommander | controlled-only | shell-only | - |
| LIVE-UAT-024 | `/inspection/workflow-settings` | trt | incidentCommander | redirect-only | read-only | - |
| LIVE-UAT-025 | `/leave` | trt | - | testable | read-only | - |
| LIVE-UAT-026 | `/leave/:leaveId` | trt | - | data-blocked | read-only | leave-record |
| LIVE-UAT-027 | `/leave/new` | trt | - | controlled-only | shell-only | - |
| LIVE-UAT-028 | `/login` | unauthenticated | - | testable | read-only | - |
| LIVE-UAT-029 | `/messages` | trt | - | testable | read-only | - |
| LIVE-UAT-030 | `/notifications/leave` | trt | - | redirect-only | read-only | - |
| LIVE-UAT-031 | `/notifications/workflow` | trt | - | testable | read-only | - |
| LIVE-UAT-032 | `/overtime` | trt | - | testable | read-only | - |
| LIVE-UAT-033 | `/overtime/:overtimeId` | trt | - | data-blocked | read-only | overtime-record |
| LIVE-UAT-034 | `/overtime/new` | trt | - | controlled-only | shell-only | - |
| LIVE-UAT-035 | `/payroll` | trt | - | testable | read-only | - |
| LIVE-UAT-036 | `/payroll/claims` | trt | - | testable | read-only | - |
| LIVE-UAT-037 | `/payroll/claims/:claimId` | trt | - | data-blocked | read-only | payroll-claim |
| LIVE-UAT-038 | `/payroll/claims/new` | trt | - | controlled-only | shell-only | - |
| LIVE-UAT-039 | `/payroll/claims/new/expense` | trt | - | controlled-only | shell-only | - |
| LIVE-UAT-040 | `/payroll/claims/new/salary` | trt | - | controlled-only | shell-only | - |
| LIVE-UAT-041 | `/payroll/payslips` | trt | - | testable | read-only | - |
| LIVE-UAT-042 | `/profile` | trt | - | testable | read-only | - |
| LIVE-UAT-043 | `/profile/security` | trt | - | testable | read-only | - |
| LIVE-UAT-044 | `/register` | unauthenticated | - | redirect-only | read-only | - |
| LIVE-UAT-045 | `/report/:reportType` | trt | incidentCommander | data-blocked | read-only | report-type |
| LIVE-UAT-046 | `/report/:reportType/:reportId` | trt | incidentCommander | data-blocked | read-only | submitted-report |
| LIVE-UAT-047 | `/report/:reportType/new` | trt | incidentCommander | controlled-only | shell-only | report-type |
| LIVE-UAT-048 | `/report/:reportType/new/:newSection` | trt | incidentCommander | controlled-only | shell-only | new-section |
| LIVE-UAT-049 | `/report/inspection` | trt | incidentCommander | redirect-only | read-only | - |
| LIVE-UAT-050 | `/report/inspection/:reportId` | trt | incidentCommander | redirect-only | read-only | submitted-inspection |
| LIVE-UAT-051 | `/report/inspection/new` | trt | incidentCommander | redirect-only | shell-only | - |
| LIVE-UAT-052 | `/report/inspection/new/:newSection` | trt | incidentCommander | redirect-only | shell-only | new-section |
| LIVE-UAT-053 | `/reporting-settings` | sysadmin | - | redirect-only | read-only | - |
| LIVE-UAT-054 | `/reporting-settings/:moduleKey` | sysadmin | - | data-blocked | read-only | reporting-module |
| LIVE-UAT-055 | `/reset-password` | unauthenticated | - | controlled-only | shell-only | - |
| LIVE-UAT-056 | `/roster` | contractManager | - | redirect-only | read-only | - |
| LIVE-UAT-057 | `/roster/overview` | contractManager | - | testable | read-only | - |
| LIVE-UAT-058 | `/roster/schedule` | contractManager | - | testable | read-only | - |
| LIVE-UAT-059 | `/roster/shift-settings` | contractManager | - | testable | read-only | - |
| LIVE-UAT-060 | `/settings` | sysadmin | - | controlled-only | shell-only | - |
| LIVE-UAT-061 | `/settings/dashboard-visibility` | sysadmin | - | controlled-only | shell-only | - |
| LIVE-UAT-062 | `/settings/inspection-workflow` | sysadmin | - | redirect-only | shell-only | - |
| LIVE-UAT-063 | `/settings/modules` | sysadmin | - | controlled-only | shell-only | - |
| LIVE-UAT-064 | `/settings/role-permissions` | sysadmin | - | controlled-only | shell-only | - |
| LIVE-UAT-065 | `/staff/details` | humanResource | contractManager | testable | read-only | - |
| LIVE-UAT-066 | `/staff/leave` | humanResource | - | redirect-only | read-only | - |
| LIVE-UAT-067 | `/staff/leave-management` | humanResource | - | redirect-only | read-only | - |
| LIVE-UAT-068 | `/staff/leave-management/:legacyLeaveId` | humanResource | - | redirect-only | read-only | legacy-leave-record |
| LIVE-UAT-069 | `/staff/leave-management/leaves` | humanResource | - | testable | read-only | - |
| LIVE-UAT-070 | `/staff/leave-management/overtime` | humanResource | - | testable | read-only | - |
| LIVE-UAT-071 | `/staff/leave-management/record/:leaveId` | humanResource | - | data-blocked | read-only | leave-record |
| LIVE-UAT-072 | `/staff/leave-management/rules` | humanResource | - | testable | read-only | - |
| LIVE-UAT-073 | `/staff/leave-management/set-holidays` | humanResource | - | controlled-only | shell-only | - |
| LIVE-UAT-074 | `/staff/leave-management/set-leaves` | humanResource | - | controlled-only | shell-only | - |
| LIVE-UAT-075 | `/staff/leave/:leaveId` | humanResource | - | redirect-only | read-only | leave-record |
| LIVE-UAT-076 | `/staff/overtime-management` | humanResource | contractManager | redirect-only | read-only | - |
| LIVE-UAT-077 | `/staff/overtime-management/:legacyOvertimeRouteKey` | humanResource | contractManager | redirect-only | read-only | legacy-overtime-record |
| LIVE-UAT-078 | `/staff/overtime-management/record/:overtimeRouteKey` | humanResource | contractManager | data-blocked | read-only | overtime-record |
| LIVE-UAT-079 | `/staff/overtime-management/records` | humanResource | contractManager | testable | read-only | - |
| LIVE-UAT-080 | `/staff/overtime-management/rules` | sysadmin | - | controlled-only | shell-only | - |
| LIVE-UAT-081 | `/staff/profile/:id` | humanResource | contractManager | data-blocked | read-only | staff-member |
| LIVE-UAT-082 | `/staff/salary-claims` | finance | humanResource | redirect-only | read-only | - |
| LIVE-UAT-083 | `/staff/salary-claims/:legacyClaimId` | finance | humanResource | redirect-only | read-only | legacy-claim-record |
| LIVE-UAT-084 | `/staff/salary-claims/assignment/:assignmentId/edit` | finance | humanResource | redirect-only | shell-only | salary-assignment |
| LIVE-UAT-085 | `/staff/salary-claims/assignment/:assignmentId/view` | finance | humanResource | redirect-only | read-only | salary-assignment |
| LIVE-UAT-086 | `/staff/salary-claims/assignment/new` | finance | humanResource | redirect-only | shell-only | - |
| LIVE-UAT-087 | `/staff/salary-claims/claim/:claimId` | finance | humanResource | data-blocked | read-only | payroll-claim |
| LIVE-UAT-088 | `/staff/salary-claims/claims` | finance | humanResource | testable | read-only | - |
| LIVE-UAT-089 | `/staff/salary-claims/company-legal` | finance | humanResource | redirect-only | shell-only | - |
| LIVE-UAT-090 | `/staff/salary-claims/overtime/:overtimeRouteKey` | finance | humanResource | redirect-only | read-only | overtime-record |
| LIVE-UAT-091 | `/staff/salary-claims/salary` | finance | humanResource | testable | read-only | - |
| LIVE-UAT-092 | `/staff/salary-claims/set-ot-rate` | finance | humanResource | redirect-only | shell-only | - |
| LIVE-UAT-093 | `/staff/salary-claims/set-salary` | finance | humanResource | redirect-only | shell-only | - |
| LIVE-UAT-094 | `/staff/salary-claims/workflow-rules` | finance | humanResource | redirect-only | shell-only | - |
| LIVE-UAT-095 | `/staff/set-salary` | finance | humanResource | redirect-only | shell-only | - |
| LIVE-UAT-096 | `/staff/set-salary/assignment/:assignmentId/edit` | finance | humanResource | controlled-only | shell-only | salary-assignment |
| LIVE-UAT-097 | `/staff/set-salary/assignment/:assignmentId/view` | finance | humanResource | controlled-only | shell-only | salary-assignment |
| LIVE-UAT-098 | `/staff/set-salary/assignment/new` | finance | humanResource | controlled-only | shell-only | - |
| LIVE-UAT-099 | `/staff/set-salary/company-legal` | finance | humanResource | controlled-only | shell-only | - |
| LIVE-UAT-100 | `/staff/set-salary/set-ot-rate` | finance | humanResource | controlled-only | shell-only | - |
| LIVE-UAT-101 | `/staff/set-salary/set-salary` | finance | humanResource | controlled-only | shell-only | - |
| LIVE-UAT-102 | `/staff/set-salary/workflow-rules` | finance | humanResource | controlled-only | shell-only | - |
| LIVE-UAT-103 | `/staff/shift-settings` | humanResource | contractManager | testable | read-only | - |
| LIVE-UAT-104 | `/team/details` | contractManager | - | testable | read-only | - |
| LIVE-UAT-105 | `/team/details/:id` | contractManager | - | data-blocked | read-only | team |

## Inspection state probes

- general: home, new-form, review, submitted-detail, image-evidence
- hse: home, new-form, review, submitted-detail, image-evidence
- fire-extinguisher: home, new-form, review, submitted-detail, image-evidence
- frt-daily: home, new-form, review, submitted-detail, image-evidence
- hydraulic: home, new-form, review, submitted-detail, image-evidence
- high-angle: home, new-form, review, submitted-detail, image-evidence
- er-aux: home, new-form, review, submitted-detail, image-evidence
- scba: home, new-form, review, submitted-detail, image-evidence

## Report state probes

- erco: home, new-form, review, submitted-detail, image-evidence
- fitness-test: home, new-form, review, submitted-detail, image-evidence
- drill: home, new-form, review, submitted-detail, image-evidence

