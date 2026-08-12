# Frontend Upgrade Stage 1 Day 5 Execution Record

Date: 2026-08-04  
Branch: `codex/frontend-upgrade-stage-1`  
Starting revision: `52fb85eeef9e7f2cc91f21e967af9d34268b0d51`  
Scope: dependency advisory triage and compatible remediation  
Local status: **completed**  
Promotion status: **blocked pending the existing staging, owner, hosted-control, and rollback prerequisites**

## Outcome

Day 5 is locally complete without changing application routing or runtime behavior.

- Patched two newly reported, safely resolvable development dependency families:
  - `brace-expansion` `5.0.8` to `5.0.9`
  - `undici` `7.28.0` to `7.29.0`
- Did not run `npm audit fix --force`.
- Kept `react-router-dom` and its transitive `react-router` at the reviewed `7.18.1` versions.
- Recorded a time-bounded, architecture-specific exception for `GHSA-qwww-vcr4-c8h2` through 2026-09-03, with mandatory reassessment on 2026-09-04.
- Added a fail-closed local audit that invalidates the exception when the reviewed router tree changes, the declarative `BrowserRouter` entry point changes, an RSC/server-router dependency or API appears, an RSC/server entry file appears, or the review deadline is reached.
- Retained the advisory in `npm audit`; it has not been suppressed or hidden.

The post-remediation audit contains exactly two high package entries, `react-router` and `react-router-dom`, representing the same RSC-specific advisory. It contains no critical entries and no remaining `brace-expansion` or `undici` entry.

## Live Dependency Evidence

### Reviewed router tree

```text
vmecc-frontend@5.5.0
`-- react-router-dom@7.18.1
    `-- react-router@7.18.1
```

The direct dependency is exactly pinned in `package.json`, and both resolved packages are exactly `7.18.1` in `package-lock.json`.

### Safely patched development tree

```text
eslint-plugin-jsx-a11y@6.10.2
`-- minimatch@10.2.5
    `-- brace-expansion@5.0.9

jsdom@29.0.2
`-- undici@7.29.0
```

Both changed lockfile entries are marked development-only. No direct application dependency, application source, router configuration, authentication behavior, route guard, or lazy route was changed.

## Advisory Dispositions

| Advisory/package family | Initial state | Disposition | Reason |
| --- | --- | --- | --- |
| `brace-expansion`, `GHSA-rgw5-rvv9-x895` | High; `5.0.8` affected | Resolved at `5.0.9` | npm offered a compatible transitive patch; the vendor advisory identifies `5.0.9` as patched. |
| `undici`, including `GHSA-4cwx-7wf7-3272` | High family entry; `7.28.0` affected | Resolved at `7.29.0` | npm offered a compatible transitive patch; the vendor advisory identifies `7.29.0` as patched. |
| `react-router` / `react-router-dom`, `GHSA-qwww-vcr4-c8h2` | Two high package entries for one advisory | Time-bounded not-applicable exception | The advisory affects unstable React Server Component action paths. This application is a browser-only declarative SPA and does not contain the affected RSC/server path. The real patched line requires a separately planned v8 migration. |

Sources reviewed:

- React Router advisory: <https://github.com/advisories/GHSA-qwww-vcr4-c8h2>
- React Router v7-to-v8 guide: <https://reactrouter.com/upgrading/v7>
- React Router changelog: <https://reactrouter.com/home/changelog>
- React Router declarative installation: <https://reactrouter.com/start/declarative/installation>
- `brace-expansion` advisory: <https://github.com/advisories/GHSA-rgw5-rvv9-x895>
- `undici` advisory: <https://github.com/advisories/GHSA-4cwx-7wf7-3272>

## React Router Applicability Assessment

The exception is based on inspected architecture, not on the advisory score alone.

Evidence in the current repository:

- `src/App.js` imports and mounts `BrowserRouter` from `react-router-dom`.
- `src/App.js` and `src/components/AppContent.js` use declarative `Routes` and `Route` elements.
- `src/routes.js` uses client-side route components and React lazy loading.
- The repository has 99 source/test files containing `react-router-dom`, confirming that a package-name migration is broad rather than a one-line security patch.
- No direct `react-router` package is declared.
- No `react-server-dom-*` dependency is declared.
- No `@react-router/dev`, server runtime, Node adapter, serving adapter, Cloudflare adapter, or Express adapter is declared.
- No `routeRSCServerRequest`, `matchRSCServerRequest`, `RSCStaticRouter`, `createRequestHandler`, or `allowedActionOrigins` usage was found.
- No `entry.rsc`, `entry.server`, or `entry.ssr` source entry point was found.

The vendor advisory explicitly limits impact to applications using unstable RSC APIs. The affected action execution path is therefore absent from this application. This conclusion must be reconsidered immediately if any architecture evidence changes.

## Why React Router Was Not Changed

The advisory's patched version is `react-router` `8.3.0`; the latest compatible v7 patch remains inside the advisory's affected range. React Router v8 is a migration, not an in-place patch for this repository:

- `react-router-dom` is removed in v8.
- Imports must move to `react-router` and, where needed, `react-router/dom`.
- React and React DOM must move from the current `19.2.0` to at least `19.2.7`.
- The repository currently contains 99 files referencing `react-router-dom`.
- Routing, authentication, guards, navigation, lazy loading, tests, and build behavior would all require focused compatibility work.

That migration should be performed on its own reviewed branch and not mixed into a development-only lockfile patch. It remains a candidate for a later planned dependency modernization stage or becomes urgent if the application adopts an affected RSC/server architecture.

The npm-proposed forced fix was also rejected. `npm audit fix --force` proposed `react-router-dom@7.11.0`, which is a downgrade and is not the vendor's patched `8.3.0` path. Accepting it would violate the plan's explicit prohibition against unreviewed forced fixes and audit-driven router downgrades.

## Exception Control

Exception ID: `FRONTEND-RR-RSC-2026-08-04`  
Advisory: `GHSA-qwww-vcr4-c8h2`  
Owner: repository owner  
Accepted scope: current browser-only declarative SPA at `react-router-dom@7.18.1` / `react-router@7.18.1`  
Effective date: 2026-08-04  
Last valid day: 2026-09-03  
Mandatory review date: 2026-09-04

Compensating controls:

1. Run `npm run audit:router-advisory` during every local validation set.
2. Run a fresh `npm audit` every Monday and before every dependency change or release-candidate decision.
3. Record each review as `upgrade-works/FRONTEND_DEPENDENCY_REVIEW_YYYY-MM-DD.md` when the result or disposition changes.
4. Do not introduce an RSC/server router dependency, API, adapter, or entry point without first resolving or renewing this decision.
5. Keep `npm audit` output visible; do not add an npm audit ignore or severity bypass for this advisory.
6. Reassess immediately when a patched v7 release becomes available or vendor scope changes.

The local audit intentionally exits non-zero on or after 2026-09-04. Renewing the date requires a fresh vendor-advisory review, installed-tree inspection, architecture scan, validation run, and dated decision record; changing only the date is not an acceptable renewal.

## Files Changed

- `package-lock.json`: compatible transitive patches for `brace-expansion` and `undici`.
- `package.json`: added `npm run audit:router-advisory`.
- `scripts/audit-react-router-advisory.mjs`: fail-closed router version, architecture, RSC/server indicator, and expiry checks.
- `upgrade-works/02-completed/FRONTEND_UPGRADE_STAGE_1_DAY_5_EXECUTION_2026-08-04.md`: this decision and evidence record.
- `upgrade-works/README.md`: programme status and document register update.

## Validation Evidence

All commands ran on Node.js `24.16.0` and npm `11.13.0`.

| Gate | Result |
| --- | --- |
| `npm audit fix --dry-run --json` before remediation | Proposed only `brace-expansion` `5.0.9` and `undici` `7.29.0` as compatible changes; retained router advisory |
| `npm audit fix` | Applied the two compatible development dependency patches; did not force or downgrade router |
| `npm ci` | Passed; 552 packages installed from the changed lockfile |
| Targeted routing/auth/guard/lazy-loading suite before clean install | Passed; 12 files / 107 tests |
| Full `npx vitest run` | Passed; 315 files / 1,728 tests |
| `npm run lint` | Passed |
| Existing repository audit scripts | Passed |
| `npm run audit:router-advisory` | Passed |
| Post-clean-install targeted suite | Passed; 12 files / 107 tests |
| Post-remediation `npm audit --json` disposition check | Exactly `react-router` and `react-router-dom`; 2 high, 0 critical |
| Isolated `npm run build` | Passed; 6,491 modules transformed |
| `git diff --check` | Required before commit |

The full unit run retained three known jsdom messages about pseudo-element `getComputedStyle`; all tests passed. The build retained the existing mixed static/dynamic import and large-chunk warnings. Neither warning class was introduced by this lockfile-only dependency patch.

## Functional Compatibility Assessment

Confidence is high that Day 5 does not alter prior application behavior:

- The only package version changes are transitive development dependencies used by lint/test tooling.
- The application router packages remain at `7.18.1`.
- No application source or route definition changed.
- Targeted authentication, session, navigation, route context, reporting routes, inspection routes, and unsaved-change guard tests passed before and after the clean install.
- The complete unit suite, lint suite, audits, and production compilation passed.

Browser-based staging flows were not executed because the approved staging origin, isolated data, named owners, and rollback drill remain unresolved. This prevents promotion but does not invalidate the local compatibility result.

## Rollback

If Day 5 must be reversed before it is committed:

1. Restore only the Day 5 versions of `package.json`, `package-lock.json`, the new audit script, and the Day 5 documentation.
2. Run `npm ci` to reconstruct the prior dependency tree.
3. Re-run the targeted 12-file suite, lint, existing audits, and production build.

After commit, prefer `git revert <day-5-commit>` so the programme history remains auditable. The pre-Day-5 checkpoint is `52fb85eeef9e7f2cc91f21e967af9d34268b0d51`. Do not revert unrelated Stage 1 work.

## Acceptance Criteria Mapping

- **Current React Router advisory has a documented disposition:** met locally by exception `FRONTEND-RR-RSC-2026-08-04`.
- **No vulnerability is silently ignored:** met; compatible advisories were patched and the remaining exception stays visible in npm audit and this register.
- **Dependency update automation is enabled or an equivalent scheduled process exists:** met through the documented weekly, pre-change, pre-release, expiry, and architecture-triggered local process while paid hosted automation remains deferred.

Day 5 is complete locally. Stage 1 is not approved for staging or production promotion.
