# VMECC Frontend Upgrade Stage 1 Execution Record

**Recorded:** 2026-08-03  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Implementation revision:** `b1b080433a388fcfd0d05c1414abc84d13a7078d`  
**Scope completed:** Day 1 lint repair and locally executable Day 2 correctness repairs  
**Promotion decision:** **NOT APPROVED — local validation only**

## 1. Outcome

The corrected lint gate, runtime policy, confirmed correctness fixes, focused regressions, full unit suite, repository audits, clean install, and isolated production build pass locally. Stage 1 is not complete and no staging or production release is approved.

The remaining promotion blockers are unchanged: named approvers, protected-branch verification, approved staging origins and test data, backend integration, deployed-header/device validation, an identified last-known-good deployed artifact, and a demonstrated rollback drill.

## 2. Checkpoints

| Revision | Purpose | Status |
| --- | --- | --- |
| `3bfb03bb100332c744970ff8908579da686e1ad5` | Establish upgrade plan, index, and preflight record | Committed before tooling/application work |
| `3ae9e93` | Initial Node.js 22 policy checkpoint | Superseded after dependency-engine verification |
| `b1b080433a388fcfd0d05c1414abc84d13a7078d` | Final Node.js 24 policy, lint repair, correctness fixes, and regression tests | Locally validated implementation checkpoint |

No commit was pushed, merged, deployed, or used to overwrite the tracked `build/` directory during this execution.

## 3. Runtime Decision

Node.js 22.23.1 was initially selected to match the previous CI major version. A clean `npm ci --ignore-scripts` under Node.js 22 then reported that `@zxing/library@0.23.0`, required by `@zxing/browser@0.2.1`, declares Node.js `>=24.0.0`.

The final policy is therefore:

- `.nvmrc`: `24.16.0`
- `package.json`: `engines.node: 24.x`
- GitHub Actions setup: `24.16.0`
- README requirement: Node.js 24.16.0 LTS

A clean install under Node.js 24.16.0 completed without an engine warning. This version is also the locally installed runtime used for final validation.

## 4. Pre-change Lint Evidence

The original flat configuration spread the React configurations and then replaced their `rules` object with the Hooks rules. Effective configuration inspection showed Prettier and Hooks enforcement but no blocking `no-undef`, `no-unreachable`, or React core rules.

The no-autofix probe reported:

| Rule | Findings | Classification |
| --- | ---: | --- |
| `no-unused-vars` | 705 | Existing migration backlog; not made blocking in this checkpoint |
| `no-undef` | 9 | 7 genuine source references and 2 intentional service-worker template placeholders |
| `no-unreachable` | 1 | Genuine unreachable extinguisher-sync block |
| **Total** | **715** | 555 files contained at least one probe finding |

After correcting runtime contexts, the first full corrected-rule run reduced 157 raw findings to 44 actionable findings. The removed set was primarily Playwright code executed inside browser callbacks but initially evaluated with Node-only globals. No autofix was used.

## 5. Lint Configuration Implemented

- Added direct `@eslint/js` and `eslint-plugin-jsx-a11y` development dependencies.
- Enabled the official JavaScript recommended rules for JavaScript, JSX, MJS, and CJS files.
- Correctly merged React recommended, JSX runtime, React Hooks, and Prettier rules.
- Registered React under the standard `react` namespace.
- Scoped browser source, Node scripts/configuration, Vitest tests, Playwright browser callbacks, and service-worker globals separately.
- Declared only the two service-worker build placeholders as readonly globals.
- Enabled high-confidence accessibility rules for alternative text and ARIA validity/support.
- Explicitly enabled `react/button-has-type`.
- Retained `no-unused-vars` as off pending a measured ratchet, and retained `react/prop-types` as off because the repository has neither systematic PropTypes coverage nor a static type system.
- Added narrow, explained `no-control-regex` exceptions only where control characters are intentionally stripped from Windows filenames.

Representative effective configurations were inspected for:

- `src/App.js` — browser/React rules, no Node globals
- `scripts/audit-hardcoded-staff.mjs` — Node globals, no React-only requirement
- `src/components/__tests__/NotificationDrawer.test.jsx` — browser, Node, Vitest, React, and accessibility rules
- `src/service-worker/service-worker.template.js` — service-worker globals and readonly build placeholders

A temporary untracked verification fixture containing `missingRuntimeReference()` made ESLint exit `1` with `no-undef`. The fixture was then removed. The service-worker template passes without suppressing `no-undef` globally.

## 6. Correctness and Accessibility Repairs

| Area | Repair |
| --- | --- |
| Message drafts | Removed stale component-level access to `draftsStorageKeyRef`; logout cleanup remains owned and tested inside `useMessageDraftPersistence` and deletes only the authenticated user's draft key. |
| Report workflow | Exposed the existing rejection/declaration error setters through the workflow and route hooks instead of duplicating state. |
| Overtime settings | Exposed the existing base-error setter from its controller so edit entry clears the correct validation state. |
| Inspection sync | Removed the unreachable progress refresh and return after exhaustive catch branches. |
| Overtime request | Added the missing `CFormCheck` import for overnight confirmation. |
| Buttons | Added explicit non-submit button types, including test doubles caught by the final blocking rule. |
| Async cleanup | Removed unsafe returns from `finally` blocks while preserving mounted/request guards. |
| Accessibility | Made image alternative text explicit and replaced unsupported `aria-invalid` uses on region/group roles with non-ARIA state markers while preserving alert descriptions. |
| Payroll | Corrected a corrupted claim-ID extraction character class and removed redundant boolean casts/escapes. |
| General correctness | Resolved the remaining blocking recommended-rule findings, added memo component display names, and documented intentional filename control-character matching. |

## 7. Regression Coverage

New or extended tests cover:

- authenticated message-draft deletion on logout
- workflow rejection/declaration error setters
- overtime base validation-error ownership
- overnight confirmation control rendering
- notification close-button type
- accessible error description/state on `WorkflowSetupField`
- existing extinguisher synchronization and report image behavior through focused regression runs

Final authoritative unit result after a clean Node.js 24.16.0 install:

```text
Test Files  312 passed (312)
Tests       1706 passed (1706)
Duration    384.89s
```

Cross-version evidence: the same 312 files and 1,706 tests also passed under Node.js 22.23.1 in 475.40 seconds before the policy was corrected. Three JSDOM informational messages about pseudo-element `getComputedStyle()` remain; they did not fail tests.

## 8. Other Verification

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts` on Node.js 24.16.0 | Pass; 552 packages installed, no engine warning |
| `npm run lint` | Pass; 0 errors and 0 warnings |
| Hardcoded staff audit | Pass; no hardcoded staff literals found |
| Text contrast audit | Pass |
| Typography audit | Pass; 175 semantic and 61 direct declarations, 777 legacy small references tracked |
| E2E module inventory contract | Pass; 50/50 catalog modules mapped, 45 mapped and 5 partial, none yet qualified |
| Payroll hook-order contract | Pass |
| Isolated Vite production build | Pass; 6,489 modules transformed in 11.65s |
| Tracked `build/` mutation | None |

Final package hashes:

| File | SHA-256 |
| --- | --- |
| `package.json` | `685B4738EFF300E4C4ED543B31D3A8386109E2C8D4B30627A3F8FB45171D2EC6` |
| `package-lock.json` | `A5108485CB216BA83D7D36B0FC6BA6ECF501E8C15F698414C94C3CB639D4AEA7` |

## 9. Open Risks and Deferred Work

1. `no-unused-vars` has a 705-finding baseline and is currently off. Day 4 must add a measured ratchet before it can become blocking.
2. `react/prop-types` remains off until PropTypes or a static type strategy is approved.
3. `npm audit` reports two high entries representing one React Router RSC-mode CSRF advisory (`GHSA-qwww-vcr4-c8h2`). The application is built as a browser SPA and no RSC action path was identified, but security ownership, applicability confirmation, and a time-bounded resolution/exception are still required.
4. The build reports a static/dynamic import overlap for `WorkflowNotifications.js`.
5. Minified chunks remain above 500 kB: `index` is about 596.50 kB and `InspectionPage` about 1,024.95 kB. CSS is about 540.11 kB.
6. E2E inventory mapping is not qualification: 0 of 50 modules are currently marked qualified.
7. No VMECC backend was available for local integration testing, and no approved staging environment or test data was supplied.
8. Production camera/header behavior, CSP, API origin, service-worker update behavior, and rollback remain unverified on a deployed origin and real devices.

## 10. Rollback

- Revert `b1b0804` to remove the final lint configuration, dependency declarations, runtime correction, correctness repairs, and new regressions as one local implementation unit.
- If returning fully to the pre-upgrade runtime policy, revert `3ae9e93` after reverting `b1b0804`.
- Do not use the locally generated `.codex-run/frontend-upgrade/` build as a production rollback artifact.
- The committed historical `build/version.json` remains only a rollback candidate until operations confirms it matches a known deployed artifact.

## 11. Next Safe Work

Proceed to the locally reviewable parts of Day 3: production header/source configuration, API-origin validation, and CSP-compatible asset review. Do not claim completion or deploy until the actual staging/production serving layers, approved origins, devices, owners, and rollback procedure are available.
