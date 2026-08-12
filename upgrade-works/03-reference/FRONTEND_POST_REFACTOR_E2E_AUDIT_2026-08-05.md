# Frontend Post-Refactor E2E Audit

**Date:** 2026-08-05  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Audited revision:** `f19bca8`  
**Upgrade comparison start:** `3bfb03b^`  
**Component-refactor comparison start:** `a195e9f`  
**Decision:** No application regression confirmed in the tested scope; test-harness hardening remains open

## 1. Audit Objective

Re-audit the frontend upgrade from its first implementation day, identify accidental behavior changes introduced by the correctness and component-reuse work, and exercise representative desktop, tablet, mobile, authenticated, offline, navigation, recovery, and error-boundary journeys with Playwright.

This is a local compatibility decision, not a cPanel staging or production release approval.

## 2. Safety Boundary

- The unrelated application already listening on port `3000` was not stopped or reused.
- The normal frontend production API configuration was not changed.
- The normal `vmecc` database was never made available to the test processes.
- Laragon's existing PostgreSQL data directory failed startup with an invalid checkpoint. No reset, WAL repair, or other destructive recovery command was run against it.
- Authenticated tests used a disposable PostgreSQL cluster bound only to `127.0.0.1:5432`.
- The disposable cluster contained only `vmecc_test`, owned by `vmecc_e2e`. That role had `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, and `NOBYPASSRLS`.
- Backend preflight verified the exclusive run lock, loopback origins, testing environment, array mailer, synchronous queue, disabled debug mode, and run-owned mutable directories.
- The smoke suite's permitted profile-name mutation was restored in `finally`; deterministic fixtures passed verification again after the suite.
- Audit listeners, the disposable database cluster, raw browser artifacts, temporary logs, and generated build changes were removed after execution.

## 3. Upgrade Boundary Review

The cumulative `3bfb03b^..f19bca8` review covered:

- Node/runtime and lint policy
- production API and header hardening
- message-draft, maintenance, payroll, leave, overtime, inspection, login, and report-workflow correctness repairs
- canonical `ActionConfirmModal`
- `ResponsiveRecordCollection` migrations in Holidays, Overtime, and Custom Shifts
- `MobileModuleBackAction`
- `RoleAssignmentAddButton`
- ERCO's feature-local `ErcoResponsiveActionModal`
- generic mobile-drawer style ownership
- removal of `AppBreadcrumb`, `DocsLink`, and `PwaInstallBanner`
- long mobile-record containment and standard empty-state reuse

`git diff --check` passed. Searches found no remaining source, test, or style references to the three removed components. The upgrade-changed application/configuration files passed Prettier.

## 4. Non-Browser Regression Evidence

| Gate                                        | Result                                             |
| ------------------------------------------- | -------------------------------------------------- |
| Full ESLint                                 | Passed; zero reported errors or warnings           |
| Refactor-focused Vitest                     | Passed; 15 files / 87 tests                        |
| Complete Vitest                             | Passed; 323 files / 1,776 tests in 395.43 seconds  |
| Production build                            | Passed; 6,493 modules transformed                  |
| Production configuration audit              | Passed                                             |
| React Router exception audit                | Passed; exception remains valid through 2026-09-03 |
| Text contrast audit                         | Passed                                             |
| Typography audit                            | Passed                                             |
| E2E inventory contract                      | Passed; 50/50 modules mapped                       |
| Hard-coded Staff audit                      | Passed                                             |
| Payroll hook-order static/runtime contracts | Passed                                             |
| Upgrade-changed file formatting             | Passed                                             |

Three non-failing JSDOM pseudo-element `getComputedStyle()` notices remain unchanged. The build retains the documented mixed static/dynamic notification import and large-chunk warnings.

A repository-wide Prettier check also reported 17 legacy/archive/document/visual-fixture files outside the upgrade-changed application boundary. They were not auto-formatted during this audit.

## 5. Playwright Evidence

### 5.1 Clean passes

| Suite                                          |       Result | Coverage                                                                                                        |
| ---------------------------------------------- | -----------: | --------------------------------------------------------------------------------------------------------------- |
| `uiux-post-p1-polish.spec.js`                  |   4/4 passed | Authenticated mobile Leave Management, applicant Leave route, desktop Payroll Configuration, Messages semantics |
| `smoke.spec.js`                                |   2/2 passed | CSRF rejection and restoration; all 98 registered routes on a 390 x 844 viewport                                |
| `dashboard-ui-visual.spec.js`                  |   1/1 passed | Desktop/mobile composition, notification drawer, confirmation interaction, overflow and touch presentation      |
| Passing `drill-upgrade-ui-smoke.spec.js` cases | 11/12 passed | 320/360/390/430 mobile, landscape, desktop, long chronology, maximum photos, file-picker return, setup flow     |
| `typography-system.spec.js`                    |   1/1 passed | Bundled Manrope font, service-worker cache, offline retrieval, mobile font size                                 |
| Passing inspection visual/accessibility cases  |   3/5 passed | Representative touch devices, enlarged/long content, keyboard order and named controls                          |

Across the unique Playwright cases selected for this audit, 22 passed cleanly. Four additional cases did not produce clean automated passes, but none established an application regression.

### 5.2 Failure attribution

#### Medium - PWA update test is navigation-racy

`pwa-update.spec.js` failed twice at the same poll with `Execution context was destroyed` while the service worker performed the expected navigation from build A to build B. The preceding assertion had already observed build B's `version.json`; later cache-preservation assertions did not complete.

Disposition: test-harness defect / qualification gap. The PWA update behavior is not marked failed, but the A-to-B cache-preservation journey is not fully qualified by this run. The poll should tolerate page navigation or wait for the reload before evaluating cache state.

#### Medium - Three stale visual E2E selectors

1. The Drill custom-category test used a non-exact accessible-name locator that matched both `Exercise Categories (optional)` and `Exercise Categories`. The failure snapshot confirmed that `Medical Response` persisted after reload.
2. The extinguisher catalogue test expected `data-testid="inspection-all-extinguishers"`, which no longer exists in production source. The snapshot showed the current Inspection home and its supported type/record controls.
3. The Inspection matrix test searched legacy `.inspection-form-actions .btn` selectors after the July workflow-action refactor. The snapshot showed a named `Continue to Review` action, but the stale selector returned zero elements.

Git history places these selector assumptions at the 2026-07-30 inspection/workflow checkpoint, before the August component-reuse refactor. They are not attributed to the audited refactor, but they reduce confidence in the affected E2E suites until corrected.

#### Medium - Mocked suites can couple to the wrong API origin

Several mocked E2E suites intercept hard-coded `localhost:8000` patterns while a normal production build contains the hosted HTTPS API. The audit prevented external requests by rebuilding a disposable development-mode bundle with a loopback API before running those suites.

Disposition: test-safety gap. Mocked suites should fail closed under the same `VMECC_SYSTEM_QA` loopback-origin policy, and route stubs should derive their origin from `VMECC_E2E_API_URL` or match only the intended loopback request space.

### 5.3 Environment finding

Laragon's existing PostgreSQL cluster cannot currently start because recovery reports an invalid checkpoint record. This is not evidence of a frontend regression, but it will block normal local development and authenticated testing until the database owner chooses a recovery or restore approach. The disposable cluster demonstrated that the application migrations, fixtures, guarded backend, authentication, and E2E flows work on a clean PostgreSQL instance.

## 6. Refactor Compatibility Assessment

No route, permission, validation, calculation, status transition, callback, or persisted-data regression was confirmed.

The strongest evidence is the combination of:

- 1,776 passing unit/component tests
- focused contract tests for each extracted component family
- a successful production build and static audits
- four authenticated real-user journeys
- CSRF mutation/restoration checks
- a real-backend traversal of all 98 registered routes
- mocked desktop/mobile interaction coverage
- offline font/service-worker coverage
- post-run fixture verification

This supports confidence that the August correctness and reuse work preserved application functionality within the executed scope. It does not prove production cPanel headers, deployed API connectivity, real-device camera behavior, or the currently racy PWA A-to-B cache-preservation assertion.

## 7. Recommended Next Work

Use a small test-hardening batch rather than another application refactor:

1. make the PWA update poll navigation-tolerant and rerun it until all cache assertions complete
2. replace the three stale Drill/Inspection locators with current semantic contracts
3. make every mocked E2E suite fail closed to loopback origins and derive stubs from the configured API URL
4. decide how to recover or replace the damaged Laragon PostgreSQL data directory; do not run destructive repair without a backup and explicit database-owner approval
5. keep bundle/chunk optimization separate and measurement-led for shared cPanel hosting

No frontend application-code correction is recommended from this audit's evidence.
