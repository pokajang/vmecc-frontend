# Frontend Component Reuse Stage 5 Completion and Handover Plan

**Date:** 2026-08-05  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Planning baseline:** `c2b5ff5`  
**Cumulative comparison base:** `2425780` (`docs: refocus frontend upgrade on component reuse`)  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Prior checkpoint:** `FRONTEND_COMPONENT_REUSE_STAGE_5_FINAL_CHECKPOINT_EXECUTION_2026-08-05.md`  
**Scope:** Stage 5 Day 42 final catalogue, completion record, and contributor handover  
**Status:** Ready for execution  
**Authorization boundary:** Repository-derived frontend documentation only; no application/test/style/tooling/dependency/backend changes, deployment, hosted GitHub Actions, production access, database mutation, release qualification, or new refactoring

## 1. Purpose

Day 42 closes the reuse-first frontend upgrade programme by documenting the final repository state in a form future contributors can use. It does not create another abstraction wave or repeat the Day 41 validation checkpoint.

The completion work must answer:

1. Which shared components exist now, what do they own, and when should they be used?
2. Which production consumers adopted the programme's approved contracts?
3. Which similar implementations intentionally remain separate, and why?
4. Which compatibility adapters remain, who consumes them, and what exact condition permits removal?
5. What was removed, what remains deferred, and what release-only work is still outstanding?
6. How should a contributor choose, extend, or create a component without reintroducing duplication or moving business logic into shared presentation?

## 2. Required Deliverables

Create two durable records under `upgrade-works/`:

```text
FRONTEND_COMPONENT_REUSE_CATALOGUE_2026-08-05.md
FRONTEND_COMPONENT_REUSE_STAGE_5_COMPLETION_EXECUTION_2026-08-05.md
```

### 2.1 Final component catalogue

The catalogue will contain:

- inventory method, exclusions, and final counts
- grouped shared-component catalogue
- approved-family adoption matrix
- ownership and contract boundaries
- current production-consumer evidence
- style owner and direct regression coverage where relevant
- use-when and do-not-use-when guidance
- retained adapters and removal conditions
- intentional domain exceptions
- removed surfaces and zero-residue evidence
- concise reuse-first contributor decision guide

### 2.2 Programme completion and handover record

The completion record will contain:

- programme baseline and final boundary
- completed stages and concrete code-level outcomes
- migrations, extractions, consistency corrections, and deletions
- validation evidence inherited from Day 41
- residual risks and deferred candidates
- release-impact summary for shared cPanel hosting
- independent rollback references
- release-only actions that remain explicitly unqualified
- final programme status and maintenance recommendations

## 3. Completion Principles

### 3.1 Current repository is authoritative

Historical audit counts and candidate labels are inputs, not final truth. Every final count, consumer list, and adapter claim must be regenerated from the current `c2b5ff5`-descended repository.

### 3.2 Catalogue reusable surfaces, not every JSX function

The primary catalogue covers production components under `src/components/**`, excluding tests, plus approved feature-local shared surfaces and compatibility facades outside that tree. Page-only and form-section components are summarized by domain/exception group unless they participate in an approved shared contract.

This keeps the catalogue useful without mislabeling every view-local fragment as a reusable system component.

### 3.3 Imports, not basenames, prove adoption

Duplicate filenames do not prove duplicate implementation. Consumer counts must distinguish:

- component definition
- direct production import
- re-export or compatibility facade
- barrel import
- test-only reference
- documentation reference
- generated build output
- same basename with unrelated semantics

Any ambiguous import chain must be inspected before it is counted.

### 3.4 Document semantic boundaries

The catalogue must state what a shared component does not own. Routes, API calls, permissions, validation, calculations, persistence, domain status meaning, and workflow transitions remain outside generic presentation contracts.

### 3.5 No implementation by documentation drift

If Day 42 discovers a factual code defect, dead export, or missing adoption, record it as a follow-up candidate. Do not edit source or silently change the final repository merely to make the catalogue look cleaner.

## 4. Task 42.1 — Freeze the Documentation Baseline

1. Confirm branch and clean worktree at or descended from `c2b5ff5`.
2. Confirm `2425780` and `c2b5ff5` are ancestors of HEAD.
3. Record the Day 42 plan commit after planning is committed.
4. Confirm no application, test, SCSS, tooling, dependency, generated build, screenshot, trace, or temporary artifact is pending.
5. Confirm no Day 40/41 local listener remains active.
6. Treat any later source change as a rebaseline event requiring this plan to stop and be amended.

Gate: documentation begins only from a clean, stable application checkpoint.

## 5. Task 42.2 — Build the Final Inventory

### 5.1 Primary inventory scope

Enumerate current production component definitions under:

```text
src/components/**/*.js
src/components/**/*.jsx
```

Exclude:

- `__tests__/`
- `*.test.*` and `*.spec.*`
- index/barrel files from component counts while recording their exports separately
- hooks, utilities, constants, API modules, and stylesheets
- deleted files and generated `build/` output

### 5.2 Additional shared surfaces

Add separately:

- compatibility facades under `src/views/shared/`
- feature-local shared components approved during the programme, including the ERCO responsive shell
- other feature-local components only when at least two production consumers use the same explicit contract

### 5.3 Evidence fields

For each catalogued surface collect:

- canonical path
- category
- purpose
- public inputs at a useful summary level
- ownership boundary
- direct production consumers or consumer count
- barrel/facade route when present
- relevant test path where one exists
- style owner where material
- lifecycle: active, compatibility adapter, feature-local shared, retained exception, or deprecated/removed

### 5.4 Verification controls

- Use `rg --files` and production-only import searches as the primary evidence.
- Resolve alias and relative imports before counting.
- Inspect zero-consumer candidates for barrel or lazy-import use.
- Inspect high-consumer results for false matches in definitions, tests, strings, and comments.
- Record reproducible commands and the inventory timestamp.
- Do not add a permanent generator script or overwrite the existing system QA inventory.

Gate: every catalogue count can be reproduced from the current tree and every exception is labelled.

## 6. Task 42.3 — Produce the Approved-Family Adoption Matrix

Create one detailed matrix for the programme's final families:

1. canonical action confirmation
2. confirmation compatibility facade
3. specialized user confirmation exception
4. responsive record collection and mobile record list
5. standard loading/empty/error states
6. mobile module Back action
7. role-assignment Add action
8. ERCO responsive action shell
9. shared mobile bottom-drawer styling
10. retained PWA install behavior after dormant-banner removal

For each family record:

- canonical source
- purpose
- actual production consumers/count
- migrations or extractions completed
- consumer-owned behavior
- direct regression evidence
- style ownership
- choose-this-when guidance
- do-not-use-this-when guidance
- current disposition

The matrix must trace every programme migration to concrete consumers rather than only listing commit messages.

## 7. Task 42.4 — Record Retained Exceptions and Adapters

### 7.1 Required adapter records

At minimum, verify and record:

- `src/views/shared/ActionConfirmModal.js`
  - current downstream production-consumer count
  - canonical re-export target
  - removal condition: zero production imports after an explicitly tested import migration
- `src/components/users/UserConfirmModal.js`
  - active consumer count and paths
  - portal/custom z-index/backdrop/body-hook capabilities
  - removal condition: every active consumer no longer requires those capabilities or a separately approved canonical contract supports them

### 7.2 Required intentional-exception groups

- attachment previews with different file/domain workflows
- domain-specific status and workflow presentations
- custom module/page headers with distinct hierarchy or navigation ownership
- context-specific loaders/spinners
- navigation controls whose destination or placement differs from the compact Reports/Inspection Back action
- forms and dialogs with different validation, submission, focus, or workflow contracts

Each exception requires a semantic reason. “Looks different” or “uses another filename” is insufficient.

### 7.3 Deferred candidates

Record, without implementing:

- large shared/view files that need a separate maintainability plan
- confirmation-facade import migration
- specialized user-confirmation convergence, if future requirements justify it
- mixed notification import and large bundle advisories
- authenticated E2E qualification when an approved environment exists

Gate: future contributors can tell the difference between technical debt, active compatibility, and deliberate domain separation.

## 8. Task 42.5 — Confirm Removed Surfaces

Re-run production/test/public/package searches for:

- `AppBreadcrumb`
- `DocsLink`
- `PwaInstallBanner`

Record:

- deleted source/test/barrel/style residue
- zero current reference result
- preserved PWA provider, navigation install affordances, install modal/drawer, service worker, manifest, icons, and install-event handling

Do not claim that the PWA feature was removed; only the dormant banner-specific surface was removed.

## 9. Task 42.6 — Write the Reuse-First Contributor Guide

The catalogue must include a short decision sequence:

1. Define the user task and semantic contract.
2. Search current shared components and the catalogue.
3. Reuse an existing component when task meaning and behavior match.
4. Keep domain behavior local and pass only presentation data/callbacks.
5. Extend a shared API only when all active consumers can adopt the new contract coherently.
6. Prefer a feature-local shared component for exact duplication inside one domain.
7. Keep implementations separate when validation, data shape, permissions, workflow, status meaning, navigation, or recovery differs.
8. Add focused characterization before migrating behavior.
9. Validate every active consumer of a changed shared source.
10. Update the catalogue when a reusable surface, adapter, or removal condition changes.

Include concise guidance for:

- placement and naming
- direct versus compatibility imports
- prop restraint and avoiding boolean/variant sprawl
- children/render-prop use only for presentation composition
- form-safe buttons
- loading/disabled locks
- responsive table/card parity
- modal/drawer dismissal and focus recovery
- accessibility names and established touch targets
- style ownership and avoiding feature-selector leakage
- focused tests and proportional validation

## 10. Task 42.7 — Prepare the Programme Completion Record

Summarize the programme by stage:

- Stage 1 local quality/security foundation and hosted-CI exception
- Stage 2 component inventory and approved contracts
- Stage 3 canonical foundations and pilots
- Stage 4 bounded pattern rollout
- Stage 5 cleanup, consistency correction, final checkpoint, and handover

For each stage record:

- concrete code-level outcome
- representative source/consumer paths
- validation evidence
- rollback references
- remaining exception or risk

Do not repeat every historical command. Link to detailed execution records and keep the completion record focused on outcomes and decisions.

## 11. Task 42.8 — Release-Impact Summary for Shared cPanel Hosting

Record explicitly:

- the programme changes frontend source and the generated build produced from it
- no backend migration, database migration, API-contract change, environment-variable addition, dependency update, or server configuration change was introduced by the reuse programme
- the production build passed locally
- deployment has not been performed or qualified
- cPanel upload/release procedures, cache/service-worker handling, staging smoke checks, rollback artifact selection, and production approval remain release-only actions
- GitHub Actions remain disabled by owner decision and are not evidence of a failed local checkpoint
- authenticated E2E remains pending an approved environment/dataset

The summary must not describe local validation as production approval.

## 12. Task 42.9 — Documentation QA and Closure

Because Day 42 is documentation-only:

- run Prettier on the Day 42 plan, catalogue, completion record, master plan, and README
- run `git diff --check`
- validate every relative Markdown link
- search for stale Day 41/42 status markers
- verify all cited paths exist or are explicitly marked deleted
- compare catalogue counts against the reproduction searches
- confirm the final Day 42 diff contains only `upgrade-works/*.md`
- confirm `git status --short -- build` is empty
- confirm the worktree is clean after the documentation commit

Do not rerun full lint, 1,776 tests, audits, or the production build merely for documentation-only changes. Day 41 is the final code checkpoint. If any source/test/style/tooling file changes, stop, amend the plan, and run proportionate code gates before claiming completion.

## 13. Maximum File Boundary

Day 42 may create or update only:

```text
upgrade-works/FRONTEND_COMPONENT_REUSE_STAGE_5_COMPLETION_PLAN_2026-08-05.md
upgrade-works/FRONTEND_COMPONENT_REUSE_CATALOGUE_2026-08-05.md
upgrade-works/FRONTEND_COMPONENT_REUSE_STAGE_5_COMPLETION_EXECUTION_2026-08-05.md
upgrade-works/FRONTEND_UPGRADE_PLAN_2026-08-03.md
upgrade-works/README.md
```

All source, test, style, script, configuration, dependency, lockfile, generated build, backend, and external-system changes are prohibited unless the plan is explicitly amended before editing.

## 14. Stop Conditions

Stop and record the issue when:

- the baseline is dirty or moves due to overlapping work
- a catalogue count cannot distinguish definitions, imports, barrels, or facades
- a supposedly unused component has an ambiguous runtime or lazy-import path
- a retained adapter's removal would break any active consumer
- a discovered code defect requires source/test/style/tooling work
- documentation would need to overstate E2E, staging, production, GitHub, or deployment evidence
- a generated inventory tool would overwrite tracked files
- the planned diff expands outside the five approved Markdown files
- historical and current evidence conflict and cannot be reconciled from the repository

Do not modify application code to force a clean completion narrative.

## 15. Commit and Rollback Strategy

Preferred commits:

1. Day 42 completion/handover plan and tracker checkpoint
2. final catalogue plus completion record and tracker closure

No application commit should exist on Day 42. Documentation commits may be independently reverted without changing runtime behavior.

## 16. Definition of Done

Day 42 and the component-quality programme are complete when:

- the catalogue reflects the current shared and approved feature-local component state
- inventory method, counts, categories, and exclusions are reproducible
- programme families map to concrete production consumers and tests
- retained adapters have active-consumer evidence and explicit removal conditions
- intentional exceptions have semantic justification
- removed surfaces have current zero-residue evidence
- contributor guidance provides a clear reuse-first decision path
- completed migrations and corrections are traceable to execution records and rollback points
- residual risks and deferred candidates are actionable and not disguised as failures
- the shared-cPanel release-impact summary distinguishes local validation from deployment qualification
- documentation formatting, links, path claims, stale-status checks, and diff boundary pass
- the master plan and README agree
- the final worktree is clean
