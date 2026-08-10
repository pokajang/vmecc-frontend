# Frontend Live UAT - Pre-Day 4 Corrective Plan

**Date:** 2026-08-10  
**Stage:** Stabilization checkpoint between authenticated shell UAT and deep record UAT  
**Source evidence:** `FRONTEND_LIVE_UAT_DAY_3_EXECUTION_2026-08-10.md`  
**Primary evidence run:** `VMECC-QA-20260810-155701-d3uat3`  
**Scope:** Verified defects, proven duplication, session resilience, permission-aligned reads, and UAT harness finalization  
**Out of scope:** Day 4 record seeding, inspection/report detail redesign, broad repository cleanup, package upgrades, deployment, and production configuration changes

## 1. Objective

Remove the verified noise and failures that would reduce confidence in Day 4 without turning this checkpoint into a broad refactor. Preserve all existing API payloads, routes, permissions, workflow transitions, and visible business behavior except for the explicitly corrected failure states.

The checkpoint is complete only when:

- both duplicated admin report queues use one shared implementation contract;
- their mobile views have no document-level horizontal overflow;
- an authentication-session 429 cannot incorrectly convert an authenticated user to anonymous;
- role-forbidden optional reads are not issued from staff profile or overtime screens;
- the live-UAT harness remains credential-safe and mutation-proof;
- focused unit, responsive, contract, build, and live read-only checks pass.

## 2. Non-negotiable safety constraints

- Do not change `.env` files or require new environment variables.
- Do not weaken, disable, or bypass API rate limiting.
- Do not broaden frontend or backend permissions to suppress a 403.
- Do not alter create, update, approval, rejection, upload, or deletion behavior.
- Do not seed business records during this checkpoint.
- Do not modify inspection/report detail UI before representative Day 4 records are available.
- Do not commit workspace credentials or Playwright evidence.
- Do not include generated `build/` churn in a source-only corrective commit unless a deployment build is explicitly requested.
- Preserve current URLs, query parameters, status values, list ordering, modal actions, and API service functions.

## 3. Workstream A - Baseline and change isolation

### Tasks

1. Record the current frontend and backend commit IDs.
2. Confirm the only intended frontend source targets are:
   - `src/views/admin/AiHelperReports.js`;
   - `src/views/admin/FeedbackReports.js`;
   - new/reused shared admin review-queue components;
   - `src/App.js` and its session tests;
   - staff profile/overtime permission-alignment code and focused tests;
   - live-UAT harness files and this documentation.
3. Inspect the worktree and exclude unrelated user changes and existing generated build churn.
4. Preserve the Day 3 evidence directories outside Git.
5. Run the existing focused tests before application edits to establish a reproducible baseline.

### Baseline commands

```powershell
npx vitest run src/views/admin/__tests__/FeedbackReports.test.jsx --environment jsdom
npx vitest run src/__tests__/App.session-recheck.test.jsx --environment jsdom
npx vitest run src/views/staff/__tests__/OvertimeManagement.security.test.jsx --environment jsdom
npm run test:e2e:live-uat-safety
npm run test:e2e:live-uat-day3-contract
```

### Exit gate

- Baseline outcomes are recorded before implementation.
- Any pre-existing failure is separated from the corrective patch.

## 4. Workstream B - Shared admin review queue and mobile overflow

### Verified problem

`AiHelperReports` and `FeedbackReports` are near-duplicate review queues. Their six-item `CButtonGroup` does not recompose at narrow widths and causes 39 CSS pixels of document overflow on both mobile routes.

### Shared-component boundary

Extract only the behavior that is genuinely repeated:

- module page header;
- status navigation and counts;
- refresh action;
- loading, list-error, and empty states;
- responsive table shell;
- status badge mapping;
- row-details opening contract;
- review modal shell;
- status and administrator-note controls;
- saving/cancel action area.

Keep module-specific behavior outside the shared core:

- API list/detail/update functions;
- page title and copy;
- table column definitions and value renderers;
- empty/error messages;
- AI response/chat snapshot sections;
- feedback message, reporter IP, and user-agent sections;
- test IDs required by existing tests.

### Proposed component contract

Use a focused component under `src/views/admin/shared/`, for example:

- `AdminReviewQueuePage.js` for orchestration and shared states;
- `AdminReviewStatusNav.js` only if the responsive navigation remains independently useful.

Prefer configuration and small render callbacks over a large generic schema engine. Do not move API knowledge into the shared visual component.

### Responsive behavior

1. Reuse `ModuleNavTabs` rather than inventing a second navigation system.
2. Use `mobileVariant="select"` if all six statuses cannot remain comfortably visible at the narrow target width.
3. Keep status counts in the accessible option/link labels.
4. Keep Refresh separate from status navigation and reachable by keyboard.
5. Ensure no child table, modal content, loading message, or toolbar increases the document width.
6. Preserve the desktop information density and current active-status query behavior.

### Tests

- Extend `FeedbackReports.test.jsx` to cover the shared contract.
- Add a focused `AiHelperReports.test.jsx` if equivalent component-level coverage does not exist.
- Add narrow/wide responsive assertions for status navigation.
- Assert that selecting a status calls the correct module API with unchanged parameters.
- Assert empty, loading, list error, detail error, and saving states.
- Assert modal labels and page-specific content remain distinct.
- Add or extend Playwright coverage that measures `html.scrollWidth - html.clientWidth` on both routes.

### Exit gate

- One shared queue implementation serves both modules.
- Both mobile routes report overflow `0` or at most the existing one-pixel measurement tolerance.
- Both desktop routes retain their current behavior.
- No API or permission change is introduced.

## 5. Workstream C - Session-bootstrap 429 resilience

### Verified problem

When `/auth/session` returns 429, `App.loadSession` currently treats the result as non-transient and can set the user to anonymous. In the Day 3 unpaced attempt this looked like an unexpected logout even though the session remained valid.

### Corrective behavior

1. Classify HTTP 429 as transient for session bootstrap.
2. Do not clear `authUser` solely because of a 429.
3. Keep a currently authenticated user in an authenticated or explicitly recoverable state while retrying.
4. Respect the server-provided retry delay when available, with a bounded fallback.
5. Avoid an uncontrolled retry loop or request storm.
6. Continue treating a verified 401 as anonymous/session-expired.
7. Preserve the existing handling for timeout, network error, 5xx, camera recovery, and maintenance behavior.

### Test matrix

Extend `src/__tests__/App.session-recheck.test.jsx` with:

- authenticated session + 429: user is not sent to login;
- initial bootstrap + 429: temporary/retryable state, not a false invalid-credentials state;
- repeated 429: bounded retry behavior;
- 429 followed by success: authenticated shell recovers;
- 401 remains anonymous;
- 5xx and timeout retain existing temporary-unavailable behavior.

### Backend boundary

Do not change the production limiter in this checkpoint unless frontend behavior cannot be corrected safely. Record the middleware-order/IP-key observation for a separate backend hardening decision.

### Exit gate

- A 429 never masquerades as logout.
- Existing 401 and recovery tests still pass.
- No rate limit is disabled or bypassed.

## 6. Workstream D - Permission-aligned staff reads

### Verified problem

Focused live runs observed 403 console responses while otherwise usable screens rendered for Contract Manager and Human Resource:

- `/staff/profile/:id`;
- `/staff/overtime-management` and `/staff/overtime-management/records`.

The likely issue is optional data being requested based on route access rather than the narrower endpoint permission.

### Investigation tasks

1. Capture the exact 403 endpoint paths in the sanitized live diagnostic collector.
2. Map each endpoint to its backend permission middleware and frontend permission helper.
3. Determine whether the data is:
   - required to render the page;
   - optional enrichment;
   - required only for an action the role cannot perform.
4. Confirm the intended Contract Manager and Human Resource behavior against route and permission tests.

### Corrective rules

- Required data with valid role access: correct the frontend endpoint/permission mismatch without broadening authorization.
- Optional enrichment: do not request it when the permission is absent; render the existing neutral fallback.
- Action-only data: load it only when the action is available or opened.
- Expected access denial: render one deliberate permission state without console noise or repeated requests.
- Never convert a 403 into fabricated data or a silent privileged fallback.

### Tests

- Add focused Staff Profile tests covering Contract Manager, Human Resource, and a user-management role.
- Extend `OvertimeManagement.security.test.jsx` to assert forbidden endpoints are not called for unsupported roles.
- Assert allowed roles still fetch and display the same records/actions.
- Assert empty and permission states remain visible and understandable.
- Rerun the focused mobile and desktop live schedules for both affected personas.

### Exit gate

- No unexpected 403 console response is generated by the affected screens.
- Their current visible, permitted information remains available.
- No role gains a new action or dataset.

## 7. Workstream E - UAT harness finalization

### Tasks

1. Retain the 750 ms production API pacing and explicit 429 diagnostics.
2. Retain route-settle and visible-spinner waits.
3. Treat console errors, page errors, failed requests, unexpected 4xx, 429, 5xx, and horizontal overflow as separate diagnostics.
4. Do not fail an explicitly expected `/403` permission route merely because its authorization request returned 403.
5. Store sanitized endpoint summaries for unexpected 4xx responses.
6. Capture route-specific screenshots for overflow and runtime failures.
7. Keep trace recording disabled for credentialed production tests.
8. Confirm login failure artifacts cannot contain filled credentials.
9. Keep persona tests independent so one failure cannot skip the remaining matrix.

### Exit gate

- Live safety and Day 3 schedule contracts pass.
- A controlled mocked 403 is classified correctly.
- A mocked unexpected 403 and 429 are visible in diagnostics.
- No secret appears in repository files or generated text evidence.

## 8. Verification sequence

Run verification in increasing cost order.

### Gate 1 - Static and focused unit checks

```powershell
git diff --check
npx eslint <changed-source-and-test-files>
npx vitest run src/views/admin/__tests__/FeedbackReports.test.jsx --environment jsdom
npx vitest run src/views/admin/__tests__/AiHelperReports.test.jsx --environment jsdom
npx vitest run src/__tests__/App.session-recheck.test.jsx --environment jsdom
npx vitest run src/views/staff/__tests__/StaffProfile.test.jsx --environment jsdom
npx vitest run src/views/staff/__tests__/OvertimeManagement.security.test.jsx --environment jsdom
```

Only include newly created test paths once they exist.

### Gate 2 - UAT contracts

```powershell
npm run test:e2e:live-uat-safety
npm run test:e2e:live-uat-day3-contract
```

### Gate 3 - Existing regression coverage

Run the relevant route, navigation, permission, admin API, and responsive primitive tests. If shared-component changes affect common navigation, include the existing `ModuleNavTabs`/route-navigation coverage.

### Gate 4 - Production build

```powershell
npm run build
```

Review bundle warnings separately from failures. Do not stage generated build files automatically.

### Gate 5 - Focused live read-only UAT

Run only the corrected scope first:

- System Administrator mobile and desktop admin report queues;
- Contract Manager mobile and desktop staff profile/overtime;
- Human Resource mobile and desktop staff profile/overtime;
- session recovery/rate-limit behavior through controlled tests, not by deliberately flooding production.

The live guard must remain GET/HEAD/OPTIONS plus login POST only.

## 9. Regression checklist

### Admin queues

- page titles remain correct;
- all six statuses remain reachable;
- counts, active status, Refresh, table rows, and empty states remain correct;
- detail modal opens the selected record;
- status and administrator-note edits retain their current payloads;
- mobile has no clipped status option or page overflow;
- keyboard focus and modal dismissal remain usable.

### Authentication

- valid login still enters the application;
- 401 still returns to login;
- 429 does not clear a valid authenticated identity;
- temporary errors present a useful recovery path;
- retries are bounded;
- credentials remain absent from artifacts.

### Staff views

- allowed profile fields remain visible;
- protected fields and actions remain protected;
- optional unavailable information has a neutral fallback;
- unsupported roles do not call privileged endpoints;
- overtime empty state, filters, tabs, and allowed rules remain functional;
- no unexpected console error remains.

## 10. Commit and rollback strategy

Prefer separate commits:

1. `Harden authenticated live UAT diagnostics`
2. `Share responsive admin review queue`
3. `Preserve sessions across API throttling`
4. `Align staff reads with role permissions`
5. `Document pre-Day 4 stabilization results`

Each application commit must be independently testable and revertible. Do not mix generated build changes, UAT credentials, evidence screenshots, or Day 4 seed data into these commits.

## 11. Stop conditions

Stop the affected batch and investigate if:

- a business mutation is attempted during live verification;
- a role gains access to previously protected information or actions;
- a 401 no longer clears an invalid session;
- shared queue extraction changes an API payload or loses module-specific content;
- mobile overflow moves to a shared layout rather than disappearing;
- three production 5xx responses occur;
- an artifact contains a credential, token, personal-data payload, or unredacted sensitive identifier;
- unrelated worktree changes overlap the required source file.

## 12. Definition of done and Day 4 handoff

The pre-Day-4 stage is complete when all four corrective workstreams pass their exit gates, the production build succeeds, focused live read-only checks are clean, and an execution report records exact changed files and test results.

Day 4 may then begin with a separate removable business-record fixture plan. Day 4 must reproduce the inspection/report detail states before changing the reported border, image-container, filename, or cross-module gallery behavior.
