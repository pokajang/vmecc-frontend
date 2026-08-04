# Frontend Upgrade Works

This directory is the durable index for the VMECC frontend code-quality, component-reuse, consistency, and maintainability upgrade programme. Release and hosting controls are retained as deferred safeguards rather than the programme's daily focus.

Application source, generated builds, temporary logs, screenshots, traces, and browser-test artifacts do not belong in this directory.

## Current Status

| Item | Status |
| --- | --- |
| Working branch | `codex/frontend-upgrade-stage-1` |
| Current stage | Stage 2 Days 7–10 completed; Stage 3 Days 11–13 confirmation foundation authorized |
| Gate decision | **Open for the bounded local confirmation foundation and one Staff canary; deployment remains outside scope** |
| Application/tooling changes started | Yes; latest implementation checkpoint `4cff7bd` |
| Next planned implementation | Day 11 — add the canonical confirmation component behind the existing shared path |

## Document Register

| Document | Purpose | Status |
| --- | --- | --- |
| [Frontend upgrade plan](./FRONTEND_UPGRADE_PLAN_2026-08-03.md) | Active Revision 2 plan for reuse-first component consolidation, consistent module implementation, proportional validation, and behavior preservation | Active; reprioritized 2026-08-04 |
| [Preflight record](./FRONTEND_UPGRADE_PREFLIGHT_2026-08-03.md) | Repository, toolchain, artifact, environment, CI, service, and safety-gate baseline | Completed; blocking actions open |
| [Stage 1 execution record](./FRONTEND_UPGRADE_STAGE_1_EXECUTION_2026-08-03.md) | Day 1 lint repair, Day 2 correctness fixes, validation evidence, rollback, and residual risks | Days 1–2 locally completed; promotion blocked |
| [Stage 1 compatibility audit](./FRONTEND_UPGRADE_STAGE_1_AUDIT_2026-08-03.md) | Post-implementation diff review, functional-compatibility tests, full validation, and residual risks | Locally verified; promotion blocked |
| [Stage 1 Day 3 execution record](./FRONTEND_UPGRADE_STAGE_1_DAY_3_EXECUTION_2026-08-03.md) | Production headers, bundled Google icon, fail-closed production API configuration, validation, and rollback | Locally completed; deployment qualification blocked |
| [GitHub Actions cost exception](./FRONTEND_UPGRADE_GITHUB_ACTIONS_EXCEPTION_2026-08-04.md) | Owner decision, disabled-workflow mechanism, compensating controls, restoration, and review deadline | Locally disabled; remote confirmation required |
| [Stage 1 Day 5 execution record](./FRONTEND_UPGRADE_STAGE_1_DAY_5_EXECUTION_2026-08-04.md) | Compatible transitive advisory patches, React Router applicability decision, fail-closed exception control, validation, and rollback | Locally completed; exception review due 2026-09-04 |
| [Component reuse audit](./FRONTEND_COMPONENT_REUSE_AUDIT_2026-08-04.md) | Day 6 component catalogue, import evidence, overlap analysis, false-positive controls, and Day 7 candidate backlog | Completed; no application changes |
| [Component reuse execution plan](./FRONTEND_COMPONENT_REUSE_EXECUTION_PLAN_2026-08-04.md) | Detailed Days 8–13 task cards plus the bounded Days 7–20 gates, pilot sequencing, validation, and rollback controls | In progress; Days 11–13 authorized |
| [Component reuse pattern matrix](./FRONTEND_COMPONENT_REUSE_PATTERN_MATRIX_2026-08-04.md) | Days 7–10 evidence, style ownership, approved contracts, selected pilots, tests, and rollback boundaries | Stage 2 completed |

## Completed Work

### 2026-08-03

- Completed the frontend code-quality audit.
- Created and hardened the original frontend upgrade plan, which Git history retains as Revision 1.1.
- Created the dedicated local branch `codex/frontend-upgrade-stage-1`.
- Captured the repository, toolchain, package, build, environment-name, security-header, CI, and local-service baselines.
- Identified the preflight blockers that must be resolved before Day 1 implementation.
- Confirmed that no application, tooling, dependency, test, or generated build source was changed during preflight.
- Received repository-owner authorization to begin local-only Stage 1 work while keeping staging and production promotion blocked.
- Committed the programme documentation checkpoint as `3bfb03b`.
- Initially tested Node.js `22.23.1`, then corrected the repository and CI policy to Node.js `24.16.0` after clean install exposed `@zxing/library@0.23.0` requiring Node.js 24 or newer.
- Repaired ESLint so JavaScript, React, Hooks, accessibility, tests, scripts, and service-worker contexts enforce the intended rules.
- Fixed all blocking undefined, unreachable, React, accessibility, and JavaScript recommended-rule findings without autofix.
- Added focused regression coverage and passed 312 test files / 1,706 tests under the final Node.js runtime.
- Passed the clean install, lint, repository audits, and isolated production build at implementation revision `b1b0804`.
- Audited the complete Stage 1 implementation diff for accidental behavior changes; no application-code regression was confirmed.
- Added five compatibility tests and passed 314 test files / 1,711 tests, all static audits, and a second isolated production build.
- Synchronized the security-header sources, limited camera to the application origin, kept unrelated capabilities disabled, and removed the remote Google icon CSP dependency.
- Removed the silent production localhost API fallback, added fail-closed production build validation and a production-configuration audit, and passed 315 test files / 1,728 tests.

### 2026-08-04

- Disabled GitHub Actions in repository configuration by moving the workflow outside `.github/workflows/`; remote workflow disablement still requires GitHub UI/default-branch confirmation.
- Recorded Day 4 as deferred rather than passed; local validation remains the compensating control and Stage 1 promotion remains blocked.
- Patched the compatible development-only `brace-expansion` and `undici` advisories without forcing or downgrading any direct dependency.
- Documented the React Router RSC-only advisory as not applicable to the current declarative BrowserRouter SPA, with a fail-closed local audit and mandatory review on 2026-09-04.
- Reconfirmed compatibility with 315 test files / 1,728 tests, lint, all local audits, clean install, targeted route/auth/guard tests, and an isolated production build.
- Replaced the unexecuted post-Stage-1 roadmap with Revision 2, prioritizing component reuse, duplication reduction, module consistency, behavior-preserving migration, and proportionate validation.
- Completed the Day 6 component reuse inventory: 124 production component files catalogued, usage measured, false duplication separated from compatibility façades, and candidate families ordered for Day 7.
- Created the bounded Days 7–20 component-reuse execution plan with decision-before-code gates, two pilot migrations, proportionate validation, and rollback boundaries.
- Completed the Day 7 pattern matrix: eight candidate families dispositioned, all six responsive-list candidates classified, unused-code removal conditions recorded, and speculative confirmation variants rejected.
- Expanded the active execution plan with detailed Days 8–13 inputs, task sequences, decisions, acceptance gates, validation commands, commit boundaries, stop conditions, and rollback controls.
- Completed Days 8–10: mapped style ownership, approved three bounded component contracts, selected `StaffActionModals` as the confirmation canary, and selected Holidays/Overtime as the collection pilots.

## Deferred Release-Only Actions

These actions remain valid but do not block local component-quality work. Reopen them only when preparing a staging or production release.

1. Record named QA, operations/deployment, security/privacy, and production release decision owners.
2. Verify GitHub branch protection and required-check policy.
3. Identify approved staging frontend/backend origins and isolated test-data procedures.
4. Confirm the currently deployed build ID or designate another last-known-good artifact.
5. Execute and record a staging rollback drill.

## Next Work

Continue with Stage 3 Days 11–13 as defined in the [component reuse execution plan](./FRONTEND_COMPONENT_REUSE_EXECUTION_PLAN_2026-08-04.md):

1. Add canonical `src/components/ActionConfirmModal.js` while preserving the old shared import path.
2. Add narrowly scoped generic drawer/confirmation styles with no intended visual change.
3. Add focused contract and compatibility tests.
4. Migrate only `StaffActionModals` as the first User-family canary.

## File Naming

Use uppercase descriptive names with an ISO date where the document is a dated snapshot:

```text
FRONTEND_UPGRADE_<DOCUMENT_TYPE>_YYYY-MM-DD.md
```

Recommended document types include:

- `PLAN`
- `PREFLIGHT`
- `STAGE_1_EXECUTION`
- `STAGE_1_RELEASE`
- `STAGE_2_EXECUTION`
- `STAGE_2_RELEASE`
- `STAGE_3_EXECUTION`
- `STAGE_3_RELEASE`
- `DECISION_LOG`
- `RISK_REGISTER`
- `FINAL_REPORT`

Use `README.md` only as this living directory index.

## Evidence Storage

- Durable plans, decisions, summaries, risk records, and release records: `upgrade-works/`
- Generated local evidence, raw logs, temporary builds, and scans: `.codex-run/frontend-upgrade/`
- Playwright output: the configured ignored test/evidence directory
- CI evidence: immutable CI artifacts linked from the relevant durable summary

Do not commit credentials, environment values, personal information, payroll data, report contents, attachments, raw production payloads, or unredacted screenshots/traces.

## Update Rule

Update this index whenever:

- a gate decision changes
- a stage begins or ends
- a new durable programme document is added
- a risk is accepted, closed, or escalated
- a release candidate is approved, rejected, deployed, or rolled back

The index must link to evidence; it must not claim completion based only on a passing summary.
