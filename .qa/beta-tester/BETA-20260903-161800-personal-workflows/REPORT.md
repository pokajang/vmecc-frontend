# Beta Acceptance Report

VERDICT: NOT GOOD TO GO
SCOPE: Employee-facing Leave, Overtime, and Salary/Claims modules on the local VMECC build
REASON CODES: ENVIRONMENT BLOCKER, COVERAGE BLOCKER
CONFIDENCE: Medium

Build/version: ec84c998 with uncommitted UI changes
Environment: Local controlled environment at localhost:3000 with API localhost:8000
Run ID: BETA-20260903-161800-personal-workflows
Executed: 2026-09-03 17:00 +08:00
Browser session: Headed Chromium 149.0.7827.55, Playwright 1.61.1, one worker; UI-only submission journey used 125 ms slow motion
Roles: 1/1 employee role
Critical coverage: 5/6

Leave and Overtime are satisfactory for the tested employee journeys. Both supported required-field recovery, confirmation, submission, persisted records, reopening, clear pending status, and next-action ownership on mobile. Salary/Claims cannot receive a three-module release pass because the live local environment explicitly disables the payroll module and returns 403 for payroll claim and draft requests.

## 1. Scope and charter

Included:

- Employee Leave, Overtime, and Salary/Claims entry, application, records, and detail views.
- Mobile widths 320 and 390; tablet 768; desktop 1440.
- Light and dark themes for form and records parity.
- Required-field recovery, confirmation, submit, persistence, reopen, responsive layout, keyboard-oriented component states, and visible workflow status.
- UI-only mutations using uniquely marked synthetic records.

Excluded:

- Staff reviewer approval/rejection handoffs, because the requested verdict was employee-facing.
- Production services and external integrations.
- Formal accessibility conformance testing.

Artifacts are stored in this directory. Browser sessions ran visibly in headed mode.

## 2. Executive results

- Leave: passed validation recovery, confirmation, submission, persistence, records, and reopened detail.
- Overtime: passed validation recovery, confirmation, submission, persistence, records, and reopened detail.
- Salary/Claims: controlled responsive presentation passed, but the live route is disabled by module configuration; critical submit and persistence coverage is blocked.
- Responsive presentation passed at 320/390/768/1440 without horizontal overflow in the existing headed matrix.
- No Critical or High product defect was observed in Leave or Overtime.
- One Medium UX defect affects both corrected Leave and Overtime forms: the prior validation banner remains visible behind the confirmation drawer.

## 3. Coverage summary

- Passed: 9
- Failed product journeys: 0
- Blocked: 1
- Excluded: 1
- Critical coverage: 5/6
- Live routes passed: Leave and Overtime records, new application, and submitted detail.
- Salary controlled visual states passed; live application and detail persistence are blocked.
- Viewports: 320, 390, 768, and 1440.
- Themes: light and dark.
- Evidence-bearing product failures: 0.

## 4. Role and permission matrix

| Role | Scope | Result |
|---|---|---|
| Employee fixture | Leave records/create/detail | Passed |
| Employee fixture | Overtime records/create/detail | Passed |
| Employee fixture | Salary/Claims | Blocked: payroll module disabled and endpoints return 403 |

Negative staff/admin authorization was excluded from this employee-facing charter.

## 5. Journey results

### Leave application

Start: Leave type selection. End: persisted Pending record reopened from records.

Variations: empty submission, corrected fields, confirmation drawer, submission, records lookup, reopened detail.

Result: Passed. Record LV-AL-2026-001 showed the correct type, schedule, reason, Pending status, Human Resource next action, workflow history, Back navigation, and mobile actions.

### Overtime application

Start: Overtime type selection. End: persisted Pending record reopened from records.

Variations: empty submission, corrected fields, confirmation drawer, submission, records lookup, reopened detail.

Result: Passed. Record OT-2026-004 showed the correct time window, duration, reason, Pending status, Contract Manager next action, workflow history, Back navigation, and mobile actions.

### Salary/Claims

Controlled visual matrix: Passed at mobile/tablet/desktop and light/dark states.

Live journey: Blocked before the Salary form. The environment displayed “This module is currently disabled. Blocking module: payroll,” and payroll claim/draft requests returned 403.

## 6. Defect register

### UX-01 — Corrected validation banner persists behind confirmation

Severity: Medium. Release blocking by itself: No.

Affected: Employee Leave and Overtime, mobile 390.

Reproduction:

1. Open a new Leave or Overtime request.
2. Submit with required fields empty.
3. Complete the highlighted fields.
4. Submit again to open confirmation.

Expected: The resolved validation message clears before confirmation appears.

Actual: The old red validation banner remains visible behind the dimmed confirmation drawer.

Impact: The user is asked to confirm while the page still signals that the submission is invalid, weakening confidence at the most consequential step.

Retest gate: After correction, opening confirmation must clear resolved validation feedback while keeping new server-side errors available if submission later fails.

## 7. UI/UX, responsive, and accessibility findings

Strengths:

- Each form answers where the user is, what is selected, and the next primary action.
- Back remains visible at the top.
- Leave explains the missing entitlement assignment and explicitly allows HR review.
- Salary distinguishes baseline, adjustments, approved overtime, final payable, and the required confirmation.
- Confirmation drawers summarize consequential values before submission.
- Submitted Leave and Overtime details lead with status, schedule, record ID, and next action.
- Mobile CTAs are full width and records/details did not horizontally overflow.
- Dark-mode contrast and hierarchy were readable in inspected screens.

Residual issue: UX-01 above. Keyboard/component checks passed, but this run is not an accessibility certification.

## 8. Blocked, excluded, and unaccounted coverage

Blocked critical coverage:

- Live Salary form, confirmation, submission, persistence, and detail.
- Cause: payroll module disabled in the environment; payroll claim and draft endpoints return 403.
- Effect: prevents a GOOD TO GO verdict for all three requested modules.

Excluded:

- Cross-role approval/rejection and payment completion.
- Hardware-dependent attachment capture and external delivery.

No other critical employee-facing item is silently unaccounted.

## 9. Recovery and instability log

- Mixed-origin harness attempt was invalid: component tests require 127.0.0.1 while authenticated session cookies require localhost. Suites were split by their required origin.
- A supplemental route sweep hit login rate limiting with HTTP 429 before product UI. It was not scored as a product failure.
- Cleanup automation waited for PATCH/PUT while cancellation uses POST. The UI clicks completed; exact-ID read-only verification confirmed both owned records became Cancelled.

## 10. Test-data and cleanup ledger

| Type | Record | Transition | Cleanup |
|---|---|---|---|
| Leave | LV-AL-2026-001 | Submitted → Pending | Cancelled through UI; retained because applicant deletion is unavailable |
| Overtime | OT-2026-004 | Submitted → Pending | Cancelled through UI; retained as a cancelled audit record |

No unowned records were deliberately changed. No Salary record was created.

## 11. Recommendations and retest gate

Before a three-module release verdict:

1. Enable payroll for the intended employee test persona and confirm the Salary application, confirmation, submission, persistence, reopened detail, and permission boundary through the visible UI.
2. Clear resolved validation feedback before opening Leave and Overtime confirmation drawers.
3. Rerun the live Salary journey at 390 and 1440, plus a focused regression of Leave and Overtime confirmation recovery.

## 12. Evidence index

- BETA-20260903-161800-personal-workflows-leave-form-mobile-320-light.png
- BETA-20260903-161800-personal-workflows-leave-confirm-mobile-390.png
- BETA-20260903-161800-personal-workflows-leave-detail-mobile-390.png
- BETA-20260903-161800-personal-workflows-overtime-form-mobile-390-dark.png
- BETA-20260903-161800-personal-workflows-overtime-confirm-mobile-390.png
- BETA-20260903-161800-personal-workflows-overtime-detail-mobile-390.png
- BETA-20260903-161800-personal-workflows-salary-form-mocked-mobile-390-dark.png
- BETA-20260903-161800-personal-workflows-salary-failure.png
- BETA-20260903-161800-personal-workflows-results.json
- BETA-20260903-161800-personal-workflows-cleanup-verification.json

## 13. Residual risk

Salary behavior behind an enabled payroll configuration remains unverified. Approval handoffs, payment completion, attachments, browser refresh after submission, and destructive deletion were not part of the completed critical employee journey.

VERDICT: NOT GOOD TO GO for the combined employee-facing Leave, Overtime, and Salary/Claims scope. Leave and Overtime individually passed the tested acceptance journeys; Salary remains coverage-blocked.
