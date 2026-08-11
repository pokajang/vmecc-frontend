# Frontend Live UAT - Post-Deployment Gate Plan

**Date:** 2026-08-10  
**Stage:** Final gate between pre-Day 4 corrections and Day 4 deep-record UAT  
**Live frontend:** `https://vmecc.amiosh.com`  
**Expected live build:** `54acd0e2d079-20260810102950`  
**Source commit:** `54acd0e`  
**Deployment commit:** `05354ec`  
**Mode:** Production-safe, authenticated, read-only UAT

## 1. Objective

Verify that the newly deployed corrective bundle behaves on the real hosted frontend and API as it did in local controlled testing. The gate specifically validates:

- shared Ask AI and Feedback review queues;
- mobile and desktop responsive behavior;
- Contract Manager and Human Resource overtime access without privileged settings reads;
- Staff Profile stability without misattributed late-request failures;
- System Administrator access to Overtime Rules;
- authenticated-session continuity without unexpected 401, 403, or 429 behavior;
- credential-safe UAT evidence and mutation protection.

This is a verification stage. It does not authorize feature redesign, data creation, approval actions, report changes, uploads, deletions, or environment changes.

## 2. Non-negotiable safety controls

1. Keep the live guard limited to `GET`, `HEAD`, and `OPTIONS`, plus the login `POST` only.
2. Block all other `POST`, `PUT`, `PATCH`, and `DELETE` requests before they leave the browser.
3. Do not click Save, Approve, Reject, Submit, Upload, Delete, or other mutation actions.
4. Do not edit `.env`, backend settings, rate limits, user permissions, or production data.
5. Load credentials only from the existing local ignored credential record; never print them to terminal, ledgers, screenshots, traces, or Markdown.
6. Keep Playwright traces and video disabled for credentialed production checks.
7. Sanitize URLs, identifiers, console messages, and evidence paths.
8. Pace production API requests at the established 750 ms minimum interval.
9. Stop the affected persona batch immediately on a 429 or session return to `/login`.
10. Do not rerun the complete 105-route Day 3 sweep; this gate is intentionally bounded.

## 3. Preflight

Before authentication:

1. Request `/version.json` with cache bypass and confirm the build ID exactly matches `54acd0e2d079-20260810102950`.
2. Confirm the live frontend and API origins remain:
   - `https://vmecc.amiosh.com`;
   - `https://vmecc-api.amiosh.com/api`.
3. Run the local credential audit without printing credential values.
4. Confirm the selected persona credentials exist for:
   - System Administrator;
   - Contract Manager;
   - Human Resource.
5. Confirm the live UAT guard and trace-off settings are active.
6. Create a new sanitized run ID and evidence directory outside the repository.

### Preflight exit gate

- deployed build matches;
- all three persona records are available locally;
- no credential value is displayed or committed;
- safety contracts pass before production navigation begins.

## 4. Viewport matrix

Run each required journey at:

| Viewport | Size/profile | Purpose |
|---|---|---|
| Mobile | iPhone 13 profile, approximately `390x844` | Recomposition, overflow, touch flow, modal fit |
| Desktop | `1440x900` | Full table/navigation density and modal behavior |

For every route record:

- final pathname;
- visible page heading;
- first meaningful action or empty state;
- document overflow (`scrollWidth - clientWidth`);
- console errors;
- page errors;
- failed requests;
- unexpected 4xx;
- 429 and 5xx responses;
- sanitized evidence only when a failure is observed.

## 5. Batch A - System Administrator review queues

### Routes

- `/admin/ai-helper-reports`
- `/admin/feedback-reports`

### Journey

For each route and viewport:

1. Enter the route directly after authentication.
2. Confirm the correct page title and one shared queue shell.
3. Confirm all six filters remain reachable:
   - Open;
   - New;
   - Reviewing;
   - Resolved;
   - Dismissed;
   - All.
4. On mobile, confirm a labelled status select is visible and the desktop tab strip is hidden.
5. On desktop, confirm the tab strip is visible and the mobile select is hidden.
6. Use read-only filters and Refresh only.
7. If a row exists, open View and inspect the modal without changing or saving fields.
8. Confirm module-specific detail content remains distinct:
   - AI response/message/context sections on Ask AI Reports;
   - feedback message/reporter metadata on Feedback Reports.
9. Close the modal with Close and Escape where supported; confirm focus and page context remain usable.
10. Measure page overflow and modal clipping.

### Acceptance criteria

- no document overflow greater than one pixel;
- no clipped filter, Refresh, View, Close, or modal content;
- no duplicated nested card treatment introduced by the shared shell;
- status counts and active state remain understandable;
- no unexpected request, console error, or permission response;
- no update request is issued.

## 6. Batch B - Contract Manager permission-aligned staff journeys

### Routes

- `/staff/overtime-management/records`
- representative `/staff/profile/:id` resolved through the read-only fixture helper
- direct `/staff/overtime-management/rules` denial/redirect probe

### Journey

1. Confirm Overtime Records loads with its established heading, filters, empty/list state, and available read-only actions.
2. Confirm the Overtime Rules navigation item is absent.
3. Confirm no request is issued to `/settings/overtime-approval-rules`.
4. Open the direct `/rules` URL and confirm it resolves to Overtime Records without rendering the rules editor.
5. Open one permitted Staff Profile fixture.
6. Confirm the profile remains usable and no late overtime settings response is attributed to it.
7. Navigate between Overtime Records and Staff Profile slowly enough for route diagnostics to settle.
8. Repeat on mobile and desktop.

### Acceptance criteria

- no unexpected 403 or console error;
- no privileged settings endpoint request;
- no Overtime Rules editor exposure;
- permitted overtime records/profile fields remain visible;
- direct rules access recovers predictably rather than showing a broken or blank state;
- document overflow is at most one pixel.

## 7. Batch C - Human Resource permission-aligned staff journeys

Repeat the Contract Manager checks for Human Resource:

- `/staff/overtime-management/records`;
- representative `/staff/profile/:id`;
- direct `/staff/overtime-management/rules` probe.

Additionally confirm that established HR overtime review controls remain visible only when the API marks the record/action as permitted. Do not activate any workflow action.

### Acceptance criteria

- no `/settings/overtime-approval-rules` request;
- no loss of HR-readable records, filters, status, or action labels;
- Overtime Rules remains unavailable without `settings.manage`;
- no mutation request leaves the browser;
- no overflow or runtime failure.

## 8. Batch D - System Administrator Overtime Rules

### Route

- `/staff/overtime-management/rules`

### Journey

1. Enter directly as System Administrator.
2. Confirm the Overtime Rules navigation item and editor render.
3. Confirm `GET /settings/overtime-approval-rules` succeeds.
4. Inspect the existing rule sections and edit affordances without entering edit mode or saving.
5. Confirm navigation back to Overtime Records works.
6. Repeat on mobile and desktop.

### Acceptance criteria

- rules are visible only to the authorized persona;
- settings read succeeds without 401, 403, or 429;
- no save/update request occurs;
- editor structure, labels, and responsive flow remain intact;
- no page overflow greater than one pixel.

## 9. Batch E - Session continuity and rate-limit observation

This batch observes normal behavior; it must not deliberately flood production.

1. Confirm each login reaches an authenticated route once.
2. During each persona batch, perform one normal route transition and one page-focus recheck.
3. Confirm no authenticated identity is cleared during a normal silent recheck.
4. Record any 401, 429, retry message, redirect to `/login`, or repeated session request.
5. If a 429 occurs naturally, stop that persona batch and verify the app presents a temporary/recoverable state rather than false invalid credentials.
6. Do not retry repeatedly; wait for the server-provided interval before one controlled recovery attempt.

### Acceptance criteria

- no false logout;
- no request storm or repeated timer after successful recovery;
- 401 remains an actual anonymous/session-expired state;
- 429, if observed, remains bounded and recoverable;
- credentials remain absent from all artifacts.

## 10. Diagnostic classification

Classify results separately:

- `passed` - route and journey completed with no failure diagnostic;
- `permission-blocked` - deliberate `/403` outcome with only matching 403/Forbidden diagnostics;
- `redirect-verified` - expected redirect completed;
- `controlled-only` - shell inspected without mutation interaction;
- `data-blocked` - required read-only fixture does not exist;
- `failed` - unexpected console/page/request error, 4xx, 429, 5xx, overflow, login return, or mutation attempt.

An intentional permission route may suppress only its matching 403/Forbidden diagnostic. An unrelated 404, JavaScript console error, failed request, 429, 5xx, or overflow must still fail the route.

## 11. Stop conditions

Stop immediately when:

- the mutation guard records any blocked business write;
- credentials or tokens appear in an artifact;
- the live build ID changes during the run;
- a persona returns unexpectedly to `/login`;
- any 429 occurs;
- three cumulative 5xx responses occur;
- a role sees protected rules or data it should not see;
- Contract Manager or Human Resource requests `/settings/overtime-approval-rules`;
- page overflow exceeds one pixel on a target route;
- a Blocker or High user-journey regression is reproduced.

Do not widen permissions, change `.env`, clear production data, or disable rate limiting to continue a stopped batch.

## 12. Evidence and reporting

Write a separate execution record after the run containing:

- run ID and timestamps;
- verified live build ID;
- persona/viewport/route matrix;
- passed, permission-blocked, redirected, data-blocked, and failed totals;
- sanitized endpoint summaries;
- exact overflow measurements;
- evidence paths for failures only;
- confirmed absence of mutation requests and secret-bearing artifacts;
- defect list ranked Blocker, High, Medium, or Low;
- corrective action and retest status;
- final Day 4 `GO`, `CONDITIONAL GO`, or `NO-GO` verdict.

Raw Playwright output, screenshots, logs, credentials, and resolved production identifiers remain outside Git. Only the sanitized durable execution summary belongs in `upgrade-works/`.

## 13. Day 4 entry decision

### GO

Proceed to Day 4 when:

- all four route batches pass at both viewports;
- no unexpected 403, 429, 5xx, page error, failed request, or console error remains;
- both admin queues have at most one pixel overflow;
- Contract Manager and Human Resource never request the privileged rules endpoint;
- System Administrator retains the rules editor;
- session continuity is stable;
- no mutation or credential exposure occurs.

### CONDITIONAL GO

Allowed only for a documented Low issue that does not affect task completion, access control, responsive layout, session integrity, or Day 4 inspection/report-detail work.

### NO-GO

Any Blocker, High, unresolved Medium, authorization leak, false logout, rate-limit loop, mutation attempt, credential exposure, or repeated overflow blocks Day 4 until corrected and retested.
