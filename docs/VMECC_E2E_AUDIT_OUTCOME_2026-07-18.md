# VMECC end-to-end workflow audit outcome

Date: 18 July 2026  
Scope: `vmecc-frontend` and `vmecc-backend`  
Environment: local isolated `testing` environment using PostgreSQL database `vmecc_test`

## Result

The regression baseline is green, and the four highest-risk approval chains now perform every manager approval/payment transition through the real UI in a separate browser context for each actor. All 50 backend `ModuleCatalog` keys are inventory-mapped, the role/API and UI route matrices passed, and both full backend and frontend regression suites passed after repairs.

This is **not** a claim that the full plan is qualified. The qualification-aware manifest currently reports `mapped=45`, `partial=5`, `qualified=0`, `blocked=0`. Record creation for the four core workflow tests remains deterministic API setup, and several planned browser branches, notification deep links, artifact checks, concurrency journeys, and secondary module CRUD journeys remain split across API, backend, component, and browser tests. Those residual gaps are documented below instead of being reported as complete.

No unresolved production-code workflow, authorization, or persistence defect was reproduced in the final runs. The audit did find and repair fixture, test-isolation, browser-synchronization, route-model, test-environment, pagination, credential-drift, and date-rot weaknesses.

## Approval workflows exercised

| Workflow     | Actors and transitions                                                                                                                         | Negative/security coverage                                         | Result                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| Inspection   | TRT-authenticated API setup -> same-team AIC **UI review** -> IC **UI approve**                                                                | Other-team AIC review denied                                       | Passed; partial plan qualification |
| Leave        | Applicant-authenticated API setup -> primary HR **UI review** -> secondary HR **UI recommend** -> tertiary HR **UI approve**                   | Finance review denied; declaration and version contracts exercised | Passed; partial plan qualification |
| Overtime     | TRT-authenticated API setup -> Contract Manager **UI review** -> HR **UI recommend** -> scoped Client CM **UI approve**                        | Repeat actor denied; final approver team scope enforced            | Passed; partial plan qualification |
| Payroll      | Employee-authenticated API setup -> Admin **UI check** -> Finance **UI review** -> Contract Manager **UI approve** -> Finance **UI mark paid** | Versioned stage ownership and payment permission                   | Passed; partial plan qualification |
| ERCO         | Submit -> browser review -> browser approve                                                                                                    | Unrelated actor and rejection branch                               | Passed                             |
| Drill        | Submit -> browser review -> browser approve                                                                                                    | Unrelated actor and rejection branch                               | Passed                             |
| Fitness Test | Submit -> browser review -> browser approve                                                                                                    | Unrelated actor and rejection branch                               | Passed                             |

Leave and overtime correction/resubmission journeys also passed from the management action back to applicant editing.

## System-module coverage

`tests/e2e/module-coverage.manifest.json` maps all 50 current catalog keys to an executable route/spec and assigns each a `critical`, `standard`, or `contract` tier. Its schema now carries the plan's effective qualification fields: module/route/API families, owner, risk, positive/negative/workflow/artifact case IDs, execution tier, automation status, and last-qualified date. `scripts/audit-e2e-module-coverage.mjs` fails if the manifest and backend `ModuleCatalog` differ, contain duplicates, omit routes/specs, reference a missing spec, use an invalid tier/status, or falsely mark a module qualified without an owner, positive case, negative case, and date.

The contract's success message deliberately says **inventory contract**, not test coverage complete. Current status is 45 mapped modules, five partially automated high-risk workflow modules, and zero fully qualified modules.

The coverage layers used for the modules were:

- Authentication and session verification for the ten baseline role personas plus five cross-team/distinct-actor personas.
- API allow/deny checks across representative endpoint families for System Administrator, Contract Manager, Human Resource, Finance, Admin, Incident Commander, Assistant Incident Commander, Tactical Response Team, Client Contract Manager, and Representative.
- Real browser route sweeps for every persona route, failing on navigation errors, console errors, page exceptions, unexpected API 401/403 responses, and server 5xx responses.
- Full frontend unit/component/hook/route coverage.
- Full backend unit/feature/audit coverage, including modules not suited to destructive browser tests: users, teams, roster, settings, dashboard sections, messages, profile, audit, module activation, maintenance, AI helper, attachments, notifications, leave assignments/holidays, payroll settings/payslips, and inspection catalogs/issues/sessions.
- Dedicated inspection matrix for all eight implemented inspection forms: General, ER Auxiliary, Fire Extinguisher, Fire Truck Daily Readiness, High Angle Rescue, Hydraulic Rescue Tools, SCBA, and HSE.

## Final test evidence

| Test layer                                           | Final outcome                                                                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Backend full suite: `php artisan test --env=testing` | 779 passed, 6,437 assertions, 1 intentionally gated visual audit skipped                                    |
| Frontend full suite: `npx vitest run`                | 252 files passed, 1,447 tests passed                                                                        |
| Catalog inventory/qualification contract             | 50/50 modules mapped; mapped 45, partial 5, qualified 0, blocked 0                                          |
| Multi-role approval E2E                              | 4/4 passed from a fresh guarded reset in 5.5 minutes; all manager transitions used UI and isolated contexts |
| Full RBAC API matrix                                 | Passed                                                                                                      |
| Full browser UI route sweep                          | Passed in 4.1 minutes                                                                                       |
| Workflow notification badge/read/reload              | Passed                                                                                                      |
| ERCO/Drill/Fitness browser workflows                 | 3/3 passed                                                                                                  |
| Leave/overtime correction journeys                   | 2/2 passed                                                                                                  |
| Inspection CRUD/PDF/workflow matrix                  | 4/4 groups passed in 4.1 minutes                                                                            |

The skipped backend visual-PDF audit is opt-in artifact generation (`INSPECTION_PDF_VISUAL_AUDIT=1`), not a functional test failure. Actual PDF generation and download were covered by the backend suite and inspection browser matrix.

## Repairs made during the audit

1. Added `E2eEnvironmentGuard` and the guarded `e2e:reset` command. A reset is refused unless the runtime environment is `testing`/`e2e` and the actual database name ends in `_test`/`_e2e`.
2. Added the deterministic `E2eScenarioSeeder`, including secondary/tertiary HR actors, cross-team AIC/TRT actors, and a Client Contract Manager whose client-site assignment intersects Smoke Site Alpha.
3. Seeded explicit leave, overtime, and salary workflow settings so workflow tests do not depend on developer database state.
4. Added current and next-year leave entitlement coverage so relative-date leave tests remain valid across a calendar-year boundary.
5. Replaced retired `codex.smoke.admin` defaults in 13 older Playwright files with the canonical seeded SysAdmin fixture and shared password.
6. Fixed the notification smoke race by waiting for the badge count on the Notifications control with the route timeout before testing read/reload persistence.
7. Fixed the leave correction smoke's five-row pagination assumption by selecting `Rows per page: All` before asserting the corrected record.
8. Added missing jsdom environment declarations to `ReportPhotoGallery.test.jsx` and `utils.viewport.test.js`; both had been running browser-only assertions in Node.
9. Replaced fixed 2026 workflow dates with relative weekdays/months to prevent overtime-window, leave-year, and payroll-period test rot.
10. Added a reusable multi-role authentication/persona layer, a four-workflow Playwright suite, and the catalog coverage contract command.
11. Reworked the four-workflow suite so each actor gets a new browser context and all manager transitions are triggered through searchable tables, row actions, confirmation dialogs, and real UI network requests.
12. Replaced the ambiguous `50/50 coverage passed` contract with a qualification-aware schema and explicit mapped/partial/qualified counts.
13. Corrected payroll automation and manifest routing: salary approvals and payment belong to `/staff/salary-claims/salary`; `/staff/salary-claims/claims` lists expense claims.
14. Added bounded per-workflow timeouts and stable visible-input/display-ID selectors; this removed default-timeout, responsive duplicate-input, and internal numeric-ID assumptions.

## Plan conformance and residual work

| Plan phase                             | Status  | Evidence and remaining gap                                                                                                                                                                     |
| -------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0: harness and coverage contract | Partial | Guarded isolated reset, deterministic actors, catalog inventory, and executable-spec validation pass. Storage isolation/cleanup evidence and a fully owned per-module fixture matrix remain.   |
| Phase 1: core happy paths              | Partial | Four core chains pass with independent UI approver sessions. Applicant create/submit is API setup, so the plan's single continuous UI journey exit criterion is not yet met.                   |
| Phase 2: branch depth                  | Partial | Wrong-role/team and repeat-actor denials plus backend stale/version tests pass; browser rejection/correction/cancel/stale-state branches are not complete for every family.                    |
| Phase 3: integrations/artifacts        | Partial | API/component notification, attachment, PDF, and correction suites pass; exact notification-to-detail browser deep links and all artifact variants remain incomplete.                          |
| Phase 4: secondary modules             | Partial | Role-aware route sweep, API matrix, full unit/feature suites, and inspection CRUD matrix pass. The plan's positive and negative browser journeys are not qualified for every secondary module. |
| Phase 5: nonfunctional                 | Partial | Existing accessibility/responsive/component checks and opt-in PDF visual audit exist; full planned breakpoint/browser/performance qualification has not run.                                   |

Until these rows meet their exit criteria, release reporting should say **regression green / plan conformance partial**, not **all-system E2E complete**.

## Reproduction

From `vmecc-backend`:

```powershell
php artisan e2e:reset --env=testing
$env:SESSION_DRIVER='file'
$env:APP_ENV='testing'
php artisan serve --env=testing --host=127.0.0.1 --port=8000
```

From `vmecc-frontend`, start Vite in one terminal and run tests in another:

```powershell
npm start -- --host 127.0.0.1 --port 3000
npm run test:e2e:coverage-contract
npx playwright test tests/e2e/workflow-approvals-e2e.spec.js --config=playwright.config.mjs --workers=1
```

The isolated database is intentionally left populated with the final E2E run's records. No test server is left running.
