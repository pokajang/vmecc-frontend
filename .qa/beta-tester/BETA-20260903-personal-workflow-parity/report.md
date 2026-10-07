# Beta UAT report: personal workflow parity

- Run ID: `BETA-20260903-personal-workflow-parity`
- Target: local frontend `http://localhost:3000`, local API `http://localhost:8000/api`
- Persona: authenticated employee (`codex.smoke.tactical-response-team@vmecc.local`)
- Browser: headed Chromium, one worker
- Verdict: **GOOD TO GO**
- Confidence: High for the scoped visual parity changes

## Charter

Verify that Apply Leave, Apply Overtime, Salary Claim, Expense Claim, and Exceptional Claim follow the reporting/inspection visual contract without changing their business behavior. Verify their records pages and the revised employee detail hierarchy.

## Coverage

- Forms: Leave, Overtime, Salary Claim, Expense Claim, Exceptional Claim.
- Records: Leave Records, Overtime Records, Claim Records.
- Responsive matrix: 320x568, 390x844, 768x1024, 1440x1000.
- Themes: light and dark.
- Detail hierarchy: employee Leave detail in headed Chromium; Leave, Overtime, Claim, and salary read-only detail components in focused tests.
- Visual evidence: 64 screenshots under `playwright/`.

## Acceptance results

- PASS: compact mobile context label and Back action remain on one row.
- PASS: selected type/month summaries use the reporting-style grouped summary contract.
- PASS: mobile primary CTAs remain full width at the terminal form position.
- PASS: scrolling to the form bottom does not leave the previous oversized action spacer.
- PASS: no terminal `Clear form` action remains.
- PASS: records pages use compact mobile shells and reporting-style search/filter placement.
- PASS: desktop layout retains full page titles, navigation, filters, and compact terminal actions.
- PASS: no horizontal overflow was detected at any tested viewport.
- PASS: light and dark themes retained readable hierarchy and control boundaries.

## Automated evidence

- Headed workflow/records suite: 2 passed in 4.2 minutes.
- Headed detail component suite: 2 passed after one harness-only correction.
- Focused detail component tests: 4 files, 11 tests passed.
- Broader focused regression suite: 49 files, 208 tests passed.
- Full ESLint: passed.
- Production build: passed; generated build artifacts were restored/removed after verification.
- `git diff --check`: passed.

## Recovery ledger

- The first supplemental detail run expected a staff-only `captured at` phrase on the employee detail. The rendered employee UI was correct. The assertion was corrected to the actual roster-impact value and the clean rerun passed. Classification: harness invalidation; no product retry or product defect.

## Findings

No release-blocking, high, medium, or low product defects were observed in the scoped journeys.

## Boundaries

- The parity run used isolated API routes for empty form/records states and did not submit or delete user data.
- The local employee account had no live Leave or Overtime records and lacked Claim Records API access, so populated live-record detail navigation was not exercised. Detail rendering and hierarchy were instead verified with controlled component records and focused tests.
