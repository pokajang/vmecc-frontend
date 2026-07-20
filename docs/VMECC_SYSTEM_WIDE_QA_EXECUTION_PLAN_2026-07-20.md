# VMECC System-Wide QA/QC Execution Plan

Date prepared: 20 July 2026  
Repositories: `vmecc-frontend` and `vmecc-backend`  
Execution target: isolated local E2E environment only  
Primary interaction method: controlled Playwright browser plus API, database, and artifact verification

## 1. Purpose

This plan defines a controlled, traceable audit of the complete VMECC software system. Approval workflows are included, but they are only one part of the scope. The audit covers every discoverable frontend route, backend endpoint, module, user-facing view, action, permission boundary, background behavior, generated artifact, and important failure state.

The plan is designed to prevent four common failures in large QA efforts:

1. Accidentally testing against or mutating the wrong environment.
2. Reporting a route as covered merely because the page opened.
3. Fixing a symptom without proving the underlying behavior and adjacent paths.
4. Losing track of untested, blocked, orphaned, or non-applicable functionality.

The desired final statement is not simply "tests passed." It is a qualified inventory showing exactly what was exercised, under which role and state, what evidence was captured, what defects were repaired, and what risk remains.

## 2. Current repository baseline

The planning baseline discovered on 20 July 2026 is:

| Inventory                          | Current count | Source                                         |
| ---------------------------------- | ------------: | ---------------------------------------------- |
| Frontend route declarations        |            97 | `vmecc-frontend/src/routes.js`                 |
| Laravel routes                     |           303 | `php artisan route:list --json`                |
| Backend module catalog keys        |            50 | `vmecc-backend/app/Services/ModuleCatalog.php` |
| Playwright specification files     |            23 | `vmecc-frontend/tests/e2e/*.spec.js`           |
| Frontend unit/component test files |           253 | `src/**/__tests__` and `*.test.*`              |

Laravel route-family counts at planning time are:

| Family           | Count | Family     | Count |
| ---------------- | ----: | ---------- | ----: |
| inspection       |    60 | staff      |    40 |
| settings         |    29 | reports    |    20 |
| ai-helper        |    20 | leave      |    19 |
| users            |    17 | messages   |    15 |
| overtime         |    12 | payroll    |    11 |
| workflow         |     9 | teams      |     8 |
| auth             |     6 | stats      |     6 |
| report-media     |     5 | non-API    |     5 |
| feedback-reports |     4 | holidays   |     4 |
| profile          |     3 | rosters    |     3 |
| onboarding       |     2 | password   |     2 |
| dashboard        |     1 | audit-logs |     1 |
| migration        |     1 |            |       |

These counts are discovery inputs, not coverage claims. They must be regenerated at execution time because routes and features may have changed.

### 2.1 Safety gaps found during the plan audit

The following controls are not yet proven by the current repository configuration and are Phase 0 blockers, not assumptions:

| Gap                                                                                                                     | Why a mishap could occur                                                                                                         | Required closure before affected testing                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Database guard checks only environment and database-name suffix                                                         | A shared or remote database named `*_test` could still be reset                                                                  | Require an exact database allowlist, loopback host, and a dedicated least-privilege database user in both code and tests |
| `.env.testing` uses the PostgreSQL `postgres` account                                                                   | A test process has privileges beyond the intended database                                                                       | Create/use an E2E-only role restricted to the approved test database and schema                                          |
| `local` and public storage are shared defaults, with some controllers hard-coding `local`                               | Upload/delete tests could touch developer files                                                                                  | Add test-specific roots for every used disk and prove resolved paths stay inside the run-owned root                      |
| Browser E2E needs persistent sessions, but the sample `file` session driver uses the shared framework session directory | Test and developer sessions could collide or be deleted together                                                                 | Add an environment-configurable session path or another test-only persistent session store plus a unique cookie name     |
| A synchronous queue executes jobs immediately                                                                           | A job can still send mail or invoke an external provider even though no worker is running                                        | Audit every dispatched job and enforce fake/test transports plus an outbound network deny rule                           |
| Shell environment variables can override `.env.testing`                                                                 | Inherited database, mail, AI, or API settings could silently win                                                                 | Start services from a sanitized, explicit environment and verify resolved runtime values                                 |
| Frontend dev/build commands can inherit a non-test `VITE_API_URL`                                                       | A controlled browser could call a non-test API                                                                                   | Set explicit loopback URLs, inspect the built bundle, and fail on every non-allowlisted browser request                  |
| `php artisan serve` may serialize requests                                                                              | A two-browser test could look concurrent while requests execute one at a time                                                    | Use a concurrency-capable isolated server for concurrency qualification and prove request overlap                        |
| No exclusive run lock is currently specified                                                                            | Two audit processes could reset or mutate the same test database concurrently                                                    | Implement an owner-recorded run lock before reset or mutable execution                                                   |
| Raw Playwright traces can contain request bodies and headers                                                            | Evidence could retain credentials or sensitive fields                                                                            | Keep raw evidence outside the repository with restricted retention; publish only sanitized evidence                      |
| Mixed `localhost` and `127.0.0.1` origins                                                                               | Cookies, Sanctum state, CORS, redirects, and browser assertions can fail inconsistently or target the wrong service              | Choose one canonical loopback hostname per run and apply it to every frontend/backend origin setting                     |
| Windows junctions, symlinks, or reparse points inside a cleanup tree                                                    | A path that appears run-owned can resolve outside the evidence/storage root                                                      | Canonicalize every cleanup target and reject link/reparse-point escape before deleting anything                          |
| Only one effective recovery administrator                                                                               | Permission, maintenance, lockout, or deletion testing can remove the auditor's last recovery path                                | Retain and verify an immutable break-glass administrator; mutate only disposable accounts                                |
| Broadly quarantining a broken baseline                                                                                  | Later cases may appear to fail independently when the shared authentication, routing, build, or database layer is already broken | Block dependent phases; quarantine only proven unrelated failures and exclude affected scope from qualification          |
| Debug responses and unrestricted raw evidence                                                                           | Error cases can expose SQL, paths, secrets, personal fields, or large volumes of trace data                                      | Repeat release/security cases with debug disabled and enforce redaction, retention, and per-run quotas                   |
| Backend suite and browser E2E share the same test database                                                              | Parallel migrations/resets and application traffic can corrupt fixtures or produce non-reproducible failures                     | Make process classes exclusive unless separate database and storage identities are proven                                |
| Automatic browser/dependency installation during execution                                                              | Tooling drift and network downloads can change the audit environment mid-run                                                     | Inventory required engines first; record and separately authorize tooling changes                                        |

Until these gaps are closed or the affected cases are marked blocked, no system-wide qualification claim is permitted.

## 3. Scope and completeness rule

### 3.1 In scope

- Authentication, authorization, sessions, account security, onboarding, and password behavior.
- Every declared frontend route, including dynamic detail/edit routes and legacy redirects.
- Every Laravel route, including read, write, destructive, upload, download, and workflow endpoints.
- All 50 module-catalog keys and routed features outside that catalog.
- Dashboard sections and their underlying API data.
- Profile, users, staff, teams, roster, shifts, leave, overtime, payroll, salary, reports, and inspections.
- Messages, attachments, notifications, audit logs, feedback, AI helper, settings, maintenance, and module activation.
- Browser navigation, forms, tables, filters, pagination, dialogs, toasts, downloads, uploads, and deep links.
- Queue jobs, notification and email side effects, scheduled behavior, console commands, and report generation where they affect system behavior.
- Database constraints, persistence, versioning, concurrency, idempotency, and audit history.
- Responsive behavior, keyboard access, basic accessibility, error recovery, and high-level performance observations.
- Chrome/Chromium primary coverage, followed by selected Firefox/WebKit compatibility checks for release-critical journeys.

### 3.2 Inventory completeness equation

The master inventory is the union of:

```text
frontend route declarations
+ navigation destinations
+ links generated by notifications and dashboard widgets
+ Laravel HTTP routes
+ module catalog entries
+ user-triggerable controls in views
+ uploads/downloads/generated artifacts
+ jobs, notifications, scheduled tasks, and operational commands
+ legacy aliases and redirects
```

Every inventory item must finish with one of these states:

- `qualified`
- `passed_partial`
- `failed`
- `blocked`
- `not_implemented`
- `not_applicable`
- `orphaned`
- `retired`

No item may be silently omitted. `not_applicable`, `orphaned`, and `retired` require a written reason and supporting repository evidence.

### 3.3 What does not count as complete coverage

- A route-opening smoke test without feature interaction.
- A frontend component test standing in for backend permission enforcement.
- An API call standing in for a user action claimed as browser E2E.
- A hidden button standing in for direct-route or direct-endpoint denial.
- One administrator persona standing in for the intended business role.
- A happy path without applicable validation and negative cases.
- A generated HTTP 200 without verifying persisted state or artifact contents.
- A module mapping without identifiable executable cases.

Source-level views and reusable components must also be inventoried. A component does not require a separate browser journey when it is purely presentational and is already exercised through a parent feature, but the ledger must link it to that parent case and to any unit/component coverage. Unlinked view code is classified as orphaned or uncovered rather than ignored.

## 4. Authority and safety boundaries

### 4.1 Authorized environment

All mutable testing must use:

- `APP_ENV=testing` or `APP_ENV=e2e`.
- The exact locally approved database (initially `vmecc_test`), not merely any name ending in `_test` or `_e2e`.
- A loopback database host unless the user explicitly approves a named isolated remote test service.
- A database role limited to the approved test database/schema and unable to drop or alter other databases.
- The existing guarded `php artisan e2e:reset --env=testing` command.
- Local frontend and backend services bound to loopback addresses.
- Test-only users, teams, records, files, sessions, email transports, and queues.

Production, staging, shared developer databases, real employee records, and real external recipients are out of bounds unless the user later grants explicit, environment-specific authority.

### 4.2 Mandatory preflight gate

Before every mutable batch, the runner must record and verify:

1. Current repository paths and Git status for both repositories.
2. Resolved Laravel environment.
3. Resolved database connection name, host, port, and database name.
4. Database host, exact name, and role match the run's explicit allowlist; the strengthened `E2eEnvironmentGuard` passes.
5. Mail transport is non-delivering (`array`, log, or dedicated test sink).
6. Every queued job reachable in the batch has test-safe downstream transports; queue isolation alone is insufficient.
7. Storage and browser downloads are isolated from user/production files.
8. Application base URLs point to loopback test servers.
9. Ports are either free or owned by processes started for the current run.
10. No browser context contains a personal profile, saved password, or unrelated session.
11. A single-writer run lock is held for the approved database and storage root.
12. Browser and backend outbound network access is denied except for recorded loopback/test-sink destinations.
13. Resolved cache, session, cookie, log, and queue namespaces are unique to the run.
14. Application, database, browser, and fixture time zones/clocks are recorded and compatible with the batch.
15. Frontend runtime/build configuration contains only the approved test API and frontend origins.
16. One canonical loopback hostname is used consistently for frontend, backend, CORS, Sanctum/session domains, cookies, redirects, and assertions; `localhost` and `127.0.0.1` are not mixed within a run.
17. Available disk space and per-run artifact quotas are checked before trace, video, upload, conversion, download, and report generation begins.

The resolved values, not only `.env.testing` text, must be checked. Configuration caches must be cleared before relying on environment changes. Preflight output must be redacted: it records identities and effective settings, never database passwords, API keys, cookies, tokens, or a raw environment dump.

### 4.3 Destructive-operation guard

Database resets, bulk deletes, account deletion, team disbanding, storage cleanup, maintenance-mode changes, and module deactivation are permitted only when all of the following are true:

- The test run has a recorded run ID.
- The guarded environment/database checks pass.
- No application server is currently serving a different environment on the target port.
- The exact target record or isolated directory is known.
- The operation appears in the current batch definition.
- Recovery is either an E2E reset or an explicit fixture restoration step.
- The exclusive run lock is owned by the current run.
- All application/test processes using the target database are stopped before a schema reset.
- Disposable records are used for delete, lockout, invitation, and role-removal tests; canonical recovery personas are never targets.

No recursive deletion may target a workspace root, home directory, unresolved environment variable, wildcard-derived parent, or shared storage root. Before cleanup, resolve the absolute canonical path and reject any symlink, junction, reparse point, or descendant whose resolved target escapes the recorded run root.

### 4.4 Storage isolation is a Phase 0 gate

Before upload, attachment, AI-document, image, export, or PDF mutation testing begins, the audit must prove that test artifacts use an isolated directory or disk. This applies to the `local` disk, public uploads, profile/team images, temporary conversion files, logs, sessions, thumbnails, downloads, and any controller that hard-codes a disk. If a resolved path can reach shared storage, a test-specific root or injectable disk must be implemented first.

The audit may read existing fixture assets before this gate, but it must not delete or overwrite shared files. The run must enforce bounded retention and storage quotas so traces, videos, logs, conversions, and deliberately large upload cases cannot fill the workstation disk. Very large configured limits are verified with focused validation tests or a safely lowered test-only limit, not by generating uncontrolled multi-gigabyte files.

### 4.5 External-effect controls

- Email delivery must use an array/log/test-sink transport.
- SMS, chat, webhook, calendar, cloud storage, and other integrations must be disabled, faked, or use explicit sandbox accounts.
- AI-provider requests must be mocked or use an explicitly authorized test account and capped budget.
- Printer, camera, scanner, GPS, QR, and hardware-dependent functions must use fixtures/emulation unless physical testing is explicitly arranged.
- Browser downloads must go to run-specific temporary storage.
- Service workers and caches must be isolated per browser context and cleared during teardown.
- Queue mode is not considered an external-effect control: synchronous jobs still execute their mail, HTTP, AI, and storage code.
- Browser requests to non-allowlisted origins must be blocked and reported rather than followed.
- Backend processes must start without inherited cloud, SMTP, webhook, or AI credentials unless a specifically approved sandbox case requires them.
- Security tests must be bounded; no denial-of-service, unbounded brute force, malware, or external scanning is permitted. Upload rejection uses inert fixture bytes, not live malicious payloads.

### 4.6 Immediate stop conditions

Execution stops immediately if any of these occurs:

- Resolved environment or database does not satisfy the guard.
- A response, log, or UI displays real personal or production data.
- An external email, webhook, AI call, or file write escapes the test boundary.
- A destructive target cannot be resolved exactly.
- A migration or reset points outside the isolated database.
- A browser session unexpectedly uses a personal profile.
- A security defect allows access beyond the test scope and continued testing could broaden impact.
- Data corruption prevents reliable attribution of later results.
- The run lock is lost, stale, or owned by another process.
- Source files change unexpectedly during a case or another process edits an overlapping file.
- An outbound connection attempts to reach a destination outside the recorded allowlist.
- The test clock/time zone differs from the fixture assumptions in a way that can alter business outcomes.

The runner records the evidence, stops services it owns, preserves artifacts, and reports the blocker before resuming.

## 5. Run identity, data, and evidence isolation

Every execution receives a run ID:

```text
VMECC-QA-YYYYMMDD-HHMMSS-<short-random-suffix>
```

The run ID is used in:

- Created names, emails, record titles, submission keys, and remarks.
- Screenshot, video, trace, download, and log directories.
- Defect and coverage ledger entries.
- Cleanup queries and retained evidence.

Test records must use recognizable prefixes such as `QA-`, `E2E-`, or the full run ID. Fixed seed actors may be reused, but mutable business records must remain attributable to one run.

### 5.1 Fixture strategy

Fixtures are divided into:

- **Baseline fixtures:** deterministic roles, permissions, users, teams, assignments, rules, and catalogs.
- **Scenario fixtures:** records created for one test family.
- **Conflict fixtures:** two-browser/version and duplicate-submission scenarios.
- **Artifact fixtures:** safe images, PDFs, text documents, invalid files, and boundary-size files.
- **Failure fixtures:** missing references, inactive users, disabled modules, expired state, and malformed payloads.

Each batch declares what it creates, mutates, deletes, and expects to remain afterward.

### 5.2 Reset policy

- Reset before the first mutable batch.
- Reset between batches that alter global settings, role permissions, modules, maintenance state, workflow rules, or shared catalogs.
- Prefer scenario-specific cleanup for low-risk independent records when it is reliable and asserted.
- Perform a final guarded reset by default. Retaining populated test state requires an explicit user request, a reason, an expiry/cleanup owner, and a handoff record.
- Stop backend servers, workers, schedulers, and browser tests before every schema reset; restart them only after seeding completes.
- Never issue a reset while another run owns the lock or while database connections from an unknown process remain active.
- Global settings, permissions, module state, maintenance state, and time fakes must also have `finally`-style restoration so an assertion failure cannot strand the environment before the next guarded reset.

### 5.3 Exclusive run lock and crash recovery

Mutable execution requires a lock containing the run ID, owner process, database identity, storage root, start time, and heartbeat. Lock behavior must be tested before it is trusted.

- Only one writer may use the database/global settings/storage root at a time.
- Read-only analysis may run concurrently only when it cannot alter application caches or boot side-effectful providers.
- A stale lock is not removed automatically merely because it is old. First prove the owner process is gone and inspect database/storage state.
- Teardown releases the lock only after browsers, workers, schedulers, and servers owned by the run are stopped.
- On crash recovery, reconcile partially created records and files before resetting or resuming.

### 5.4 Clock and date policy

- Record operating-system, PHP/application, PostgreSQL, and browser time zones.
- Do not change the computer's system clock.
- Use application-level clock injection/fakes for boundary tests when available.
- Use dynamically valid fixture periods for ordinary tests and dedicated fixed-clock cases for month/year/leap-day boundaries.
- Never calculate a future date by adding a fixed number of days without also verifying eligibility, holiday, entitlement, and configured workflow windows.

### 5.5 Source-state ownership

The workspace is shared with the user and may already contain uncommitted work. Before each batch:

- Record Git heads, status, and hashes of files in the batch scope.
- Maintain a change ledger identifying audit-owned files/hunks.
- Do not overwrite, revert, stage, or commit unrelated changes.
- If the user or another process changes an overlapping file during execution, stop the affected case, preserve evidence, reread the new source, and re-baseline affected results.
- After any production change, regenerate affected inventories and invalidate earlier results whose code path changed.

## 6. Personas and organizational topology

At minimum, retain independent test personas for:

| Persona                            | Primary use                                             |
| ---------------------------------- | ------------------------------------------------------- |
| System Administrator               | Full administration and recovery checks                 |
| Admin                              | Payroll check stage and delegated administration        |
| Tactical Response Team Alpha       | Applicant, submitter, report creator                    |
| Tactical Response Team Beta        | Cross-team ownership and scope checks                   |
| Assistant Incident Commander Alpha | Scoped inspection review                                |
| Assistant Incident Commander Beta  | Wrong-team denial                                       |
| Incident Commander                 | Final report approval and command visibility            |
| Contract Manager                   | Overtime review, payroll approval, workforce management |
| Human Resource 1                   | Initial HR review                                       |
| Human Resource 2                   | Distinct-actor recommendation                           |
| Human Resource 3                   | Distinct-actor final approval                           |
| Finance                            | Payroll review and payment                              |
| Client Contract Manager Alpha      | Site/team-scoped overtime approval                      |
| Client Contract Manager Beta       | Wrong-scope denial                                      |
| Representative                     | Low-privilege authenticated user                        |
| Locked/disabled user               | Authentication denial and session invalidation          |

Each persona gets a separate browser context. The audit must never simulate a multi-user scenario by clearing cookies and changing users inside a single context.

Retain two independent System Administrator personas: one primary audit administrator and one verified break-glass recovery administrator. The break-glass account is tested before, but never used as the mutation target for, role removal, lockout, deletion, maintenance-mode, module-disable, password-throttle, or session-revocation cases. Every destructive identity test uses a disposable run-owned user, and no case may delete, demote, disable, or lock the final recovery path.

Team/site topology must include:

- Two unrelated teams.
- At least two sites/locations.
- Explicit membership dates and active/inactive states.
- One permitted and one forbidden client/site intersection.
- Records owned by each relevant team.
- Users with multiple roles where conflict behavior must be tested.

## 7. Controlled browser policy

The browser used for manual-style QA is launched by Playwright, optionally in headed mode so the user can observe it. It must not attach to the user's existing personal browser profile.

While a controlled headed case is running, the user should observe without clicking or typing in that browser window. If manual interference occurs, the case is invalidated and restarted from a known fixture state. The runner must not infer a product defect from a state altered outside the recorded test actions.

For every browser case:

1. Create a fresh context for the persona.
2. Authenticate using a test-only credential source.
3. Confirm the session user through the backend session endpoint.
4. Record console errors, page errors, failed requests, and responses at or above 500.
5. Perform the user interaction through the visible UI when the case is classified as browser E2E.
6. Verify the resulting UI state.
7. Verify authoritative API/database state separately when appropriate.
8. Capture a screenshot at the failure point and a trace for unexpected failures.
9. Close the context and prove no session leaks into the next persona.
10. Fail the case if a request resolves outside the approved origin allowlist, even if the page otherwise works.
11. Use run-specific download and browser-output directories outside the Vite source root.

Passwords, session cookies, CSRF tokens, banking details, medical details, private message bodies, and other sensitive fields must be redacted from logs and retained evidence. Authentication secrets must never be placed in screenshots, case names, URLs, or committed fixtures.

Raw traces can contain authentication request bodies and headers. They remain local, outside Git, with restricted retention and test-only credentials. Only sanitized screenshots/log excerpts may be included in the final report. Trace collection must not be enabled indiscriminately for passing login/security cases.

API helpers may create deterministic prerequisites and inspect results, but they must not perform the business transition that a browser case claims to test.

Development-server browser runs are useful for diagnosis but do not qualify production delivery. Release-critical routes must also run against an explicitly configured E2E production build/preview whose compiled API origin has been inspected. A standard production bundle must never be previewed for E2E if it embeds a non-test API URL.

## 8. Master coverage ledger

The audit must generate a machine-readable ledger rather than maintaining results only in prose. Recommended fields are:

```text
itemId
sourceType
moduleKey
featureFamily
frontendRoutes[]
backendRoutes[]
viewOrComponent
rolesAllowed[]
rolesDenied[]
dataFixtures[]
positiveCaseIds[]
negativeCaseIds[]
browserCaseIds[]
apiCaseIds[]
artifactCaseIds[]
nonfunctionalCaseIds[]
risk
owner
automationStatus
executionStatus
lastExecutedAt
result
defectIds[]
evidencePaths[]
notes
```

The generated inventory must be diffed against the previous inventory. Added or removed routes and endpoints fail the inventory gate until classified.

## 9. Test layers

### Layer 0: repository and configuration contracts

- Route and module inventory generation.
- Duplicate, conflicting, shadowed, and unreachable route detection.
- Navigation-to-route reconciliation.
- Endpoint/controller/action existence.
- Permission-name and module-key consistency.
- Environment, migration, configuration, and dependency checks.
- Orphan view, unused endpoint, legacy alias, and dead-link identification.

### Layer 1: backend endpoint contracts

Every Laravel route is classified and accounted for. Applicable endpoints receive:

- Successful request with schema assertions.
- Unauthenticated request.
- Authorized and unauthorized role requests.
- Ownership/team/site scope requests.
- Input validation and boundary values.
- Missing/deleted resource behavior.
- Duplicate/idempotent request behavior.
- Version/concurrency behavior for mutable shared records.
- Database, audit, notification, email, job, and attachment side-effect assertions.
- Response data-minimization checks for sensitive fields.

### Layer 2: browser route qualification

Every frontend route is exercised under its intended role and, where applicable, an unauthorized role. Route qualification verifies:

- Correct page rather than a fallback page.
- Navigation and active-state accuracy.
- No blank screen, redirect loop, page exception, console error, or unexpected HTTP failure.
- Loading, empty, error, and populated states.
- Dynamic ID, slug, detail, edit, and legacy redirect behavior.
- Refresh and browser back/forward behavior.
- Deep-link behavior with a fresh session.
- Module-disabled and maintenance-mode behavior where relevant.

### Layer 3: feature and interaction qualification

For each user-facing function:

- Create, view, edit, save, submit, cancel, delete, restore, or other relevant lifecycle actions.
- Search, filter, sort, group, paginate, select, and bulk action.
- Modal open/close/cancel, confirmation, keyboard focus, and error recovery.
- Required fields, formats, ranges, cross-field validation, duplicates, and long input.
- Attachment upload, replacement, preview, download, integrity, and removal.
- Persistence after refresh and re-login.
- Notification, audit history, and downstream dashboard effects.

### Layer 4: cross-module journeys

Cross-module cases verify that a change in one area appears correctly everywhere it is consumed. Required families include:

- User creation/role assignment -> login/navigation/permissions/audit.
- Team membership -> roster/report/approval scope.
- Roster/shift settings -> overtime eligibility and leave impact.
- Leave/overtime approval -> dashboard, notifications, payroll inputs where applicable.
- Salary assignment -> salary claim baseline -> payslip/payment.
- Report submission -> approval queue -> notification -> detail -> PDF/export.
- Module activation/maintenance -> navigation, direct route, endpoint, and recovery.

### Layer 5: nonfunctional checks

- Responsive layouts at mobile, tablet, desktop, and wide desktop widths.
- Keyboard-only completion of critical journeys.
- Accessible names, labels, errors, dialog focus, and contrast spot checks.
- Browser compatibility for critical routes and workflows.
- Page-load and interaction timing observations using fixed fixture sizes.
- Large result sets, long text, and boundary-size attachments.
- Session expiry, retry, offline/network failure, and stale page recovery.
- Basic security headers, cookies, CSRF, upload handling, and sensitive-data exposure.

Concurrency cases require a server proven capable of overlapping requests. Before accepting a concurrency result, a diagnostic case must demonstrate two in-flight requests overlap at the application boundary. The single-process PHP development server must not be used to claim production concurrency behavior if it serializes requests. Use an isolated Laragon Apache/Nginx/PHP worker setup or another approved multi-worker local server, while retaining the same guarded database and outbound-network controls.

Performance measurements must not use Vite development mode or a debug/single-worker backend as production evidence. They are bounded observations, not load testing, unless a separate load-test scope and resource ceiling is approved.

## 10. Standard endpoint procedure

Each of the 303 backend routes is assigned one execution class:

| Class | Meaning                  | Execution rule                                                |
| ----- | ------------------------ | ------------------------------------------------------------- |
| R     | Read-only                | Exercise broadly across relevant roles                        |
| W     | Controlled write         | Use run-owned fixture and assert side effects                 |
| D     | Destructive              | Execute only after exact-target and recovery checks           |
| A     | Artifact/upload/download | Execute after storage-isolation gate                          |
| X     | External effect          | Fake/sandbox first; otherwise mark blocked                    |
| O     | Operational/internal     | Test contract or command behavior without unsafe side effects |
| N     | Not applicable/retired   | Do not invoke; document reason                                |

For every endpoint, record:

1. HTTP method, URI, name, controller, middleware, and feature owner.
2. Authentication expectation.
3. Permission and scope expectation.
4. Valid request and expected response schema/status.
5. Invalid request matrix and expected 4xx behavior.
6. Persistence and side effects.
7. Idempotency/version requirement.
8. Browser consumer or reason no browser consumer exists.
9. Evidence and final qualification state.

Unexpected 500 responses are always defects. Expected 401, 403, 404, 409, or 422 responses pass only when their body and lack of mutation are asserted.

## 11. Standard frontend route and view procedure

For each of the 97 route declarations:

1. Resolve example parameters for dynamic segments.
2. Identify intended roles and navigation entry.
3. Open by normal navigation.
4. Open directly in a fresh browser context.
5. Refresh after load.
6. Use browser back and forward where state is meaningful.
7. Verify page heading, route, module state, and active navigation.
8. Check loading, empty, populated, and recoverable-error states.
9. Exercise every primary and secondary action visible on the page.
10. Exercise table controls and mobile equivalents.
11. Check dialogs, drawers, menus, toasts, and confirmation behavior.
12. Attempt direct access as an unauthorized persona.
13. Check phone, tablet, and desktop layouts.
14. Record console/page/network errors.
15. Verify links and notifications resolve to an exact record.

Legacy redirect routes are qualified by both destination correctness and preservation of required identifiers/query parameters.

## 12. System feature matrix

The following work packages cover the full catalog and routed features. Each row requires positive, negative, browser, API, persistence, and applicable artifact evidence before qualification.

### 12.1 Platform, authentication, and account

| Feature family         | Required coverage                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Authentication/session | Login, logout, remember, invalid password, throttling, lock/disable, expiry, cookie/CSRF behavior |
| Password lifecycle     | Change/reset endpoints, validation, token invalidation, old-session handling                      |
| Onboarding             | Initial state, completion, repeat access, role-specific steps                                     |
| Profile/security       | View/edit, validation, image, contact/banking/medical field authorization, password/security tab  |
| PWA/application shell  | Install prompt, update behavior, cache isolation, offline/failed API behavior                     |

### 12.2 Administration and settings

| Module/catalog family           | Required coverage                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `settings.module_activation`    | Enable/disable, navigation, direct route/API denial, dependency/recovery behavior                                    |
| `settings.system_maintenance`   | Off/grace/on behavior, allowed administrators, blocked users, automatic restoration                                  |
| `settings.role_permissions`     | Read/edit/save, invalid combinations, immediate and next-session enforcement, audit                                  |
| `settings.dashboard_visibility` | Per-role visibility and hidden-data endpoint enforcement                                                             |
| `users`                         | List/search/filter, create/invite, view/edit, role assignment, lock/disable/delete, duplicate email, self-protection |
| `audit`                         | Filters, actor/target/detail rendering, authorization, immutable event visibility                                    |
| AI reports/knowledge            | Listing, upload/ingestion, status, access controls, retry/failure, deletion, source visibility                       |
| Feedback reports                | Submit/list/view/update lifecycle, authorization, long text and attachments if supported                             |

Global settings must be tested in their own reset-bounded batch because they can invalidate every later result.

### 12.3 Dashboard

Cover `dashboard`, `dashboard.payroll`, `dashboard.overtime`, `dashboard.leave`, `dashboard.roster`, and `dashboard.reports`:

- Role-specific cards and visibility.
- Counts reconciled against API/database fixtures.
- Empty/loading/error states.
- Date/range behavior.
- Card and notification drilldowns.
- Hidden card data not exposed through unauthorized endpoints.
- Refresh after underlying module changes.

### 12.4 Staff, teams, and roster

| Module/catalog family      | Required coverage                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `staff`, `staff.directory` | Directory, detail/profile, search/filter, authorization, state changes                         |
| `teams`, `teams.directory` | Create, view, edit, membership, lead, image, active/inactive/disband, duplicate/conflict rules |
| `roster`                   | Overview/schedule, create/edit/publish where applicable, team/date scope, conflict behavior    |
| `roster.shift_settings`    | Shift definitions, custom shifts, validation, downstream overtime behavior                     |

Cross-module assertions must prove that team and roster changes affect reporting and workforce scope correctly.

### 12.5 Leave

Cover `leave`, `leave.self_service`, `leave.management`, `leave.assignments`, `leave.holidays`, and `leave.workflow_rules`:

- Draft, create/submit, detail, edit, cancel, delete-draft.
- Entitlement calculations, pending/used balances, year boundary, half-day/time-slot behavior.
- Attachments and invalid files.
- Manager search/filter/group/pagination and bulk actions.
- Review/recommend/approve with distinct HR actors.
- Reject, request correction, applicant correction, and resubmission.
- Wrong role, direct endpoint, ownership, team scope, stale version, and concurrent action denial.
- Holiday and assignment CRUD, duplicates, overlaps, and downstream calculation.
- Dashboard, notification, deep-link, roster-impact snapshot, audit, and email/job effects.

### 12.6 Overtime

Cover `overtime`, `overtime.self_service`, `overtime.management`, `overtime.workflow_rules`, and `overtime.rate_settings`:

- Eligibility and shift-window rules.
- Draft, submit, view, edit/correct, cancel, and duplicate prevention.
- Weekday/weekend/public-holiday, overnight, and duration boundaries.
- Review/recommend/approve with Contract Manager, HR, and scoped Client Contract Manager.
- Repeat actor, wrong team/site, wrong role, stale version, and concurrent action denial.
- Rule and rate setting changes with downstream calculation assertions.
- Search/filter/group/pagination/bulk actions.
- Dashboard, notification/deep-link, audit, email/job, and payroll linkage.

### 12.7 Payroll and salary

Cover `payroll`, `payroll.self_service`, `payroll.claims`, `payroll.payslips`, `payroll.salary_claims_management`, `payroll.salary_settings`, `payroll.salary_assignments`, `payroll.workflow_rules`, `payroll.company_profile`, `payroll.statutory_rates`, and `payroll.payment_actions`:

- Expense and salary claim draft/create/submit/view/edit rules.
- Salary baseline, additions, deductions, overtime payout, statutory calculations, totals, rounding, and snapshots.
- Salary assignment create/edit/view/delete/history and duplicate-period constraints.
- Admin check -> Finance review -> Contract Manager approval -> Finance payment.
- Reject/correction if supported, wrong stage/role, distinct actor, stale version, and concurrency.
- Salary Records versus Claim Records routing and filtering.
- Single and bulk payment, payment date/reference/note, double-payment prevention, unmark behavior and authorization.
- Payslip visibility, PDF/content, payment status, and employee isolation.
- Company profile, statutory rates, overtime rates, and workflow rules with downstream recalculation.
- Dashboard, notifications, exact deep links, audit, email/job, and export effects.

### 12.8 Reports and inspections

Cover `reports`, `reports.inspection`, `reports.erco`, `reports.drill`, `reports.fitness_test`, `reports.pdf_exports`, and every inspection subtype currently implemented:

- General Inspection.
- ER Auxiliary.
- Fire Extinguisher.
- Fire Truck Daily Readiness.
- High Angle Rescue.
- Hydraulic Rescue Tools.
- SCBA.
- HSE and any additional catalog-driven inspection type discovered at runtime.
- ERCO, Drill, Fitness Test, and dynamic report types.

For every applicable form/type:

- Start, draft/autosave, resume, validation, section navigation, review, submit, detail, edit, and delete rules.
- Location/equipment/catalog selection and inactive/deleted catalog behavior.
- Checklist rows, findings/issues, evidence, photos/media, continuation, session progress, and duty confirmation.
- Same-team review, final approval, rejection/correction if supported, wrong-team/role, stale version, and concurrent action.
- Record scope, search/filter/sort/pagination and management queues.
- Notification/deep-link, audit timeline, PDF/download filename/content, media integrity, and orphan cleanup.
- Mobile camera/file interaction through safe fixtures where physical hardware is unavailable.

### 12.9 Communication and shared workflow infrastructure

Cover `messages`, `workflow_notifications`, and `workflow_attachments`:

- Thread list, create/send, participants, unread/read, hide/delete behavior, long messages, empty state.
- Attachment validation, upload, download, authorization, integrity, missing file, and removal.
- Workflow notification creation, recipient scope, count, drawer/list, read/dismiss, reload persistence, and exact record/action deep link.
- Duplicate notification suppression and job/email delivery records.
- Cross-user isolation and direct endpoint denial.

### 12.10 Operational and routed features outside the catalog

- Reporting workflow settings and aliases.
- Inspection workflow settings and legacy report aliases.
- AI helper conversations, sources, ingestion jobs, failures, reports, and access controls.
- Feedback reporting.
- Migration/status endpoint classification.
- Legacy redirects for leave, overtime, salary claims, reporting, roster, and notifications.
- Application install/update/offline behavior.
- Console commands and scheduled tasks that affect user-visible state.

## 13. Exploratory user-perspective checklist

Beyond scripted cases, each primary page receives a bounded exploratory session asking:

- Can a new user understand the next action without repository knowledge?
- Is the terminology consistent between navigation, heading, table, dialog, notification, and PDF?
- Are disabled actions explained?
- Does an error explain what the user can do next?
- Can cancel/close accidentally lose work?
- Are destructive actions clearly scoped and confirmed?
- Do search/filter states visibly explain why a record disappeared?
- Are IDs, dates, currencies, durations, teams, and statuses formatted consistently?
- Does a successful toast match the state actually persisted?
- Does a notification take the user directly to the correct record and permitted action?
- Do responsive layouts preserve every function rather than merely hide controls?
- Are empty states useful and accurate?

Exploratory findings must still receive reproducible steps before a code fix is made.

## 14. Execution phases and gates

### Phase 0: freeze, safety, and inventory

Actions:

1. Record both Git heads and dirty worktrees.
2. Regenerate frontend, backend, module, navigation, job, command, and artifact inventories.
3. Create the master ledger and stable IDs.
4. Strengthen and test the environment guard for exact database, host, and database-role allowlists, including deliberate refusal cases.
5. Replace the broad PostgreSQL account with an E2E-only least-privilege role.
6. Implement and verify isolated storage, public upload, log, download, session, cookie, cache, and queue paths/namespaces.
7. Implement and test the exclusive run lock and crash-recovery procedure.
8. Sanitize inherited environment variables and enforce loopback/test-sink outbound network allowlists.
9. Verify every reachable job's mail, HTTP, AI, and storage effects under both synchronous and configured queue modes.
10. Verify frontend dev and E2E build modes compile/use only the approved test origins.
11. Establish a concurrency-capable isolated backend and prove request overlap before concurrency cases.
12. Validate personas, break-glass administrator, teams, sites, catalogs, dates, and year-boundary fixtures.
13. Define run-owned process, evidence-retention, and teardown records.

Exit gate:

- Every discovered item is represented in the ledger.
- Mutable effects are isolated and recoverable.
- No unresolved safety blocker remains.
- Deliberate guard/refusal tests prove that wrong database, host, role, storage path, origin, and lock ownership cannot proceed.

### Phase 1: baseline build and automated regression

Actions:

- Dependency/configuration inspection.
- Backend full test suite.
- Frontend full unit/component suite.
- Production frontend build.
- Lint and formatting checks.
- Existing Playwright smoke suites against a fresh guarded reset.

Failures are triaged before exploratory testing. A broken baseline is not allowed to contaminate later conclusions. Authentication, authorization, routing, migrations, database isolation, build configuration, or shared test-infrastructure failures block every dependent phase. Only a demonstrably unrelated, pre-existing failure may be quarantined, with its affected inventory marked `blocked` or `partial` rather than counted as passed.

Exit gate:

- Baseline failures are fixed, or an explicitly documented unrelated failure is quarantined with its affected scope excluded from qualification; all dependency-blocking failures stop progression.

### Phase 2: authentication, authorization, and route/endpoint sweep

Actions:

- Authentication/session/password/onboarding cases.
- API allow/deny matrix across every route family.
- Browser route sweep for intended roles and representative denied roles.
- Direct URL and direct endpoint checks.
- Module-disabled and maintenance-mode behavior in reset-bounded sub-batches.

Exit gate:

- No unexplained 401/403/404/422/500.
- No unauthorized data exposure or mutation.
- Every route and endpoint has an execution classification and result.

### Phase 3: administration, settings, users, staff, teams, and roster

Run order:

1. Profile/security.
2. Staff directory/profile.
3. User administration.
4. Teams and membership.
5. Roster and shifts.
6. Audit/feedback.
7. Global settings in isolated reset-bounded batches.

Global permission, module, and maintenance tests run last in this phase, maintain a verified break-glass path throughout, restore state in teardown even after a failed assertion, and are followed by a complete reset.

Exit gate:

- CRUD, permission, scope, audit, navigation, and downstream consumers pass for each family.

### Phase 4: leave, overtime, payroll, and dashboards

Run order preserves prerequisites:

1. Leave entitlements, holidays, and rules.
2. Leave self-service and management workflows.
3. Shift/overtime/rate rules.
4. Overtime self-service and management workflows.
5. Salary/company/statutory settings and assignments.
6. Expense/salary claims, approvals, payments, and payslips.
7. Dashboard reconciliation and drilldowns.

Exit gate:

- Happy, negative, correction, cancellation, concurrency, notification, and artifact cases pass or are explicitly recorded as gaps.

### Phase 5: reports and inspections

Run each report/inspection type as its own fixture-bounded package, followed by common workflow, notification, media, PDF, and concurrency matrices.

Exit gate:

- Every discovered type has lifecycle evidence.
- Catalog/equipment/session/media/PDF side effects reconcile.
- No type is inferred covered from another type's form.

### Phase 6: communication, AI, integrations, and PWA

Actions:

- Messages and attachments.
- Workflow notifications and exact deep links.
- AI helper and knowledge lifecycle using controlled provider behavior.
- Feedback lifecycle.
- Email/job/digest behavior.
- Install, update, cache, offline, and recovery behavior.

Exit gate:

- External effects remain contained.
- Async outcomes are observable and attributable to the run.

### Phase 7: resilience, accessibility, responsive, compatibility, and performance

Actions:

- Session expiry, offline/slow/failing API, refresh/retry, stale version, double click, and concurrent users.
- Keyboard and dialog-focus checks.
- Mobile/tablet/desktop/wide layouts.
- Chrome primary plus selected Firefox/WebKit critical journeys.
- Fixed-fixture timing and large-data observations.

Exit gate:

- No release-blocking recovery, accessibility, responsive, or compatibility defect remains.
- Performance observations include fixture size and environment context.

### Phase 8: defect retest and qualification

Actions:

1. Reset to a clean environment.
2. Reproduce each fixed defect using its original steps.
3. Run the added regression test.
4. Run adjacent module tests.
5. Run relevant cross-module journeys.
6. Run full backend/frontend suites after shared logic, auth, permissions, persistence, configuration, or API changes.
7. Re-run release-critical browser journeys.
8. Reconcile final inventory and evidence.

Exit gate:

- No blocker or critical defect remains open.
- High defects are fixed or explicitly accepted by the user with impact recorded.
- Every inventory item has a final state and evidence/reason.

## 15. Defect handling and immediate-fix protocol

Every unexpected result follows this sequence:

1. **Preserve:** capture route, role, input, screenshot, trace, console/network output, response, and run ID.
2. **Reproduce:** repeat from a known fixture state without changing code.
3. **Localize:** determine frontend, backend, data, configuration, test harness, or environment ownership.
4. **Assess:** assign severity and blast radius.
5. **Fix:** make the smallest maintainable production or harness change that addresses the root cause.
6. **Protect:** add a regression test at the lowest useful layer and a browser case when user interaction caused the defect.
7. **Reset:** restore deterministic state if the failed attempt may have mutated shared fixtures.
8. **Retest:** repeat exact reproduction, targeted tests, and adjacent paths.
9. **Broaden proportionally:** run full suites for shared authorization, workflow, persistence, configuration, or routing changes.
10. **Document:** update ledger, defect record, evidence, and final status.

The audit must not weaken assertions, suppress console errors, increase timeouts without cause, or mock the failing business action merely to obtain a green run.

### 15.1 Change discipline

- Preserve unrelated user changes in dirty worktrees.
- Review diffs before and after every fix.
- Avoid broad refactors unless required to resolve a systemic defect.
- Do not update dependencies unless the defect requires it and compatibility is verified.
- Do not commit, push, open pull requests, or contact external systems unless separately requested.
- Record production-code fixes separately from test-harness and documentation fixes.
- Roll back only audit-owned hunks with a targeted patch. Never use `git reset --hard`, broad checkout/revert, or deletion to recover from a failed fix.

### 15.2 Fix authority boundary

The instruction to fix defects immediately does not authorize an ambiguous business-policy decision or an unrelated destructive change.

The audit may fix immediately:

- Reproducible implementation defects whose intended behavior is established by permissions, validation rules, API contracts, existing UI copy, or tests.
- Test-harness, fixture, selector, isolation, and synchronization weaknesses.
- Localized accessibility, error handling, routing, persistence, and security defects with a clear safe outcome.

The audit pauses for user direction before:

- Changing approval ownership, financial formulas, entitlement policy, retention policy, or other ambiguous business rules.
- Adding a production data migration/backfill whose effect extends beyond test fixtures.
- Making a breaking API/schema change or changing an external integration contract.
- Introducing or substantially upgrading a dependency.
- Deleting or rewriting user-owned data/files.
- Expanding scope to production, shared infrastructure, real recipients, paid AI services, or third-party accounts.
- Choosing between multiple materially different product behaviors with no repository source of truth.

While awaiting direction, the item is recorded as blocked; unrelated safe batches may continue only if the blocker cannot contaminate their results.

## 16. Severity and release impact

| Severity | Definition                                                                                                   | Execution response                        |
| -------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Blocker  | Environment unsafe, system unavailable, data corruption, or core audit cannot continue                       | Stop affected execution immediately       |
| Critical | Authentication/authorization bypass, sensitive exposure, destructive corruption, core business path unusable | Fix immediately; full affected regression |
| High     | Major feature broken, wrong financial/workflow outcome, unrecoverable user state                             | Fix before qualification                  |
| Medium   | Important function impaired with workaround, misleading state, significant UX/accessibility problem          | Fix during owning batch when safe         |
| Low      | Cosmetic, copy, minor layout, or low-impact inconsistency                                                    | Fix proportionally or record backlog      |

Security and data-integrity severity is based on impact, not how difficult the defect is to reproduce.

## 17. Evidence standards

For a passing browser case, retain:

- Case ID, run ID, role, route, fixture ID, and timestamp.
- Expected and actual result.
- Relevant response status and persisted-state assertion.
- Screenshot for key terminal states when useful.

For a failure, additionally retain:

- Screenshot at failure.
- Playwright trace and, when helpful, video.
- Console and page errors.
- Failed request/response body with secrets redacted.
- Exact reproduction steps.
- Database identifiers or queries sufficient to confirm state without exporting sensitive data.

Artifact cases retain the generated file, MIME type, size, safe filename, integrity/hash where relevant, and semantic content checks. Visual inspection supplements but does not replace content assertions.

Evidence retention rules:

- Store raw traces, videos, logs, downloads, database extracts, and screenshots outside both repository roots and outside the Vite watched tree.
- Add/verify ignore rules before any tool could write evidence beneath a repository.
- Use synthetic data only; redact secrets and sensitive fields before copying excerpts into documentation.
- Record the evidence root's resolved absolute path and verify it is run-owned before cleanup.
- Retain raw failure evidence only until the defect is resolved and the sanitized report is produced, unless the user requests longer retention.
- Never recursively clean an evidence parent directory. Remove only the validated run-ID directory.
- If safe redaction of an artifact is not practical, record its hash/location locally and do not publish or commit it.

## 18. Verification commands and process controls

Representative commands are listed for repeatability; the execution ledger must record the exact commands actually run. They are not safe to run merely by copying this section. Phase 0 must first provide a checked runner/wrapper that sanitizes inherited variables, acquires the run lock, verifies resolved configuration, and refuses an unapproved target.

Backend safety/reset:

```powershell
php artisan e2e:reset --env=testing
php artisan test --env=testing
php artisan route:list --env=testing --json
```

The reset command runs only while application servers/workers are stopped and only after the strengthened exact host/database/role guard passes.

Backend server:

```powershell
# These values are illustrative; the checked runner supplies the full sanitized environment.
$env:APP_ENV='testing'
$env:APP_URL='http://127.0.0.1:8000'
$env:APP_FRONTEND_URL='http://127.0.0.1:3000'
$env:DB_HOST='127.0.0.1'
$env:DB_DATABASE='vmecc_test'
$env:MAIL_MAILER='array'
$env:AI_HELPER_ENABLED='false'
$env:OPENAI_API_KEY=''
php artisan serve --env=testing --host=127.0.0.1 --port=8000
```

The runner must additionally set the dedicated database role, isolated persistent session driver/path and cookie name, storage roots, cache/log/queue namespaces, and any integration deny flags created in Phase 0. Do not substitute the current shared file-session directory. Environment variables are applied only to audit-owned child processes (or a disposable runner shell) and are restored afterward; the audit must not leave a user's long-lived terminal contaminated with test settings.

Frontend checks and server:

```powershell
$env:VITE_API_URL='http://127.0.0.1:8000/api'
$env:VMECC_E2E_API_URL='http://127.0.0.1:8000/api'
$env:VMECC_E2E_BROWSER_API_URL='http://127.0.0.1:8000/api'
$env:VMECC_E2E_BASE_URL='http://127.0.0.1:3000'
npm run lint
npx vitest run
npm run build
npm run test:e2e:coverage-contract
npm start -- --host 127.0.0.1 --port 3000
```

`npm run build` is a compile check. Browser qualification of built assets requires a dedicated E2E build mode with the approved loopback API compiled in, a bundle-origin scan, and a separately owned preview process. It must not reuse an ordinary production build that may contain a production API URL.

Diagnostic runs may use `APP_DEBUG=true`, but release/security qualification must repeat applicable error-path and browser cases with `APP_DEBUG=false` so stack traces, SQL, paths, and secrets are not exposed to clients. Required browser engines are inventoried before execution; installing or upgrading browsers or dependencies is a separately recorded repository/tooling change, not an automatic side effect of a test batch.

Visible controlled browser example:

```powershell
npx playwright test <spec> --config=playwright.config.mjs --workers=1 --headed
```

Process rules:

- Record the PID/session for every server started by the audit.
- Do not terminate an unknown process occupying a port.
- Use one backend environment for the entire batch.
- Hold the exclusive run lock for every mutable server/test process.
- Never reset the schema while a server, worker, scheduler, or browser test is connected.
- Run the backend suite, schema reset, queue workers, schedulers, and browser E2E as explicitly exclusive process classes unless the batch design proves they use separate databases and storage roots; `php artisan test` must never race an E2E server on the same test database.
- Do not use broad `cache:clear`, Redis flush, queue purge, or storage-clean commands against a shared service. Clear only the recorded run namespace or replace the service with an isolated instance.
- Stop owned servers at the end of the batch.
- Verify ports 3000 and 8000 are no longer listening after teardown.
- If a planned port is occupied by an unknown process, do not kill it; choose a new recorded port and update every origin/CORS/cookie setting consistently, or stop and request direction.

## 19. Batch entry and exit checklist

### Before each batch

- [ ] Batch scope and mutation list are defined.
- [ ] Git heads/status recorded.
- [ ] Environment and database resolved and safe.
- [ ] External effects disabled or sandboxed.
- [ ] Storage/download/session isolation confirmed.
- [ ] Canonical origins, artifact quota, and free disk space confirmed.
- [ ] Fresh reset completed when required.
- [ ] Persona and prerequisite fixtures verified.
- [ ] Primary and break-glass administrator recovery verified.
- [ ] Ports and owned processes recorded.
- [ ] Evidence directory and run ID created.
- [ ] Existing baseline failures known.

### After each batch

- [ ] All cases have results and evidence/reasons.
- [ ] Unexpected mutations reconciled.
- [ ] Defects reproduced and classified.
- [ ] Fixes have regression tests and retest evidence.
- [ ] Global settings restored or database reset.
- [ ] Test files/downloads cleaned only from the isolated target.
- [ ] Cleanup target canonicalized and checked for symlink/junction escape.
- [ ] Browser contexts and owned servers closed.
- [ ] Ports verified clear.
- [ ] Git diff reviewed for accidental or unrelated edits.
- [ ] Coverage ledger and checkpoint summary updated.

## 20. Coverage qualification rules

A feature may be marked `qualified` only when:

- All discovered routes/endpoints/actions in its declared scope are classified.
- Intended roles pass and representative forbidden roles are denied server-side.
- Positive and applicable negative cases pass.
- UI business actions are performed through the UI in browser cases.
- Persistence and important downstream side effects are verified.
- Applicable notifications, deep links, attachments, and artifacts pass.
- Applicable stale/concurrency and retry behavior passes.
- No blocker, critical, or unaccepted high defect remains.
- Evidence paths and execution date are recorded.

A parent module cannot be marked qualified merely because its child routes are mapped, and a child cannot inherit qualification from a similar module.

## 21. Final deliverables

The execution must produce:

1. Versioned frontend-route inventory.
2. Versioned backend-route inventory.
3. Module, feature, view, job, command, and artifact inventory.
4. Machine-readable master coverage ledger.
5. Persona, team, site, catalog, and fixture manifest.
6. Batch execution logs.
7. Severity-ranked defect register.
8. Screenshots, traces, logs, and generated-artifact evidence.
9. Production fixes and regression tests.
10. Route/endpoint orphan and legacy-alias report.
11. Final qualification summary by module and feature family.
12. Explicit residual-risk and blocked-item register.
13. Reproduction commands and environment description.
14. Final cleanup state. The default is a guarded reset; any intentionally retained database must cite the user's request, owner, reason, and cleanup expiry.

## 22. Final release-readiness criteria

The system-wide audit may recommend release only when:

- Environment safety controls passed throughout execution.
- 100% of discovered inventory items have a final classification.
- All release-critical routes and endpoints are qualified.
- All required personas can complete their critical journeys.
- Direct route and endpoint authorization is enforced.
- No blocker or critical defect remains.
- No unaccepted high-severity defect remains.
- Full backend and frontend regression suites pass on the final code.
- Production build passes.
- Critical browser journeys pass from a fresh guarded reset.
- Notifications, deep links, attachments, downloads, PDFs, and payment artifacts pass where applicable.
- Global settings and test services are restored/closed.
- The final report distinguishes qualified, partial, blocked, and non-applicable coverage without inflating percentages.

If these criteria are not met, the correct outcome is "regression status plus explicit residual risk," not "system-wide testing complete."

## 23. Planned execution order

The execution should begin only after this plan is accepted. The recommended order is:

1. Build inventory generators and the master ledger.
2. Close storage/session/external-effect isolation gaps.
3. Validate and expand deterministic fixtures.
4. Establish the clean automated baseline.
5. Run authentication and system-wide RBAC/route/endpoint sweeps.
6. Run administration, users, staff, teams, roster, and settings batches.
7. Run leave, overtime, payroll, and dashboard batches.
8. Run every reporting and inspection subtype.
9. Run messages, notifications, AI, feedback, jobs, artifacts, and PWA batches.
10. Run resilience, concurrency, responsive, accessibility, compatibility, and performance passes.
11. Retest every defect and run final regressions.
12. Reconcile the entire inventory and publish the qualification report.

This sequence intentionally delays globally disruptive settings and unsafe artifact work until their isolation controls are proven, and it repeats clean resets whenever one batch could invalidate the next.
