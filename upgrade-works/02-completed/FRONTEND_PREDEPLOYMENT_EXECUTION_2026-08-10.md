# Frontend and Backend Predeployment Execution

**Date:** 2026-08-10  
**Runbook:** `../DEPLOYMENT.md`  
**Scope:** Local release qualification only  
**Decision:** Local predeployment gates passed; GitHub push, cPanel deployment, and hosted smoke checks remain separate

## 1. Outcome

The Stage 6 frontend and current backend passed the applicable local full-release gates after bounded security dependency remediation. No production, cPanel, GitHub push, hosted database, live corpus, or external email operation was performed.

The frontend implementation and production-build boundary is local commit `f47265b` on `main`. The backend dependency patch is local commit `c981376` on `main`. Neither repository is pushed by this execution.

## 2. Corrective Changes

### Frontend

- Pinned `react-router-dom` and transitive `react-router` from 7.18.1 to patched 7.18.2.
- Updated transitive development packages `js-yaml` from 4.3.0 to 4.3.1 and `nanoid` from 3.3.16 to 3.3.18.
- Replaced the React Router non-applicability-exception audit with a fail-closed patched-version and architecture audit.
- Regenerated the tracked production `build/` from the final source and lockfile.

### Backend

- Updated `guzzlehttp/guzzle` from 7.15.1 to 7.15.3.
- Updated `guzzlehttp/promises` from 2.5.1 to 2.5.2.
- Updated `league/commonmark` from 2.8.2 to 2.9.1.
- Updated `nette/utils` from 4.1.4 to 4.1.5.

No frontend or backend business logic was changed during dependency remediation.

## 3. Database Isolation and Failure Attribution

The existing Laragon PostgreSQL data directory could not start after an interrupted shutdown and reported an invalid checkpoint record. No recovery, reset, `pg_resetwal`, or deletion was attempted against it.

A new disposable PostgreSQL 17.2 cluster was initialized outside the damaged data directory. It exposed only loopback port 5432 and contained empty `vmecc_test` and `vmecc_phpunit_test` databases. The testing role was granted login and database ownership but no superuser, database-creation, role-creation, replication, or row-security-bypass privilege.

The first complete backend test run produced 1,116 passes, one skip, and six environment failures: five required the private Markdown corpus read path, and one correctly rejected the temporary role's initial `CREATEDB` privilege. After removing that privilege and presenting the existing 35-source workspace corpus through a temporary junction, all 22 affected tests passed. The subsequent complete suite passed.

## 4. Backend Evidence

| Gate                                  | Result                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Composer install from lock            | Passed                                                                   |
| `composer validate --strict`          | Passed                                                                   |
| `composer audit --no-dev`             | Passed; zero advisories                                                  |
| Fresh testing migration               | Passed; complete migration chain applied to an empty PostgreSQL database |
| Focused environment-attribution rerun | 22 tests / 125 assertions passed                                         |
| Complete Laravel suite                | 1,122 tests / 8,059 assertions passed; one optional test skipped         |
| Route discovery                       | 320 routes                                                               |
| AI coverage contract                  | 50/50 modules, 48/48 topics, 56/56 representative queries; ready         |
| AI answer-quality contract            | 26/26 cases and 20/20 workflows; ready                                   |
| AI input-safety contract              | 22/22 cases and 6/6 decisions; ready                                     |

## 5. Frontend Evidence

| Gate                                                                        | Result                                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Clean `npm ci` from patched lock                                            | Passed; 552 packages installed                                                          |
| `npm audit --audit-level=high`                                              | Passed; zero vulnerabilities                                                            |
| Full ESLint                                                                 | Passed                                                                                  |
| Contrast, typography, staff-hardcoded, production-config, and router audits | Passed                                                                                  |
| Payroll hook-order control                                                  | Passed                                                                                  |
| E2E module mapping                                                          | 50/50 modules mapped                                                                    |
| Complete Vitest suite                                                       | 330 files / 1,808 tests passed                                                          |
| Controlled component, recovery, Drill, and Inspection Playwright            | 31/31 passed                                                                            |
| PWA update Playwright                                                       | 1/1 passed after two 6,495-module builds                                                |
| Final production build                                                      | Passed; 6,495 modules transformed                                                       |
| Production artifact                                                         | `.htaccess` present, production HTTPS API origin present, zero localhost API references |

The only Vitest notices were the three established jsdom pseudo-element `getComputedStyle` limitations. The production build retained the existing mixed static/dynamic `WorkflowNotifications` import warning and large-chunk advisories; neither was introduced by dependency remediation.

## 6. Release Boundary

The frontend began on `codex/frontend-upgrade-stage-1` at `f19bca8`, 57 commits ahead of fetched `origin/main`, with the audited Stage 6 working tree uncommitted. The release preparation includes the reviewed Stage 6 source, tests, durable records, patched dependency tree, router audit, and regenerated tracked production build.

The backend began clean on local `main` at `eb33c60`, synchronized with fetched `origin/main`. Its release delta is limited to `composer.lock`.

No repository was pushed and no remote branch, cPanel working copy, document root, production database, production cache, scheduler, queue worker, corpus, or environment file was changed.

## 7. Next Authorized Boundary

With both local commits and the frontend fast-forward to local `main` verified, the code is ready for the next separately authorized stage:

1. push the reviewed frontend and backend `main` commits;
2. take the required production database and current-artifact backups;
3. perform the server pulls and dependency/cache/migration sequence from `DEPLOYMENT.md`;
4. run hosted readiness, authenticated workflow, headers, API-origin, nested-route, private-file, email, queue, camera, and rollback checks; and
5. open production traffic only after every hosted gate passes.

The damaged local Laragon PostgreSQL directory should be repaired from a known-good backup or replaced under a separate maintenance task. A normal startup was attempted and failed; no reset, forced recovery, `pg_resetwal`, content deletion, or further use was performed. It is separate from the disposable test cluster used for qualification.
