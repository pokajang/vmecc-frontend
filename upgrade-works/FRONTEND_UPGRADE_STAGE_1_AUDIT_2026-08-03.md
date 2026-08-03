# VMECC Frontend Upgrade Stage 1 Compatibility Audit

**Audited:** 2026-08-03  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Implementation under audit:** `b1b080433a388fcfd0d05c1414abc84d13a7078d`  
**Pre-implementation comparison point:** `3ae9e93`  
**Decision:** **LOCALLY VERIFIED — staging and production promotion remain blocked**

## 1. Audit Objective

Audit the Stage 1 Days 1–2 upgrade work for accidental functional changes, repair confirmed defects if found, and verify that locally testable application behavior remains compatible with the pre-upgrade application.

This audit did not authorize deployment, dependency force-fixes, backend mutation, production-data access, or changes to the tracked `build/` artifact.

## 2. Scope Reviewed

- The complete `3ae9e93..b1b0804` implementation diff, including 51 changed files.
- Runtime-policy, package manifest, and lockfile changes.
- ESLint configuration and source/test execution contexts.
- Report workflow, overtime settings, payroll draft protection, message draft cleanup, inspection synchronization, accessibility, filename parsing, and button behavior changes.
- CSS and test consumers of changed ARIA/state attributes.
- Production-bundle behavior for the payroll unsaved-change warning.
- All unit tests, repository audits, and an isolated production build.

## 3. Findings and Disposition

| Area | Audit finding | Disposition |
| --- | --- | --- |
| Runtime dependencies | No existing package version changed in the Stage 1 lockfile delta. New packages are development-only lint/accessibility dependencies and their transitive dependencies. npm lock metadata was regenerated under the selected runtime. | No runtime dependency rollback required. |
| Node.js policy | Node.js 24 is required by the installed `@zxing/library@0.23.0` dependency and affects development/CI tooling, not browser execution. | Node.js 24.16.0 pin retained. |
| Report workflow errors | Existing validation state is passed through the workflow and route hooks; no duplicate state was introduced. The actual modal callbacks were not covered at the route level. | Runtime implementation retained; route and modal interaction coverage added. |
| Overtime base errors | The view clears the controller-owned base-hour validation error, including after a deferred discard confirmation. This cross-editor continuation was not covered by a component test. | Runtime implementation retained; deferred-switch regression coverage added. |
| Payroll navigation warning | `process.env.NODE_ENV` was correctly replaced with `import.meta.env.PROD`. The isolated production payroll bundle contains `beforeunload`; generated JavaScript contains no `process.env` reference. | Runtime implementation retained; production/development hook coverage added. |
| Message draft cleanup | Logout cleanup remains user-key scoped inside `useMessageDraftPersistence`; removing the stale component reference does not broaden deletion. | Existing focused regression retained; no correction required. |
| Inspection synchronization | Removed statements were unreachable after exhaustive returning catch branches. The `finally` block still releases synchronization state. | No correction required. |
| ARIA state changes | No stylesheet, end-to-end selector, or external test consumer depends on the removed unsupported `aria-invalid` attributes. Error descriptions and non-ARIA state markers remain. | No compatibility correction required. |
| Boolean/regex cleanup | Removed casts occur in boolean contexts and preserve truthiness. Regex escape cleanup preserves matching; the payroll claim-ID repair replaces a corrupted mojibake exclusion with the intended bullet/parenthesis boundary. | No correction required. |
| Buttons and image alternatives | Explicit button types prevent accidental form submission. Known report-image callers supply alternative text, and the component now enforces an explicit value. | No correction required. |
| Dependency advisory | Both production-only and full `npm audit` report the same two high entries for one React Router RSC-mode CSRF advisory. No RSC action path was identified in this browser SPA. The proposed `--force` remediation is a breaking downgrade. | Existing open security risk retained; no unsafe force-fix applied. |

No Stage 1 application-code regression was confirmed. The corrective work required by this audit was limited to strengthening regression tests and durable evidence.

## 4. Regression Coverage Added

Five additive tests were added across two new and two existing test files:

1. The Reports route clears rejection remarks errors when non-empty remarks are entered.
2. The Reports route clears declaration errors when the declaration is checked.
3. `useReportRouteActions` exposes both workflow validation-error setters unchanged.
4. Overtime settings clear stale base-hour errors after the user confirms leaving another active editor.
5. Payroll claim drafts register and remove `beforeunload` protection in production, and do not register it in development.

Focused result:

```text
Test Files  4 passed (4)
Tests       28 passed (28)
```

## 5. Full Validation Evidence

All commands used Node.js 24.16.0.

| Check | Result |
| --- | --- |
| ESLint | Pass; 0 errors and 0 warnings |
| Focused compatibility tests | Pass; 4 files / 28 tests |
| Full Vitest suite | Pass; 314 files / 1,711 tests in 373.82s |
| Test-count comparison | Prior: 312 files / 1,706 tests; current: +2 files / +5 tests; no tests removed |
| Hardcoded staff audit | Pass |
| Text contrast audit | Pass |
| Typography audit | Pass; 175 semantic and 61 direct declarations, 777 legacy small references tracked |
| Payroll hook-order contract | Pass |
| E2E module inventory contract | Pass; 50/50 mapped, 45 mapped and 5 partial, 0 qualified |
| System QA inventory generation | Pass; disposable output under `.codex-run/frontend-upgrade/` |
| Isolated Vite production build | Pass; 6,489 modules transformed in 13.06s |
| Production payroll bundle | `beforeunload` present; `process.env` absent |
| `git diff --check` | Pass |
| Tracked `build/` mutation | None |

The full suite continues to emit three non-failing JSDOM notices for unsupported pseudo-element `getComputedStyle()` behavior. This is unchanged from the implementation validation.

## 6. Residual Risks and Validation Boundary

- Authenticated browser workflows were not rerun because no VMECC backend, approved staging target, or approved test data is available locally.
- The production build retains the known static/dynamic import overlap for `WorkflowNotifications.js`.
- The build retains chunks above 500 kB: approximately 596.50 kB for `index`, 1,024.95 kB for `InspectionPage`, and 540.11 kB for CSS.
- Module inventory mapping is not journey qualification; all 50 modules remain unqualified for release evidence.
- Production headers, API origins, camera/device behavior, service-worker updates, and rollback remain unverified on a deployed origin.
- The React Router advisory still requires security ownership, applicability confirmation, and a time-bounded upgrade or exception decision.

These boundaries prevent a staging or production compatibility guarantee. They do not invalidate the local finding that the audited Stage 1 changes introduced no confirmed functional regression.

## 7. Promotion and Rollback Decision

- Keep implementation revision `b1b0804`; no application-code revert is justified by this audit.
- Keep the added compatibility tests as the regression guard for future stages.
- Do not deploy or mark Stage 1 release-ready based on local evidence alone.
- Preserve the rollback instructions in `FRONTEND_UPGRADE_STAGE_1_EXECUTION_2026-08-03.md`.
- Continue to Day 3 only within the existing local-review boundary until staging, owners, test data, and rollback evidence are available.
