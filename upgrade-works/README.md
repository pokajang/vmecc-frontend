# Frontend Upgrade Works

This directory is the durable index for the VMECC frontend code-quality, component-reuse, consistency, and maintainability upgrade programme. Release and hosting controls are retained as deferred safeguards rather than the programme's daily focus.

Application source, generated builds, temporary logs, screenshots, traces, and browser-test artifacts do not belong in this directory.

## Current Status

| Item                                | Status                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| Working branch                      | `main`; locally qualified release commits are not yet pushed                                  |
| Current stage                       | Stages 1–6 and Days 1–61 completed locally; Stage 6 closed on 2026-08-10                      |
| Gate decision                       | **Local predeployment gates passed; push and hosted deployment remain separately authorized** |
| Application/tooling changes started | Completed; security dependency patches and production build are locally qualified             |
| Next planned implementation         | None; next boundary is reviewed `main` push followed by the hosted runbook                    |

## Document Register

| Document                                                                                                                                       | Purpose                                                                                                                                                     | Status                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [Frontend upgrade plan](./FRONTEND_UPGRADE_PLAN_2026-08-03.md)                                                                                 | Revision 2 plan for reuse-first component consolidation, consistent module implementation, proportional validation, and behavior preservation               | Completed locally through Day 61                        |
| [Preflight record](./FRONTEND_UPGRADE_PREFLIGHT_2026-08-03.md)                                                                                 | Repository, toolchain, artifact, environment, CI, service, and safety-gate baseline                                                                         | Completed; blocking actions open                        |
| [Stage 1 execution record](./FRONTEND_UPGRADE_STAGE_1_EXECUTION_2026-08-03.md)                                                                 | Day 1 lint repair, Day 2 correctness fixes, validation evidence, rollback, and residual risks                                                               | Days 1–2 locally completed; promotion blocked           |
| [Stage 1 compatibility audit](./FRONTEND_UPGRADE_STAGE_1_AUDIT_2026-08-03.md)                                                                  | Post-implementation diff review, functional-compatibility tests, full validation, and residual risks                                                        | Locally verified; promotion blocked                     |
| [Stage 1 Day 3 execution record](./FRONTEND_UPGRADE_STAGE_1_DAY_3_EXECUTION_2026-08-03.md)                                                     | Production headers, bundled Google icon, fail-closed production API configuration, validation, and rollback                                                 | Locally completed; deployment qualification blocked     |
| [GitHub Actions cost exception](./FRONTEND_UPGRADE_GITHUB_ACTIONS_EXCEPTION_2026-08-04.md)                                                     | Owner decision, disabled-workflow mechanism, compensating controls, restoration, and review deadline                                                        | Locally disabled; remote confirmation required          |
| [Stage 1 Day 5 execution record](./FRONTEND_UPGRADE_STAGE_1_DAY_5_EXECUTION_2026-08-04.md)                                                     | Compatible transitive advisory patches, React Router applicability decision, fail-closed exception control, validation, and rollback                        | Locally completed; exception review due 2026-09-04      |
| [Component reuse audit](./FRONTEND_COMPONENT_REUSE_AUDIT_2026-08-04.md)                                                                        | Day 6 component catalogue, import evidence, overlap analysis, false-positive controls, and Day 7 candidate backlog                                          | Completed; no application changes                       |
| [Component reuse execution plan](./FRONTEND_COMPONENT_REUSE_EXECUTION_PLAN_2026-08-04.md)                                                      | Detailed Days 8–13 task cards plus the bounded Days 7–20 gates, pilot sequencing, validation, and rollback controls                                         | Completed locally; Days 7–20 passed                     |
| [Component reuse pattern matrix](./FRONTEND_COMPONENT_REUSE_PATTERN_MATRIX_2026-08-04.md)                                                      | Days 7–10 evidence, style ownership, approved contracts, selected pilots, tests, and rollback boundaries                                                    | Stage 2 completed                                       |
| [Stage 3 component reuse execution record](./FRONTEND_COMPONENT_REUSE_STAGE_3_EXECUTION_2026-08-04.md)                                         | Days 11–20 confirmation foundation, Staff canary, Holidays and Overtime pilots, full checkpoint, residual risks, and rollback                               | Stage 3 passed locally                                  |
| [Stage 4 structure/navigation plan](./FRONTEND_COMPONENT_REUSE_STAGE_4_PLAN_2026-08-04.md)                                                     | Detailed Days 21–24 inventory, contract review, pilot gate, proportional validation, stop conditions, and rollback boundaries                               | Days 21–24 passed locally                               |
| [Stage 4 structure/navigation execution](./FRONTEND_COMPONENT_REUSE_STAGE_4_EXECUTION_2026-08-04.md)                                           | Final dispositions, compact mobile Back extraction, characterization, validation evidence, exceptions, and rollback boundary                                | Days 21–24 passed locally                               |
| [Stage 4 data-list/standard-state plan](./FRONTEND_COMPONENT_REUSE_STAGE_4_DATA_LISTS_PLAN_2026-08-04.md)                                      | Detailed Days 25–28 inventory, state-machine review, pilot selection, proportional validation, stop conditions, and rollback controls                       | Days 25–28 passed locally                               |
| [Stage 4 data-list/standard-state execution](./FRONTEND_COMPONENT_REUSE_STAGE_4_DATA_LISTS_EXECUTION_2026-08-04.md)                            | Final dispositions, Work Shift collection migration, characterization, validation evidence, exceptions, and rollback boundary                               | Days 25–28 passed locally                               |
| [Stage 4 actions/status/workflow plan](./FRONTEND_COMPONENT_REUSE_STAGE_4_ACTIONS_STATUS_PLAN_2026-08-04.md)                                   | Detailed Days 29–32 inventory, semantic-ownership review, feature-local pilot gate, proportional validation, stop conditions, and rollback controls         | Days 29–32 passed locally                               |
| [Stage 4 actions/status/workflow execution](./FRONTEND_COMPONENT_REUSE_STAGE_4_ACTIONS_STATUS_EXECUTION_2026-08-04.md)                         | Final dispositions, role-assignment action extraction, characterization, validation evidence, exceptions, and rollback boundary                             | Days 29–32 passed locally                               |
| [Stage 4 forms/dialogs plan](./FRONTEND_COMPONENT_REUSE_STAGE_4_FORMS_DIALOGS_PLAN_2026-08-04.md)                                              | Detailed Days 33–36 form/dialog inventory, ERCO pilot gate, focus and dismissal checks, full Stage 4 checkpoint, stop conditions, and rollback controls     | Days 33–36 passed locally                               |
| [Stage 4 forms/dialogs execution](./FRONTEND_COMPONENT_REUSE_STAGE_4_FORMS_DIALOGS_EXECUTION_2026-08-04.md)                                    | Final dispositions, ERCO responsive-shell extraction, characterization, full Stage 4 validation, cumulative boundary, and rollback                          | Stage 4 passed locally                                  |
| [Stage 5 cleanup plan](./FRONTEND_COMPONENT_REUSE_STAGE_5_CLEANUP_PLAN_2026-08-04.md)                                                          | Detailed Days 37–39 zero-use proof, approved template/PWA cleanup, retained-adapter conditions, validation, stop controls, and rollback                     | Days 37–39 passed locally                               |
| [Stage 5 cleanup execution](./FRONTEND_COMPONENT_REUSE_STAGE_5_CLEANUP_EXECUTION_2026-08-04.md)                                                | Final reference proof, exact deletions, retained adapters, active PWA protections, validation, build cleanup, boundary, and rollback                        | Days 37–39 passed locally                               |
| [Stage 5 consistency plan](./FRONTEND_COMPONENT_REUSE_STAGE_5_CONSISTENCY_PLAN_2026-08-05.md)                                                  | Detailed Day 40 real-user journeys, representative consumers, viewport/state matrix, evidence rubric, bounded corrections, validation, and rollback         | Day 40 passed locally                                   |
| [Stage 5 consistency execution](./FRONTEND_COMPONENT_REUSE_STAGE_5_CONSISTENCY_EXECUTION_2026-08-05.md)                                        | Five-family dispositions, responsive evidence, Family C corrections, fixture blocker, validation, cleanup, boundary, and rollback                           | Day 40 passed locally                                   |
| [Stage 5 final checkpoint plan](./FRONTEND_COMPONENT_REUSE_STAGE_5_FINAL_CHECKPOINT_PLAN_2026-08-05.md)                                        | Day 41 cumulative architecture review, complete local gates, audit applicability, correction controls, build cleanup, and rollback                          | Day 41 passed locally                                   |
| [Stage 5 final checkpoint execution](./FRONTEND_COMPONENT_REUSE_STAGE_5_FINAL_CHECKPOINT_EXECUTION_2026-08-05.md)                              | Final architecture/behavior audit, full local gates, applicability decisions, build cleanup, advisories, residual risks, and Day 42 handover                | Day 41 passed locally                                   |
| [Stage 5 completion/handover plan](./FRONTEND_COMPONENT_REUSE_STAGE_5_COMPLETION_PLAN_2026-08-05.md)                                           | Day 42 repository-derived catalogue, adoption matrix, adapter/exception register, contributor guidance, release impact, closure controls, and rollback      | Day 42 passed locally                                   |
| [Final component reuse catalogue](./FRONTEND_COMPONENT_REUSE_CATALOGUE_2026-08-05.md)                                                          | Current shared-component registry, resolved consumer counts, adoption contracts, adapters, exceptions, removed surfaces, and reuse-first guidance           | Final repository-derived reference                      |
| [Stage 5 completion/handover execution](./FRONTEND_COMPONENT_REUSE_STAGE_5_COMPLETION_EXECUTION_2026-08-05.md)                                 | Programme outcomes, final inventory, validation inheritance, rollback, residual risks, shared-cPanel release impact, and maintenance handover               | Programme completed locally                             |
| [Post-refactor E2E audit](./FRONTEND_POST_REFACTOR_E2E_AUDIT_2026-08-05.md)                                                                    | Cumulative first-day-to-handover review, full local gates, isolated authenticated Playwright coverage, failure attribution, and cleanup                     | No application regression confirmed; gaps closed Day 43 |
| [Module consistency and reuse plan](./FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md)                                                | Stage 6 Days 43–61 E2E hardening, evidence-led reuse families, proportional gates, mishap controls, and shared-cPanel boundary                              | Completed locally; Days 43-61 passed                    |
| [Stage 6 Day 43 execution](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_DAY_43_EXECUTION_2026-08-05.md)                                               | Semantic locator repairs, loopback-only mocked API contract, PWA navigation tolerance, validation evidence, and cleanup                                     | Day 43 passed locally                                   |
| [Stage 6 filter/search plan](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_FILTER_SEARCH_PLAN_2026-08-05.md)                                           | Detailed Days 44-46 inventory matrix, candidate scoring, characterization gate, one-pilot boundary, validation, mishap controls, and rollback               | Days 44-46 passed locally                               |
| [Stage 6 filter/search execution](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_FILTER_SEARCH_EXECUTION_2026-08-05.md)                                 | Complete adopter/specialist inventory, Inspection toolbar pilot, characterization, browser and full-suite evidence, cleanup, rollback, and deferrals        | Days 44-46 passed locally                               |
| [Stage 6 Inspection toolbar completion plan](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_INSPECTION_TOOLBAR_COMPLETION_PLAN_2026-08-06.md)           | Detailed Days 47-49 characterization, ordered Hydraulic/ER Aux/High Angle migrations, real-source browser journeys, stop controls, validation, and rollback | Days 47-49 passed locally                               |
| [Stage 6 Inspection toolbar completion execution](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_INSPECTION_TOOLBAR_COMPLETION_EXECUTION_2026-08-06.md) | Final behavior matrix, three consumer migrations, unit/browser/full-suite evidence, failure attribution, cleanup, and rollback boundaries                   | Days 47-49 passed locally                               |
| [Cross-module shared component audit](./FRONTEND_CROSS_MODULE_SHARED_COMPONENT_AUDIT_2026-08-06.md)                                            | Inspection/ERCO/Fitness/Drill UI and journey audit, safe consolidation candidates, false-abstraction boundaries, test evidence, and implementation order    | Completed; scheduling decision pending                  |
| [Cross-module corrective execution](./FRONTEND_CROSS_MODULE_SHARED_COMPONENT_CORRECTIVE_EXECUTION_2026-08-06.md)                               | Shared report breakpoint, responsive dialog and edit-state banner implementation, consumer migrations, findings, validation, and rollback                   | Completed locally                                       |
| [Stage 6 page headers/action bars plan](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_PAGE_HEADERS_ACTION_BARS_PLAN_2026-08-06.md)                     | Days 50–52 inventory, specialist boundaries, existing-primitive pilot, long-title characterization, validation, and rollback controls                       | Days 50–52 passed locally                               |
| [Stage 6 page headers/action bars execution](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_PAGE_HEADERS_ACTION_BARS_EXECUTION_2026-08-06.md)           | Adoption counts, final dispositions, wrap-safety correction, behavior-preservation evidence, validation, and rollback                                       | Days 50–52 passed locally                               |
| [Stage 6 form sections/validation plan](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_FORM_SECTIONS_VALIDATION_PLAN_2026-08-06.md)                     | Days 53–55 inventory, candidate boundaries, pilot characterization, accessibility gates, validation, stop conditions, and rollback                          | Days 53–55 passed locally                               |
| [Stage 6 form sections/validation execution](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_FORM_SECTIONS_VALIDATION_EXECUTION_2026-08-06.md)           | Final inventory, field-error primitive and pilots, accessibility correction, test/build/browser evidence, cleanup, and rollback                             | Days 53–55 passed locally                               |
| [Stage 6 detail/summary plan](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_DETAIL_SUMMARY_PLAN_2026-08-06.md)                                         | Days 56–58 inventory, existing-primitive pilot, semantic characterization, responsive validation, stop conditions, and rollback                             | Days 56–58 passed locally                               |
| [Stage 6 detail/summary execution](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_DETAIL_SUMMARY_EXECUTION_2026-08-06.md)                               | Final inventory, two Leave consumer migrations, test-first and browser evidence, failure attribution, cleanup, and rollback                                 | Days 56–58 passed locally                               |
| [Stage 6 state/recovery plan](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_STATE_RECOVERY_PLAN_2026-08-06.md)                                         | Days 59–60 state taxonomy, existing-primitive evidence gate, transition characterization, responsive validation, mishap controls, and rollback              | Days 59–60 passed locally                               |
| [Stage 6 state/recovery execution](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_STATE_RECOVERY_EXECUTION_2026-08-06.md)                               | Final state dispositions, five missing-record migrations, test-first/browser evidence, failure attribution, cleanup, and rollback                           | Days 59–60 passed locally                               |
| [Stage 6 final checkpoint plan](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_FINAL_CHECKPOINT_PLAN_2026-08-06.md)                                     | Day 61 cumulative tracked/untracked audit, full local gates, browser/build evidence, catalogue reconciliation, cleanup, and handover                        | Executed; passed locally                                |
| [Stage 6 final checkpoint execution](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_FINAL_CHECKPOINT_EXECUTION_2026-08-10.md)                           | Final ownership verdicts, catalogue counts, complete local gate and journey evidence, cleanup, residual risks, rollback, and close decision                 | Stage 6 passed and closed locally                       |
| [Predeployment execution](./FRONTEND_PREDEPLOYMENT_EXECUTION_2026-08-10.md)                                                                    | Frontend/backend dependency remediation, isolated PostgreSQL qualification, complete local gates, release boundary, cleanup, and next-stage decision        | Local predeployment gates passed                        |

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
- Completed the Days 29–32 inventory and retained the global create-action contract, manual domain controls, loading presentations, domain statuses, workflow controllers, approval gates, and confirmation wrappers where their contracts or meanings differ.
- Added untouched-source characterization for the Create Staff and Manage User Roles Add Assignment buttons, including effective type, presentation, event forwarding, form safety, and loading locks.
- Extracted only the exact duplicate role-assignment Add presentation into feature-local `RoleAssignmentAddButton`, while preserving each consumer's label, callback, form/modal structure, role and scope rules, validation, state, and persistence behavior.
- Passed the Days 29–32 checkpoint with changed-file quality checks, 5 focused files / 31 tests, a 6,494-module production build, guarded generated-output cleanup, boundary searches, and diff checks.
- Prepared the bounded Stage 4 Days 33–36 forms/dialogs plan from 60 production `CModal` files, established shared-contract adoption, explicit false-abstraction exclusions, and an exact two-component ERCO responsive-shell candidate.
- Set the Day 36 exit gate to full lint, the complete unit suite, applicable repository audits, production build, guarded output cleanup, and a cumulative Stage 4 boundary review.
- Completed the Days 33–36 inventory and retained domain forms, validation, confirmation wrappers, workflow dialogs, attachment previews, auth flows, and lifecycle modals where their contracts differ.
- Added untouched-source characterization for the exact ERCO chronology-initialization and PreMob-mode responsive shells, including breakpoint, modal/drawer classes, action type/order, event forwarding, form safety, Escape dismissal, and focus restoration.
- Extracted only those duplicate branches into feature-local `ErcoResponsiveActionModal`, preserving each consumer's title, body, buttons, colors, callbacks, and chronology state.
- Passed the Day 36 and full Stage 4 checkpoint with full lint, 324 files / 1,779 tests, all applicable local audits, a 6,495-module production build, guarded cleanup, and the cumulative Stage 4 diff review.
- Prepared the bounded Stage 5 Days 37–39 cleanup plan with reproducible zero-runtime-use proof for `AppBreadcrumb`, `DocsLink`, and the dormant PWA banner surface, while retaining active adapters and install behavior.
- Completed Days 37–39 by removing only those three unmounted components and their exclusive barrel, hook, test, selector, and E2E residue in two independently reversible commits.
- Preserved active PWA installation and every compatibility surface with consumers; passed full lint, 3 files / 9 retained PWA tests, affected audits, a 6,493-module production build, guarded cleanup, and the exact implementation boundary.

### 2026-08-05

- Prepared the bounded Day 40 consistency-review plan around the five component families changed in Stages 3–4, representative HR/admin/reporting journeys, primary desktop/mobile modes, targeted breakpoint probes, and evidence-before-code gates.
- Completed the Day 40 consistency review: retained four coherent families, fixed mobile record intrinsic-width overflow, and routed Custom Shifts through the standard shared empty-state presentation.
- Passed changed-file formatting and lint, 15 focused files / 105 tests, representative breakpoint/theme checks, a 6,493-module production build, generated-output cleanup, and the exact implementation boundary.
- Recorded authenticated browser journeys as fixture-blocked by the unavailable local PostgreSQL service rather than treating them as either a frontend pass or failure.
- Prepared the bounded Day 41 final-checkpoint plan with the cumulative `2425780..HEAD` comparison, complete local quality gates, explicit audit applicability, evidence-before-correction controls, and guarded build cleanup.
- Completed the Day 41 cumulative architecture and behavior-preservation review without finding an evidence-backed correction candidate.
- Passed repository-wide Prettier, full ESLint, 323 test files / 1,776 tests, all six applicable read-only audits, and the 6,493-module production build.
- Restored tracked build output, validated and removed only 111 previewed untracked build entries, and confirmed a clean generated-output boundary.
- Prepared the documentation-only Day 42 completion plan for a repository-derived catalogue, concrete adoption matrix, adapter/exception register, reuse-first contributor guide, and shared-cPanel handover.
- Published the final catalogue: 124 production component-area JS/JSX modules, 106 component files, 15 support modules, three barrels, and zero component without a resolved production importer.
- Recorded final adoption, active adapter removal conditions, intentional domain exceptions, removed-surface proof, and reuse-first contributor rules.
- Closed Stages 1–5 and Days 1–42 locally without changing runtime code after `a6bbadf`; retained `c2b5ff5` as the final code-validation checkpoint.
- Published the shared-cPanel release-impact handover while keeping deployment, authenticated E2E, production approval, and hosted GitHub checks explicitly unqualified.
- Completed the post-refactor audit with no confirmed August refactor regression and identified four stale/racy E2E contracts.
- Opened the bounded Stage 6 Days 43–58 module consistency and reuse programme.
- Completed Day 43 without production-source changes: repaired all four incomplete Playwright contracts, added a loopback-only mocked API guard, and passed 16/16 unique repaired/safety cases.
- Passed full lint, the 50/50 E2E module mapping audit, one disposable 6,493-module development build, two 6,493-module PWA production builds, negative origin proof, diff checks, and guarded cleanup.
- Completed the Days 44-46 filter/search inventory across all 18 production `TableFilters` consumers and the credible manual/specialist families.
- Characterized Fire Extinguisher and FRT search behavior against untouched source, then migrated only their duplicated presentation to the existing Inspection-owned `ManagedCheckToolbar`.
- Kept search state, matching, loading/empty meaning, URL behavior, APIs, permissions, validation effects, and workflow ownership in their consumers.
- Passed 4 focused files / 48 tests, the complete 323-file / 1,780-test suite, full lint, a 6,493-module production build, 2/2 real-component browser journeys, the 10-case visual matrix, origin safety, E2E mapping, diff checks, and guarded cleanup.
- Prepared the Days 47-49 Inspection toolbar completion plan, preserving three distinct loading/visibility contracts and extending Stage 6 to Day 61 rather than compressing later quality stages.

### 2026-08-06

- Characterized Hydraulic, ER Aux and High Angle search, visibility, empty, read-only, refresh and compartment-reset behavior against untouched production source.
- Migrated all three remaining manual Inspection row-search toolbars to `ManagedCheckToolbar` without extending its API or moving domain ownership.
- Passed 7 files / 74 focused tests, 95 files / 894 Inspection tests, the complete 323-file / 1,786-test suite, 6/6 controlled browser journeys, full lint, 50/50 E2E mapping, formatting, production build, diff checks, and generated-output cleanup.
- Audited every registered Inspection type plus the ERCO, Fitness Test, and Drill workflows through design-system and user-journey lenses.
- Approved only three further cross-module candidates: a report responsive-dialog shell, the shared report mobile hook/query, and a presentation-only edit-state banner; retained whole forms, setup, personnel, chronology, analysis, mobile homes, and summary builders as domain-owned compositions.
- Found and fixed the controlled API guard matching Vite `/src/services/api/` modules; added a regression contract and passed 15/15 controlled safety, Drill, and Inspection browser tests.
- Completed the cross-module corrective pass: established one report breakpoint implementation, migrated seven responsive report dialogs, consolidated ERCO/Drill/Fitness edit banners, and retired the ERCO-local hook and responsive shell.
- Passed 139 files / 1,049 tests, 5 files / 26 post-boundary tests, scoped lint, a production build, and 15/15 controlled Playwright tests after the corrective migrations.
- Completed the Days 50–52 page-header/action-bar inventory and retained the established shared families instead of introducing a competing abstraction.
- Reproduced and fixed the canonical module header's long unbroken-title wrapping gap with one presentation class; no consumer, permission, route, callback, or action contract changed.
- Passed the direct 24-test primitive suite, 4 files / 41 focused consumer tests, scoped lint, an isolated production build, 12/12 controlled responsive browser journeys, and diff/cleanup gates.

- Prepared the detailed Days 53–55 form-section and validation-presentation plan with a report inline-error pilot pool, explicit feature/domain exclusions, accessibility characterization, proportional validation, and independently reversible rollback.
- Completed the Days 53–55 inventory, retained the established Inspection and workflow section systems, and selected only the exact Report/Salary inline-error pilot.
- Added the presentation-only `FormFieldError`, migrated four duplicate containers, and explicitly exposed the existing rejection error through `aria-invalid` without moving validation or workflow behavior.
- Passed 7 files / 29 affected tests, 2/2 controlled real-source browser journeys, scoped lint and formatting, a 6,495-module production build, diff checks, and guarded cleanup.
- Prepared the detailed Days 56–58 detail/summary plan around existing `ResponsiveKeyValueList` adoption in the two duplicated Leave detail views, with domain-formatting exclusions and semantic/mobile gates.
- Completed the detail/summary inventory and retained specialist `DetailField`, Inspection detail, financial, status, and domain-summary systems where their contracts differ.
- Migrated only the applicant and staff Leave metadata loops to the unchanged `ResponsiveKeyValueList`, increasing its production consumers from two to four while preserving all consumer-owned formatting, links, actions, Approval Gates, and history.
- Passed 10 files / 38 affected tests, 2/2 controlled real-source browser cases, targeted lint and formatting, a 6,495-module production build, 50/50 E2E mapping, diff checks, and guarded cleanup.
- Prepared the detailed Days 59–60 state/recovery plan around the existing `PageState`, `TableLoader`, and `ResponsiveRecordCollection` layers, with separate loading, empty, missing, error, forbidden, and retry contracts.
- Completed the state-presentation inventory and retained loader, collection, permission, retry, offline, operation-progress, and field-error systems where their lifecycle or recovery contracts differ.
- Migrated five active Leave, Overtime, and Claim missing-record shells to the unchanged `PageState` error contract while preserving messages, Back controls, navigation, and successful-detail branches.
- Passed 26 files / 104 affected tests, 5/5 controlled real-source browser cases, targeted lint and formatting, a 6,495-module production build, 50/50 E2E mapping, ownership searches, and diff checks.
- Prepared the Day 61 final-checkpoint plan with the `f19bca8..working tree` boundary, explicit untracked-file coverage, complete local gates, catalogue reconciliation, correction protocol, and guarded cleanup.

### 2026-08-10

- Audited the complete tracked and untracked `f19bca8..working tree` Stage 6 boundary and found no evidence-backed runtime correction candidate.
- Reconciled the catalogue to 127 production component-area modules: 109 PascalCase components, 15 support modules, three barrels, and zero unresolved component-area importer.
- Corrected the documentation distinction between the root `FormFieldError`'s two importers and four rendered placements; no production behavior changed on Day 61.
- Passed repository formatting, full lint, all applicable local audits, payroll controls, 50/50 E2E mapping, and 330 files / 1,808 Vitest tests.
- Passed 32/32 controlled Playwright journeys across API isolation, shared components, state recovery, Drill, Inspection, and PWA update behavior with no Blocker or High user-journey regression.
- Passed the final isolated 6,495-module production build and removed only the verified Day 61 environment, listener, build, log, and temporary PWA artifacts.
- Closed Stage 6 locally while retaining authenticated backend, real-device camera, hosted API/header, shared-cPanel, and production rollback checks as release-only work.
- Completed the full local predeployment runbook, remediated all npm and Composer advisories, passed 1,122 backend tests and 1,808 frontend tests, passed 32/32 controlled browser journeys, and regenerated the production frontend artifact.

## Deferred Release-Only Actions

These actions remain valid but do not block local component-quality work. Reopen them only when preparing a staging or production release.

1. Record named QA, operations/deployment, security/privacy, and production release decision owners.
2. Verify GitHub branch protection and required-check policy.
3. Identify approved staging frontend/backend origins and isolated test-data procedures.
4. Confirm the currently deployed build ID or designate another last-known-good artifact.
5. Execute and record a staging rollback drill.

## Next Work

The local component-quality programme is complete through Stage 6 Day 61. No further component implementation stage is scheduled. Reopen work only when repository evidence identifies a concrete reuse/consistency defect, or when the owner authorizes release qualification.

Release qualification remains separate: authenticated staging journeys, real-device camera checks, hosted API/header and cache verification, shared-cPanel deployment/rollback, and production approval. GitHub Actions remain disabled under the recorded cost exception.

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
