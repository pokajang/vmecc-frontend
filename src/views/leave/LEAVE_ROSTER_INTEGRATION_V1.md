# Leave-Roster Interaction V1

## Purpose

Connect individual leave records to team-based roster assignments without
changing either module's primary layout or making roster duty a hard blocker
for a leave request.

This version is informational and operationally useful:

- An applicant can see published roster duty that overlaps the requested leave.
- The leave workflow carries an immutable snapshot of the duty known when the
  request was submitted or resubmitted.
- Roster managers can see live, privacy-safe leave markers on existing roster
  assignments.
- Approved leave affecting a published roster notifies the responsible roster
  audience; it does not automatically alter the roster.

## Product Contract

Rosters assign a **team** to a date and shift. Leave belongs to an individual.
An employee is considered rostered only when all of the following are true:

1. The employee has an active `team_members` membership for the roster date.
2. That team is assigned to the roster date and shift.
3. The leave interval overlaps that shift's actual time window.

Consequences:

- Never remove an entire team from a shift because one member applies for
  leave.
- Do not reject, reserve, or otherwise block a leave request due to roster
  duty in V1.
- Do not expose leave type, reason, medical evidence, or approval remarks in
  the roster module.
- Do not expose unpublished roster data to an applicant merely because they
  are applying for leave.

## UI Preservation Contract

Keep `Leave.js`, `RosterManagement.js`, current roster cards, mobile roster
editor, leave detail views, workflow modal, and existing table/card layouts.

Allowed additions only:

- One compact informational alert/summary in the existing leave application
  form after dates and time slots are sufficient to assess duty.
- One `Roster impact` row in existing applicant and manager leave detail
  sections.
- A compact marker appended to an existing roster shift assignment cell.
- A native tooltip or existing popover for marker details; do not add a new
  roster detail page, drawer, calendar, or scheduling wizard.
- Existing toast/notification patterns for published-roster impact notices.

## Status Semantics

Use the server as the single interpreter of leave and roster status.

| Leave state | Applicant duty context | Roster marker | Operational effect |
| --- | --- | --- | --- |
| Pending | Show informational duty context | `Leave requested` | No block |
| Needs Correction | Show only in leave history/detail | No marker | No effect |
| Approved | Show duty context and approved impact | `On leave` | Notify roster audience when applicable |
| Rejected / Cancelled / Draft | Do not show duty impact | No marker | No effect |

Pending requests are planning signals only. Approved leave is an absence
signal. A correction request must not leave an obsolete roster marker behind.

## Phase 0: Contract and Data Audit

Before implementation:

1. Inventory all `rosters`, `team_members`, `leaves`, `custom_shifts`, and
   shift-window records in a staging copy.
2. Confirm active membership logic uses `started_at <= roster date` and
   `ended_at >= roster date` (or null bounds), consistently with the
   inspection-session resolver.
3. Define the canonical mapping from leave time slots to roster shift windows,
   including overnight and custom shifts.
4. Confirm whether a roster assignment is valid only when published for
   applicants. V1 default: applicants see published duty only; roster managers
   may see draft impact in management responses if policy permits.
5. Identify roster-manager recipients and team-lead recipients for notices.

Safety checks:

- Do not backfill snapshot data by guessing historical membership or roster
  state.
- Do not modify leave balances, roster assignments, or published status.
- Document time-zone and overnight-shift behavior before coding overlap logic.

## Phase 1: Server-Owned Availability and Overlap Service

Create `LeaveRosterImpactService` in the backend. It must be the only place
that resolves leave-to-roster overlap.

Responsibilities:

1. Resolve active team membership for a user on each candidate roster date.
2. Load roster rows in one bounded query for the requested date range and
   matching teams.
3. Resolve built-in and custom roster shift windows from the same settings used
   by roster management.
4. Convert leave start/end dates and half-day slots into date/time intervals.
5. Detect interval overlap, including overnight shifts and partial-day leave.
6. Return a normalized impact item:

   ```json
   {
     "date": "2026-07-14",
     "shift": "day",
     "shift_label": "Day",
     "team_id": 12,
     "team_name": "Alpha",
     "roster_status": "published",
     "overlap": "full"
   }
   ```

7. Return an empty collection rather than an error where no duty exists.

Safety checks:

- Do not infer a user's team from a mutable display-name field.
- Use `team_members` date-effective membership, not only current membership.
- Keep query ranges bounded to the leave range or roster request range.
- Use local business dates consistently; never compare date strings as UTC
  timestamps for overnight shift decisions.
- Unit-test each overlap boundary before wiring UI behavior.

## Phase 2: Additive Leave Snapshot Storage

Add an additive nullable JSON column to `leaves`:

```text
roster_impact_snapshot
```

Snapshot shape:

```json
{
  "observed_at": "2026-07-11T10:00:00+08:00",
  "source": "published_roster",
  "items": ["normalized impact item"],
  "summary": {
    "duty_count": 2,
    "team_names": ["Alpha"]
  }
}
```

Lifecycle:

1. Create the snapshot inside the same leave create/update transaction after
   claim validation and before committing the leave record.
2. Refresh it when a pre-review Pending record is edited or a Needs Correction
   record is resubmitted.
3. Do not rewrite it when a roster later changes. It records the workflow
   context at submission time.
4. Keep it nullable for historical records. Show `No roster duty recorded` in
   detail views rather than fabricating history.
5. Include the snapshot in applicant and manager leave API responses.

Safety checks:

- This migration is additive and reversible at the code level; do not backfill
  from current roster data.
- Snapshot failure must fail the leave mutation only if the service itself
  cannot guarantee a correct result. A no-impact result is valid.
- Retain the existing leave `version` concurrency check. Snapshot updates occur
  under the same lock and version increment as the leave edit.

## Phase 3: Applicant Leave Context

Add a read-only endpoint scoped to `self.leave`, for example:

```text
GET /leave/roster-impact?leave_type=...&start_date=...&end_date=...&start_time_slot=...&end_time_slot=...
```

Rules:

1. Validate the same dates and time slots as leave submission.
2. Return only the authenticated applicant's own published roster impacts.
3. Return a privacy-safe summary and impact items. Do not expose other team
   members or unpublished schedules.
4. Debounce the existing form hook after complete dates/time slots are present;
   cancel stale requests when values change.

Minimal UI behavior in `LeaveApplySection`:

- Render one compact existing alert below date/slot controls when impacts exist.
- State that the request remains submittable.
- Summarize dates, shifts, and team names; avoid a new modal or calendar.
- Do not show the alert for a failed lookup. Submission remains governed by
  server-side leave validation, while a non-blocking lookup failure is treated
  as unavailable guidance.

Acceptance:

- An applicant sees published duty before submitting, but can submit normally.

## Phase 4: Workflow Detail Context

Reuse existing applicant and manager leave detail sections.

1. Display the snapshot in one `Roster impact` detail row when available.
2. Use neutral informational wording for Pending and approved-duty wording for
   Approved status.
3. Display the captured roster status and observed time only in manager detail
   where it supports audit review; keep applicant copy concise.
4. Do not add roster actions to the leave workflow modal in V1.
5. Include the snapshot in leave history exports only if such exports already
   exist; do not create a new export surface.

Acceptance:

- A manager can identify affected roster duty while reviewing leave without
  navigating away from the existing leave record.

## Phase 5: Live Roster Markers

Extend the existing roster index response with an availability block per shift:

```json
{
  "team_id": 12,
  "team": "Alpha",
  "status": "published",
  "leave_marker": {
    "requested_count": 1,
    "approved_count": 1,
    "people": [
      { "user_id": 52, "name": "Person A", "state": "approved" }
    ]
  }
}
```

Rules:

1. Calculate markers live from date-effective team membership, roster rows,
   and active leave records. Do not use leave snapshots for live staffing data.
2. Include only Pending and Approved records, using the status semantics above.
3. Expose member names only to `rosters.manage` users. Team viewers receive
   aggregate counts or no marker according to the approved privacy policy.
4. Never include leave type, reason, attachment, approval remarks, or medical
   details.
5. Batch-resolve markers for the roster response. Do not query leave records
   once per roster cell.

Minimal UI behavior:

- Append `1 leave request` or `1 on leave` to the current team assignment
  badge/cell.
- Use a tooltip/focus description to list permitted names and affected state.
- Keep existing edit controls and team selection unchanged.
- Carry the same marker into the existing roster print/export output as a
  concise count, not confidential detail.

Acceptance:

- A roster manager can identify team members with pending or approved leave on
  the assigned shift without losing the current roster layout.

## Phase 6: Published-Roster Notifications

Trigger roster-impact notification evaluation after a committed leave workflow
mutation that changes a leave into or out of Approved.

1. Compare current live roster impacts before and after the workflow change.
2. Notify roster managers and affected team leads only when the leave overlaps
   a published roster row.
3. Include leave display ID, employee name, date, shift, and team. Exclude
   leave type/reason/evidence.
4. Emit after commit through the existing workflow notification service.
5. Deduplicate equivalent transition notifications using the leave ID, version,
   action, roster date, and shift.
6. Do not send a notice for a Pending request in V1 unless operations explicitly
   request planning notifications later.

Safety checks:

- Notification failure cannot roll back leave approval/cancellation.
- Do not notify the applicant about their own roster impact unless the existing
  notification policy already requires it.
- A roster edit must not modify leave state or trigger leave workflow actions.

## Phase 7: Validation Boundaries

V1 does not enforce staffing thresholds because the system does not yet model
minimum team coverage per shift.

Enforce only these integrity rules:

1. Existing roster rule: a team cannot occupy more than one shift on the same
   date.
2. Existing leave rules: overlapping leave, entitlement, evidence, workflow,
   and version rules remain unchanged.
3. New read integrity: marker data must match the current roster/team
   membership/leave state for the response date range.
4. New notification integrity: only published duty produces an operational
   roster-impact notification.

Explicitly defer:

- Auto-unassigning or replacing a team.
- Blocking leave based on roster duty.
- Blocking roster publication for partial team absence.
- Payroll, attendance, or timesheet adjustments.
- Minimum-staffing enforcement until a configurable team/shift coverage policy
  exists.

Future coverage policy:

- Once minimum staffing is configured, block roster publication only when
  `available active members < required members`, with an audited override path.
- Do not reuse leave entitlement settings as staffing policy.

## Phase 8: Tests

### Backend unit and feature coverage

1. Membership is recognized only within its effective dates.
2. Published roster is visible to the applicant; draft roster is not.
3. Full-day, first-half, second-half, overnight, and custom-shift overlap rules
   return correct impacts.
4. Pending produces a requested marker; Approved produces an on-leave marker;
   correction, rejected, cancelled, and draft do not.
5. A correction resubmission refreshes the snapshot and increments leave
   version atomically.
6. A later roster edit changes live markers but not the leave snapshot.
7. Roster managers receive permitted names; unauthorized/team-viewer responses
   never leak leave details.
8. Approval/cancellation with a published impact emits one deduplicated notice
   after commit.
9. No leave or roster mutation is created by an impact lookup.
10. Roster list remains bounded in query count for a multi-month response.

### Frontend coverage

1. Existing leave form displays the informational duty alert without disabling
   submit.
2. Lookup is not made until required dates/time slots are complete and stale
   requests cannot overwrite newer data.
3. Applicant and manager details render a snapshot using the existing detail
   layout.
4. Roster assignment cells render requested/on-leave marker counts and
   accessible name tooltip where authorized.
5. Print/export adds non-sensitive marker counts.
6. Empty, unavailable, and unauthorized marker states preserve the existing
   roster rendering and edit controls.

### Browser E2E path

1. Create a team, dated membership, and published Day roster assignment.
2. Sign in as the member and open Leave. Select overlapping dates/slots and
   confirm the duty context appears while submit remains enabled.
3. Submit leave. Confirm the manager sees the roster snapshot in the existing
   leave detail and roster shows `leave request`.
4. Approve the leave through the existing workflow modal. Confirm roster now
   shows `on leave` and the roster manager receives one impact notification.
5. Change the roster assignment. Confirm live markers move/remove correctly
   while the leave detail still shows the original submission snapshot.
6. Cancel or reject the leave. Confirm live roster markers and any absence
   notification state are cleared appropriately.
7. Verify a non-roster manager cannot obtain names or sensitive leave data from
   roster endpoints.

## Phase 9: Rollout

1. Deploy additive migration and backend read capability first.
2. Verify marker queries and overlap results in staging against realistic team
   membership and published roster data.
3. Deploy applicant context and roster markers behind a dedicated feature flag.
4. Enable for roster managers first, monitor API latency/query counts and
   notification volume, then enable applicant guidance.
5. Run the E2E path against staging before production enablement.
6. Keep the flag available for immediate UI rollback; retain the nullable
   snapshot column and audit data.

## Production Exit Criteria

The integration is ready when:

- Leave remains submittable regardless of roster duty.
- All overlap interpretation is server-owned and covered by tests.
- Applicant guidance never exposes unpublished roster data.
- Roster markers are live, privacy-safe, and do not reveal confidential leave
  details.
- Submission snapshots preserve workflow context without becoming live roster
  truth.
- Published-roster impact notifications are post-commit and deduplicated.
- Existing Leave and Roster UI remains materially unchanged except for the
  limited guidance, detail row, and marker described above.
