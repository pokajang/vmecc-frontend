# Frontend Module Consistency and Reuse Plan

**Date:** 2026-08-05  
**Application:** `vmecc-frontend`  
**Programme:** Stage 6 - Module Consistency and Reuse Expansion  
**Planned days:** 43-61  
**Status:** Completed locally; Days 43-61 passed and Stage 6 closed on 2026-08-10  
**Hosting context:** Shared cPanel; no deployment change is included

## 1. Purpose

Continue the frontend upgrade around the repository owner's actual priority: repeated interface code should use coherent, reusable components where the behavior and presentation contracts are genuinely the same. Modules should look and behave consistently without forcing unrelated domain workflows into one oversized abstraction.

Stages 1-5 established the component foundation and completed the original Days 1-42 programme. This is a new, bounded programme. It does not reopen completed work or treat more CI, hosting ceremony, dependency churn, or broad visual redesign as the goal.

## 2. Desired Outcome

By Day 61, the frontend should have:

1. trustworthy browser qualification for the user journeys used to approve refactors
2. fewer exact or near-exact manual filter/search compositions
3. consistent page-heading and action-bar structure where module contracts match
4. consistent form-section and validation presentation where semantics match
5. consistent read-only detail and summary presentation where data shapes match
6. consistent loading, empty, error, and recovery states without erasing domain meaning
7. an updated component catalogue showing adoption, intentional exceptions, and removal conditions

Success is measured by reduced duplicate ownership and clearer module contracts, not by the number of new shared components.

## 3. Non-Negotiable Boundaries

- Preserve routes, permissions, API payloads, persistence, calculations, status transitions, validation rules, callback order, focus behavior, and user-visible outcomes.
- Do not change the backend, database schema, production environment, cPanel configuration, dependencies, or GitHub Actions under this plan.
- Do not create a universal filter, header, form, detail, status, or workflow component.
- Keep authorization, data fetching, mutations, business rules, form state, and workflow decisions in their owning modules.
- Extract only a stable shared presentation or interaction contract used by at least two real consumers, unless a feature-local extraction removes exact duplication inside one module.
- Characterize existing behavior before migrating a consumer.
- Keep one independently reversible component family per implementation batch.
- A failed test is evidence to investigate, not permission to alter application behavior until the failure is attributed.
- Do not repair, reset, or replace the damaged normal Laragon PostgreSQL data directory under this frontend plan.
- No staging or production promotion is authorized.

## 4. Evidence and Candidate Rules

A candidate may proceed only when the inventory records all of the following:

| Requirement        | Passing evidence                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Repetition         | At least two production consumers with matching structure or interaction                                       |
| Stable contract    | Inputs, outputs, responsive behavior, accessibility, and style ownership can be named without domain branching |
| Behavior safety    | Current behavior is covered by existing tests or new characterization tests                                    |
| Ownership          | A clear shared or feature-local owner exists                                                                   |
| Net simplification | Consumers lose duplicated composition; the shared API does not reproduce each consumer internally              |
| Migration boundary | Each consumer can be migrated and reverted independently                                                       |

Reject or defer a candidate when it needs module-name switches, permission logic, API calls, workflow-state interpretation, large render-prop surfaces, or many boolean props to remain usable.

## 5. Validation Policy

Validation is proportional so code-quality work does not become process work.

### Per consumer

- untouched-source characterization where behavior is not already explicit
- focused unit/component tests
- changed-file ESLint and Prettier
- semantic searches for legacy and shared ownership

### Per component family

- all affected consumer tests
- targeted Playwright desktop/mobile journey when the family affects a primary interaction
- `git diff --check`
- production build when runtime composition, imports, styles, or routing changed

### Stage checkpoints

- full ESLint
- complete Vitest suite
- applicable repository audits
- production build
- targeted real-user Playwright journeys
- generated-output cleanup and exact diff review

The complete suite is not required after every small consumer migration. GitHub Actions remain disabled by owner decision; validation is local.

## 6. Day-by-Day Working Plan

### Day 43 - Playwright qualification hardening

**Objective:** Remove the four known false failures and make mocked browser work fail closed to the configured loopback API.

Tasks:

1. Repair the Drill custom-category locator with an exact, scoped semantic contract.
2. Replace the removed extinguisher-home test ID journey with the current supported module navigation and responsive-route contract.
3. Replace legacy Inspection action CSS selectors with current semantic button contracts.
4. Make the PWA A-to-B assertion tolerate the expected service-worker navigation and complete both app-cache and unrelated-cache preservation checks.
5. Add a reusable E2E API safety helper that validates the configured API base URL as an explicit loopback HTTP origin and aborts API requests outside that origin.
6. Apply the helper to the repaired mocked suites and remove their hard-coded API interception origins.
7. Run the four previously failing cases, then their containing suites.

Exit gate:

- all four cases pass without retry masking
- non-loopback API configuration fails before navigation or is explicitly aborted
- no application source file changes
- PWA assertions reach the final cache-preservation checks

Rollback boundary: E2E support/spec files and Day 43 documentation only.

### Days 44-46 - Shared filter and search controls

**Objective:** Inventory repeated filter/search composition and migrate only the strongest contract.

Detailed working plan: [Stage 6 Filter/Search Plan](FRONTEND_MODULE_CONSISTENCY_STAGE_6_FILTER_SEARCH_PLAN_2026-08-05.md)

Execution record: [Stage 6 Filter/Search Execution](../../02-completed/FRONTEND_MODULE_CONSISTENCY_STAGE_6_FILTER_SEARCH_EXECUTION_2026-08-05.md)

Day 44:

- catalogue production search fields, select filters, date ranges, reset actions, applied-filter summaries, and responsive arrangements
- record query ownership, debounce behavior, URL synchronization, accessibility names, empty results, and mobile layout
- separate general record filtering from workflow, payroll, Inspection, and other domain-specific filtering

Day 45:

- rank candidates by duplication, test coverage, and contract stability
- write characterization for the selected two-consumer pilot
- approve either an existing primitive extension, a small new shared composition, or no extraction

Day 46:

- migrate one pilot pair only
- preserve each consumer's query/data state and result behavior
- run affected unit tests, desktop/mobile Playwright, lint, formatting, diff check, and build

Stop condition: if the proposed API needs domain fields, request logic, or more than a small set of compositional slots, retain the current implementations and record the exception.

### Days 47-49 - Inspection toolbar family completion

**Objective:** Complete the proven Inspection row-search presentation family before switching component domains.

Detailed working plan: [Stage 6 Inspection Toolbar Completion Plan](FRONTEND_MODULE_CONSISTENCY_STAGE_6_INSPECTION_TOOLBAR_COMPLETION_PLAN_2026-08-06.md)

Day 47:

- characterize Hydraulic, ER Aux and High Angle against untouched production source
- preserve distinct loading, visibility, empty-state, selected-group and search-reset behavior
- approve each consumer independently against the existing `ManagedCheckToolbar` API

Day 48:

- migrate Hydraulic first and ER Aux second
- keep refresh, row data, empty messages and domain actions local
- stop between consumers for focused tests and exact diff review

Day 49:

- migrate High Angle only after its selected-group and continuation resets are proven
- extend the loopback-only real-source browser journeys for all three consumers
- run the affected Inspection family, full lint, build, E2E mapping and cleanup gates

Stop condition: do not add a domain-specific shared prop or move loading, group selection, empty-state meaning or workflow decisions into the toolbar.

### Days 50-52 - Page headers and action bars

**Objective:** Align module location, title, supporting text, and primary/secondary actions where the hierarchy is already equivalent.

Day 50:

- inventory headings, mobile/desktop title variants, back actions, action clusters, badges, and overflow behavior
- map current adoption of shared page/header primitives

Day 51:

- characterize a pilot pair, including keyboard order, wrapping, permissions, disabled/loading state, and mobile action priority
- define the smallest presentation-only contract

Day 52:

- migrate the pilot pair
- preserve navigation and authorization in consumers
- validate wide/narrow, light/dark, keyboard, and long-title cases

Stop condition: do not combine Dashboard composition, detail breadcrumbs, workflow controls, or feature-specific mobile drawers merely because they occupy the top of a page.

### Days 53-55 - Form sections and validation presentation

**Objective:** Reuse repeated section framing, field guidance, and validation presentation without centralizing form state or business rules.

Day 53:

- inventory section headings, descriptions, required markers, error summaries, field messages, footers, and responsive grouping
- separate visual duplication from differing validation semantics

Day 54:

- select a low-risk pilot pair with existing behavior tests
- characterize label association, described-by relationships, error announcement, disabled state, submission lock, and focus recovery

Day 55:

- migrate presentation only
- leave schemas, state, validation, mutations, and submit handling local
- validate keyboard, screen-reader names, mobile, error, and loading cases

Stop condition: no generic schema renderer, dynamic domain-form engine, or abstraction that hides field ownership.

### Days 56-58 - Detail and summary presentation

**Objective:** Consolidate repeated read-only label/value, metadata, and summary layouts where the information contract matches.

Day 56:

- inventory detail grids, metadata cards, summary rows, definition-list patterns, long values, missing values, and mobile stacking

Day 57:

- identify a pilot with matching semantics and ordering
- characterize long text, empty value, links/actions, responsive order, and assistive-technology structure

Day 58:

- migrate the pilot
- keep formatting and domain interpretation in consumers unless they are truly general
- validate narrow/wide, long content, absent data, and keyboard behavior

Stop condition: do not normalize domain statuses, calculations, dates, or confidential-field rules into a presentation primitive.

### Days 59-60 - Loading, empty, error, and recovery states

**Objective:** Standardize repeated state presentation and recovery affordances while preserving domain-specific messages and actions.

Day 59:

- inventory loader, skeleton, empty, no-results, first-use, recoverable error, forbidden, and retry patterns
- distinguish full-page, collection, form, drawer, and inline state contracts
- identify missing reuse of existing state primitives before proposing another one

Day 60:

- migrate only exact state-shell duplication or extend an existing primitive with a bounded prop
- preserve retry callbacks, permission meaning, error attribution, and focus behavior locally
- validate loading-to-success, empty, filtered-empty, recoverable error, and mobile journeys

Stop condition: do not reduce distinct first-use, no-results, forbidden, or destructive-failure meanings to one generic message.

### Day 61 - Final consistency audit and handover

**Objective:** Decide whether Stage 6 improved ownership and consistency without introducing behavior drift.

Tasks:

1. Review the complete Stage 6 diff by component family and consumer.
2. Run full lint, complete Vitest, applicable audits, production build, and representative Playwright journeys.
3. Search for abandoned legacy composition and duplicate shared implementations.
4. Update the component catalogue with new adoption, intentional exceptions, and removal conditions.
5. Record behavior-preservation evidence, residual risks, rollback boundaries, and any deferred candidates.
6. Close the programme rather than inventing more work when the evidence backlog is empty.

Exit gate: no confirmed regression, no unresolved shared ownership, clean generated-output boundary, and a documented decision for every selected candidate family.

## 7. Stage Sequence and Commit Boundaries

Use independently reversible boundaries:

1. Day 43 E2E qualification hardening
2. filter/search characterization
3. filter/search pilot
4. remaining Inspection toolbar characterization
5. Hydraulic and ER Aux migration
6. High Angle migration and Inspection toolbar checkpoint
7. header/action characterization
8. header/action pilot
9. form characterization
10. form pilot
11. detail/summary characterization
12. detail/summary pilot
13. state/recovery characterization and pilot
14. Day 61 audit/catalogue/handover

Documentation may accompany its owning boundary. Do not mix unrelated component families in one implementation commit.

## 8. Mishap Controls

Before editing:

- confirm the worktree and preserve unrelated changes
- identify the exact production importers and tests
- record behavior that must remain unchanged
- confirm the candidate is not an adapter or deliberate domain exception

During editing:

- move presentation, not decisions
- preserve DOM order unless the approved contract explicitly requires a tested accessibility improvement
- preserve effective button type, accessible name, focus restoration, Escape/backdrop handling, and mobile touch target
- retain existing class hooks until their consumers and tests are migrated
- stop after the approved pilot instead of opportunistically migrating the repository

After editing:

- inspect the exact diff and search both old and new ownership paths
- attribute failures before fixing code
- restore tracked build output and delete only previewed generated entries
- leave the normal database and unrelated listeners untouched

## 9. Shared cPanel Impact

This programme changes frontend source and local tests only. Each runtime family must continue to pass a production build, but cPanel deployment, server headers, PHP/Laravel configuration, database changes, cache invalidation, and production rollback drills remain separate release work. Bundle optimization is also separate unless measurement demonstrates a user-facing problem.

## 10. Current Authorization

The owner authorized this bounded programme. Days 43-60 passed locally by 2026-08-06, and the Day 61 cumulative audit, catalogue reconciliation, complete local validation, cleanup, and handover passed on 2026-08-10. Stage 6 is closed locally; staging, production, cPanel deployment, and release qualification remain separate owner-authorized work.
