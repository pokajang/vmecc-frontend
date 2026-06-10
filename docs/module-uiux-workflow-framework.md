# Module UI/UX Workflow Framework

Version: 1.0
Owner: Frontend Platform
Last updated: 2026-04-10

## Purpose

Use this as the default framework when building or auditing any frontend workflow module (leave, overtime, payroll, claims, approvals, requests, admin operations).

## 1. Interaction Principles and UX Quality Bar

1. State clarity first.

- Every record view must show current status, current action owner, and next possible actions.

2. Progressive disclosure.

- Keep list views compact.
- Show detailed timeline and metadata in record detail page/modal.

3. Safe action design.

- Require explicit confirmation for submit, approve, reject, cancel, delete.
- Require remarks for rejection.
- Show blocking reason when action is unavailable.

4. Form resilience.

- Support draft save and draft restore.
- Preserve attachment metadata safely.
- Guard unsaved changes with discard confirm.

5. Responsive parity.

- Desktop and mobile must expose equivalent controls and filters.
- No critical action should be desktop-only.

6. Accessibility baseline.

- Keyboard reachable actions and focusable controls.
- Programmatic labels for icon-only buttons.
- Clear error messaging tied to invalid fields.

## 2. Reusable CRUD + Workflow Template

## Create

- Required: field validation, eligibility checks, confirmation modal, success toast.
- Optional: draft save/restore.
- API contract: create returns normalized record model used by list/detail immediately.

## Read

- List view:
- Search, filter, sort, period controls.
- For self-service records tables, render month-group summary rows as:
  `<Month Year> | <N records>` on the left and `Total: <module KPI>` on the right.
- Month grouping sort contract: month-first ordering, then selected sort within each month.
- Month summary totals/counts must reflect current visible rows after pagination.
- For staff-admin records tables (leave, overtime, salary claims), render group summary rows as:
  `<Group Label> | <N records>` on the left and `Total: <module KPI>` on the right.
- Staff-admin group ordering contract: period/month-first ordering, then selected sort within each group.
- Use `Unknown period` for missing/malformed period/date group labels in staff-admin record tables.
- Standardize record-table Action cells with shared `RowActions` while keeping module-specific actions.
- Empty/loading/error states.
- Row actions with role/status gating.
- Detail view:
- Structured metadata card.
- Workflow timeline card with actor/time/remarks.

## Update

- Allowed states must be explicit (for example: Draft, Pending).
- Editing should re-evaluate workflow metadata if policy requires re-review.
- Changes should append history entry with actor/time.

## Delete

- Soft-delete preferred for auditability where feasible.
- Hard delete only for Draft/non-submitted records unless policy says otherwise.

## Cancel

- Canonical cancel matrix required (status x stage x actor).
- If cancelled after approval, rebalance used/pending counters according to policy.

## Review/Recommend/Approve/Reject

- Stage and role gating must be checked in both UI and API.
- Backend is final authority.
- UI should show required role label when action is blocked.

## 3. Notification Design Contract (In-App and Email)

## In-app notifications (mandatory)

- Event taxonomy: define per module (example: submitted, edited, reviewed, recommended, approved, rejected, cancelled, allocation_updated).
- Payload contract:
- `id`, `eventType`, `recordId`, `recordDisplayId`, `ownerUserId`, `actor`, `title`, `message`, `createdAt`.
- `read` plus frontend-derived `unread`.
- `actionRequired` and viewer-specific `actionRequiredForViewer`.
- UI requirements:
- Unread badge in header.
- Action queue view filtered to actionable items.
- Mark single read and mark all read.
- Deep-link to relevant record context.

## Email notifications (recommended for production)

- Trigger on high-importance transitions at minimum: submitted, approved, rejected, cancelled.
- Use queue-based dispatch with retry and failure logs.
- Include actor, record ID, action summary, and direct link.
- Respect user communication preferences and role-based recipient rules.

## 4. Frontend Architecture Guide

1. Layering

- View components: render only.
- Hooks: state derivation, workflow controls, side effects.
- Services: API and payload normalization.
- Utilities: pure formatting and workflow helper logic.

2. Data normalization boundary

- Normalize API payloads once at service/adapter layer.
- Never spread API field aliases across multiple views.

3. Error/loading/empty-state standards

- Every async section must define all three states.
- Use non-blocking toasts for operation feedback.
- Use inline field errors for validation.

4. Policy-driven behavior

- Workflow role/stage rules must come from policy snapshot or domain helper.
- Avoid hardcoding role decisions in view components.

5. Testing strategy

- Unit test domain helpers and workflow state transitions.
- Integration test critical user flows end-to-end.
- Add regression tests for notification payload mapping and route building.

## 5. QA Acceptance Checklist

1. Requester flow

- Can create request with valid inputs.
- Cannot submit when required fields/policies fail.
- Can save and restore draft.
- Can edit only allowed states.
- Can delete only allowed states.
- Can cancel only allowed states.

2. Staff workflow

- Action buttons match stage and role.
- Reject requires remarks.
- Stage transitions and status updates are correct.
- History timeline records actor/action/time/remarks.

3. Notifications

- In-app events generated for each workflow transition.
- Unread and action-required badges update correctly.
- Mark read and mark all read behave correctly.
- Deep links open correct module context.

4. Quality gates

- ESLint clean on touched files.
- No render purity violations.
- No hook dependency warnings in modified areas.
- Mobile and desktop parity verified.

## 6. Default Implementation Rules for Future Modules

- Apply no-behavior quality fixes immediately during audit implementation.
- Escalate policy or behavior-changing changes as explicit findings with impact and migration notes.
- Do not ship workflow module without a notification contract and deep-link behavior.
- Treat backend policy and frontend affordance as one contract; mismatch is a release blocker.

## 7. OT/Payroll Notification Operations

- Email dispatch for workflow notifications requires backend queue workers; keep `WORKFLOW_EMAIL_ENABLED=true` in runtime env for OT/Payroll production.
- Monitor `workflow_email_deliveries` for failure spikes (`status=failed`) and retry backlog.
- Validate after each release:
- `GET /workflow/notifications/unread-count` reflects header badges.
- `actionRequiredForViewer` counts match Workflow Action Queue.
- Deep links from in-app and email open the expected OT/Payroll record context.
