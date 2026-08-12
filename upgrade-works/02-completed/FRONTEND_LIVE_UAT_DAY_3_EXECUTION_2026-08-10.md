# Frontend Live UAT - Day 3 Execution Report

**Date:** 2026-08-10  
**Stage:** Authenticated, production-safe route sweep  
**Primary run:** `VMECC-QA-20260810-155701-d3uat3`  
**Verdict:** Authenticated shell coverage completed; corrective work and record fixtures remain  
**Production mutation verdict:** None attempted or permitted

## 1. Outcome

All six temporary UAT personas authenticated successfully and all 12 persona/viewport schedules ran. The primary sweep produced 12 ledgers containing 324 route/persona/viewport entries.

| Result | Entries |
| --- | ---: |
| Passed | 106 |
| Controlled shell only | 88 |
| Redirect verified | 60 |
| Permission blocked as expected | 4 |
| Data blocked | 64 |
| Failed | 2 |
| **Total** | **324** |

Mobile and desktop each contributed 162 entries. No production write request was allowed by the browser guard.

## 2. Verified failures

### 2.1 Mobile horizontal overflow

The System Administrator mobile schedule consistently measured 39 CSS pixels of horizontal overflow on:

- `/admin/ai-helper-reports`;
- `/admin/feedback-reports`.

Both desktop routes passed. Focused run `VMECC-QA-20260810-163952-sysmob` captured route-specific screenshots and reproduced the same 39-pixel overflow on both pages.

The two pages use nearly duplicate review-queue implementations and the same six-item `CButtonGroup`. The unbroken status filter row exceeds the narrow viewport. This is both a responsive defect and a strong shared-component candidate.

Recommended correction:

1. extract a shared admin review-queue shell for status filters, refresh, loading/empty state, table, and detail dialog;
2. use the existing `ModuleNavTabs` mobile-select or horizontal-scroll contract instead of a non-wrapping button group;
3. retain page-specific columns and detail sections through configuration or render slots;
4. verify both routes at mobile and desktop widths.

## 3. Additional runtime findings

### 3.1 API throttle can appear as logout

The initial unpaced attempt exhausted the API-wide 120-request-per-minute bucket. The API throttle executes before `session.auth`, so requests are keyed by IP before a user is bound. A 429 from `/auth/session` is treated by the frontend session bootstrap as a non-transient anonymous result, which returns the user to the login screen.

This was not a credential or session-expiry failure. The final harness spaces API reads by 750 ms and records 429 responses explicitly; the completed primary run then recorded zero rate-limit errors and no session-loss cascade.

Production hardening should be handled separately: treat session-bootstrap 429 as temporary unavailability, and review whether authenticated API traffic can be limited by user rather than shared IP without weakening the limiter.

### 3.2 Role-forbidden background requests

The primary run recorded two 403 console messages on `/staff/profile/:id` for Contract Manager and Human Resource in both viewports. Focused mobile runs confirmed that the profile eventually renders usable content, but optional/background requests still fail noisily.

With the stricter spinner wait and console-error gate, a focused Contract Manager run also observed one 403 console response on each visit to the overtime-records route. The visible page rendered its valid empty state.

Corrective action:

- identify the exact optional requests and gate them by the same permission contract used to show the page/action;
- do not issue endpoints the current role cannot access;
- keep a deliberate visible permission or empty state instead of relying on failed background calls;
- rerun Contract Manager and Human Resource staff/overtime schedules after correction.

## 4. Data-blocked coverage

The read-only fixture resolver could not find suitable records for 64 entries covering 21 parameterized route patterns:

- inspection detail and edit;
- ERCO, Fitness Test, Drill, and inspection-report detail redirects;
- leave and overtime detail routes;
- payroll claim and salary-assignment detail/edit routes;
- legacy staff leave, overtime, and salary-claim detail routes.

These are not passes or application failures. The temporary personas do not own or have access to representative records required by those routes. The original inspection-detail mobile concerns therefore remain outside the completed live evidence:

- unexpected left border;
- image nested inside additional cards/containers;
- device filename displayed under uploaded images.

The next data step is a deterministic, removable UAT record seeder (or an approved existing-record fixture mapping) for inspection, ERCO, Fitness Test, Drill, leave, overtime, and payroll detail states. No `.env` change is required.

## 5. Harness hardening completed

- removed serial failure coupling so every persona runs;
- increased the per-persona timeout for the full schedule;
- ignored normal browser navigation-cancellation errors;
- added route-settle and visible-spinner waits;
- paced API reads below the deployed production limit;
- records 429 responses separately;
- treats console errors as failures in subsequent runs and stores a redacted summary;
- captures route-specific screenshots for overflow and runtime failures;
- clears login fields before surfacing login errors;
- disabled Playwright traces because traces retain credential-entry actions;
- removed the earlier credential-bearing failed-run artifact.

Safety and schedule contracts passed 8/8 after hardening. ESLint and `git diff --check` are required again before committing the final harness changes.

## 6. Readiness verdict

Day 3 authenticated shell coverage is executed and evidence-backed. It is not an all-views completion verdict because 64 detail checks remain data-blocked.

Proceed next with a small corrective and fixture stage:

1. fix and share the duplicated admin review-queue UI;
2. remove role-forbidden background requests;
3. add removable representative UAT records for the blocked detail routes;
4. run Day 4 deep inspection/report journeys, including the three user-reported image/detail issues;
5. only then perform the repository-wide shared-component reconciliation and final regression run.
