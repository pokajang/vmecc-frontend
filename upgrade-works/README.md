# Frontend Upgrade Works

This directory is the durable index for the VMECC frontend code-quality, component-reuse, consistency, and maintainability upgrade programme. Release and hosting controls are retained as deferred safeguards rather than the programme's daily focus.

Application source, generated builds, temporary logs, screenshots, traces, and browser-test artifacts do not belong in this directory.

## Current Status

| Item                                | Status                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| Working branch                      | `codex/frontend-upgrade-stage-1`                                                                |
| Current stage                       | Stage 4 Days 29–32 actions/status/workflow plan ready; source work not started                  |
| Gate decision                       | **Days 25–28 passed; Days 29–32 bounded planning gate ready; deployment remains outside scope** |
| Application/tooling changes started | Yes; latest committed implementation checkpoint `0596fcb`                                       |
| Next planned implementation         | Stage 4 Day 29 — inventory action, loading, status, confirmation, and workflow presentation     |

## Document Register

| Document                                                                                                            | Purpose                                                                                                                                              | Status                                              |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [Frontend upgrade plan](./FRONTEND_UPGRADE_PLAN_2026-08-03.md)                                                      | Active Revision 2 plan for reuse-first component consolidation, consistent module implementation, proportional validation, and behavior preservation | Active; reprioritized 2026-08-04                    |
| [Preflight record](./FRONTEND_UPGRADE_PREFLIGHT_2026-08-03.md)                                                      | Repository, toolchain, artifact, environment, CI, service, and safety-gate baseline                                                                  | Completed; blocking actions open                    |
| [Stage 1 execution record](./FRONTEND_UPGRADE_STAGE_1_EXECUTION_2026-08-03.md)                                      | Day 1 lint repair, Day 2 correctness fixes, validation evidence, rollback, and residual risks                                                        | Days 1–2 locally completed; promotion blocked       |
| [Stage 1 compatibility audit](./FRONTEND_UPGRADE_STAGE_1_AUDIT_2026-08-03.md)                                       | Post-implementation diff review, functional-compatibility tests, full validation, and residual risks                                                 | Locally verified; promotion blocked                 |
| [Stage 1 Day 3 execution record](./FRONTEND_UPGRADE_STAGE_1_DAY_3_EXECUTION_2026-08-03.md)                          | Production headers, bundled Google icon, fail-closed production API configuration, validation, and rollback                                          | Locally completed; deployment qualification blocked |
| [GitHub Actions cost exception](./FRONTEND_UPGRADE_GITHUB_ACTIONS_EXCEPTION_2026-08-04.md)                          | Owner decision, disabled-workflow mechanism, compensating controls, restoration, and review deadline                                                 | Locally disabled; remote confirmation required      |
| [Stage 1 Day 5 execution record](./FRONTEND_UPGRADE_STAGE_1_DAY_5_EXECUTION_2026-08-04.md)                          | Compatible transitive advisory patches, React Router applicability decision, fail-closed exception control, validation, and rollback                 | Locally completed; exception review due 2026-09-04  |
| [Component reuse audit](./FRONTEND_COMPONENT_REUSE_AUDIT_2026-08-04.md)                                             | Day 6 component catalogue, import evidence, overlap analysis, false-positive controls, and Day 7 candidate backlog                                   | Completed; no application changes                   |
| [Component reuse execution plan](./FRONTEND_COMPONENT_REUSE_EXECUTION_PLAN_2026-08-04.md)                           | Detailed Days 8–13 task cards plus the bounded Days 7–20 gates, pilot sequencing, validation, and rollback controls                                  | Completed locally; Days 7–20 passed                 |
| [Component reuse pattern matrix](./FRONTEND_COMPONENT_REUSE_PATTERN_MATRIX_2026-08-04.md)                           | Days 7–10 evidence, style ownership, approved contracts, selected pilots, tests, and rollback boundaries                                             | Stage 2 completed                                   |
| [Stage 3 component reuse execution record](./FRONTEND_COMPONENT_REUSE_STAGE_3_EXECUTION_2026-08-04.md)              | Days 11–20 confirmation foundation, Staff canary, Holidays and Overtime pilots, full checkpoint, residual risks, and rollback                        | Stage 3 passed locally                              |
| [Stage 4 structure/navigation plan](./FRONTEND_COMPONENT_REUSE_STAGE_4_PLAN_2026-08-04.md)                          | Detailed Days 21–24 inventory, contract review, pilot gate, proportional validation, stop conditions, and rollback boundaries                        | Days 21–24 passed locally                           |
| [Stage 4 structure/navigation execution](./FRONTEND_COMPONENT_REUSE_STAGE_4_EXECUTION_2026-08-04.md)                | Final dispositions, compact mobile Back extraction, characterization, validation evidence, exceptions, and rollback boundary                         | Days 21–24 passed locally                           |
| [Stage 4 data-list/standard-state plan](./FRONTEND_COMPONENT_REUSE_STAGE_4_DATA_LISTS_PLAN_2026-08-04.md)           | Detailed Days 25–28 inventory, state-machine review, pilot selection, proportional validation, stop conditions, and rollback controls                | Days 25–28 passed locally                           |
| [Stage 4 data-list/standard-state execution](./FRONTEND_COMPONENT_REUSE_STAGE_4_DATA_LISTS_EXECUTION_2026-08-04.md) | Final dispositions, Work Shift collection migration, characterization, validation evidence, exceptions, and rollback boundary                        | Days 25–28 passed locally                           |
| [Stage 4 actions/status/workflow plan](./FRONTEND_COMPONENT_REUSE_STAGE_4_ACTIONS_STATUS_PLAN_2026-08-04.md)        | Detailed Days 29–32 inventory, semantic-ownership review, feature-local pilot gate, proportional validation, stop conditions, and rollback controls  | Planned; source work not started                    |

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
- Completed Days 11–13: established canonical `ActionConfirmModal` ownership, preserved all 31 shared-path importers, moved generic confirmation drawer styles out of Inspection ownership, and migrated only the Staff terminate/rehire canary.
- Passed the Days 11–13 gate with changed-file quality checks, a production build, and 6 focused test files / 21 tests; four `UserConfirmModal` importers and 18 render instances remain intentionally unchanged.
- Re-audited Days 11–13 against `a195e9f`, hardened the generic close-control touch target, and passed full lint, the pre-fix complete 317-file / 1,738-test suite, the post-fix 6-file / 24-test regression, compiled selector parity, and a production build.
- Completed Days 14–16: added the bounded `loadingMessage` contract, migrated `HolidaysTab` to `ResponsiveRecordCollection`, removed its direct mobile-list/loader branch, and corrected reduced-motion loader rule ordering.
- Passed the Holidays pilot with 10 pre-migration characterization tests, 37 final focused tests, changed-file quality checks, compiled motion-rule verification, and a production build.
- Completed Days 17–19: characterized `OvertimeRecordsTab`, migrated only its manual responsive collection shell, preserved selection/grouping/workflow composition, and added no workflow-specific shared prop.
- Passed the Overtime pilot with 8 pre-migration direct tests and 5 files / 38 focused final tests covering responsive action parity, keyboard access, footer behavior, security integration, and shared states.
- Completed the Day 20 checkpoint with full lint, 318 files / 1,753 tests, all seven applicable local audits, a 6,492-module production build, generated-output cleanup, import searches, and a full Stage 3 boundary review.
- Prepared the bounded Stage 4 Days 21–24 structure/navigation plan with preliminary usage evidence, explicit false-abstraction exclusions, a maximum pilot boundary, proportional validation, and rollback controls.
- Completed the Stage 4 structure/navigation inventory and retained the existing shared header/tab contracts plus the intentional Dashboard, profile, Messages, Inspection, detail-navigation, side-panel, and dormant-breadcrumb exceptions.
- Added characterization for the existing `BackButton`, Inspection module header actions, and Reports mobile Back behavior before changing production source.
- Extracted the exact duplicated Reports/Inspection compact mobile Back presentation into `MobileModuleBackAction` while keeping both handlers, guards, visibility rules, route choices, and state transitions local.
- Passed the Days 21–24 checkpoint with full lint, 321 test files / 1,762 tests, a 6,493-module production build, boundary searches, diff checks, and generated-output cleanup.
- Prepared the bounded Stage 4 Days 25–28 data-list and standard-state plan using current primitive adoption, manual-composition candidates, proportional validation, and explicit exclusions for specialized data/workflow views.
- Completed the Days 25–28 inventory and retained specialized Login Records filters, Leave, Payroll, Inspection, roster, workflow, and context-specific state implementations.
- Added untouched-source characterization for Custom Shifts loading, empty, error, responsive order, and Edit/Delete dialog behavior.
- Migrated only the Custom Shifts collection shell to `ResponsiveRecordCollection`, preserving its API, state, callbacks, table, mobile cards, messages, actions, classes, and document order.
- Passed the Days 25–28 checkpoint with changed-file quality checks, 3 files / 33 focused tests, a 6,493-module production build, boundary searches, diff checks, and generated-output cleanup.
- Prepared the bounded Stage 4 Days 29–32 actions/status/workflow plan with current adoption evidence, semantic false-positive controls, a feature-local role-assignment pilot candidate, and proportional validation.

## Deferred Release-Only Actions

These actions remain valid but do not block local component-quality work. Reopen them only when preparing a staging or production release.

1. Record named QA, operations/deployment, security/privacy, and production release decision owners.
2. Verify GitHub branch protection and required-check policy.
3. Identify approved staging frontend/backend origins and isolated test-data procedures.
4. Confirm the currently deployed build ID or designate another last-known-good artifact.
5. Execute and record a staging rollback drill.

## Next Work

Begin Stage 4 Days 29–32 as defined in the [actions/status/workflow plan](./FRONTEND_COMPONENT_REUSE_STAGE_4_ACTIONS_STATUS_PLAN_2026-08-04.md):

1. Regenerate production usage and manual-bypass evidence for actions, loading controls, statuses, confirmations, and workflow presentation.
2. Classify status and workflow ownership before considering any shared presentation change.
3. Characterize the exact Create Staff/Manage User Roles Add Assignment pair before source edits.
4. Approve the feature-local extraction only if type, event, disabled, form, and accessibility behavior are identical.

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
