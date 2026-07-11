# Leave Remediation V1

## Purpose

Harden leave submission, entitlement accounting, workflow authority, attachments,
and concurrent updates without redesigning the existing Leave or Staff Leave
Management experience.

This plan addresses the production blockers found in the leave audit. It is an
implementation sequence, not a UI redesign specification.

## UI Preservation Contract

The existing page structure remains the product contract:

- Keep `Leave.js` as the applicant page shell and preserve its records, detail,
  and application sections.
- Keep the existing leave-type selection, form fields, confirmation modal,
  records table, manager records table, assignment tab, holiday tab, and
  workflow modal.
- Do not replace tables, cards, navigation, filters, or the approval workflow
  presentation.
- Reuse existing toasts, inline field errors, disabled states, and modals for
  new validation and conflict feedback.

Permitted UI changes are deliberately small:

- Add an evidence download row/button to existing applicant and manager detail
  views.
- Add a `Request correction` row action using the existing workflow modal.
- Add concise conflict and unavailable-data messages using existing alerts and
  toasts.
- Disable bulk selection/actions that the server declares ineligible.

No new page, dashboard, wizard, or broad component restyle is required.

## Execution Rules

1. Release backend compatibility before frontend behavior that depends on it.
2. Keep each schema migration additive and backward compatible.
3. Do not recalculate or overwrite historical balances automatically in a
   migration. Generate a reviewable reconciliation report first.
4. Wrap each leave mutation and its balance update in one database transaction.
5. Use row locks only inside short transactions; never perform notification,
   file streaming, or network work while holding locks.
6. Dispatch notifications after a committed transaction. A notification failure
   must not roll back a completed leave decision.
7. Preserve existing records and approval history. Add new history actions;
   never rewrite prior history entries.
8. Return structured API errors and retain legacy response fields until all
   consumers have switched.
9. Implement and test one phase at a time. Do not bundle unrelated cleanup.

## Phase 0: Baseline and Release Safety

Before code changes:

1. Export a read-only report of active leave records, assignments, workflow
   snapshots, and attachments.
2. Identify records with negative availability, missing assignments, unsupported
   leave types, missing required evidence, overlap candidates, or inconsistent
   workflow state.
3. Record production migration status and verify backups/restoration procedure.
4. Add a feature flag or server capability response for the new versioned leave
   API if frontend and backend cannot be deployed together.

Safety checks:

- No data mutation is performed in this phase.
- The report must be reviewed by HR before balance corrections are applied.
- Existing applicants retain the current read-only and submission experience
  until the new API contract is available.

## Phase 1: Canonical Leave Policy

Create a backend-owned leave policy service or configuration that defines:

- Allowed leave types, including Maternity and Paternity Leave.
- Display-ID codes for every allowed type.
- Entitlement requirement per type.
- Evidence and coverage requirements per type.
- Allowed work shifts and half-day slots.
- Date policy, including future, past, and cross-year requests.

Use this policy in LeaveController, LeaveAssignmentController, display-ID
generation, and workflow services. Keep the frontend constants as a display
projection of the same policy until a policy endpoint is introduced.

Safety checks:

- Add Maternity and Paternity support before enforcing the allowlist so existing
  UI selections do not become invalid.
- Add a migration only if persistent policy data is required; do not convert
  existing leave types in place without an approved mapping.
- Reject unknown new submissions with a stable `LEAVE_TYPE_INVALID` code.

Acceptance:

- Every type shown in Leave.js can be assigned, submitted, formatted, and
  reconciled by the backend.

## Phase 2: Server-Side Claim Guard

Introduce `LeaveClaimGuardService` and call it from leave create and update.
The guard must:

1. Validate leave type, dates, shift, and half-day boundaries.
2. Calculate working days from the server calendar and persist that value rather
   than the caller's `days` value.
3. Enforce coverage and evidence requirements from the canonical policy.
4. Verify that an attachment belongs to the applicant and is unlinked or linked
   to the leave being updated.
5. Reject overlapping active leave records for the same applicant. Cancelled and
   rejected records must not block a new request.
6. Return precise 422 errors, including `LEAVE_OVERLAP`,
   `LEAVE_ATTACHMENT_INVALID`, `LEAVE_ATTACHMENT_REQUIRED`, and
   `LEAVE_DAYS_INVALID`.

Safety checks:

- Treat client `days` as a compatibility input only during transition; compare
  it to the calculated value, then persist only the calculation.
- Exclude the current record when validating an update.
- Do not use client-side validation as authorization or integrity enforcement.
- Add API tests for direct HTTP requests, not only browser form behavior.

Minimal UI effect:

- Keep the current form and validation layout. Map returned field errors to the
  existing inline error/toast mechanism.

## Phase 3: Entitlement Integrity and Transactions

Replace balance mutation helpers with transaction-safe accounting.

1. In a short database transaction, lock the leave record and all affected
   `leave_assignments` rows using `lockForUpdate`.
2. Verify an entitlement exists where policy requires one. Do not create a
   zero-entitlement assignment as a side effect of a request.
3. Verify `entitlement - used - pending` can cover the server-calculated days.
4. Apply pending, used, rejection, and cancellation deltas in the same
   transaction as the leave status transition.
5. Support cross-year leave by calculating and charging days per entitlement
   year. If that cannot be safely delivered in this version, reject cross-year
   submissions explicitly until the allocation model is complete.
6. Move notification dispatch and audit side effects to post-commit work.

Safety checks:

- Never hold locks while uploading/downloading attachments or sending
  notifications.
- Make balance deltas idempotent with the leave transition; retrying a failed
  request must not double charge an entitlement.
- Add a dry-run reconciliation command that compares assignment totals with
  leave records. Require HR approval before any repair command mutates data.

Acceptance:

- Concurrent requests cannot overdraw an entitlement or leave status and
  balance out of sync.

## Phase 4: Authoritative Workflow and Corrections

Make LeaveWorkflowController the sole authority for workflow transitions.

1. Enforce the snapshot's `workflow_stage` and `next_action_role` for review,
   recommend, approve, reject, and manager cancellation.
2. Restrict workflow bypass to System Administrator only.
3. Enforce `enforceDistinctApprovers` by checking prior actor IDs in approval
   history before allowing later workflow stages.
4. Validate declaration confirmation server-side for actions that require it,
   and append it to history remarks or a structured history field.
5. Add `Needs Correction` and `correction` stage. Require correction remarks.
6. Permit applicant edits for Draft, Needs Correction, and legacy Pending
   records that have not yet received a manager workflow action. A resubmission
   creates a `Resubmitted` history entry and returns the request to its
   configured first stage.
7. Return `permitted_actions` from management record endpoints. The frontend
   consumes this result rather than reconstructing authority itself.

Safety checks:

- Keep current status labels and approval-gate UI. Add only the correction row
  action and existing-modal copy needed to collect required remarks.
- Preserve all prior history entries; do not reset history when resubmitting.
- Return a validation error for legacy Pending records in malformed stages rather
  than guessing an actor or transition.

Acceptance:

- Direct API calls cannot reject, cancel, or approve a leave outside the
  server-assigned role and stage.

## Phase 5: Optimistic Concurrency

Add an additive `version` integer column to `leaves`, defaulting to 1.

1. Include `version` in applicant and manager record responses.
2. Require `expected_version` for update, applicant cancel/delete, and all
   manager workflow actions.
3. Compare and increment the version under the same transaction and row lock as
   the mutation.
4. On mismatch, return HTTP 409 with `LEAVE_VERSION_CONFLICT`, the current
   version, and a safe current record snapshot.

Safety checks:

- Deploy the backend to accept an absent `expected_version` during a short
  compatibility window only if the old frontend remains in service. Log these
  legacy writes and remove compatibility after frontend rollout.
- Do not use timestamps as version substitutes.
- Add the database migration before enabling strict frontend version requests.

Minimal UI effect:

- Use the existing toast and refresh records after a 409. Do not add a new
  conflict-resolution screen.

## Phase 6: Attachment Access and Retention

Separate attachment authorization from the applicant-only route group.

1. Allow the leave owner to access their own evidence.
2. Allow authorized leave managers to stream evidence for managed leave records.
3. Keep upload and destructive deletion owner-controlled, subject to leave
   status restrictions.
4. Prevent deletion of evidence linked to approved leave.
5. Add a small evidence row/download action to existing applicant and manager
   detail components.

Safety checks:

- Authorize through the attached leave record, not attachment ID possession.
- Keep storage paths private and stream files through authenticated endpoints.
- Check file ownership before replacing or detaching evidence.

Acceptance:

- Reviewers can inspect required evidence, while unrelated users receive 403.

## Phase 7: Manager Bulk Actions and Rules Permissions

Harden existing manager controls without changing their layout.

1. Use server `permitted_actions` to disable row actions and selection.
2. Before opening the existing bulk modal, require all selected rows to share
   one actionable stage and action.
3. Submit each selected record with its expected version and show the existing
   partial-success summary after refresh.
4. Align the Leave Workflow tab with API permission: either require
   `settings.manage` in the UI or introduce a dedicated server permission.
5. Treat `{ ok: false }` from loading or saving rules as failure. Never show a
   success message unless the server confirms the save.

Safety checks:

- Do not make bulk actions atomic unless the product explicitly requires that
  behavior; retain partial-success reporting but make incompatible selection
  impossible.
- Do not expose a fallback policy as if it were saved server state after a 403
  or network error.

## Phase 8: Frontend Contract Wiring

Update existing hooks and normalizers only:

- Map `version`, `permitted_actions`, correction status, and structured API
  errors in `leaveApiNormalizer.js` and leave persistence helpers.
- Send `expected_version` from existing submission, cancel, delete, and manager
  workflow hooks.
- Use backend error codes for field feedback, overlap, balance, attachment, and
  conflict messages.
- Treat `Needs Correction` as editable/resubmittable in the existing records
  and detail controls.
- Preserve existing draft behavior, but store a source-record ID/version when a
  correction draft is linked to a leave record.

Safety checks:

- Do not retain browser-only fallback records after an API load failure.
- Do not construct workflow stages, history entries, or approval roles on the
  client for persisted records.
- Keep all new UI messages inside current toast, alert, table action, and modal
  patterns.

## Phase 9: Data Reconciliation and Rollout

After all new behavior is tested in staging:

1. Run the dry-run reconciliation report against production data.
2. Review exceptions with HR, especially cross-year records and leave types
   previously unsupported by assignment APIs.
3. Apply approved corrections through an audited command, in small batches with
   an export of before/after values.
4. Run the additive schema migration.
5. Deploy backend compatibility, then frontend contract wiring, then enable
   strict version enforcement.
6. Monitor structured error codes, version conflicts, balance rejection rates,
   and attachment authorization failures.

Rollback:

- Feature flags or compatibility paths may disable strict client behavior.
- Do not roll back a migration by dropping live version data. Roll back code
  first, retain additive columns, and investigate data before any schema change.

## Required Verification

Backend feature tests must cover:

- Server-calculated days and rejection of forged day values.
- Entitlement missing/exhausted checks and concurrent submission behavior.
- Overlap detection, including half-day and cancelled/rejected boundary cases.
- Required coverage/evidence and attachment ownership/linkage.
- Every workflow action's role/stage authorization.
- Distinct approver enforcement, correction, resubmission, and audit history.
- Version conflict responses for applicant and manager mutations.
- Applicant and manager attachment access rules.
- Cross-year allocation or explicit cross-year rejection.

Frontend tests must cover:

- Existing form displays backend field errors without layout changes.
- Conflict toast/refresh behavior.
- Correction action and resubmission controls.
- Server-provided row permissions and incompatible bulk-selection blocking.
- Rules-tab permission failures and failed-save feedback.

Browser E2E tests must cover the real API path:

1. Applicant submits valid leave with evidence.
2. Manager reviews, recommends, and approves using configured roles.
3. Applicant receives correction, edits, and resubmits.
4. Unauthorized manager actions are denied by the API.
5. Concurrent applicant/manager changes produce a visible conflict and refresh.
6. Manager downloads evidence through the authenticated route.
7. Mixed-stage bulk selection is blocked before confirmation.

## Production Exit Criteria

The leave module is ready for production only when:

- All mutation paths are server-validated, transactional, versioned, and
  permission-checked.
- Balance reconciliation is reviewed and approved.
- The backend, frontend, and browser E2E suites pass in staging.
- No unresolved authorization, entitlement, attachment-access, or concurrency
  finding remains.
- The existing Leave and Leave Management UI remains materially unchanged apart
  from the limited controls described in this document.
