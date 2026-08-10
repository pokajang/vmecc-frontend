# Stage 6 Final Checkpoint and Handover Plan

Date: 2026-08-06  
Stage: 6, Day 61  
Status: Executed; Stage 6 passed and closed locally on 2026-08-10  
Parent: `FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md`

## Objective

Decide whether Stage 6 improved component ownership, reuse, accessibility, and cross-module
consistency without introducing behavior drift. Close the stage with a repository-derived catalogue,
complete local quality evidence, explicit residual risks, independently reversible boundaries, and
a clean generated-output boundary.

Day 61 is primarily an audit and handover checkpoint. Production corrections are allowed only when
the evidence identifies a concrete Stage 6 regression, incomplete migration, stale ownership path,
or accessibility failure. It is not authorization for another component family or opportunistic
cleanup programme.

## Cumulative audit boundary

The committed Stage 6 starting point is `f19bca8` (`docs: complete frontend reuse programme
handover`). Stage 6 changes currently live in the working tree rather than a later commit.

Audit both:

1. tracked changes from `f19bca8` to the current working tree; and
2. every untracked file reported by `git status --porcelain`.

The planning snapshot contains 52 tracked changes and 34 untracked paths. These counts are a
pre-execution checksum, not a deletion or commit list. Recompute them at execution start and explain
any difference before proceeding.

Do not use `git diff` alone because it omits untracked components, tests, E2E support, and execution
records. Do not stage, commit, reset, restore, clean, or delete user work as part of the audit.

## Stage 6 families in scope

Reconcile the implementation and evidence for every completed boundary:

| Boundary                      | Shared owner or outcome                                                                | Required closure question                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Day 43 E2E hardening          | Controlled API stubs, safety contract, semantic locators, PWA navigation tolerance     | Are browser fixtures isolated, fail-closed, and still mapped?                           |
| Days 44–49 Inspection filters | `ManagedCheckToolbar` across Fire Extinguisher, FRT, Hydraulic, ER Aux, and High Angle | Did search/visibility/loading/empty and compartment reset behavior remain local?        |
| Cross-module corrective pass  | Canonical report breakpoint, `ResponsiveReportDialog`, `WorkflowEditStateBanner`       | Are retired ERCO owners gone and all report consumers on the intended shared path?      |
| Days 50–52 headers/actions    | Existing header systems plus canonical long-title wrap correction                      | Did only presentation change, with actions, permissions, and routing preserved?         |
| Days 53–55 form validation    | `FormFieldError` in two Report/Salary importers and four rendered error placements     | Are validation ownership, IDs, announcements, and `aria-invalid` relationships correct? |
| Days 56–58 detail/summary     | `ResponsiveKeyValueList` adopted by two Leave consumers                                | Are ordering, formatting, links, Approval Gates, and actions still consumer-owned?      |
| Days 59–60 state/recovery     | `PageState` adopted by five active missing-record presenters                           | Are missing, loading, empty, forbidden, and retry meanings still distinct?              |

## Day 61 sequence

### 1. Freeze and record the audit baseline

Before running mutating tools:

- record branch, `HEAD`, Node/npm versions, package version, and current timestamp;
- capture complete porcelain status and split tracked, deleted, and untracked paths;
- verify no task-owned Vite/preview listener or temporary environment/build directory is present;
- record the exact Stage 6 comparison boundary and changed-path groups;
- identify tracked build/output paths before any build; and
- preserve the current working tree exactly.

Stop if `HEAD` is not `f19bca8` unless the new commits can be proven to belong to the authorized
Stage 6 boundary. Stop if an unexplained generated output or unrelated destructive operation would
be required.

### 2. Audit the cumulative diff by family

Review each changed production file alongside its owning tests and execution record. Confirm:

- presentation moved but state machines, API calls, payloads, persistence, calculations,
  permissions, routes, callbacks, and workflow decisions did not;
- shared APIs contain no route, module, role, permission, or domain switches;
- adapters and specialist components were retained or retired according to their documented
  conditions;
- responsive and accessibility changes are supported by tests;
- imports resolve to the canonical owner rather than compatibility paths where direct ownership is
  required;
- removed ERCO components/hooks have no production, test, style, or documentation residue except
  intentional historical references;
- no stale selector, duplicated implementation, orphaned file, or zero-use component was introduced;
- no test weakens an assertion, suppresses an error, adds an arbitrary wait, or broadens a network
  boundary merely to pass; and
- execution records match the actual source and validation evidence.

For untracked files, inspect their full contents and importer graph. Classify every path as
production source, test, controlled E2E support, plan/execution record, or unexpected residue.

### 3. Run ownership and duplication searches

Reproduce and record at least these checks:

- production importer counts for every new or newly adopted shared component;
- canonical/compatibility imports for `useReportIsMobile`;
- absence of `ErcoResponsiveActionModal` and the ERCO-local `useIsMobile` outside historical docs;
- all intended `ResponsiveReportDialog` and `WorkflowEditStateBanner` consumers;
- all five Inspection `ManagedCheckToolbar` consumers and remaining manual toolbar dispositions;
- `FormFieldError` consumers and legacy inline-error wrappers;
- `ResponsiveKeyValueList` consumers and intentional specialist detail systems;
- `PageState` consumers and the unimported legacy `RecordDetailCard` decision;
- header/action primitive adoption and the single canonical long-title style owner;
- zero production importer candidates under `src/components` and feature component areas; and
- stale tests, styles, selectors, barrels, or exports referencing retired owners.

Search results are evidence leads. Inspect context before classifying a match as duplication or
residue.

### 4. Catalogue reconciliation

Update `FRONTEND_COMPONENT_REUSE_CATALOGUE_2026-08-05.md` from the final repository rather than
copying execution-record counts. Recompute:

- production component/support/barrel totals using the catalogue's existing counting method;
- resolved production importer counts;
- zero-importer candidates and their active/dead/adapter/test-fixture disposition;
- Stage 6 additions, removals, compatibility paths, and consumer migrations;
- the adoption matrix, intentional exceptions, removal conditions, and maintenance register; and
- validation references and catalogue checkpoint date.

Expected deltas to verify, not assume, include:

- `ResponsiveReportDialog` with seven production consumers;
- `WorkflowEditStateBanner` with three production consumers;
- `FormFieldError` with two production importers and four rendered error placements;
- `ResponsiveKeyValueList` increasing from two to four production consumers;
- `PageState` increasing from eight to thirteen production importers;
- canonical report mobile ownership moving to `src/hooks/useReportIsMobile.js` with a compatibility
  re-export at the old report hook path;
- retirement of `ErcoResponsiveActionModal` and the ERCO-local `useIsMobile`; and
- the final `ManagedCheckToolbar` Inspection consumer set.

If repository-derived counts differ, correct the catalogue and execution summary; do not alter
source merely to make expected counts true.

### 5. Formatting and static-quality gates

Run in this order so attribution remains clear:

1. `npx prettier --check "src/**/*.{js,jsx,scss,css}" "tests/**/*.{js,jsx}" "scripts/**/*.mjs" "*.{js,mjs}"`
2. `npm run lint`
3. `npm run audit:contrast`
4. `npm run audit:typography`
5. `npm run audit:staff-hardcoded`
6. `npm run audit:production-config`
7. `npm run audit:router-advisory`
8. `npm run test:payroll-hook-order`
9. `npm run test:payroll-hook-runtime`
10. `npm run test:e2e:coverage-contract`

Payroll hook checks are applicable because Stage 6 changed a Payroll detail consumer. The
system-inventory generator is not run unless inspection proves its generated system artifact is
required for catalogue reconciliation; it changes output and Stage 6 changed no system-scope
contract. `npm audit` and dependency upgrades remain inapplicable because package and lock files did
not change. GitHub Actions remain disabled by owner decision.

If Prettier reports unrelated legacy/archive/fixture files outside the Stage 6 boundary, record them
separately and do not bulk-format them. Every Stage 6 source, test, script, and E2E file must pass.

### 6. Complete unit and component suite

Run:

```text
npx vitest run --reporter=dot
```

Record files, tests, duration, warnings, skipped/todo counts, worker failures, unhandled rejections,
and console errors. A zero exit code is insufficient if Vitest reports an unhandled error or hidden
worker failure.

On failure:

1. reproduce the smallest failing test;
2. classify it as Stage 6 regression, pre-existing application issue, stale test, fixture/harness
   problem, or environment dependency;
3. inspect the relevant Stage 6 diff before changing code; and
4. rerun the focused test and the complete suite after any correction.

Do not update snapshots, loosen assertions, suppress console errors, increase timeouts, or add retries
without evidence that the existing contract requires it.

### 7. Controlled Playwright checkpoint

Use an explicit `127.0.0.1` origin, dedicated environment mode, and isolated logs. The normal local
database is out of scope. Run the representative Stage 6 real-source/safety contracts:

- `controlled-api-safety.spec.js`;
- `inspection-filter-search-component.spec.js`;
- `form-field-error-component.spec.js`;
- `detail-summary-component.spec.js`;
- `state-recovery-component.spec.js`;
- the applicable report dialog/edit-banner and Inspection browser contracts already changed by the
  cross-module corrective pass; and
- PWA update coverage through its repository runner if its isolated two-build prerequisites and
  cleanup boundary pass preflight.

The browser matrix must cover at least 320 px mobile and a representative desktop viewport, actual
production component imports, no page errors, no uncontrolled API requests, keyboard access, and no
horizontal overflow for presentation families where those assertions apply.

Record every failure before modification. Distinguish application regressions from router-provider
duplication, missing real container boundaries, unavailable backend fixtures, service-worker timing,
port conflicts, and browser harness defects. A harness correction may not change production
behavior or weaken the intended assertion.

### 8. Isolated production build

Create a Day 61-only environment mode with an explicit non-production API URL and build to a unique
directory outside the repository root. Refuse to reuse or overwrite an existing directory.

Run the production build and record:

- Vite version, transformed module count, duration, and exit status;
- output location and whether tracked output remained unchanged;
- mixed static/dynamic import and chunk-size advisories; and
- whether any new warning is attributable to Stage 6.

Do not deploy, preview on a network interface, mutate cPanel, or treat a successful local build as
production qualification.

### 9. Evidence-backed correction protocol

If the audit finds a confirmed defect:

1. identify the exact owning Stage 6 family and consumer;
2. add or correct a focused regression test against the real contract;
3. make the smallest independently reversible correction;
4. inspect the exact diff and ownership searches;
5. rerun focused, affected-family, browser, full-suite, lint, audit, and build gates in proportion to
   the correction; and
6. record the failure, root cause, fix, and residual risk.

Stop and request direction if resolution requires backend/database changes, dependency upgrades,
production/cPanel work, a new abstraction family, or broad unrelated source churn.

### 10. Guarded cleanup

After all validation:

- verify the exact command line before stopping a Day 61 listener;
- delete only the Day 61 temporary environment file through a tracked edit mechanism;
- resolve and verify each isolated build/log directory against its exact expected absolute path;
- remove only task-owned Playwright screenshots, videos, and traces identified by the Day 61 spec
  names;
- leave unrelated listeners, databases, build output, logs, and worktree changes untouched; and
- prove that the temporary environment, listener, build, logs, screenshots, traces, and task-owned
  output no longer exist.

Never run broad `git clean`, recursive deletion against the repository root, or restore/reset over
the dirty working tree.

### 11. Final handover

Create:

`FRONTEND_MODULE_CONSISTENCY_STAGE_6_FINAL_CHECKPOINT_EXECUTION_2026-08-10.md`

The handover must include:

- audited revision/boundary and exact worktree scope;
- family-by-family ownership and behavior verdict;
- correction log or explicit no-correction result;
- final catalogue and importer counts;
- full command/result matrix with durations and warning attribution;
- Playwright journey matrix and fixture limitations;
- build advisories and cleanup proof;
- residual risks, deferred release-only checks, and intentional exceptions;
- independent rollback map by Stage 6 family;
- shared-cPanel impact statement; and
- an explicit Stage 6 close/hold decision.

Update the main plan and `upgrade-works/README.md` only after all required gates and cleanup pass.

## Acceptance gate

Day 61 passes only when:

- the complete tracked and untracked Stage 6 boundary is audited;
- every Stage 6 family has an ownership, behavior, and rollback verdict;
- no confirmed regression or unresolved shared owner remains;
- no abandoned legacy implementation remains without an intentional exception/removal condition;
- the catalogue matches final repository-derived counts;
- Stage 6 formatting, full lint, complete Vitest, applicable audits, Payroll checks, and E2E mapping
  pass;
- representative controlled Playwright contracts pass or have a precisely documented external
  blocker that does not conceal an application failure;
- the isolated production build passes with warnings attributed;
- temporary and generated artifacts are proven removed; and
- the handover records residual risks without manufacturing another refactor backlog.

## Stop conditions

Stop or hold closure if:

- `HEAD` or the working-tree boundary changes without attribution;
- an untracked production file cannot be assigned an importer/owner;
- a Stage 6 regression is reproducible but unresolved;
- full tests, lint, an applicable audit, mapping, or build fails;
- a browser failure cannot be safely attributed;
- catalogue counts cannot be reproduced;
- cleanup would require broad deletion or risk user files; or
- closure requires backend, database, dependency, deployment, cPanel, or GitHub Actions changes.

## Rollback model

Do not use a whole-worktree reset. Preserve the independently reversible boundaries documented in
each Stage 6 execution record:

- Day 43 E2E support/spec corrections;
- Inspection toolbar consumers;
- report responsive dialog/breakpoint/edit-banner consolidation;
- header wrap correction;
- `FormFieldError` consumers and primitive;
- two Leave `ResponsiveKeyValueList` adoptions; and
- five `PageState` missing-record adoptions.

Rollback the affected consumers before removing a shared primitive or extension. Do not revert
unrelated Stage 1–5 work, user changes, backend code, dependencies, or release configuration.

## Release and hosting boundary

Day 61 qualifies only the local frontend source and tests. It does not qualify staging or production,
deploy to shared cPanel, verify hosted headers/API connectivity, test the live database, validate
real-device camera behavior, restore GitHub Actions, or perform a production rollback drill. Those
remain deferred release-only actions.
