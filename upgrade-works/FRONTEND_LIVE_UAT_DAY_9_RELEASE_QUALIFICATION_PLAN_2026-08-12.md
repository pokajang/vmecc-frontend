# Frontend Live UAT Day 9 Release Qualification, Deployment, and Closeout Plan

**Date:** 2026-08-12  
**Parent:** `FRONTEND_LIVE_UAT_DAYS_7_9_COMPLETION_PLAN_2026-08-11.md`  
**Entry decision:** Day 8 completed with GO for Day 9  
**Status:** Local Gates A–E passed; source/build commit checkpoints are next  
**Execution record:** `FRONTEND_LIVE_UAT_DAYS_7_9_FINAL_EXECUTION_2026-08-12.md`  
**Repository:** `C:\laragon\www\vmecc\vmecc-frontend` on `main`  
**Hosting model:** committed frontend `build/` copied manually to shared-cPanel document root  
**Primary outcome:** prove that the complete Days 4–8 frontend change set is internally consistent, reproducible, safe to release, correctly deployed, and behaviorally unchanged outside the approved improvements

## 1. Day 9 boundary

Day 9 is the final qualification and release-control stage. It does not reopen broad refactoring. It verifies the accumulated implementation, corrects only release-blocking defects, creates traceable source and artifact commits, and—only after the required gates—supports the existing manual cPanel deployment and read-only live verification.

Authorized local work:

- inspect all modified, deleted, and untracked frontend paths;
- map each release path to an approved Day 4–8 change or exclude it;
- run repository audits, tests, Playwright contracts, PWA checks, and production builds;
- correct a reproduced frontend or test-harness defect within the existing approved behavior;
- update durable upgrade records;
- create a reviewed authored-source commit and a separate generated-build commit after all local gates pass; and
- prepare exact manual cPanel commands after the artifact commit is known.

Actions requiring a deliberate release checkpoint:

- pushing commits to `origin/main`;
- replacing the public frontend document-root contents;
- running authenticated checks against the public system; and
- rolling back the public frontend.

Not authorized:

- backend source, schema, migration, seeder, permission, workflow, or API changes;
- `.env` or cPanel environment changes;
- npm/build execution on cPanel;
- production database mutation;
- production create, update, approve, reject, submit, upload, or delete journeys;
- GitHub Actions enablement;
- dependency upgrades merely to make an audit quieter; or
- another cross-module redesign or speculative shared-component extraction.

## 2. Fixed release facts and invariants

At plan creation:

- frontend `HEAD` and its upstream both resolve to `9410ad4d71ab3b934e74ab232730f9fde3437bb0`;
- the worktree intentionally contains the accumulated Days 4–8 source, test, document, and generated-build changes;
- backend status is clean;
- Day 8 passed 45/45 primary browser checks, 24/24 adjacent checks, 4/4 additional journeys, 37/37 focused component tests, full lint, and its final contracts;
- the current tracked build is provisional because its build ID predates the final authored-source commit; and
- production is hosted at `https://vmecc.amiosh.com`, with the API at `https://vmecc-api.amiosh.com/api`.

These invariants apply throughout execution:

1. Never use `git add .` for the release.
2. Never stage credentials, `.env*` overrides, `UAT/`, `.qa/`, Playwright output, logs, traces, screenshots, uploads, dumps, dependencies, or unrelated workspace files.
3. Never treat an old generated build as proof for newly committed source.
4. Never hide a failed gate by chaining commands and reporting only the last exit code.
5. Never mutate production to manufacture live test coverage.
6. Never touch the backend because this release is frontend-only.
7. Never enable paid GitHub Actions; the recorded cost exception remains in force.
8. Keep every correction small, evidence-backed, and routed through the current shared owner when one exists.

## 3. Execution stages and gates

### Stage 9.0 — Freeze and evidence workspace

Tasks:

1. Create a unique ignored Day 9 run directory outside tracked application paths.
2. Record date/time, branch, frontend `HEAD`, upstream commit, remote URL, Node/npm versions, and available disk space.
3. Record backend `HEAD`, upstream, and clean status without changing it.
4. Record listeners before starting services so unrelated processes are not stopped later.
5. Confirm `UAT/creds.md`, `.qa/`, `.playwright-output/`, and all local environment files are ignored or outside the frontend repository.
6. Capture `git status --short`, `git diff --stat`, `git diff --name-status`, and untracked-path inventory.
7. Preserve logs by command and exit code; do not store credentials or response bodies containing personal data.

**Gate A:** the execution environment is attributable, local evidence paths are ignored, and no unknown service or repository is in scope.

### Stage 9.1 — Complete release-scope reconciliation

Classify every changed path into one of these groups:

| Group                     | Expected examples                                                    | Decision                                                                     |
| ------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Authored runtime          | report media, Inspection presentation/upload, shared media, messages | Must map to an approved finding and pass behavior review.                    |
| Tests and harness         | Vitest, Playwright, fixtures, audit scripts/config                   | Must assert current intended behavior without weakening failure detection.   |
| Styles                    | report, Inspection, shared gallery SCSS                              | Must map to filename removal, neutral image framing, or responsive behavior. |
| Durable records           | `upgrade-works/*.md`                                                 | Must be accurate, credential-free, and internally linked.                    |
| Generated artifact        | `build/**`                                                           | Provisional until rebuilt from the authored-source commit.                   |
| Local evidence or secrets | `.qa`, UAT credentials, logs, traces, screenshots                    | Must remain excluded and unstaged.                                           |
| Unknown or unrelated      | anything without a Day 4–8 owner                                     | HOLD until excluded or explained.                                            |

Review the authored diff for accidental changes to:

- routes or navigation authorization;
- API paths, methods, request payloads, response mapping, or CSRF behavior;
- workflow transitions, role rules, approvals, or status logic;
- persistence, upload lifecycle, retry semantics, or deletion behavior;
- document filename behavior, which intentionally remains distinct from device-image filename suppression;
- error handling or fallback visibility;
- accessibility names, focus behavior, and responsive breakpoints; and
- dependency manifests and lockfiles.

Specific reconciliation requirements:

1. Confirm the evidence-loss correction preserves descriptions through immediate post-upload responses.
2. Confirm device image filenames are hidden only in presentation; internal upload metadata remains available where required.
3. Confirm documents, Messages attachments, and avatars did not accidentally inherit the report-photo presentation contract.
4. Confirm the Inspection detail left divider changes only through 928 px and remains at 929 px and wider.
5. Confirm the evidence-image un-nesting did not remove labels, descriptions, controls, missing-image fallback, or semantic grouping.
6. Confirm Day 8 harness corrections use dynamic configured origins and semantic selectors rather than suppressing assertions.
7. Reconcile generated asset deletions/additions separately from authored code.

**Gate B:** every release path has a documented owner and reason; backend and dependency scope remain unchanged; unknown or unrelated paths force HOLD.

### Stage 9.2 — Dependency and static qualification

Run each check independently and save its result:

1. Verify `package.json` and `package-lock.json` scope and record their hashes.
2. Run `npm ci` from the committed lockfile.
3. Confirm the lockfile is byte-identical after installation.
4. Run `npm audit --audit-level=high`; classify any finding by actual VMECC usage instead of automatically changing dependencies.
5. Run `npm run lint`.
6. Run `npm run audit:production-config`.
7. Run `npm run audit:router-advisory`.
8. Run `npm run audit:contrast`.
9. Run `npm run audit:typography`.
10. Run `npm run audit:staff-hardcoded`.
11. Run `npm run audit:media-render-sites`.
12. Run `npm run test:e2e:coverage-contract`.
13. Run the live-UAT route-coverage and credential-safety audits without printing credential values.
14. Run `git diff --check`.
15. Scan changed and prospective staged paths for private keys, tokens, passwords, environment values, production payloads, and credential files.

Advisory handling:

- a directly exploitable High/Critical issue in the deployed client bundle is HOLD;
- an advisory outside the application architecture may be recorded as non-applicable only with evidence;
- a dependency update expands scope and requires a separate correction/requalification loop; and
- do not alter the lockfile unless a reviewed dependency correction is actually required.

**Gate C:** install integrity, lint, applicable audits, whitespace, and credential safety pass with no unexplained dependency change.

### Stage 9.3 — Full automated behavior qualification

#### 9.3.1 Full unit/component suite

Run:

```powershell
npx vitest run --environment jsdom
```

Record files, tests, skips, duration, warnings, and exit code. A passing total does not excuse a new unexpected skip or unhandled rejection.

#### 9.3.2 Historical contract replay

Run independently:

- UAT safety contract;
- Day 3 contract;
- Day 4 contract;
- Day 5 media inventory contract;
- Day 6 shared-media browser contract; and
- Day 8 accessibility/responsive contract.

#### 9.3.3 Day 7 isolated mutation replay

Use the backend's guarded E2E tooling with a new run ID, explicit loopback frontend/API origins, and disposable `vmecc_test` PostgreSQL only.

Required sequence:

1. acquire the exclusive E2E lock;
2. run guarded reset, preflight, and fixture verification;
3. run the Inspection CRUD matrix;
4. run all eight Inspection-type journeys and continuation/recovery coverage;
5. run ERCO, Fitness Test, and Drill workflow journeys;
6. run Leave/Overtime mutation journeys only with the isolated-fixture authorization flags;
7. rerun the affected Inspection workflow unit scope;
8. run guarded cleanup/reset and fixture reconciliation;
9. request graceful lock release; and
10. stop only the processes and disposable database created by the run.

No production URL may appear in the mutation allow-list. Any uncertainty about the resolved database or host is an immediate HOLD before the first mutation.

#### 9.3.4 Day 8 and adjacent browser replay

Run the Day 8 suite plus the previously qualified adjacent matrix covering:

- administrator queues;
- dashboard, Leave, payroll/overtime, Messages, and state recovery;
- all Inspection types, drawers, filters, status, continuation, detail-divider boundaries, semantics, and evidence;
- all registered report forms at mobile width; and
- report media at mobile and desktop widths.

Use the same required responsive boundaries: 320 where applicable, 360, 390, 430, 768, 928, 929, 1440, and the recorded landscape case.

**Gate D:** the complete repository and browser qualification is green; disposable state returns to its exact seeded baseline; no task-owned listener, lock, trace, or mutation residue remains.

### Stage 9.4 — PWA and provisional production-build qualification

Run:

```powershell
npm run test:e2e:pwa-update
```

This must run against its production-build harness, not the Vite development server. Verify:

- build A installs and controls the test client;
- build B activates through the intended update path;
- the entry bundle changes to build B;
- the intended app-shell caches are retained/updated correctly;
- unrelated Cache Storage data is not removed; and
- the runner removes its temporary directories and services.

Then create a provisional production build for artifact analysis. Verify:

1. `build/index.html`, `build/.htaccess`, `build/version.json`, and `build/service-worker.js` exist.
2. `build/version.json` is valid JSON and its ID format is valid.
3. the production API origin is present where expected;
4. localhost, loopback, development WebSocket, source-map, and local filesystem references are absent from public assets;
5. every entrypoint asset reference resolves to a file in `build/`;
6. no obsolete hashed asset is referenced;
7. no credential or UAT marker exists in the artifact;
8. nested SPA navigation works under a local production preview; and
9. filename-free media, image framing, descriptions, fallback behavior, and representative responsive routes pass against the production artifact.

The provisional build proves buildability only. It is not the release artifact because the final authored-source commit does not yet exist.

**Gate E:** PWA update behavior and a production-mode artifact pass without unexplained cache, origin, asset, or runtime behavior.

### Stage 9.5 — Correction loop

If any gate fails:

1. stop at that gate;
2. classify the issue as product defect, test/harness drift, environment fault, data/permission block, or non-applicable check;
3. reproduce it independently;
4. correct only the smallest owning source or assertion boundary;
5. add or strengthen a regression assertion;
6. rerun the focused failing check;
7. rerun every affected historical contract;
8. rerun the complete gate containing the failure; and
9. update the scope ledger before continuing.

Return to the full qualification sequence when a correction affects runtime source, shared styles, API behavior, persistence, focus/navigation, media lifecycle, or build generation.

Do not downgrade a genuine failure to a note merely to reach the release stage.

### Stage 9.6 — Authored-source commit

This stage begins only after Gates A–E pass.

1. Refresh `git status`, the path ledger, diff statistics, and secret scan.
2. Exclude all `build/**` additions, deletions, and modifications from the authored-source staging set.
3. Stage reviewed runtime source, styles, tests, audit tooling/configuration, package-script changes, and durable upgrade records explicitly by path.
4. Inspect `git diff --cached --name-status`, `--stat`, and the staged patch.
5. Confirm no ignored evidence, credentials, environment files, or generated build files are staged.
6. Rerun staged whitespace and secret checks.
7. Create one authored-source commit with a message describing the frontend consistency/media/UAT work.
8. Record the full source commit ID.
9. Confirm the only remaining intentional worktree changes are provisional generated-build files.

If staged scope differs from the qualified scope, return to Gate B.

**Gate F:** the source commit contains exactly the qualified authored changes and no deployment artifact or local evidence.

### Stage 9.7 — Canonical build and artifact commit

After the authored-source commit:

1. run a fresh production build into the canonical tracked `build/` directory;
2. verify the build-ID prefix equals the authored-source commit prefix;
3. repeat the build essentials, production-origin, no-local-origin, asset-reference, stale-hash, credential, whitespace, and production-preview checks;
4. repeat the PWA update gate if canonical generation or service-worker bytes differ from the qualified provisional output in an unexplained way;
5. verify no authored source changed during build generation;
6. stage only `build/**`;
7. inspect staged deletions and additions as hashed-asset replacement, not isolated file loss;
8. create a separate deployment-artifact commit;
9. record the full artifact commit ID and `build/version.json` value; and
10. verify the worktree is clean and the artifact commit contains no authored source.

The build ID identifies the authored-source commit. It is expected not to equal the later artifact commit that contains it; do not amend repeatedly to chase a self-referential hash.

**Gate G:** clean local repository, traceable source commit, traceable artifact commit, and a build whose ID points to the qualified source.

### Stage 9.8 — Push checkpoint

Before pushing:

1. present the source commit, artifact commit, build ID, complete gate summary, remaining blocks, and rollback candidate;
2. confirm local history is exactly two intended commits ahead of `origin/main` unless a correction required a documented variation;
3. fetch and ensure upstream did not advance unexpectedly;
4. require a deliberate push decision;
5. push both commits to `origin/main` without force; and
6. verify local `HEAD`, upstream, and remote main all equal the artifact commit.

If upstream advanced, stop and reconcile—never force-push the release.

**Gate H:** the reviewed commits are present on `origin/main`, and no deployment has occurred yet.

### Stage 9.9 — Manual shared-cPanel deployment checkpoint

The user operates the cPanel terminal. After Gate H, provide one concise command block bound to the known artifact commit and build ID.

The command block must:

1. enter `~/vmecc-frontend` and use `git pull --ff-only origin main`;
2. verify repository `HEAD` equals the expected artifact commit;
3. verify `build/index.html`, `build/.htaccess`, and `build/version.json` before touching the public directory;
4. resolve and validate the exact target as `~/public_html/vmecc.amiosh.com`;
5. capture the current public `version.json` and create a recoverable timestamped backup outside the document root;
6. verify the backup before replacement;
7. remove only the validated frontend document-root contents, including stale dotfiles/assets;
8. copy `build/.` into the empty document root;
9. verify the deployed essentials and public build ID; and
10. print the deployed repository commit and build ID for the execution record.

Do not run npm, Composer, Artisan, migrations, seeders, or environment commands. Do not touch `~/vmecc-backend` or the API document root.

If `rsync` is unavailable, use the validated fresh-delete plus `cp -a build/.` approach. Never construct a recursive-delete target from an unverified or empty variable.

**Gate I:** the expected complete build is served from the exact frontend document root and a verified rollback copy exists.

### Stage 9.10 — Read-only live verification

Bind the live harness to:

- frontend `https://vmecc.amiosh.com`;
- API `https://vmecc-api.amiosh.com/api`;
- expected Day 9 build ID; and
- local, ignored UAT credentials without printing or persisting them in reports.

Run in fresh browser contexts with production mutations disabled.

#### Public and delivery checks

1. public root and login load successfully;
2. `version.json` exactly matches the expected Day 9 build;
3. `index.html`, JavaScript, CSS, manifest, icons, and service worker return successfully;
4. assets referenced by the entry document exist and use the expected cache behavior;
5. API requests use only the production API origin;
6. direct visits and refreshes on representative nested SPA routes work;
7. no old hashed asset request produces an application-breaking failure; and
8. a fresh context receives the new build while an existing-service-worker context reaches it through the intended update flow.

#### Authenticated read-only matrix

At minimum, cover 390 px and 1440 px for the authorized representative personas:

- dashboard and primary navigation;
- Inspection list/detail/review;
- Incident Commander `All` scope, detail refresh, and close/back restoration;
- each Inspection type with an authorized existing record;
- ERCO, Fitness Test, and Drill list/detail/review where authorized data exists;
- Inspection detail-divider behavior across 928/929 px;
- report/Inspection image rendering, absence of device filenames, neutral framing, descriptions, viewer controls, and missing-image fallback where existing data exposes them;
- representative document filename retention;
- empty/loading/error presentation where it can be reached without mutation; and
- keyboard access and drawer close/focus behavior on representative surfaces.

Monitor throughout:

- console errors and warnings;
- page exceptions;
- failed requests and unexpected 4xx/5xx responses;
- session or CSRF loops;
- rate-limit responses;
- horizontal overflow;
- unexpected write methods or mutation endpoints; and
- public build identity drift.

Classification rules:

- unavailable authorized data is `data-blocked`, not passed;
- an inaccessible view is `permission-blocked`, not failed unless the role should have access;
- no production record may be created or altered to convert a block into a pass; and
- any unexpected mutation attempt is a release HOLD even if the server rejects it.

**Gate J:** public identity and assets match the artifact, representative journeys pass or are honestly blocked, unexpected production mutations equal zero, and no Blocker/High release regression remains.

### Stage 9.11 — Rollback decision and procedure

Rollback immediately when:

- the public build ID is wrong or mixed assets are served;
- the SPA root or critical nested routes fail;
- authentication/session behavior regresses;
- production API origin is wrong;
- a Blocker/High runtime, permission, workflow, evidence, or media regression appears;
- the service worker traps users on an unusable build; or
- the deployed files cannot be reconciled to the artifact commit.

Rollback must:

1. stop live UAT;
2. restore the verified pre-deployment backup into the same validated document root;
3. verify the prior `version.json` and essential files;
4. run the public anonymous baseline and one critical authenticated read-only journey;
5. record the rollback reason and restored build ID; and
6. leave Day 9 at HOLD pending a new correction cycle.

Do not roll back the backend or database for this frontend-only release.

### Stage 9.12 — Final closeout

1. Reconcile route, module, role, viewport, state, and media coverage.
2. Record passes, honest data/permission blocks, skips, Medium/Low findings, and owners/triggers.
3. Record source commit, artifact commit, deployed build ID, previous build ID, backup location, push result, deployment result, and rollback status.
4. Confirm unexpected production mutations equal zero.
5. Confirm local/database cleanup ledgers are empty.
6. Stop only Day 9-owned services and leave unrelated listeners untouched.
7. Confirm raw artifacts remain ignored and credentials remain outside Git.
8. Write `FRONTEND_LIVE_UAT_DAYS_7_9_FINAL_EXECUTION_2026-08-12.md`.
9. Update the parent plan and `upgrade-works/README.md` to one of the final verdicts below.

## 4. Verdict model

### GO — programme and release complete

Use only when all local gates pass, both commits are pushed, the exact build is deployed, live read-only verification passes, zero unexpected production mutation occurs, and no unresolved Blocker/High issue remains.

### CONDITIONAL GO — deployed with explicit non-critical blocks

Use only when all release-safety gates pass and remaining items are data/permission blocks or accepted Medium/Low observations with an owner and trigger. Never use this for an unverified build, failed critical route, authentication issue, or missing rollback evidence.

### HOLD — do not push/deploy or rollback

Use when any required local gate fails, release scope is unexplained, credentials/evidence risk staging, upstream diverges, the artifact is not source-traceable, deployment identity mismatches, an unexpected production mutation occurs, or a Blocker/High regression is present.

## 5. Minimum evidence table

| Evidence                 | Required record                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Scope                    | HEAD/upstream, complete path ledger, authored/generated split, exclusions                 |
| Dependencies             | install integrity, lockfile stability, audit classification                               |
| Static quality           | lint, production config, router, contrast, typography, media, coverage, credential audits |
| Unit behavior            | full Vitest totals, skips, warnings, duration                                             |
| Historical contracts     | Days 3–6 and safety results                                                               |
| Controlled mutation      | run ID, exact isolated database/hosts, journey outcomes, cleanup proof                    |
| Accessibility/responsive | Day 8 and adjacent matrix totals, viewports, retained domain differences                  |
| PWA                      | A-to-B update result, cache behavior, cleanup proof                                       |
| Build                    | source commit, artifact commit, build ID, essentials, origins, asset integrity            |
| Push                     | remote convergence without force                                                          |
| Deployment               | validated docroot, previous build, backup, deployed build identity                        |
| Live UAT                 | role/route/viewport outcomes, blocks, diagnostics, zero mutations                         |
| Closeout                 | GO/CONDITIONAL GO/HOLD, findings, rollback status, residual risk                          |

## 6. Completion definition

Day 9 is complete only when:

- every accumulated frontend path is reviewed and attributable;
- the complete local qualification is green;
- controlled mutation ends with zero disposable residue;
- the PWA and canonical production artifact are verified;
- source and build commits are separated and traceable;
- any push and deployment occur only after their preceding gates;
- the public site serves the exact expected build;
- live verification is read-only and records honest blocks;
- rollback is either unnecessary and ready, or successfully executed after a release failure;
- no unintended backend, environment, database, or GitHub Actions change occurs; and
- the final execution record reconciles the entire Days 7–9 programme.

Until Stage 9.10 passes, a local GO means **ready for the next release gate**, not **release complete**.
