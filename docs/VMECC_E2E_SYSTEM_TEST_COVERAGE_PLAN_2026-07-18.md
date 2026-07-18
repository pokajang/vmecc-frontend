# VMECC End-to-End System Test Coverage Plan

Date: 2026-07-18  
Status: Proposed implementation plan  
Scope: `vmecc-frontend` and `vmecc-backend`

## 1. Purpose

This plan defines the end-to-end test program for the complete VMECC system. It covers every key in `App\Services\ModuleCatalog::MODULES`, every canonical frontend route family, shared platform behavior, and routed features that sit outside the activation catalog.

The first implementation priority is workflow and approval correctness across inspection, leave, overtime, payroll claims, and operational reports. The same test infrastructure will then be extended to every other system module.

The plan is designed to answer four questions for each module:

1. Can an authorized user complete the main business journey through the browser?
2. Is an unauthorized, expired, wrong-team, or wrong-stage user blocked in both the UI and API?
3. Does the resulting database-backed state, history, notification, attachment, and generated output remain correct?
4. Does the journey remain usable on supported desktop and mobile layouts, including interruption and retry where relevant?

## 2. Sources of truth and completeness rules

The coverage inventory must be generated and reviewed against:

- Backend module catalog: `vmecc-backend/app/Services/ModuleCatalog.php`
- Backend roles and default permissions: `vmecc-backend/app/Services/RoleCatalog.php`
- Backend API surface: `vmecc-backend/routes/api.php`
- Frontend routes: `vmecc-frontend/src/routes.js`
- Frontend navigation and route filtering: `vmecc-frontend/src/_nav.js` and `src/utils/navigation.js`
- Backend system guides: `vmecc-backend/database/ai-helper-system-guides/*.md`
- Existing PHPUnit, Vitest, and Playwright suites

Completeness is measured by the following rules:

- All 50 keys currently declared in `ModuleCatalog::MODULES` appear in section 9.
- Every canonical route family has a route-load assertion for at least one allowed persona.
- Every permissioned module has an allowed and denied assertion.
- Every mutating journey has success, validation failure, authorization failure, and stale/conflicting-state coverage where the resource is versioned.
- Every workflow family has happy path, rejection, correction/cancellation where supported, wrong-role, wrong-stage, and concurrency coverage.
- Legacy redirects are tested for routing only; business journeys run against canonical routes.
- External integrations have deterministic CI coverage and a separate opt-in live canary.
- A catalog/route coverage audit fails CI when a new module or route is introduced without a declared test owner and coverage status.

## 3. Testing layers

End-to-end coverage complements rather than replaces focused backend and frontend tests.

| Layer | Purpose | Typical runner | Required use |
|---|---|---|---|
| L0 domain/component | State machines, calculations, validation, rendering contracts | PHPUnit and Vitest | Exhaustive combinations and fast regression checks |
| L1 API integration | Persistence, RBAC, scope, CSRF, concurrency, files | PHPUnit feature tests and Playwright API requests | Full endpoint and negative security matrix |
| L2 browser E2E | Real route, UI action, session, API, and persistence journey | Playwright | Representative business journeys for every module |
| L3 artifact/output | PDF, download, image, attachment, email payload, notification | Playwright plus output parsers | Every generated or uploaded artifact family |
| L4 operational qualification | Mobile, interruption, offline, performance, live dependencies | Playwright opt-in suites and physical-device checklist | High-risk journeys and release candidates |

Browser E2E tests must perform the business action under test through the UI. API helpers may prepare prerequisites, discover IDs, verify final state, and clean up data. They must not replace the UI transition being claimed as E2E coverage.

## 4. Environment and data safety

### 4.1 Dedicated environment

Create an isolated E2E environment before adding lifecycle tests:

- Backend environment: `APP_ENV=e2e`
- Dedicated database: for example `vmecc_e2e`; never the development or production database
- Dedicated file/storage prefix or disk for uploaded artifacts
- Array/log mailer for deterministic CI; Mailpit for local notification inspection
- Queue in synchronous mode for the baseline suite
- Frontend and API URLs supplied through `VMECC_E2E_BASE_URL`, `VMECC_E2E_API_URL`, and `VMECC_E2E_BROWSER_API_URL`
- A hard backend guard that refuses an E2E reset/seed command unless `APP_ENV=e2e` or an equivalent explicit safe flag is present

The current PHPUnit configuration does not force an isolated database, so database-resetting test commands must not be run until the E2E database is explicitly configured and verified.

### 4.2 Fixture lifecycle

Add a purpose-built `E2eScenarioSeeder`; do not keep extending the fixed smoke scenario for all lifecycle tests.

The seeder should:

- Create deterministic personas and two operational teams, Alpha and Beta.
- Create valid active role assignments with start/end dates and primary-team relationships.
- Create a second HR actor for distinct-approver tests.
- Seed leave entitlement, holidays, shifts, rosters, salary assignments, statutory settings, overtime eligibility, inspection catalogs, and report locations.
- Seed only prerequisites and immutable reference records; tests should create the business record they exercise.
- Emit a machine-readable fixture manifest containing user IDs, team IDs, reference IDs, and enabled module settings.
- Be idempotent.

Every created business record uses a run marker such as `E2E-<UTC timestamp>-<worker>-<case>` in its display ID, submission key, reason, or description.

Preferred cleanup order:

1. Run the suite against a disposable database and discard it after the run.
2. For persistent local E2E databases, delete only records carrying the exact run marker through a guarded cleanup command.
3. Never use broad cleanup queries, unresolved globs, or production-like databases.

### 4.3 Global settings isolation

Workflow rules, module activation, dashboard visibility, shift windows, rates, statutory settings, company profile, and maintenance mode are global state. Tests that mutate them must either:

- Run against a fresh database, or
- Capture the original value and restore it in `afterAll`, even after a failed assertion.

Suites that mutate global settings run serially with one worker.

## 5. Persona and team topology

| Persona key | Role and scope | Team | Main test responsibility |
|---|---|---|---|
| `sysadmin` | System Administrator, global | None | Configuration, overrides, user administration, destructive recovery |
| `contract_manager` | Contract Manager, office | None | Overtime review, payroll approval, reporting administration |
| `hr_primary` | Human Resource, office | None | Leave management, overtime recommendation, salary management |
| `hr_secondary` | Human Resource, office | None | Leave distinct-actor and concurrent-action scenarios |
| `finance` | Finance, office | None | Payroll review and payment actions |
| `admin_role` | Admin, office | None | Payroll claim check stage and team/settings cases |
| `ic_alpha` | Incident Commander, site | Alpha | Inspection approval and IC fallback review |
| `aic_alpha` | Assistant Incident Commander, site | Alpha | Same-team inspection review |
| `aic_beta` | Assistant Incident Commander, site | Beta | Wrong-team denial |
| `trt_alpha` | Tactical Response Team, site | Alpha | Primary applicant and report submitter |
| `trt_beta` | Tactical Response Team, site | Beta | Scope isolation and concurrent operational records |
| `client_cm` | Client Contract Manager, client/site scope | Business-approved mapping | Overtime final approval |
| `representative` | Representative, client/site scope | Client Alpha | Unrelated/low-privilege denial |
| `inactive_user` | Former or inactive assignment | Alpha | Expired-role and disabled-account denial |

### 5.1 Required overtime scoping decision

The default overtime workflow is Contract Manager -> Human Resource -> Client Contract Manager. The current smoke Client Contract Manager is assigned to `Smoke Client Alpha`, while the TRT applicant is assigned to `Smoke Site Alpha`. Overtime management requires team intersection for site/client-scoped actors.

Before the final-approval E2E can be considered valid, the business owner must define how a client approver is related to an operational site. The fixture must model that approved rule. The test must not use System Administrator to conceal an unreachable configured approver.

### 5.2 Leave distinct-actor decision

The default leave stages all use Human Resource. If `enforceDistinctApprovers` is enabled, the fixture must contain multiple active HR users, or the approved role-permission model must be expanded. The E2E plan assumes two HR users without changing production permissions.

## 6. Playwright architecture

Proposed structure:

```text
tests/e2e/
  fixtures/
    e2e-test.js
    personas.js
    fixture-manifest.js
  support/
    auth.js
    api.js
    artifacts.js
    assertions.js
    cleanup.js
    network-observer.js
  pages/
    login.page.js
    workflow-action.modal.js
    record-list.page.js
  workflows/
    inspection-approval.spec.js
    leave-approval.spec.js
    overtime-approval.spec.js
    payroll-claim-approval.spec.js
    reporting-approval.spec.js
  modules/
    core-admin.spec.js
    dashboard.spec.js
    messages.spec.js
    people-teams-roster.spec.js
    leave-administration.spec.js
    overtime-settings.spec.js
    payroll.spec.js
    inspection-assets-issues.spec.js
    ai-feedback.spec.js
  platform/
    auth-session-security.spec.js
    module-rbac-route-matrix.spec.js
    notifications-attachments.spec.js
    responsive-accessibility.spec.js
    pwa-interruption.spec.js
```

Guidelines:

- Use a separate browser context per persona. Never switch users inside one cookie jar.
- Create contexts lazily so a scenario pays only for the actors it needs.
- Prefer role/name/test-ID selectors. Avoid CSS selectors tied to layout.
- Add `data-testid` only where semantic locators cannot uniquely distinguish actions, especially form review versus approval review.
- Keep page objects small and centered on repeated interaction contracts, not entire pages.
- A workflow lifecycle should normally be one test so its sequence is readable and its record is not shared with another test.
- Use separate records for approve, reject, correction, cancel, and concurrency branches.
- Capture trace, screenshot, console errors, failed requests, actor, record ID, workflow stage, and current URL on failure.
- Fail on unexpected 5xx responses and uncaught browser exceptions.

### 6.1 Existing Playwright suites to retain and consolidate

| Existing coverage | Reuse direction | Remaining gap |
|---|---|---|
| `smoke.spec.js` and `smoke-full.spec.js` | Keep route/RBAC/notification sweeps as broad health checks; feed them from the shared persona fixture | They do not prove full business lifecycles |
| `user-management-crud-smoke.spec.js` | Retain focused user CRUD and modal coverage | Add invitation, role-assignment dates/scope, session revocation, lockout, and cross-role denial journeys |
| `inspection-live-smoke.spec.js` | Retain catalog/API/QAQC artifact matrix | Replace opportunistic/inconclusive approval probes with deterministic TRT/AIC/IC records |
| Inspection type-specific specs | Retain form, mobile, continuation, PDF, and evidence depth | Attach nightly approval integration to every implemented type |
| `reporting-workflow-smoke.spec.js` | Reuse workflow modal, row action, settings, and report creation patterns | Add Inspection and extract shared multi-persona helpers |
| `report-media-workflow-smoke.spec.js` | Retain authenticated media lifecycle | Add authorization-negative, lease/orphan, invalid-media, and output-order cases |
| `leave-remediation-smoke.spec.js` | Retain correction visibility as a branch | Add UI submission, all configured manager stages, approval/rejection/cancel, balance, and notification assertions |
| `overtime-remediation-smoke.spec.js` | Retain correction/resubmission branch | Add UI submission, review/recommend/final approve, scope, classification, and downstream payroll assertions |
| Mobile and UI/UX specs | Retain targeted layout evidence | Connect reference viewport checks to every P0 form/detail/modal |

New work should extract duplicated authentication, cookie parsing, shell stubbing, API JSON, diagnostics, and cleanup logic before adding more large standalone helpers. Existing tests should migrate incrementally; they do not need to be rewritten all at once.

## 7. Universal workflow contract

Apply these assertions to inspection, leave, overtime, payroll claims, ERCO, drill, and fitness-test workflows where supported.

### 7.1 Submission

- Applicant can save a draft and recover it after reload or a new browser context.
- Validation prevents incomplete submission and focuses/explains the failing field.
- Double-click/retry does not create duplicate records when a submission key is used.
- Successful submission stores applicant identity, applicant roles, workflow snapshot, stage, next role, version, and submission history.
- The next actor receives a notification with an exact deep link.
- The applicant cannot perform a manager stage unless explicit policy allows it.

### 7.2 Forward transitions

- Only the current stage action is enabled.
- Current role, active assignment, permission, team scope, status, stage, declaration, and expected version are enforced server-side.
- Successful transition increments the version exactly once and records authenticated actor ID/name/time/remarks.
- Next role and action queue move to the correct actor.
- Existing records retain their submission-time workflow snapshot after settings change.
- Distinct-actor policy blocks anyone who completed an earlier protected stage.

### 7.3 Terminal and return transitions

- Approval sets the terminal status/stage, clears the next role, and emits final notifications.
- Rejection requires remarks and cannot be processed again.
- Correction requires remarks, removes manager ownership, unlocks only allowed applicant fields, and resubmission returns to the correct first stage with a new version/history entry.
- Cancellation follows the workflow-specific applicant/manager/system-administrator policy and adjusts dependent balances or outputs.
- Unauthorized or failed transitions do not change version, history, balances, notifications, or audit records.

### 7.4 Concurrency

- Two actors load the same version.
- First valid action succeeds.
- Second action receives the workflow-specific 409 conflict and latest record.
- UI refreshes or offers a clear reload path without silently overwriting state.

## 8. Priority workflow scenarios

### 8.1 Inspection approval

Happy path:

1. `trt_alpha` creates a minimal valid General Inspection through `/inspection/new` and completes the form-review step.
2. Submit and verify `Submitted`, stage `review`, next role AIC, team Alpha, and version 1.
3. `aic_beta` and `representative` cannot see an enabled Review action; direct transition attempts are denied.
4. `aic_alpha` opens the notification or action queue, reviews through the UI, and verifies `Reviewed`, stage `approve`, next role IC.
5. `ic_alpha` approves through the UI.
6. `trt_alpha` reopens the record and sees Approved status, AIC/IC attribution, remarks, and downloadable PDF.

Additional records cover AIC rejection, IC rejection after review, IC fallback when no same-team AIC exists, self-review/self-approval policy, settings snapshot stability, stale version, notification deep links, and wrong-team scope.

Run the happy path for General Inspection on every commit. Run approval integration for all eight implemented inspection types nightly:

- General Inspection
- Emergency Response Auxiliary Equipment
- Fire Extinguisher
- Fire Truck Daily Readiness
- High Angle Rescue Equipment
- Hydraulic Rescue Tools
- SCBA
- Health Safety Environment

### 8.2 Leave approval

Happy path:

1. Seed entitlement, a published roster, cover person, and applicable holidays.
2. `trt_alpha` checks balance/roster impact, uploads evidence, saves a draft, restores it, and submits.
3. Process Review, optional Recommend, and Approve with the configured HR actors.
4. Verify declaration requirements, version increments, history, notifications, and balance movement from pending to used.
5. Applicant sees Approved and cannot edit or delete the request/attachment.

Branch records cover correction/resubmission, rejection, applicant cancellation, administrator cancellation of approved leave, insufficient entitlement, overlapping leave, half-day/time-slot rules, holiday/weekend calculation, attachment authorization, edit lock after first manager action, distinct approvers, wrong role, stale version, and roster-impact notification.

### 8.3 Overtime approval

Happy path:

1. `trt_alpha` passes eligibility, date classification, duration, overnight confirmation, and optional evidence checks.
2. Save/restore a draft and submit a new claim.
3. `contract_manager` reviews.
4. `hr_primary` recommends.
5. Correctly scoped `client_cm` approves.
6. Verify history, notification ownership, approved status, rate classification, and availability to payroll calculations.

Branch records cover correction/resubmission, rejection, applicant cancellation, system-administrator cancellation policy, weekday/weekend/public-holiday classification, overnight duration, ineligible role, overlapping claims, edit lock, wrong team, wrong role, distinct actor, stage skipping, stale version, and attachment authorization.

### 8.4 Payroll claim approval and payment

Happy path:

1. Employee creates expense, salary, and exceptional claim records with appropriate items and evidence.
2. Default configured stages execute as Admin Check -> Finance Review -> Contract Manager Approve.
3. Finance marks an approved salary claim Paid with date/reference/note.
4. Employee views the resulting claim/payslip and downloads the authorized file.
5. Authorized recovery unmarks Paid with mandatory reason and restores Approved consistently.

Cover rejection, cancellation, draft recovery, calculation snapshots, salary baseline, approved overtime inclusion, bulk approve/reject/pay/unpay partial failures, wrong role, payment permission separation, stale version, duplicate submission, attachment ownership, and immutable audit/payment events.

### 8.5 ERCO, Drill, and Fitness Test approvals

For each report type:

- Save/restore draft; submit a minimal and a media-bearing report.
- Configured reviewer reviews; approver approves.
- Separate record is rejected with remarks.
- Unrelated actor and owner self-action are blocked.
- Settings changes do not rewrite in-flight snapshots.
- Exact workflow notification deep links open the correct record.
- Supported PDFs download and contain identifying text/media; unavailable PDF actions are not shown.

## 9. Complete module coverage matrix

### 9.1 Core and administration

| Catalog module | Browser coverage required | Personas | Priority |
|---|---|---|---|
| `settings.module_activation` | View registry; disable/enable parent and child; dependency propagation; locked modules cannot be disabled; hidden nav and direct API/route enforcement; restore settings | Sysadmin, TRT | P0 |
| `settings.system_maintenance` | Enable with message/grace behavior; ordinary session blocked; allowed public status/login behavior; sysadmin recovery; disable and resume original route | Sysadmin, TRT | P0 |
| `settings.role_permissions` | Load matrix; change one reversible permission; new session reflects change; direct endpoint denial; wildcard admin preserved; restore matrix | Sysadmin, affected role | P0 |
| `settings.dashboard_visibility` | Change dashboard section permission; card/API visibility changes without exposing data; restore | Sysadmin, HR/TRT | P1 |
| `users` | Create/invite, edit, lock/unlock, activate/deactivate, password reset trigger, role assignment lifecycle, session list/revoke, soft delete/restore, filters and validation | Sysadmin, target user | P0 |
| `audit` | Workflow/admin actions appear with actor/action/target; search/filter/pagination; details do not expose secrets; unauthorized route/API denied | Sysadmin, Representative | P1 |
| `profile` | Update general, banking, emergency, and medical fields; image upload/remove; validation; password change; current session retained as intended | TRT | P0 |
| `staff` | Staff root permissions and navigation; unauthorized users do not receive staff data | HR/CM, Representative | P1 |
| `staff.directory` | List/search/filter; open canonical staff profile; scoped fields; deep link; empty state and pagination | HR/CM, Representative | P1 |

Non-catalog core surfaces covered with this group: login, logout, remember session, expired session, CSRF, forgot/reset password, onboarding state, Google OAuth redirect/callback contract, route 403/404/500 behavior, and legacy route redirects.

### 9.2 Dashboard

| Catalog module | Browser coverage required | Personas | Priority |
|---|---|---|---|
| `dashboard` | Shell loads; action queue; role-appropriate sections; card links; empty/loading/error states; counts reconcile to fixture data | All representative roles | P0 |
| `dashboard.payroll` | Payroll cards/charts visible only with module and permission; counts/amounts match seeded claims | HR/Finance, TRT denied | P1 |
| `dashboard.overtime` | Pending/actionable/approved summaries and links match scoped records | HR/CM, wrong-team actor | P1 |
| `dashboard.leave` | Pending/approved/balance summaries and links match leave data | HR, TRT | P1 |
| `dashboard.roster` | Published/draft/on-duty summaries respect team scope | IC/CM, other-team user | P1 |
| `dashboard.reports` | Submitted/reviewed/approved counts and action links respect report permission and team workflow | AIC/IC/TRT | P1 |

### 9.3 Communication and shared workflow infrastructure

| Catalog module | Browser coverage required | Personas | Priority |
|---|---|---|---|
| `messages` | Find contact; send/read text; unread state; attachment upload/view/delete authorization; delete for self/everyone policy; empty/error/retry; module-disabled behavior | TRT Alpha/Beta | P1 |
| `workflow_notifications` | Badge count, list/filter, exact deep link, mark one/all read, dismiss one/all, persistence across reload, action-owner visibility, terminal owner notice | All workflow actors | P0 |
| `workflow_attachments` | Upload allowed type/size; preview/download; owner/manager authorization; delete rules by state; orphan cleanup/lease behavior; malicious type rejection | Applicants/managers/unrelated | P0 |

### 9.4 Teams and roster

| Catalog module | Browser coverage required | Personas | Priority |
|---|---|---|---|
| `teams` | Permission and scope boundary for team data and mutations | Sysadmin/IC, wrong-team user | P0 |
| `teams.directory` | Create/update team; member options; assign/remove members; upload/remove image; detail view; delete constraints; canonical deep link | Sysadmin/IC | P1 |
| `roster` | Create schedule, assign team/shift, edit, publish, view by date/team; draft versus published visibility; conflict/duplicate rules; scope denial | CM/IC, TRT | P0 |
| `roster.shift_settings` | View/update shift windows; custom shift CRUD; prevent invalid/overlapping windows; changes reflected in roster/leave/overtime forms | Sysadmin/HR | P1 |

### 9.5 Leave

| Catalog module | Browser coverage required | Personas | Priority |
|---|---|---|---|
| `leave` | Parent activation and navigation; dependent dashboard/admin behavior | Sysadmin, TRT/HR | P0 |
| `leave.self_service` | Draft, compute days, roster impact, evidence, submit, view, allowed edit/delete/cancel, correction resubmit, balance | TRT | P0 |
| `leave.management` | Scoped record list/detail, review/recommend/approve/reject/correct/cancel, bulk actions if exposed, history and action owner | HR users | P0 |
| `leave.assignments` | Entitlement create/update/delete; year/type validation; used/pending reconciliation; employee balance update and history | HR | P1 |
| `leave.holidays` | Batch create, edit, delete; default/national/custom holiday wizard; duplicate handling; leave/overtime classification effect | HR/Sysadmin | P1 |
| `leave.workflow_rules` | Applicant rule and fallback CRUD; recommendation/distinct options; invalid role/permission/unreachable role blocked; new submissions use new snapshot; old records unchanged | Sysadmin | P0 |

### 9.6 Overtime

| Catalog module | Browser coverage required | Personas | Priority |
|---|---|---|---|
| `overtime` | Parent activation and dependencies; navigation/API gates | Sysadmin, TRT/managers | P0 |
| `overtime.self_service` | Eligibility, policy, classification, draft, submit, detail, edit/delete/cancel, correction resubmit, overnight and evidence | TRT | P0 |
| `overtime.management` | Scoped list/detail, review/recommend/approve/reject/correct/cancel policy, bulk action behavior, wrong-team isolation | CM/HR/Client CM | P0 |
| `overtime.workflow_rules` | Applicant/fallback rules, recommendation/distinct actors, reachability and scope validation, snapshot stability | Sysadmin | P0 |
| `overtime.rate_settings` | Weekday/weekend/holiday multipliers, base-hour strategy, role overrides, numeric validation, calculations reflected downstream | Sysadmin/HR | P1 |

### 9.7 Payroll

| Catalog module | Browser coverage required | Personas | Priority |
|---|---|---|---|
| `payroll` | Parent activation/dependency behavior and navigation | Sysadmin, employee/managers | P0 |
| `payroll.self_service` | Employee landing, authorized records, totals, no cross-user leakage | TRT | P0 |
| `payroll.claims` | Expense/salary/exceptional claim draft, item/evidence validation, submit, view, edit/delete/cancel rules, correction/rejection display | TRT | P0 |
| `payroll.payslips` | List, period filter, authorized download, file signature/content, cross-user denial, empty state | TRT, unrelated | P0 |
| `payroll.salary_claims_management` | Scoped claims/salary lists, detail, check/review/approve/reject/cancel, filters, grouping, bulk selection and mixed-result summary | Admin/Finance/CM/HR | P0 |
| `payroll.salary_settings` | Parent configuration tabs, permission and child navigation, settings persistence | HR/Sysadmin | P1 |
| `payroll.salary_assignments` | Draft/create/view/edit/delete assignment; effective dates; pay components; history; duplicate/overlap validation; employee downstream snapshot | HR | P0 |
| `payroll.workflow_rules` | Check/review/approve roles; permission reachability; snapshot stability; unknown role validation | Sysadmin | P0 |
| `payroll.company_profile` | Legal/company fields, validation, persistence, use in payroll output | HR/Sysadmin | P1 |
| `payroll.statutory_rates` | EPF/PERKESO/SIP settings and validation; effective calculation in assignment/claim snapshots | HR/Sysadmin | P1 |
| `payroll.payment_actions` | Mark/unmark paid single and bulk; permission separation; mandatory recovery reason; version conflict; payment event/audit integrity | Finance, HR denied | P0 |

### 9.8 Reports and inspection

| Catalog module | Browser coverage required | Personas | Priority |
|---|---|---|---|
| `reports` | Parent activation, common records/drafts, filters, scope, shared workflow, media, notifications, legacy routes | TRT/AIC/IC/CM | P0 |
| `reports.inspection` | All eight form types; draft/offline recovery; catalogs/assets; submit/edit; review/approve/reject; PDF; issue workflow; sessions; duty and team scope | TRT/AIC/IC | P0 |
| `reports.erco` | Full form, chronology/analysis, draft, media, submit, approval/rejection, detail and PDF | TRT/IC | P0 |
| `reports.drill` | Five-stage form, camera return, max media, draft, submit, approval/rejection, detail and PDF when enabled | TRT/IC | P0 |
| `reports.fitness_test` | Setup/participants/results, validation, draft, submit, approval/rejection, detail; output availability rules | TRT/IC | P1 |
| `reports.pdf_exports` | Inspection/ERCO/Drill endpoints, authorization, throttling, file signature, expected text, image count/order, large/invalid image hardening | Owner/manager/unrelated | P0 |

Detailed inspection submodule coverage:

- Location, site-location, equipment, fire-truck, and SCBA catalog CRUD with in-use deletion constraints.
- Fire-extinguisher single/batch creation, lookup, edit, out-of-service, return, retire, restore, delete, coverage, history, scanner, and exception preview/download.
- Inspection issue assign/unassign/start/resolve/verify/reopen/cancel with assignee and verifier separation.
- Session create/resume, per-asset claim/complete/reset, concurrent claims, location progress, submit, and closed-session denial.
- Duty context show/confirm, TTL expiry, stale duty source, mutation enforcement, and feature-gate off/on behavior.
- Offline queue, reconnect sync, duplicate prevention, conflict resolution, media lease renewal, camera interruption, and draft restoration.
- Desktop and mobile parity for create, review, records, detail, action menus, evidence, and management panels.

### 9.9 Routed features outside the activation catalog

| Surface | Browser coverage required | Personas | Priority |
|---|---|---|---|
| Authentication/session | Login/logout, invalid credentials, inactive/locked account, remember cookie, expiry/recheck, CSRF, password change/reset, revoked session | Sysadmin, TRT | P0 |
| Onboarding | Required profile steps, resume state, operational routes not incorrectly blocked, completion persistence | New TRT | P1 |
| Ask AI user | Context-aware question, streaming UI, thread persistence/delete, document upload/detail/delete, citation links, report-response action, rate/error/timeout state | TRT | P1 |
| Ask AI administration | Diagnostics, markdown knowledge upload, knowledge review/update/delete, audience/scope visibility, response reports triage | Sysadmin | P1 |
| Feedback reports | Authenticated submission, validation, admin list/detail/status update, submitter isolation | TRT, Sysadmin | P1 |
| PWA/update | Install prompt behavior, update banner, service-worker update, offline shell, reconnect recovery, camera-return state | TRT | P2 |
| Error and legacy routing | 403/404/500 pages; all declared legacy redirects preserve encoded IDs and reach canonical detail routes | Allowed/denied users | P1 |
| Email/digest jobs | Deterministic queued payload/recipient assertions in CI; Mailpit delivery canary for invitation/reset/workflow digest | Relevant actors | P2 |
| Google authentication | Deterministic redirect/state/callback failure contract in CI; opt-in live identity-provider canary only | Dedicated test identity | P2 |

Ask AI CI tests must stub the model provider at the HTTP boundary while exercising VMECC authorization, streaming parsing, persistence, retrieval, citation, and failure handling. A live OpenAI canary is separate, opt-in, rate-limited, and must not be a merge gate.

## 10. Cross-cutting quality coverage

### 10.1 RBAC and module matrix

Generate a matrix from all smoke/E2E personas and representative route/API families:

- Allowed navigation item and canonical route load.
- Hidden navigation and 403 for disallowed direct access.
- Active assignment dates and primary role behavior.
- Office/global versus site/client-team scope.
- Module disabled versus missing permission distinction.
- System Administrator wildcard behavior while preserving stage/order/concurrency invariants.
- No response body leaks records outside the actor's scope.

This broad matrix remains API-heavy for speed, with representative browser checks for each navigation group.

### 10.2 Security

- CSRF required for every unsafe session-authenticated endpoint.
- Session fixation check across login; logout invalidates session.
- Upload type, size, content mismatch, path, authorization, and orphan handling.
- Stored text rendered safely in remarks, messages, report descriptions, names, and file names.
- Rate-limit response and UI recovery for login, AI, uploads, exports, and duty confirmation.
- Sensitive profile, salary, medical, attachment, and audit fields never appear to unauthorized users.
- Destructive actions require the expected confirmation and operate on the displayed target ID.

### 10.3 Accessibility and responsive behavior

For every primary module landing page and every P0 form/detail/modal:

- Keyboard-only navigation and visible focus.
- Accessible names for buttons, inputs, menus, drawers, modals, status changes, and errors.
- Dialog focus containment and restoration.
- Validation associated with the exact field.
- No horizontal page overflow at 360x800, 390x844, 768x1024, 1280x720, and 1440x900 reference sizes.
- Primary touch targets are usable on coarse pointers.
- Sticky action bars do not cover fields, evidence, or pagination.
- Status is not conveyed by color alone.

Use targeted automated accessibility scanning after selecting a compatible dependency. Until then, enforce semantic Playwright locators, keyboard journeys, focus assertions, and existing component tests.

### 10.4 Reliability and interruption

- Reload after save and after each workflow transition.
- New browser context confirms persistence independent of React state/local storage.
- Network failure during create/update/upload produces a recoverable state.
- Duplicate clicks/retries are idempotent where submission keys exist.
- Offline-capable report flows survive disconnect/reconnect and camera/app background return.
- Global notification and dashboard counts converge after mutations.
- No persistent loading indicators or uncaught console errors.

### 10.5 Generated output and downloads

For PDFs, payslips, exports, images, and attachments:

- HTTP status, content type, non-zero size, and expected file signature.
- Identifying record text and key calculated fields.
- Expected evidence count/order where meaningful.
- Authorization under owner, workflow actor, unrelated actor, and expired session.
- Invalid/oversized media fails safely without partial persisted links.
- Download filenames are safe and stable enough for users.

## 11. Execution suites and schedule

### P0 pull-request gate

Target: deterministic and approximately 15 minutes after parallelization.

- Backend workflow/RBAC/concurrency feature tests.
- Frontend workflow/domain/component tests.
- Authentication and CSRF browser smoke.
- Module/RBAC route matrix.
- Inspection General happy approval path.
- Leave happy approval path.
- Overtime happy approval path after scoping is resolved.
- Payroll claim happy approval/payment path.
- One ERCO/Drill/Fitness representative approval path, rotated or parallelized.
- Workflow notification deep links.
- User management critical CRUD.
- Module activation/maintenance recovery.

### P1 nightly

Target: complete functional system coverage.

- Every row in section 9.
- All workflow branches and negative role/team/stage cases.
- All eight inspection types.
- All report media and supported PDF checks.
- All dashboard data reconciliation.
- Settings mutation/restore tests.
- Mobile reference viewports.
- Concurrency and interruption cases.
- Full artifact retention on failure.

### P2 weekly/release candidate

- Chromium plus one additional supported browser engine where compatible.
- Live Mailpit delivery, queue worker, and scheduled digest qualification.
- Live AI canary with controlled prompts and spend limits.
- Google OAuth test identity canary.
- PWA install/update/offline qualification.
- Large media, slow network, rate limiting, and long-list performance.
- Physical mobile-device report checklist.
- Visual comparison for high-risk report/PDF layouts.

## 12. Implementation phases

### Phase 0: Safety and inventory

- Provision and verify the dedicated E2E database/storage.
- Add guarded E2E seed/reset/cleanup commands and fixture manifest.
- Add catalog/route coverage inventory generation.
- Resolve overtime Client Contract Manager scope and leave distinct-actor fixture decisions.
- Normalize shared login/cookie/CSRF helpers already duplicated across current specs.

Exit criteria: an E2E reset cannot target development/production, all personas authenticate, and the generated inventory lists all 50 catalog modules.

### Phase 1: Approval foundation

- Implement separate browser contexts and common workflow modal/assertion helpers.
- Add inspection, leave, overtime, payroll claim, and reporting happy paths.
- Add final-state API/history/notification assertions and run-marked cleanup.

Exit criteria: five workflow families complete through their configured actors without API-performing the UI transitions.

### Phase 2: Workflow hardening

- Add reject, correction/resubmit, cancel, wrong-role, wrong-team, distinct-actor, self-action, settings snapshot, and stale-version cases.
- Add attachment and notification deep-link coverage.

Exit criteria: the universal workflow contract in section 7 is satisfied or explicitly marked not applicable for every workflow family.

### Phase 3: Workforce, settings, and payroll completion

- Cover users, roles, module activation, maintenance, profile, staff, teams, roster, leave administration, overtime settings, salary settings, payslips, and payment recovery.

Exit criteria: all non-report P0/P1 catalog rows have positive and negative browser coverage.

### Phase 4: Reports, assets, and outputs

- Complete all inspection types, assets, issues, sessions, duty context, media, offline behavior, ERCO, Drill, Fitness, and PDFs.

Exit criteria: all report catalog rows and generated-output checks pass nightly.

### Phase 5: Communication, AI, PWA, and qualification

- Complete messages, Ask AI, feedback, PWA/update, external canaries, responsive/accessibility, performance, and physical-device qualification.

Exit criteria: every section 9 row is automated or has an approved manual/live qualification with owner and evidence.

## 13. Coverage reporting and ownership

Maintain a machine-readable manifest alongside the tests with fields:

```text
moduleKey
routeFamilies
apiFamilies
owner
risk
positiveCaseIds
negativeCaseIds
workflowCaseIds
artifactCaseIds
executionTier
automationStatus
lastQualifiedAt
```

Generate a human-readable report after nightly runs containing:

- Catalog modules covered/missing.
- Canonical routes passed/failed/skipped.
- Persona/permission matrix results.
- Workflow transitions by module/action/status.
- Unexpected 4xx/5xx and browser errors.
- Created/cleaned record counts.
- Artifact paths for traces, screenshots, downloads, and JSON summaries.
- Explicit reasons for every skip or inconclusive result.

An inconclusive workflow action is not a pass. Missing fixtures or unreachable configured roles must fail setup and identify the exact role, permission, or scope problem.

## 14. Release acceptance criteria

A release candidate is acceptable when:

- P0 is green on the target commit.
- P1 is green in the isolated E2E environment.
- No catalog module or canonical route is unowned or absent from the coverage manifest.
- All configured workflow roles pass reachability and active-assignee audit.
- No P0 journey reports unexpected 5xx, uncaught browser errors, data leakage, stale overwrite, duplicate submission, or incomplete cleanup.
- Generated outputs pass signature/content/authorization checks.
- Required P2 live/manual qualifications have current evidence.
- Known skips are documented with risk, owner, expiry date, and release approval.

## 15. Initial implementation backlog

1. Create safe E2E environment validation and database reset/seed commands.
2. Add `E2eScenarioSeeder`, second HR persona, Beta-team actors, and fixture manifest.
3. Resolve and encode the Client Contract Manager-to-operational-site scope rule.
4. Consolidate multi-origin login/cookie/CSRF handling into one Playwright fixture.
5. Add module/route/API coverage manifest and audit.
6. Implement inspection TRT -> AIC -> IC browser approval.
7. Implement leave submit -> staged HR approval and correction loop.
8. Implement overtime TRT -> Contract Manager -> HR -> Client Contract Manager approval.
9. Implement payroll employee -> Admin -> Finance -> Contract Manager -> Finance payment.
10. Extend existing reporting workflow browser tests to inspection and shared helpers.
11. Add workflow negative/concurrency matrix and exact notification deep links.
12. Implement the remaining module groups in section 9 by P0/P1 priority.
