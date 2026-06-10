# Payroll Claim Hardening QA Matrix

## Scope
- Salary claim submit integrity and draft lifecycle
- Submission idempotency (UI + API)
- Salary totals no-fallback display policy
- Salary detail parity across self and staff views
- Payslip totals mapping consistency

## Preconditions
- Frontend built from latest `main` hardening patch set
- Backend migrated with:
  - `2026_04_21_000002_add_submission_key_to_payroll_claims_table.php`
  - `2026_04_21_000003_repair_salary_totals_and_normalize_payroll_draft_ids.php`
- Test users:
  - Payroll self-service user
  - Staff approver user (salary claims management access)

## Scenario Matrix

1. Salary submit creates one final claim and no ghost draft
- Create salary draft, add adjustment line, submit once.
- Refresh page, trigger focus/online events.
- Expected:
  - Exactly one submitted claim row.
  - Source draft removed.
  - No new draft appears automatically.

2. Expense submit creates one final claim and no ghost draft
- Create expense draft with valid attachment, submit once.
- Refresh page, trigger focus/online events.
- Expected:
  - Exactly one submitted claim row.
  - Source draft removed.
  - No new draft appears automatically.

3. Submit buttons lock while request is in-flight
- Start submit and throttle network.
- Expected:
  - Submit modal confirm button disabled (`Submitting...`).
  - Form-level submit/save actions disabled during in-flight window.
  - Modal close/cancel blocked during submit.

4. API idempotency with same `submission_key`
- Replay identical create-claim POST with same `submission_key`.
- Expected:
  - Same claim id returned.
  - `idempotent_replay = true` on replay response.
  - Single DB row for that `(user_id, submission_key)`.

5. Draft consumption + idempotent replay safety
- Submit with `source_draft_id` and `submission_key`.
- Replay same payload.
- Expected:
  - First request consumes draft.
  - Replay does not create second claim.
  - Replay does not attempt to consume draft again.

6. Draft API missing `draft_id` stays stable
- POST draft twice without `draft_id`.
- Expected:
  - Server generates non-empty `draft_id`.
  - Second save reuses same draft id for same `(user, claim_type)`.
  - No duplicate draft rows.

7. Salary list/detail no-fallback totals policy
- Use salary claim with null/missing `adjustments_total` and `projected_net_payout`.
- Expected across self/staff/payroll list/detail:
  - Total Adjustments = `0`
  - Projected/Final = `0`
  - Never inferred from `amount` or baseline math.

8. Salary detail parity between self and staff
- Open same submitted salary claim in:
  - Self payroll claim detail
  - Staff salary claim detail
- Expected:
  - Shared read-only salary renderer structure/order.
  - No edit controls in detail renderer.
  - Line items and totals match claim payload fields.

9. Payslip totals mapping policy
- Validate payslip row/detail for salary claim.
- Expected:
  - `adjustments_total` reflects explicit claim field.
  - `netPayable` reflects explicit `projected_net_payout`.
  - No fallback derivation from item sums or baseline math.

## Signoff
- [ ] Self payroll QA
- [ ] Staff payroll management QA
- [ ] API/DB verification QA
- [ ] Production readiness signoff
