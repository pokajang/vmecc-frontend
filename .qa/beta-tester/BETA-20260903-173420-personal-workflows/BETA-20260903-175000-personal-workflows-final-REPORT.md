# Beta Test Report: Employee Personal Workflows

- Run ID: `BETA-20260903-175000-personal-workflows-final`
- Date: 2026-09-03
- Environment: local frontend `http://localhost:3000`, local API `http://localhost:8000/api`
- Browser: headed Chromium
- Test identity: synthetic employee fixture
- Verdict: **GOOD TO GO**

## Executive summary

Leave, Overtime, and Salary Claim employee journeys now follow the shared reporting workflow contract across form, confirmation, records, and detail states. The final live run passed every required checkpoint with no unexpected API failures or browser console errors. Salary overtime preview remained server-authoritative and did not call the admin-only overtime settings endpoint.

## Covered journeys

1. Authenticate once and reuse the employee session.
2. Leave: trigger validation, correct fields, confirm, submit, reopen persisted record, and cancel through UI.
3. Overtime: trigger validation, correct fields, confirm, submit, reopen persisted record, and cancel through UI.
4. Salary Claim: load assigned salary and server overtime preview, confirm payout, submit, reopen on mobile, reopen on desktop, and cancel through UI.
5. Responsive contract: 320, 390, 768, and 1440 widths in light and dark themes.
6. Records contract: Leave, Overtime, and Claim records use the reporting records header and interaction pattern.
7. Header geometry: Back remained visible at identical mobile bounds for Leave, Overtime, and Salary, with document width equal to viewport width.

## Results

- Live journeys: 7/7 passed.
- Controlled Playwright parity suite: 2/2 passed.
- Focused frontend regression: 29/29 passed.
- Full frontend suite: 1,974/1,976 passed on the first run; the two failures were stale test contracts after CToast removal and composed optional-label rendering. Both were corrected and rerun: 34/34 passed.
- Backend regression: 47/47 tests passed, 245 assertions.
- Focused ESLint: passed.
- Frontend/backend `git diff --check`: passed.
- Unexpected API responses: 0.
- Browser console errors: 0.
- Admin overtime-rate requests from employee Salary Claim: 0.

## Findings

No unresolved release-blocking, major, or minor defects were found in the tested employee-facing scope.

Two invalidated harness observations were corrected before the final run:

- An overtime test date was initially future-dated relative to the server clock.
- The first Salary detail oracle stopped at the mounted container before asynchronous claim hydration. The corrected oracle waits for the submitted claim content and rejects a terminal not-found state.

## Test data cleanup

The final synthetic records were cancelled through their product UI and verified in the database:

- `LV-AL-2026-004`: Cancelled
- `OT-2026-006`: Cancelled
- `CLM-2026-002`: Cancelled

## Evidence

- `BETA-20260903-175000-personal-workflows-final-results.json`
- `BETA-20260903-175000-personal-workflows-final-leave-confirm-mobile-390.png`
- `BETA-20260903-175000-personal-workflows-final-leave-detail-mobile-390.png`
- `BETA-20260903-175000-personal-workflows-final-overtime-confirm-mobile-390.png`
- `BETA-20260903-175000-personal-workflows-final-overtime-detail-mobile-390.png`
- `BETA-20260903-175000-personal-workflows-final-salary-confirm-mobile-390.png`
- `BETA-20260903-175000-personal-workflows-final-salary-detail-mobile-390.png`
- `BETA-20260903-175000-personal-workflows-final-salary-detail-desktop-1440.png`
- `BETA-20260903-175000-detail-header-inspection.json`
