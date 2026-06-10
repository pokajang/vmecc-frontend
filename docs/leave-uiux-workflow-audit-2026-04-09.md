# Leave Module UI/UX and Workflow Audit
Date: 2026-04-09
Scope: Employee leave module, staff leave workflow actions, notification UI, and leave API workflow/notification services.

## Executive Summary
The leave module has a strong baseline: explicit stage-based workflow, confirmation modals on sensitive actions, draft support, attachment safeguards, and server-side notification emission. The main gaps are around consistency and integration quality, not core capability.

This audit is split into:
1. Fix now (no behavioral change) - applied in this implementation.
2. Significant change required - documented for follow-up.

## CRUD + Workflow Matrix (Source of Truth)
| Stage | Employee | Reviewer | Recommender | Approver | HR/Admin |
|---|---|---|---|---|---|
| Create (submit) | Create leave request, validate, confirm, submit | View incoming tasks | View incoming tasks when recommendation is enabled | View incoming tasks when final stage | Configure assignments/rules |
| Read | View record list/details and timeline | View all records in staff leave management | Same as reviewer | Same as reviewer | View all records, assignments |
| Update | Edit Pending/Draft request | N/A on employee-owned record edit | N/A | N/A | Assignment updates via staff module |
| Delete | Delete Draft only | N/A | N/A | N/A | N/A |
| Cancel | Cancel own eligible request (UI allows active/approved stage-state based rows) | Reject/cancel path through staff workflow endpoints | Same | Same | Admin cancel endpoint exposed |
| Review | N/A | Review action when role matches next action role | N/A | N/A | System Admin bypass supported |
| Recommend | N/A | N/A | Recommend action when stage/role match | N/A | System Admin bypass supported |
| Approve | N/A | If reviewer is final stage in policy | If recommender is final stage in policy | Final approval stage | System Admin bypass supported |
| Reject | N/A | Reject allowed in staff workflow | Reject allowed in staff workflow | Reject allowed in staff workflow | Reject allowed in staff workflow |

## Notification Lifecycle Matrix
| Event | Emission point | In-app persistence | Unread/action-required | Navigation target | Email coverage |
|---|---|---|---|---|---|
| submitted | LeaveController@store | leave_notifications table | unread=true, action_required depends on next role | Notifications pages -> leave/staff route mapping | Not wired in leave API route layer |
| edited | LeaveController@update | yes | action_required when re-review needed | same | Not wired in leave API route layer |
| reviewed | LeaveWorkflowController@review | yes | depends on next stage role | same | Not wired in leave API route layer |
| recommended | LeaveWorkflowController@recommend | yes | depends on next stage role | same | Not wired in leave API route layer |
| approved | LeaveWorkflowController@approve | yes | usually final/non-action | same | Not wired in leave API route layer |
| rejected | LeaveWorkflowController@reject | yes | final/non-action | same | Not wired in leave API route layer |
| cancelled | LeaveController@cancel / LeaveWorkflowController@adminCancel | yes | final/non-action | same | Not wired in leave API route layer |
| allocation_updated | LeaveAssignmentController via service | yes | non-action informational | same | Not wired in leave API route layer |

## Fix Now (No Behavioral Change) - Implemented
1. Notification payload normalization at frontend service boundary.
- Added a stable adapter for backend notification shape so UI consistently receives `read`, `unread`, `actionRequired`, and `actionRequiredForViewer`.
- File: `src/services/leaveNotifications.js`

2. Notification action-required counting fix.
- Count now uses normalized `actionRequiredForViewer` instead of legacy snake_case field.
- File: `src/hooks/useLeaveNotifications.js`

3. Notification navigation hardening for staff path.
- Staff notification deep-link now targets supported leave management route (`/staff/leave-management/leaves`) instead of legacy path.
- File: `src/services/leaveNotifications.js`

4. Leave form hook stability and dependency safety.
- Stabilized callbacks and setter references in `useLeaveForm` to support safe effect dependencies and reduce hook warning churn.
- File: `src/views/leave/hooks/useLeaveForm.js`

5. Leave screen lint/purity hardening.
- Resolved no-behavior lint/prettier issues.
- Removed render-time `Date.now()` use in filtering path.
- File: `src/views/leave/Leave.js`

6. Notification UI lint/prettier cleanup.
- No behavior change; formatting and consistency cleanup.
- Files: `src/views/notifications/leave/LeaveNotifications.js`, `src/views/notifications/tasks/LeaveTasks.js`

## Significant Change Required (Do Not Auto-Apply)
1. Cancellation policy consistency.
- Frontend cancellation eligibility helper and backend cancellation guards are not fully symmetric across all states and actors.
- Impact: user confusion and edge-case action denial after UI appears to allow action.
- Recommendation: define one canonical cancellation policy matrix (status x stage x actor), enforce it in shared domain logic and backend guards, and display reason labels when blocked.

2. Notification deep-link precision.
- Current mapping opens list pages, not always record-level deep links with context.
- Impact: slower task completion and possible wrong record targeting in high-volume queues.
- Recommendation: include `recordKey`/owner context in notification metadata and route directly to detail views.

3. Email channel gap for leave workflow notifications.
- Leave API exposes in-app notifications; explicit leave workflow email dispatch route/service is not wired in current leave routes/controllers.
- Impact: no guaranteed out-of-app alerting for critical workflow transitions.
- Recommendation: add backend leave email notification pipeline (queue + templates + retry policy + opt-in/out and role routing).

4. Action-required semantics for viewer role context.
- Action-required is currently broad; viewer-specific actionability can be made stricter against current role and stage at read time.
- Impact: some users may see action-needed badges for records they cannot currently act on.
- Recommendation: compute `actionRequiredForViewer` server-side with actor role context at query time.

5. Workflow declaration and audit text standardization.
- Declaration language exists, but cross-module consistency and legal wording control are not centralized.
- Impact: compliance wording drift between modules.
- Recommendation: centralize declaration templates in policy config and version them.

## Industry Standard Alignment Snapshot
Aligned:
- Multi-stage workflow with explicit stage and next action role.
- Confirmation modals for destructive/high-impact actions.
- Draft restore for interrupted submissions.
- Structured approval history and timeline view.
- In-app notification store with read tracking.

Partially aligned:
- Deep-link task resolution from notifications.
- Actor-specific action-required semantics.
- Unified frontend/backend policy source for cancellability.

Not yet aligned:
- Leave workflow email notifications as first-class production channel.
- Explicit SLA/escalation rules for unattended pending actions.

## Validation Run
- ESLint executed on all touched leave/notification files and returned clean results after fixes.
