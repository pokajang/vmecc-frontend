# Frontend Live UAT - Day 2 Execution Plan

**Date:** 2026-08-10  
**Parent plan:** `FRONTEND_LIVE_UAT_COMPONENT_RECONCILIATION_PLAN_2026-08-10.md`  
**Prerequisite:** Day 1 route manifest and baseline completed  
**Stage:** Production-safe Playwright harness  
**Status:** Executed; see `FRONTEND_LIVE_UAT_DAY_2_EXECUTION_2026-08-10.md`  
**Application change scope:** Test infrastructure only; no application UI or business behavior changes

## 1. Objective

Build an isolated Playwright harness that can inspect the deployed frontend without accidentally altering production business data. The harness must support later role-based route traversal, responsive and accessibility measurements, deterministic evidence, and truthful blocked results.

Day 2 proves the safety boundary and anonymous live connectivity. It does not claim authenticated all-view coverage; that begins after authorized live credentials are supplied.

## 2. Safety invariants

The harness must fail closed:

1. It runs only when both `VMECC_LIVE_UAT=1` and `VMECC_LIVE_UAT_READ_ONLY=1` are present.
2. The frontend origin must be exactly `https://vmecc.amiosh.com`.
3. The API origin/path must be exactly `https://vmecc-api.amiosh.com/api`.
4. Service workers are blocked to avoid background or stale-client behavior.
5. Workers and retries are limited to avoid multiplying production traffic.
6. GET, HEAD, and OPTIONS are the only generally allowed methods.
7. POST is allowed only for the exact authentication login endpoint.
8. PUT, PATCH, DELETE, and all other POST endpoints are aborted and recorded as safety violations.
9. Authentication secrets are read only from environment variables and are never logged or persisted.
10. A test cannot pass when a blocked mutation was attempted.
11. Live evidence is written outside the frontend Git repository.
12. Production IDs remain runtime-only and are not written into committed manifests.

## 3. Environment contract

### Mandatory for every live run

```text
VMECC_LIVE_UAT=1
VMECC_LIVE_UAT_READ_ONLY=1
VMECC_LIVE_UAT_BASE_URL=https://vmecc.amiosh.com
VMECC_LIVE_UAT_API_URL=https://vmecc-api.amiosh.com/api
E2E_RUN_ID=VMECC-QA-YYYYMMDD-HHMMSS-abcdef
```

### Role credentials

Credential pairs are required only when a suite requests that persona:

```text
VMECC_LIVE_UAT_TRT_EMAIL
VMECC_LIVE_UAT_TRT_PASSWORD
VMECC_LIVE_UAT_INCIDENT_COMMANDER_EMAIL
VMECC_LIVE_UAT_INCIDENT_COMMANDER_PASSWORD
VMECC_LIVE_UAT_CONTRACT_MANAGER_EMAIL
VMECC_LIVE_UAT_CONTRACT_MANAGER_PASSWORD
VMECC_LIVE_UAT_HUMAN_RESOURCE_EMAIL
VMECC_LIVE_UAT_HUMAN_RESOURCE_PASSWORD
VMECC_LIVE_UAT_FINANCE_EMAIL
VMECC_LIVE_UAT_FINANCE_PASSWORD
VMECC_LIVE_UAT_SYSADMIN_EMAIL
VMECC_LIVE_UAT_SYSADMIN_PASSWORD
```

The helper reports only missing variable names. It must never report a credential value.

## 4. Planned files

- `playwright.live-uat.config.mjs`
- `tests/e2e/live-uat/live-uat-fixture.js`
- `tests/e2e/live-uat/live-uat-support.js`
- `tests/e2e/live-uat/public-baseline.live.spec.js`
- `tests/e2e/live-uat-safety-contract.spec.js`
- focused unit tests for pure safety, redaction, and ledger behavior where useful
- package scripts for controlled safety and opt-in live execution
- `upgrade-works/02-completed/FRONTEND_LIVE_UAT_DAY_2_EXECUTION_2026-08-10.md`

## 5. Task sequence

### Task 2.1 - Create the isolated live configuration

1. Add a dedicated Playwright config; do not weaken `playwright.config.mjs` or its localhost safeguards.
2. Validate both opt-in flags before Playwright discovers or starts tests.
3. Validate exact HTTPS frontend and API URLs.
4. Validate the existing run-ID format.
5. Use one worker, zero retries, blocked service workers, retained traces on failure, and failure-only screenshots.
6. Write output under the parent `.qa/<run-id>/evidence/playwright/live-uat` directory.
7. Define representative mobile and desktop projects.
8. Do not start a local web server.

**Gate:** Running the config without explicit live/read-only flags or with a different origin fails before browser activity.

### Task 2.2 - Implement the request safety policy

Create a pure request classifier and a Playwright request guard.

The classifier returns one of:

- `allow-safe-method`;
- `allow-auth-login`;
- `block-mutation`;
- `block-origin`.

The guard must:

- inspect every browser-context request;
- continue safe requests;
- allow the exact login request only;
- abort forbidden requests;
- record method and sanitized origin/path;
- never record headers, request bodies, tokens, cookies, or query secrets;
- cause the test to fail during teardown if any violation occurred.

**Gate:** A mocked POST to a report/settings/workflow endpoint is aborted and makes the safety assertion fail, while GET and login POST are allowed.

### Task 2.3 - Implement persona authentication

1. Map stable persona keys to environment variable names and expected role labels.
2. Fail with a missing-variable list when a requested persona is unavailable.
3. Authenticate through the visible login journey so the browser receives production cookies normally.
4. Verify the route leaves `/login` and the authenticated shell becomes ready.
5. Never print form values or response bodies from authentication.
6. Use a fresh browser context for each persona; do not transform one role's session into another.
7. Add a safe session-clear helper that clears browser cookies locally without calling a production logout endpoint.

**Gate:** Anonymous suites need no credentials; authenticated suites cannot silently fall back to local smoke accounts.

### Task 2.4 - Implement route readiness and journey diagnostics

Add reusable helpers for:

- navigating only to the approved frontend origin;
- waiting for the application root and loading state to settle;
- detecting unexpected login redirects;
- closing incidental install/notification dialogs without acknowledging data;
- collecting console errors, uncaught page errors, failed requests, and 5xx responses;
- measuring document and component horizontal overflow;
- capturing heading, primary-action, and navigation orientation evidence;
- measuring touch targets and sticky-action overlap;
- checking focus visibility, drawer/dialog focus containment, Escape dismissal, and focus return in later suites.

Diagnostics must distinguish expected permission/401 outcomes from runtime failures.

### Task 2.5 - Implement evidence redaction and deterministic ledger

1. Store route IDs, parameterized route patterns, persona keys, viewport names, result states, and artifact-relative paths.
2. Redact email addresses, bearer/token values, sensitive query parameters, UUID-like identifiers, and long numeric record IDs from diagnostic text.
3. Do not store request or response bodies.
4. Sort ledger rows deterministically before writing JSON.
5. Use only these result states:
   - `passed`;
   - `failed`;
   - `permission-blocked`;
   - `data-blocked`;
   - `feature-disabled`;
   - `redirect-verified`;
   - `controlled-only`.
6. Keep all runtime ledgers outside Git.

**Gate:** Repeated writes of the same logical entries produce the same ordered JSON apart from explicitly separated run metadata.

### Task 2.6 - Add the controlled safety-contract suite

Using the existing localhost Playwright configuration:

1. Install the production request guard on a controlled blank page.
2. Fulfil a mocked safe GET and prove it is allowed.
3. Fulfil a mocked login POST and prove it is allowlisted.
4. Attempt a mocked report POST and prove it is aborted and recorded.
5. Test pure policy cases for PATCH, PUT, DELETE, a foreign origin, and query redaction.

No request in this suite reaches production.

### Task 2.7 - Add and run anonymous live proof

With explicit live/read-only flags:

1. Open `/login` on mobile and desktop.
2. Confirm the login page has an identifiable heading/form and no horizontal overflow.
3. Directly open `/inspection` anonymously and verify safe redirection to `/login`.
4. Collect console/network diagnostics.
5. Assert no blocked mutation was attempted.
6. Write the local evidence ledger.

This establishes that the config, origin restrictions, route guard, responsive projects, artifact location, and production connectivity work together without credentials.

### Task 2.8 - Run quality and anti-mishap checks

Run:

```bash
npm run lint
npm run test:e2e:coverage-contract
npm run audit:live-uat-route-coverage
npm run test:e2e:live-uat-safety
npx vitest run <focused Day 2 unit specs>
npm run test:e2e:live-uat-public
git diff --check
```

Also prove expected failure for:

- missing opt-in flag;
- read-only flag disabled;
- unexpected frontend origin;
- unexpected API origin;
- malformed run ID;
- missing requested persona credentials;
- attempted non-authentication mutation.

Expected-failure checks pass only when the harness refuses the unsafe input.

### Task 2.9 - Reconcile and report

The execution report must include:

- exact live origin/build;
- safety policy and allowed authentication exception;
- credential availability by variable name only;
- controlled and live test counts;
- mobile/desktop results;
- console/network findings;
- artifact location;
- files changed;
- remaining blockers;
- Day 3 readiness verdict.

## 6. Acceptance criteria

Day 2 passes when:

- unsafe config values fail before browser execution;
- the browser request guard blocks and reports business-data mutations;
- the sole POST exception is the exact login endpoint;
- secrets and request bodies are absent from diagnostics and artifacts;
- anonymous production checks pass on mobile and desktop;
- authenticated suites require explicit persona credentials;
- runtime output is outside Git;
- route/module coverage contracts still pass;
- focused safety tests, lint, syntax, and diff checks pass;
- no production record or setting is changed.

## 7. Day 3 readiness rule

The harness may be declared technically ready after anonymous proof and controlled safety tests pass. Day 3 authenticated route traversal additionally requires the intended role credential pairs. Missing credentials are an external prerequisite, not a reason to weaken the guard or use SysAdmin for every route.
