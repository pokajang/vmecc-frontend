# Beta Acceptance Report

VERDICT: NOT GOOD TO GO
SCOPE: Mobile ER Assessment setup-to-requirements context transfer
REASON CODES: PRODUCT FAILURE
CONFIDENCE: High

Build/version: Frontend 5.5.0; source revision not captured
Environment: Local, `http://localhost:3000` with real API at `http://localhost:8000/api`
Run ID: `BETA-20260828-er-context-01`
Executed: 2026-08-28, Asia/Kuala_Lumpur
Browser session: Headed Google Chrome channel, Playwright 1.61.1, one worker, 175 ms slow motion
Roles: 1/1, Tactical Response Team smoke persona
Critical coverage: 0/1

The ER Assessment context transfer is not releasable. On two independent visible journeys, the setup page accepted company and location, and the real draft endpoint successfully received both values, but the immediately following requirements page rendered `-` for both fields. Reloading the requirements route did not recover either value.

## 1. Scope and charter

- Feature scope: ER Assessment only, from the visible ER home/type list through setup and into requirements.
- Included route states: ER home, new assessment setup, requirements context, and requirements reload.
- Role: Tactical Response Team test persona using the repository-approved smoke authentication helper.
- Viewport: Mobile, 390 by 844, touch enabled.
- Requirements: company and location entered on setup must appear unchanged in Assessment Context after Continue and after reload.
- Mutations: real ER draft creation/update with run-marker synthetic data.
- Exclusions: desktop, custom type creation, requirement completion, camera/photo capture, final submission, approvals, and authorization-negative testing.
- Evidence location: `.qa/beta-tester/BETA-20260828-er-context-01/evidence/`.
- Browser mode: visible headed Chrome; no headless fallback.

## 2. Executive results

- Authentication and visible ER entry passed.
- Working at Height selection reached setup with the expected type.
- Company, location, date, and scope accepted the synthetic setup values.
- The real draft endpoint returned `201` on attempt 1 and `200` on attempt 2.
- Both requests contained the exact company and location entered through the UI.
- The next Assessment Context card omitted both values on both attempts.
- Reloading the requirements route did not restore the values.
- No failed HTTP responses, page exceptions, or material console errors occurred during the corrected run.

## 3. Coverage summary

- Passed: 3
- Failed: 1
- Blocked: 0
- Excluded: 6
- Not applicable: 0
- Critical items: 0 passed of 1
- Roles: 1 covered of 1 required
- Views: 3 covered of 3 discovered in scope
- Critical journeys: 0 completed of 1 planned
- Viewports: mobile 390 by 844
- Evidence-bearing failures: 1 of 1

Coverage ledger:

| Item | Critical | Result | Evidence |
| --- | --- | --- | --- |
| Authenticate and open ER Assessment through visible UI | No | Passed | `attempt-1-01-er-home.png`, `attempt-2-01-er-home.png` |
| Select Working at Height and enter setup context | No | Passed | `attempt-1-03-setup-filled.png`, `attempt-2-03-setup-filled.png` |
| Persist the complete setup payload through the real draft API | No | Passed | `observations.json`, draft status `201` then `200` |
| Preserve company and location in Assessment Context immediately and after reload | Yes | Failed | `attempt-1-04-requirements-context.png`, `attempt-2-04-requirements-context.png`, reload screenshots |

## 4. Role and permission matrix

| Role | Authentication | Intended routes/actions | Result |
| --- | --- | --- | --- |
| Tactical Response Team | Passed using approved smoke persona | Open ER Assessment, choose type, complete setup, continue to requirements | Authorized and executable; context transfer failed |

Negative permission and cross-team access checks were outside this narrow defect-validation scope.

## 5. Journey results

### Journey ER-CTX-01: setup context reaches requirements

- Purpose: verify company and location transfer from the previous setup page.
- Persona: Tactical Response Team.
- Start: Conduct ER Assessment type list.
- End: Emergency response readiness requirements page.
- Synthetic values, attempt 1: `BETA-20260828-er-context-01-1 Company` and `BETA-20260828-er-context-01-1 Location`.
- Synthetic values, attempt 2: `BETA-20260828-er-context-01-2 Company` and `BETA-20260828-er-context-01-2 Location`.
- Draft outcome: exact values present in successful real API requests.
- Visible outcome: both values replaced by `-` immediately after navigation and remained missing after reload.
- Reproducibility: 2 of 2 corrected attempts.
- Result: Failed.

## 6. Defect register

### ER-CTX-001: Company and location disappear on requirements context card

- Severity: High.
- Release blocking: Yes.
- Scope: ER Assessment mobile setup-to-requirements transition.
- Route: `/report/er-assessment/new/setup?type=working-at-height` to `/report/er-assessment/new/requirements?type=working-at-height`.
- Environment: local frontend and real local PostgreSQL-backed API.
- Viewport: 390 by 844.
- Role: Tactical Response Team test persona.
- Preconditions: ER assessment types migration applied; authenticated smoke persona; Working at Height selected.

Reproduction:

1. Open Conduct ER Assessment.
2. Select Working at Height.
3. Enter a non-empty company, location, date, and work scope.
4. Select Continue.
5. Observe Assessment Context on the requirements page.
6. Reload the requirements page and observe Assessment Context again.

Expected: Assessment Context displays the exact company and location entered on setup, immediately and after reload.

Actual: Company and location display `-` immediately and after reload. Work activity and date remain populated.

Technical evidence: The draft request includes the correct company and location and succeeds, ruling out a dead port, failed request, setup-input loss, and backend payload rejection.

Likely affected area, inference: the type-only route seed remains active across the step navigation and is rehydrated ahead of the newly saved draft, resetting fields not present in that seed. This inference aligns with the type query remaining on the requirements URL and the observed payload/render mismatch; it is not an implementation change.

User impact: the field user loses visible company and location context during an emergency readiness assessment. This creates a materially incomplete safety record context and undermines confidence that the assessment is associated with the correct workplace.

Recommended correction: preserve and render the complete saved setup context whenever navigating or reloading the requirements step. A type-only seed must not override populated in-session or persisted draft values.

Retest acceptance criteria:

1. Enter unique company and location values through the setup UI.
2. Confirm the successful real draft request contains both values.
3. Confirm the requirements card displays both exact values immediately.
4. Reload the requirements URL and confirm both exact values remain displayed.
5. Repeat for a built-in type and a user-added ER type.
6. Verify Back to setup retains all entered context.

Regression surface: seeded type selection, fresh-assessment route state, draft hydration precedence, step navigation, reload/resume behavior, and custom ER type selection.

## 7. UI/UX, responsive, and accessibility findings

- The mobile setup form and requirements page were discoverable and usable at 390 by 844.
- Labels were understandable and the primary Continue action was visible.
- The context card clearly exposed the defect by rendering dashes, rather than stale or ambiguous values.
- Formal accessibility conformance was not assessed.

## 8. Blocked, excluded, and unaccounted coverage

- Desktop was excluded because the reported defect and supplied evidence were mobile-specific.
- Custom type creation was excluded from this narrow transfer validation.
- Requirement responses, evidence camera, review, submission, and approval were excluded because failure occurred before those stages.
- Negative authorization and cross-role handoff were excluded.
- No in-scope item remained blocked or unaccounted.

## 9. Recovery and instability log

- Initial runner attempt: invalid harness attempt. The runner misclassified an off-canvas navigation `Close` button as an optional dialog dismissal and timed out before ER interaction.
- Correction: the disposable runner was changed to require a visible dialog ancestor before selecting a safe dismissal action.
- Classification: harness invalidation, not product evidence.
- Corrected attempt 1: valid product failure captured.
- Product retry: fresh browser context, re-authentication, and new marker-owned values.
- Corrected attempt 2: same valid product failure reproduced.
- Confidence impact: none after the single verified harness correction; product result is repeatable.

## 10. Test-data and cleanup ledger

| Record | Creator | Transition | Cleanup result |
| --- | --- | --- | --- |
| ER Assessment draft with run marker | Tactical Response Team smoke persona | Created on attempt 1, updated on attempt 2 to requirements stage | Retained; no safe visible discard action was exercised within scope |

No unowned application records were deliberately deleted. The residual local test draft contains the attempt 2 marker values and is disclosed for later cleanup.

## 11. Recommendations and retest gate

Release retest requires ER-CTX-001 to satisfy all listed acceptance criteria. The minimum gate is exact immediate and reload persistence of company and location through the real API for both built-in and user-added ER assessment types, with no failed request or console exception.

## 12. Evidence index

- `evidence/observations.json`: complete corrected-run ledger and safe draft payload subset.
- `evidence/attempt-1-03-setup-filled.png`: first setup values before Continue.
- `evidence/attempt-1-04-requirements-context.png`: first immediate failure.
- `evidence/attempt-1-05-requirements-after-reload.png`: first reload failure.
- `evidence/attempt-2-03-setup-filled.png`: retry setup values before Continue.
- `evidence/attempt-2-04-requirements-context.png`: repeated immediate failure.
- `evidence/attempt-2-05-requirements-after-reload.png`: repeated reload failure.
- Recorded WebM files in `evidence/`: headed browser journey video.

## 13. Residual risk

This verdict is intentionally limited to the mobile setup-to-context transfer. Desktop behavior, custom type transfer, Back navigation retention, camera operation, final report projection, and cross-role review remain unverified and should be included in the fix regression run.

VERDICT: NOT GOOD TO GO for mobile ER Assessment setup-to-requirements context transfer.
