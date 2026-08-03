# VMECC Frontend Upgrade Preflight Record

**Recorded:** 2026-08-03  
**Plan:** [FRONTEND_UPGRADE_PLAN_2026-08-03.md](./FRONTEND_UPGRADE_PLAN_2026-08-03.md)  
**Document home:** `upgrade-works/`  
**Working branch:** `codex/frontend-upgrade-stage-1`  
**Gate decision:** **OPEN FOR LOCAL-ONLY STAGE 1; BLOCKED FOR STAGING/PRODUCTION PROMOTION**  
**Authorization:** The requesting repository owner authorized all locally executable next steps on 2026-08-03.  
**Permitted scope:** Local frontend documentation, runtime pinning, ESLint configuration, focused correctness fixes, tests, audits, and isolated build validation. No external-system mutation or deployment is authorized.

## 1. Decision Summary

The locally verifiable preflight inventory is complete. Local-only Day 1 implementation may start on the dedicated branch. Staging and production promotion remain blocked because mandatory ownership, rollback, and environment controls remain unverified.

Promotion-blocking findings:

1. Named QA, operations/deployment, security/privacy, and production release decision owners are not recorded.
2. GitHub branch protection and required-check settings could not be verified from the local repository or unauthenticated remote access.
3. No approved staging frontend/backend origins, isolated test data, or staging credentials have been identified.
4. No current staging rollback drill or last-known-good deployed artifact match has been demonstrated.
5. The committed `build/version.json` identifies commit `eb1d792b6788`, one commit behind current source `59b427d0ab60`.
6. No VMECC backend is listening on the expected local port `8000`.
7. Port `3000` is occupied by an unrelated `ulearn` PHP development server, not VMECC.
8. Preflight found CI on Node.js 22 while the active shell used Node.js 24. Stage 1 clean-install evidence later confirmed a transitive dependency requires Node.js 24 or newer, so the repository and CI policy was corrected to Node.js 24.16.0.

## 2. Repository Baseline

| Item | Recorded value | Status |
| --- | --- | --- |
| Repository | `https://github.com/pokajang/vmecc-frontend.git` | Verified |
| Branch at preflight start | `main` | Verified |
| Dedicated working branch | `codex/frontend-upgrade-stage-1` | Created locally |
| Source revision | `59b427d0ab6051d25fba062ae9a12ea7313c4274` | Verified |
| Remote `origin/main` | `59b427d0ab6051d25fba062ae9a12ea7313c4274` | Matches local source |
| Source commit date | `2026-07-30T12:25:28+08:00` | Recorded |
| Source commit subject | `Improve extinguisher duplicate and location controls` | Recorded |
| Tracked source modifications | None | Verified |
| Documentation checkpoint | Commit `3bfb03bb100332c744970ff8908579da686e1ad5` | Committed before tooling/application changes |
| Unrelated local changes | None reported by Git | Verified |

The preflight documentation was committed before tooling/application changes. No application, dependency, test, or generated build source was modified during preflight.

## 3. Toolchain Baseline

| Tool | Local version | Repository/CI expectation | Status |
| --- | --- | --- | --- |
| Node.js | `24.16.0` active shell | `.nvmrc`, `package.json`, README, and CI pin `24.16.0` | Policy aligned with dependency engine requirements |
| npm | `11.13.0` | No root engine or package-manager pin | Unpinned |
| Git | `2.54.0.windows.1` | Not pinned | Recorded |
| Vite | `7.3.6` | Lockfile installation | Recorded |
| Vitest | `4.1.4` | Lockfile installation | Recorded |
| ESLint | `9.39.1` | Lockfile installation | Recorded |
| Playwright | `1.61.1` | Lockfile installation | Recorded |

Preflight found no runtime-version file or root engine declaration. Stage 1 initially selected Node.js 22 for CI parity, but `npm ci` showed that `@zxing/library@0.23.0` requires Node.js 24 or newer. The policy was therefore corrected to `.nvmrc` and CI version `24.16.0` with `engines.node: 24.x`; final Stage 1 validation uses that exact runtime.

## 4. Package Integrity Baseline

| File | SHA-256 |
| --- | --- |
| `package.json` | `946690B5538817E2871735D5F38ADA46AB1F43463C49F4D157E15DD04EBEAA60` |
| `package-lock.json` | `153CF381CC61F4A4443B08F98407F955B2F1AB9742E9BD862298603CA339C586` |

The package manifest and lockfile were read only. `npm ci`, dependency upgrades, and audit remediation were not run during preflight.

## 5. Build and Rollback Material

Committed build metadata:

```json
{
  "app": "vmecc-frontend",
  "version": "5.5.0",
  "buildId": "eb1d792b6788-20260730042347",
  "builtAt": "2026-07-30T04:23:47.012Z"
}
```

The build ID refers to full commit `eb1d792b67889194d186717948cb6f8ea0191b48`, titled `Upgrade workflow UX and sensitive data isolation`. That revision is an ancestor exactly one commit behind current `HEAD`.

| Artifact | SHA-256 |
| --- | --- |
| `build/version.json` | `32B6017FB36496AE66B7CB70A348775C6442263F0242EB1DE52681BD3227DFBD` |
| `build/index.html` | `71A38B1C3EFE0965C22D38B959418BE80FB36A745009EAD4E9D9DD5C1F0F25EB` |
| `build/service-worker.js` | `35839CEEFA6DF31B058DD9B71DB9B9CE4AA860947CE067D8E4F285D571D48EBB` |
| Tracked build files | 142 |

The committed build is a **rollback candidate only**. It must not be called the last-known-good deployed artifact until operations confirms that the same build ID and checksums were deployed and a rollback drill succeeds.

## 6. Environment Configuration Inventory

Only variable names and origin components were inspected. Values other than the API origin components were not recorded.

| File | API origin | Intended classification |
| --- | --- | --- |
| `.env.example` | `http://localhost:8000/api` | Local example |
| `.env` | `http://localhost:8000/api` | Local development |
| `.env.local` | `http://localhost:8000/api` | Local override; Git-ignored |
| `.env.production` | `https://vmecc-api.amiosh.com/api` | Production build configuration |

Environment-name inventory includes application name, API URL, attachment-size configuration, payroll API/fallback flags, report API/fallback flags, inspection feature flags, and holiday-guidance cohort flags. All `VITE_*` values are client-visible and must be treated as public configuration.

## 7. Security-Header Baseline

The repository `.htaccess` declares:

- HSTS with one-year duration and subdomains
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- strict-origin referrer policy
- a Permissions Policy that currently disables camera, microphone, geolocation, payment, and USB
- a restrictive CSP with self-hosted scripts, inline styles, selected image/API origins, no objects, and no framing
- separate cache policies for HTML, hashed assets, service worker, manifest, and version metadata

This is a source-configuration baseline only. The actual production and staging response headers have not been observed, and intermediary Apache, proxy, or CDN overrides remain unknown. The camera policy conflict identified in the audit is therefore confirmed in repository configuration but not yet qualified against a deployed origin.

## 8. Local Service Availability

| Expected service | Expected port | Observation | Status |
| --- | --- | --- | --- |
| VMECC frontend | 3000 | Port is owned by `php.exe` serving `C:\laragon\www\ulearn\server.php`; `/version.json` returns 404 | Unavailable |
| VMECC backend API | 8000 | No listener | Unavailable |

No existing process was stopped or modified. Live VMECC E2E, session, API, camera, or rollback validation cannot run in the current service state.

## 9. CI and Remote Controls

The only repository workflow currently:

1. checks out the source
2. installs Node.js 22
3. runs `npm ci`
4. runs `npm run build`

Lint, unit tests, custom audits, coverage, E2E, dependency triage, and artifact-integrity checks are not enforced. Local and remote `main` point to the same revision.

Branch-protection settings, required checks, environment protections, action-secret access, and recent workflow-run status require authenticated GitHub administrative visibility and remain unverified.

## 10. Existing Evidence Reuse Decision

The 2026-07-20 system-wide QA report is useful historical evidence but cannot satisfy the current release gate because:

- it explicitly concluded conditional rather than complete qualification
- its frontend baseline was 255 test files and 1,466 tests, while the current audit found 311 files and 1,702 tests
- it qualified Chromium only
- its module inventory remained mapped rather than qualified
- current dependencies and source have changed

Its safety lesson remains applicable: browser qualification must use an immutable, run-owned build outside the repository `build/` directory. Repository build artifacts must not be overwritten while a preview or browser run is active.

## 11. Current Validation Baseline

The code-quality audit immediately preceding this preflight recorded the following under local Node.js 24.16.0:

| Check | Result | Qualification |
| --- | --- | --- |
| Existing `npm run lint` | Passed in 43.7 seconds | Signal is incomplete because core JS/React rules are missing |
| Full Vitest | 311 files and 1,702 tests passed in 337.76 seconds | Local unit baseline |
| Production build | Passed in 13.07 seconds | Emitted large-chunk and ineffective dynamic-import warnings |
| Contrast audit | Passed | Local static contract |
| Typography audit | Passed | Local static contract |
| Hardcoded-staff audit | Passed | Local static contract |
| E2E module contract | 50/50 mapped; 45 mapped, 5 partial, 0 qualified | Inventory only |
| Dependency audit | Two high-severity entries from one React Router RSC advisory | Applicability requires documented triage |
| Live Playwright E2E | Not run | Backend unavailable |

These results are evidence for planning and regression comparison. They are not a production release approval and have not been reproduced on the CI Node.js 22 runtime during this preflight.

## 12. Preflight Checklist

| Mandatory control | Status | Evidence or required action |
| --- | --- | --- |
| Named engineering, QA, operations, and release owners | **PARTIAL** | Requesting repository owner authorized local Stage 1; named QA/operations/security/production owners remain required before promotion |
| Protected working branch/no direct main implementation | **PARTIAL PASS** | Dedicated local branch created; remote protection unverified |
| Source revision and toolchain captured | **PASS** | Sections 2–4 |
| Deployed build ID and headers captured | **BLOCKED** | Approved staging/production origins and operations verification required |
| Last-known-good artifact retained | **PARTIAL** | Committed one-commit-old candidate exists; deployed match unverified |
| Rollback verified in staging | **BLOCKED** | Staging access and operations-led rollback drill required |
| Baseline validation recorded | **PARTIAL PASS** | Current local evidence recorded; Node.js 22 reproduction pending |
| Scope-clean working tree | **PARTIAL PASS** | Only the in-scope root README and `upgrade-works/` documentation changes are present |
| Isolated backend, accounts, data, browsers, and devices available | **BLOCKED** | No local backend or approved staging harness currently available |
| Evidence location outside Vite source tree | **PASS** | Use ignored `.codex-run/frontend-upgrade/` for generated evidence; keep durable summaries in `upgrade-works/` |
| Known flaky tests/incidents distinguished | **PARTIAL** | jsdom pseudo-element warnings and historical QA residual risks recorded; owner review pending |

## 13. Local Stage 1 Authorization and Promotion Conditions

Local-only Day 1 is authorized under these conditions:

1. Work remains on `codex/frontend-upgrade-stage-1`; no direct push to `main` is authorized.
2. Node.js 24.16.0 is the selected runtime policy for local/CI and dependency-engine parity.
3. Work is limited to the frontend repository and the locally executable Stage 1 scope.
4. No staging, production, shared backend, external provider, or live account may be mutated.
5. Documentation is committed separately before tooling/application changes.

Before staging or production promotion, the following remain mandatory:

1. Named QA, operations/deployment, security/privacy, and production release decision owners.
2. Verified GitHub branch protection and required checks.
3. Approved staging frontend/backend origins and isolated test-data procedure.
4. Operations confirmation of the deployed build ID or another last-known-good artifact.
5. A successful staging rollback drill and evidence reference.

Until those promotion conditions are complete, the gate decision remains **BLOCKED FOR STAGING/PRODUCTION PROMOTION**.
