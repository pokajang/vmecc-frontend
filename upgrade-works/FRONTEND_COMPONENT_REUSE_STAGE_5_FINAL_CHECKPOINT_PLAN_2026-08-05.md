# Frontend Component Reuse Stage 5 Final Checkpoint Plan

**Date:** 2026-08-05  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Planning baseline:** `10e5d11`  
**Cumulative comparison base:** `2425780` (`docs: refocus frontend upgrade on component reuse`)  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Prior checkpoint:** `FRONTEND_COMPONENT_REUSE_STAGE_5_CONSISTENCY_EXECUTION_2026-08-05.md`  
**Scope:** Stage 5 Day 41 final local code-quality checkpoint  
**Status:** Completed locally; all planned gates passed with no application correction  
**Authorization boundary:** Local frontend audit, validation, and evidence-backed behavior-preserving corrections only; no deployment, hosted GitHub Actions, backend, database, API-contract, route, permission, persistence, dependency, business-rule, workflow, or broad redesign changes

## 1. Purpose

Day 41 verifies the cumulative component-reuse programme as one coherent frontend change set. It is a checkpoint, not a new migration wave. The default result is validation and documentation; application code changes require a reproducible failure or a verified cumulative defect with a clear owner.

The checkpoint must answer:

1. Did the programme reduce duplication without creating overly broad shared APIs?
2. Did domain logic remain in its existing owners?
3. Do lint, the complete unit suite, applicable static audits, and the production build pass together?
4. Are deleted implementations still unreferenced and retained adapters still justified by consumers?
5. Is the repository clean and ready for the Day 42 catalogue and handover?

## 2. Frozen Baseline

At planning time:

- branch: `codex/frontend-upgrade-stage-1`
- worktree: clean
- checkpoint HEAD: `10e5d11`
- cumulative component-reuse comparison: `2425780..HEAD`
- commits after the comparison base: 44
- changed paths: 63
- production-source paths touched or deleted: 28
- test-source paths: 16
- durable upgrade records: 18
- package or lockfile paths: 0
- backend paths: 0

The comparison base is the Revision 2 commit that changed the programme direction to reuse-first frontend quality work. Earlier Stage 1 security/configuration work remains documented but is not reclassified as a component-reuse change.

## 3. Required Outcomes

- a cumulative architecture and behavior-preservation audit
- complete local lint and unit-suite results
- read-only applicable audit results with explicit applicability decisions
- one successful production build after code-level gates pass
- guarded restoration and cleanup of generated build output
- exact attribution and minimal correction of any in-scope failure
- no unexplained dead shared surface, duplicate implementation, broadened public API, or CSS leakage
- an execution record with commands, results, residual risks, commits, and rollback points
- updated master plan and `upgrade-works/README.md`
- a clean worktree ready for Day 42

## 4. Checkpoint Principles

### 4.1 Validate before correcting

Do not edit production source to anticipate a failure. First reproduce it, identify whether it is new, pre-existing, environmental, flaky, generated-output related, or caused by the cumulative programme, and record the evidence.

### 4.2 Preserve semantic ownership

Shared components may own repeated presentation and interaction mechanics. They must not absorb route decisions, API calls, permissions, validation, calculations, record mutation, domain status meaning, or workflow transitions.

### 4.3 Prefer an honest exception over false reuse

Similar-looking implementations remain separate when their data shapes, task sequence, error recovery, permission rules, or status semantics differ. Day 41 does not pursue a numerical reuse target.

### 4.4 Attribute broad-gate failures

A full-gate failure does not automatically authorize a repository-wide rewrite. Corrections must stay inside the smallest owner and must not format or rename unrelated files.

## 5. Task 41.1 — Establish the Execution Baseline

1. Confirm branch, HEAD, and clean status.
2. Confirm `2425780` is an ancestor of HEAD.
3. Recount commits and changed paths in `2425780..HEAD`.
4. Confirm no package/lock, backend, generated build, temporary fixture, screenshot, or Playwright output is staged.
5. Confirm the Day 40 temporary listeners are not running.
6. Search application/test/public/package scope for removed `AppBreadcrumb`, `DocsLink`, and `PwaInstallBanner` residue.

Gate: stop on an unexplained user edit, non-ancestor comparison base, active generated diff, or overlapping work.

## 6. Task 41.2 — Cumulative Architecture Audit

Review the cumulative production diff and current consumers for these families:

- confirmation foundation and compatibility facade
- mobile module Back action
- responsive record collection, mobile record list, and standard states
- role-assignment Add action
- ERCO responsive action shell
- removed CoreUI template components and dormant PWA banner surface
- retained PWA install prompt behavior and compatibility adapters

For each family record:

- shared source and current production consumers
- consumer-owned props, handlers, data, and domain rules
- duplicate implementation residue
- unused import/export or zero-consumer surface
- API breadth and consumer-specific branching
- state, responsive, focus, dismissal, button-type, and callback ownership
- disposition: pass, intentional difference, retained adapter, finding, or deferred

Audit the current repository rather than trusting historical adoption counts. Searches must distinguish production consumers from definitions, tests, documentation, generated output, and compatibility facades.

## 7. Task 41.3 — Behavior-Preservation Review

Inspect `2425780..HEAD` for accidental changes to:

- route declarations or navigation destinations
- API clients, endpoints, requests, payloads, or response mapping
- role and permission checks
- form validation or submitted values
- calculations, statuses, and status meaning
- lifecycle, approval, confirmation, and workflow sequence
- persistent state or storage
- loading and repeated-submit locks
- callback/event ordering
- effective button types and form submission
- Escape, explicit dismissal, trigger-focus restoration, and Back behavior
- mobile/desktop record content and ordering
- responsive breakpoint ownership
- shared SCSS selector reach and specificity

A mechanical extraction is acceptable only when these semantics remain in their prior owners or are demonstrably unchanged.

## 8. Task 41.4 — Formatting and Lint Gates

Run a read-only Prettier check across tracked frontend source, tests, scripts, and top-level tool configuration. Do not bulk-format the repository when the check identifies historical drift.

Run:

```text
npx prettier --check "src/**/*.{js,jsx,scss,css}" "tests/**/*.{js,jsx}" "scripts/**/*.mjs" "*.{js,mjs}"
npm run lint
```

If Prettier reports files:

1. identify whether each file is in the cumulative programme diff
2. correct only changed in-scope files whose formatting was introduced by the programme
3. record unrelated historical drift without rewriting it

Lint must pass completely or receive an attributed, bounded correction before proceeding.

## 9. Task 41.5 — Complete Unit Suite

Run the complete Vitest suite once against the unchanged checkpoint:

```text
npx vitest run
```

For a failure:

1. record file, test, assertion/error, and first failing run
2. rerun the exact failing file independently
3. determine cumulative regression, pre-existing issue, environmental dependency, or flake
4. correct only a reproduced in-scope regression
5. run focused coverage after correction
6. rerun the complete suite only after all focused failures pass

Do not weaken assertions, increase timeouts without evidence, skip tests, alter authentication, seed persistent data, or change backend services merely to make the gate green.

## 10. Task 41.6 — Applicable Read-Only Audits

| Audit                                | Applicability                                                                      | Planned disposition                          |
| ------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| `npm run audit:contrast`             | Applicable: cumulative UI/SCSS work                                                | Run                                          |
| `npm run audit:typography`           | Applicable: cumulative presentation work                                           | Run                                          |
| `npm run audit:staff-hardcoded`      | Applicable: Staff and HR consumers changed                                         | Run                                          |
| `npm run audit:production-config`    | Read-only final safety control                                                     | Run                                          |
| `npm run audit:router-advisory`      | Read-only dependency/route advisory                                                | Run                                          |
| `npm run test:e2e:coverage-contract` | Read-only static coverage contract; no browser/data mutation                       | Run                                          |
| `npm run audit:system-inventory`     | Generates inventory output and the component programme did not change system scope | Do not run unless a verified gap requires it |
| payroll hook-order/runtime checks    | No payroll source changed in the cumulative programme                              | Not applicable                               |
| browser E2E suites                   | Local PostgreSQL fixture unavailable; several suites mutate data                   | Do not run on Day 41                         |
| `npm audit` or dependency upgrades   | No package or lockfile changed                                                     | Not applicable                               |

An audit failure is evidence to investigate, not authorization to expand scope.

## 11. Task 41.7 — Production Build and Guarded Cleanup

After formatting, lint, unit, and applicable audits pass:

1. record `git status --short -- build`
2. run `npm run build` once
3. record Vite version, module count, duration, and warnings
4. inspect tracked and untracked `build/` changes
5. restore tracked build output with `git restore --worktree -- build`
6. preview untracked cleanup with `git clean -nd -- build`
7. validate every previewed path resolves under the exact repository `build` directory
8. remove only the previewed paths with `git clean -fd -- build`
9. confirm `git status --short -- build` is empty

Existing non-failing bundle advisories must be recorded. Do not introduce code splitting, dependency changes, or bundler configuration work without a separate approved plan.

## 12. Task 41.8 — Correction Protocol

No production/test correction file is pre-authorized. When a verified in-scope issue exists:

1. amend this plan before editing with finding, severity, owner, exact maximum file boundary, and regression command
2. add or strengthen characterization when the behavior is not already protected
3. apply the smallest correction
4. run changed-file Prettier and ESLint
5. run focused regression
6. rerun the failed broad gate
7. inspect and commit the correction independently

Corrections may not change dependencies, backend code, routes, API contracts, permissions, validation, persistence, calculations, status meaning, or workflow sequence.

## 13. Task 41.9 — Execution Record and Trackers

Create:

```text
upgrade-works/FRONTEND_COMPONENT_REUSE_STAGE_5_FINAL_CHECKPOINT_EXECUTION_2026-08-05.md
```

Record:

- frozen baseline and cumulative boundary
- architecture-family dispositions and consumer evidence
- behavior-preservation review
- exact commands, versions, counts, durations, warnings, and failures
- audit applicability decisions
- corrections and independent rollback commits, if any
- build-output cleanup proof
- final changed/forbidden-boundary audit
- remaining risks and Day 42 readiness

Update the master plan and `upgrade-works/README.md` only after all claims are evidenced.

## 14. Stop Conditions

Stop the affected work and preserve the last passing checkpoint when:

- the worktree contains an unexplained overlapping user change
- the cumulative base is wrong or not an ancestor
- a failure requires backend, database, production, permission, route, API, dependency, or workflow changes
- a shared correction would worsen an active consumer
- an audit would overwrite tracked inventory without a verified need
- a browser test requires persistent data mutation or production access
- a proposed fix becomes a broad formatting, naming, SCSS, or architecture sweep
- build cleanup cannot prove that every target stays inside the exact `build` directory
- a failure remains non-reproducible after focused reruns

Record genuine blockers; do not label an unavailable fixture as an application failure or silently treat it as passed.

## 15. Commit and Rollback Strategy

Preferred commits:

1. Day 41 plan and tracker checkpoint
2. one independently reversible correction per verified owner, only if required
3. Day 41 execution record and tracker completion

Documentation and generated-output cleanup must not be mixed into application correction commits. No backend or data rollback is authorized or expected.

## 16. Definition of Done

Day 41 is complete when:

- the cumulative architecture and behavior boundaries are reviewed
- current consumers and retained adapters are evidenced
- removed-symbol residue remains empty
- read-only formatting check is classified accurately
- full ESLint passes
- the complete unit suite passes
- every applicable audit passes or has an evidence-backed disposition
- one production build passes and generated output is cleaned safely
- no unauthorized dependency, backend, route, API, permission, persistence, validation, calculation, status, workflow, or broad redesign change enters the checkpoint
- execution record and trackers agree
- local links and Markdown formatting pass
- the worktree is clean
- Day 42 can create the final catalogue from a stable repository state

## 17. Execution Result

Day 41 completed locally on 2026-08-05 with no application correction. Repository-wide Prettier, full ESLint, 323 test files / 1,776 tests, all six applicable read-only audits, the cumulative architecture/behavior review, and a 6,493-module production build passed. Guarded build cleanup left no generated-output diff.

Full evidence, applicability decisions, build advisories, residual risks, and Day 42 handover are recorded in `FRONTEND_COMPONENT_REUSE_STAGE_5_FINAL_CHECKPOINT_EXECUTION_2026-08-05.md`.
