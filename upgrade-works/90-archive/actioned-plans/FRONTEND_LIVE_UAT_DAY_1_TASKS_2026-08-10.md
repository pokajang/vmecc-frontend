# Frontend Live UAT - Day 1 Task Plan

**Date:** 2026-08-10  
**Parent plan:** `FRONTEND_LIVE_UAT_COMPONENT_RECONCILIATION_PLAN_2026-08-10.md`  
**Stage:** Day 1 - Baseline, deployment identity, and route manifest  
**Status:** Executed; see `FRONTEND_LIVE_UAT_DAY_1_EXECUTION_2026-08-10.md`  
**Change scope:** Inventory, evidence structure, and coverage contract only; no UI refactor or production data mutation

## 1. Day 1 objective

Establish one trustworthy answer to four questions before live UAT begins:

1. Which frontend build is actually running in production?
2. Which distinct views and meaningful view states exist?
3. Which user role is expected to access each view?
4. Which routes can be tested immediately, and which require permission, representative data, a controlled environment, or redirect-only verification?

Day 1 does not declare that a view works. It establishes the complete test population and the evidence baseline against which later findings and fixes will be reconciled.

## 2. Safety and scope rules

- Production activity is limited to public version/header checks and read-only discovery after authentication.
- Do not create, edit, submit, approve, reject, delete, upload, acknowledge, mark as read, or change settings in production.
- Do not click a control if its effect is uncertain.
- Do not place passwords, session cookies, CSRF tokens, personal data, or production record payloads in committed files.
- Dynamic production record IDs may exist only in ignored local run artifacts. The committed manifest uses parameterized routes and fixture aliases.
- Do not change application UI, CSS, business behavior, API contracts, or shared components during Day 1.
- Do not silently omit routes hidden by role permissions or feature flags; classify them explicitly.
- Treat legacy redirects as route contracts, not independent UI designs.
- Stop if the public build identity does not match the deployment intended for this audit.

## 3. Expected Day 1 files

### Committed planning and coverage files

- `upgrade-works/90-archive/stale-status/FRONTEND_LIVE_UAT_ROUTE_MATRIX_2026-08-10.md`
- `tests/e2e/live-uat/route-manifest.json`
- `scripts/audit-live-uat-route-coverage.mjs`
- a package script for the new route coverage audit
- `upgrade-works/02-completed/FRONTEND_LIVE_UAT_DAY_1_EXECUTION_2026-08-10.md`

### Local-only evidence

- `.qa/<run-id>/baseline/production-version.json`
- `.qa/<run-id>/baseline/production-headers.txt`
- `.qa/<run-id>/baseline/source-metadata.json`
- `.qa/<run-id>/inventory/` output from the existing system inventory generator
- `.qa/<run-id>/inventory/dynamic-route-fixtures.local.json`

The `.qa` directory is outside the frontend Git root. Before collecting data, verify it is not tracked by any parent repository.

## 4. Task sequence

### Task 1.1 - Preflight and immutable run identity

1. Confirm the frontend working tree and preserve all existing user changes.
2. Capture:
   - branch name;
   - full and short frontend commit SHA;
   - local `build/version.json`;
   - Node, npm, and Playwright versions;
   - browser channel/version intended for UAT;
   - local timestamp and timezone.
3. Create a unique run ID in the existing format:

   ```text
   VMECC-QA-YYYYMMDD-HHMMSS-abcdef
   ```

4. Create the local evidence directories without placing them inside `vmecc-frontend`.
5. Verify no environment file, credential value, or browser storage state will be committed.

**Output:** `source-metadata.json` and an initialized evidence directory.

**Failure rule:** A dirty working tree is recorded, not cleaned or reset. Day 1 may continue only if the planned files do not overwrite unrelated work.

### Task 1.2 - Confirm the live deployment baseline

1. Fetch `https://vmecc.amiosh.com/version.json` without cache and save the response.
2. Capture response headers for:
   - `/`;
   - `/login`;
   - one nested frontend route that is safe to request directly.
3. Confirm:
   - the version endpoint returns valid JSON;
   - its build ID matches the intended deployed build;
   - the root and nested route return the SPA successfully;
   - the frontend is not serving an older cached build;
   - the API base configured in the served assets is the production API, not localhost.
4. Record the deployed build ID, build timestamp, frontend commit association, and verification time in the route matrix.

**Output:** production version/header evidence and a `matched` or `mismatch` baseline verdict.

**Failure rule:** If the build is stale or cannot be identified, stop the UAT baseline. Deployment correction must occur before screenshots or UI verdicts are treated as current.

### Task 1.3 - Generate the source inventories

1. Run the existing system inventory generator into the local Day 1 artifact directory.
2. Retain its frontend routes, navigation references, views, components, modules, and source metadata.
3. Run the existing E2E module-coverage contract and record its result.
4. Supplement the generated inventory because its regular-expression route extraction is not the final authority:
   - inspect `src/routes.js` directly;
   - inspect `_nav.js` and role-filtered navigation;
   - inspect application-level public routes and error/maintenance routing;
   - inspect feature flags and backend module activation mapping;
   - inspect inspection type and report type registries;
   - inspect legacy redirect functions and destination mappings.
5. Reconcile duplicates and aliases without deleting evidence of their existence.

**Output:** raw generated inventory plus a reviewed canonical route list.

**Failure rule:** Generator success alone does not complete this task. Any route that the generator cannot parse must be added through reviewed manifest metadata.

### Task 1.4 - Build the canonical route manifest

Create one deterministic manifest row per canonical view or redirect contract. Each row must include:

- stable route ID;
- route pattern;
- canonical destination, where applicable;
- page/view name;
- module family;
- source component;
- route type: `public`, `static`, `dynamic`, or `redirect`;
- intended roles;
- feature/module prerequisite;
- representative fixture alias for dynamic routes;
- expected page heading or landmark;
- primary user task;
- relevant states;
- target viewports;
- mutation risk: `none`, `safe-interaction`, or `controlled-only`;
- planned UAT status;
- notes or intentional exception.

Allowed planned UAT statuses are:

- `testable`;
- `permission-blocked`;
- `data-blocked`;
- `feature-disabled`;
- `redirect-only`;
- `controlled-only`.

Do not use `passed` during Day 1 because the actual route UAT has not yet run.

**Output:** `tests/e2e/live-uat/route-manifest.json`.

### Task 1.5 - Reconcile role and permission coverage

For each canonical authenticated route:

1. Assign the intended operational persona, not merely SysAdmin.
2. Identify a secondary role when visibility or action differences are important.
3. Record whether the role should see:
   - the navigation entry;
   - the page itself;
   - read-only details;
   - workflow actions;
   - administrative controls.
4. Separate `route may be opened` from `role may perform actions`.
5. Record permission-denied expectations so an intentional 403 is not reported as a broken page.

Minimum personas:

- unauthenticated user;
- Tactical Response Team;
- Incident Commander/Assistant Incident Commander;
- Contract Manager/Client Contract Manager;
- Human Resource;
- Finance;
- SysAdmin.

**Output:** role columns and permission expectations in the route matrix.

### Task 1.6 - Resolve dynamic route fixture requirements

Build fixture aliases without committing production identifiers. At minimum account for:

- user profile;
- leave and overtime details;
- payroll claim and salary assignment details;
- inspection detail and permitted edit route;
- fire extinguisher detail;
- ERCO, Fitness Test, and Drill details;
- staff profile;
- team view.

For each alias, record:

- required role;
- safe read-only discovery endpoint or list view;
- required data characteristics, such as `submitted inspection with image evidence`;
- whether production currently has a suitable representative;
- fallback controlled fixture when production lacks one.

Store actual discovered IDs only in `dynamic-route-fixtures.local.json`.

**Output:** parameterized fixture requirements in the committed matrix and local runtime mappings outside Git.

### Task 1.7 - Prove inspection and report subtype completeness

Create explicit rows or state variants for:

- General Inspection;
- HSE Inspection;
- Fire Extinguisher Inspection;
- Hydraulic Rescue Equipment Inspection;
- High Angle Rescue Equipment Inspection;
- ER Auxiliary Equipment Inspection;
- SCBA Inspection;
- Fire Truck Daily Readiness Inspection;
- ERCO;
- Fitness Test;
- Drill.

For every subtype, identify:

- list/home entry;
- new-form shell;
- review state;
- submitted detail;
- image/evidence state;
- role and permission prerequisite;
- mobile and desktop coverage requirement;
- whether state is safe on production or controlled-only.

The route may be shared across types, but the rendered view state is not considered covered until the subtype appears separately in the matrix.

**Output:** complete inspection/report subsection in the route matrix.

### Task 1.8 - Mark high-risk UI consistency surfaces

Tag routes that exercise the component families to be reconciled later:

- detail surface/drawer;
- metadata summary;
- workflow status and actions;
- search/filter toolbar;
- desktop table/mobile record list;
- loading, empty, error, and permission state;
- image upload queue;
- image preview/gallery/editor;
- user caption/description;
- attachment preview/download;
- sticky mobile actions;
- dialog/drawer focus behavior.

Specifically flag every known consumer of inspection and report media components so Day 5 can distinguish shared implementation from local duplication.

**Output:** pattern tags on manifest/matrix rows; no refactor yet.

### Task 1.9 - Add and run the route coverage contract

Implement a deterministic audit that fails when:

- a canonical route from `src/routes.js` has no manifest entry;
- a manifest route no longer exists and is not marked as an intentional external/public state;
- a dynamic route has no fixture alias;
- an authenticated route has no intended persona;
- a redirect has no expected destination;
- an inspection/report subtype is missing;
- a row uses an invalid status, viewport, or mutation-risk value;
- duplicate stable IDs or canonical route keys exist.

The audit should report actionable missing/extra entries rather than rewriting the manifest automatically.

Run:

```bash
npm run test:e2e:coverage-contract
npm run audit:live-uat-route-coverage
```

**Output:** passing existing module coverage and new route-manifest coverage contracts.

### Task 1.10 - Day 1 reconciliation and handoff

1. Compare source routes, navigation, registries, manifest, and Markdown matrix counts.
2. Confirm every omission has an explicit reason.
3. Confirm no row is prematurely marked `passed`.
4. Confirm production was not mutated.
5. Confirm local evidence and secrets are not staged or tracked.
6. Run lint only for new JavaScript audit code and then the repository lint gate if practical.
7. Run `git diff --check` and inspect the complete diff.
8. Write the Day 1 execution note with:
   - production build verdict;
   - source commit;
   - route/view counts;
   - status breakdown;
   - role coverage;
   - blocked prerequisites;
   - contract results;
   - exact changed files;
   - Day 2 readiness verdict.

## 5. Route matrix presentation

The Markdown matrix should remain reviewable and avoid exposing live data. Recommended columns:

| Route/view | Module | Intended role | Primary task | States | Viewports | Production mode | Day 1 status |
|---|---|---|---|---|---|---|---|
| `/inspection/:reportId` | Inspection | TRT/reviewer | Understand submitted inspection | submitted, image, long remarks | mobile, desktop | Read-only | testable/data-blocked |

Group rows by module family. Put detailed machine-readable metadata in JSON rather than creating an excessively wide Markdown table.

## 6. Commands planned for execution

PowerShell baseline examples:

```powershell
$runId = "VMECC-QA-20260810-HHMMSS-abcdef"
$artifactRoot = "C:\laragon\www\vmecc\.qa\$runId"

git status --short
git rev-parse HEAD
node --version
npm --version
npx playwright --version

npm run audit:system-inventory -- --output "$artifactRoot\inventory"
npm run test:e2e:coverage-contract
npm run audit:live-uat-route-coverage
npm run lint
git diff --check
```

The real run ID must replace the illustrative timestamp/suffix. Do not copy the placeholder literally.

Production baseline checks:

```powershell
Invoke-RestMethod -Uri 'https://vmecc.amiosh.com/version.json' -Headers @{ 'Cache-Control' = 'no-cache' }
Invoke-WebRequest -Method Head -Uri 'https://vmecc.amiosh.com/'
Invoke-WebRequest -Method Head -Uri 'https://vmecc.amiosh.com/login'
```

Nested routes should use GET if the hosting layer does not implement HEAD consistently. These checks do not authenticate or mutate application data.

## 7. Day 1 completion gate

Day 1 passes only when all of the following are true:

- the live build identity is verified and recorded;
- the intended source commit is recorded;
- every canonical route and redirect is represented;
- every authenticated route has an intended persona;
- every dynamic route has a fixture alias and discovery strategy;
- all eight implemented inspection types and all three report types are separately represented;
- every manifest row has a valid planned status and mutation-risk classification;
- the existing module coverage audit passes;
- the new route-manifest contract passes;
- no production write occurred;
- no secret or production record identifier is committed;
- the execution report gives a defensible `ready` or `not ready` verdict for Day 2.

## 8. Conditions that block Day 2

- Production serves a stale or unidentified build.
- Required production roles cannot be authenticated safely.
- Route inventory and navigation cannot be reconciled.
- Any canonical route lacks an owner/status without explanation.
- Dynamic route discovery would require creating or modifying production data.
- The artifact directory risks committing credentials or sensitive production evidence.
- The route coverage contract fails.

Blocked items must be reported precisely. They must not be converted to false passes or bypassed by testing everything as SysAdmin.
