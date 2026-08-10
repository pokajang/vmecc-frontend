# Frontend Module Consistency Stage 6 Filter/Search Plan

**Date:** 2026-08-05  
**Application:** `vmecc-frontend`  
**Parent plan:** [Frontend Module Consistency and Reuse Plan](./FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md)  
**Stage boundary:** Days 44-46  
**Status:** Completed locally; see execution record  
**Authorization boundary:** Inventory, characterization, and at most one approved two-consumer pilot

**Execution:** [Days 44-46 execution record](./FRONTEND_MODULE_CONSISTENCY_STAGE_6_FILTER_SEARCH_EXECUTION_2026-08-05.md)

## 1. Objective

Improve consistency and reuse in record-list filtering without centralizing module data, query behavior, permissions, URL state, or domain rules.

The work must answer three questions in order:

1. Which production filter/search compositions are genuinely duplicated?
2. Can an existing shared primitive own that repeated presentation or interaction?
3. Can one small pilot be migrated with less total code and no behavior change?

The stage succeeds if it produces a reliable disposition and, only when justified, one bounded migration. Creating a new component is not itself a success criterion.

## 2. Verified Starting Point

Repository inspection on 2026-08-05 established:

- `TableFilters` is the canonical general record-filter primitive.
- It already owns desktop search, a 250 ms local search debounce, structured select filters, optional period selection, clear behavior, active-filter chips, and the mobile filter drawer.
- Its mobile drawer owns Escape dismissal, focus trapping, initial focus, and focus return.
- Supporting ownership is split across:
  - `src/components/TableFilters.js`
  - `src/components/table-filters/useTableFilters.js`
  - `src/components/table-filters/ActiveFilterChips.js`
  - `src/components/table-filters/FilterControls.js`
  - `src/components/table-filters/MobileFilterDrawer.js`
- `TableFilters` has 18 production importers across Users, Staff, Leave, Overtime, Payroll, Audit, AI knowledge, Reports, and Inspection.
- Existing shared-component tests cover mobile drawer presentation, clear paths, explicit filter defaults, and visible desktop labels.
- Manual search experiences also exist, but several are different product contracts: Messages contact lookup, searchable selects, Inspection location selection, checklist-row search, and scanner/asset lookup.

This means the default decision is to reuse or narrowly extend `TableFilters`, not create another global filter system.

## 3. Scope

### In scope

- record-list search fields
- record-list select filters
- date/period filters used to narrow lists
- reset/clear controls
- active-filter summaries
- desktop/mobile filter layout
- repeated wrappers around `TableFilters`
- manual record-filter compositions that may be valid `TableFilters` consumers
- exact duplicate search-and-clear presentation within a feature, if it is not a record-list contract

### Out of scope unless evidence overturns the classification

- Messages contact/user lookup backed by remote requests
- searchable comboboxes and `react-select` controls
- bank, location, asset, extinguisher, or staff selection inputs
- barcode/scanner lookup
- Inspection checklist navigation and completion search
- workflow action-queue interpretation
- permission or role resolution
- API request construction, pagination, caching, or cancellation
- filtering algorithms and domain status normalization
- URL/deep-link policy
- table sorting, grouping, bulk actions, exports, and workflow transitions
- broad visual redesign
- backend, database, dependency, cPanel, GitHub Actions, or deployment changes

## 4. Required Behavior-Preservation Matrix

Every inventoried candidate must record these fields before it can be selected:

| Contract area        | Required evidence                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Consumer and route   | Owning component, visible module, and route family                                             |
| Search ownership     | Local, parent-controlled, URL-derived, or remote/server-driven                                 |
| Timing               | Immediate, shared 250 ms debounce, custom debounce, submit-only, or remote request             |
| Matching             | Fields searched, normalization, and case/whitespace behavior                                   |
| Structured filters   | Key, label, value, default, option ordering, and clear value                                   |
| Period/date behavior | Meaning, default, available options, and timezone/date boundary                                |
| Clear behavior       | Search-only, chip-level, filter-level, or reset-all result                                     |
| Empty behavior       | First-use empty, no records, filtered empty, or error                                          |
| URL behavior         | Query parsing, serialization, history replacement, and deep-link retention                     |
| Responsive behavior  | Desktop arrangement, mobile search, drawer trigger, control order, and wrapping                |
| Accessibility        | Search name, visible labels, drawer name, focus trap/return, keyboard order, and announcements |
| Permissions          | Which controls or options are conditionally visible; ownership must remain local               |
| Side effects         | Page reset, selection reset, export scope, data reload, or workflow state changes              |
| Tests                | Existing unit/component and Playwright coverage                                                |
| Disposition          | Adopt existing, extend existing, feature-local extraction, retain, or remove dead code         |

Missing evidence means the candidate is not ready for migration.

## 5. Candidate Classification

Classify each production composition into exactly one family:

### A. Existing `TableFilters` adopter

Check whether the consumer uses the canonical contract correctly and whether nearby wrapper code is repeated. Do not migrate merely to rename props or reorder already-consistent code.

### B. Likely missed `TableFilters` adoption

A manual record-list filter may qualify when it has:

- one controlled search value
- zero or more controlled select filters
- a deterministic reset path
- the same desktop/mobile interaction model
- no remote suggestion list, selection workflow, or domain-specific navigation

### C. Feature-local duplicate

Two or more controls inside one feature may share an exact search-and-clear presentation but not the record-list filter contract. Prefer a small feature-local component if extraction is justified.

### D. Intentional specialist

Retain implementations whose search drives remote lookup, staged form navigation, asset discovery, workflow interpretation, or another materially different job.

### E. Dead or unreachable composition

Removal requires production-import, route, dynamic-import, barrel-export, test, and style reference proof. Do not infer dead code from a single search.

## 6. Candidate Scoring Gate

Only compare candidates after the Day 44 inventory is complete. Score each candidate from 0-2 for every dimension:

| Dimension              | 0               | 1                       | 2                                 |
| ---------------------- | --------------- | ----------------------- | --------------------------------- |
| Structural duplication | Superficial     | Partial                 | Exact/near-exact                  |
| Behavioral equivalence | Different       | Some overlap            | Same interaction/state contract   |
| Consumer count         | One             | Two                     | Three or more                     |
| Existing primitive fit | Poor            | Needs bounded extension | Fits current API                  |
| Test strength          | Weak            | Partial                 | Strong characterization available |
| Migration isolation    | Entangled       | Moderate                | Independently reversible          |
| Net simplification     | Adds complexity | Neutral                 | Removes duplicated ownership      |
| Regression risk        | High            | Medium                  | Low                               |

Selection rules:

- A pilot needs at least 12/16 total.
- Behavioral equivalence, test strength, migration isolation, and net simplification must each score at least 1.
- A candidate scoring 0 for existing primitive fit cannot become a global shared component.
- Prefer an existing-primitive adoption over a new component when scores are otherwise comparable.
- If no candidate passes, close Days 44-46 with a documented no-extraction decision.

## 7. Day 44 - Inventory and Disposition Baseline

### Goal

Build a complete, reproducible production inventory before proposing code changes.

### Tasks

1. Enumerate every production `TableFilters` importer and record its configured props.
2. Enumerate manual search inputs, select filters, date/period controls, clear buttons, active-filter summaries, and filter drawers in `src/views`.
3. Resolve each control to its visible route and owning state/hook.
4. Separate record-list filtering from lookup, selection, form navigation, scanning, and workflow search.
5. Record debounce/timing, clear behavior, URL synchronization, page-reset behavior, responsive layout, accessible names, permissions, and tests.
6. Compare repeated consumer wrappers around `TableFilters` before looking for a new primitive.
7. Search for unused or legacy filter components, exports, styles, and selectors.
8. Produce the candidate matrix and classify every candidate A-E.
9. Rank candidates using the scoring gate.

### Minimum inspection boundary

- all 18 verified `TableFilters` production importers
- all production inputs whose accessible name or placeholder indicates record search
- shared filter support files and their tests
- manual clear/reset controls adjacent to those searches
- responsive SCSS selectors belonging to filter/search presentation
- route and hook owners for any top-ranked candidate

### Day 44 deliverable

Add the inventory and scoring matrix to the execution record. Record retained specialists as explicitly as migration candidates so future work does not repeatedly reconsider false matches.

### Day 44 exit gate

- all verified importers are accounted for
- every manual candidate has a route, owner, state/timing classification, and disposition
- no code has changed
- one pilot pair is selected, or a no-pilot decision is justified

## 8. Day 45 - Characterization and Contract Approval

### Goal

Prove the selected pilot's existing behavior before changing its composition.

### Tasks

1. Identify the smallest existing tests that directly render both consumers.
2. Add characterization only where current behavior is not already explicit.
3. Verify for both consumers:
   - effective search accessible name and placeholder
   - controlled value synchronization
   - timing/debounce behavior
   - each structured filter's default and options
   - individual chip clear behavior
   - reset-all callback effects
   - page/selection reset side effects
   - filtered-empty message versus unfiltered-empty message
   - mobile drawer trigger, control order, Escape dismissal, and focus return
   - desktop labels, wrapping, and control order
   - URL/deep-link retention where applicable
4. Write the proposed contract as inputs, outputs, owned behavior, and explicitly unowned behavior.
5. Compare final line/branch ownership against the current implementations.
6. Choose exactly one decision:
   - adopt `TableFilters` unchanged
   - make one bounded backward-compatible `TableFilters` extension
   - create one feature-local presentation component
   - retain both consumers unchanged

### Contract restrictions

The approved contract must not accept:

- module names or route switches
- permissions or user roles
- raw records or filtering callbacks that interpret records
- API clients or endpoints
- workflow statuses with domain meaning
- pagination or selection state
- arbitrary mode booleans that recreate each consumer internally

Composition slots are allowed only when named by stable presentation responsibility and when they reduce, rather than hide, duplication.

### Characterization gate

All new characterization tests must pass against untouched production source. Capture that passing command/result before migration.

### Day 45 exit gate

- both pilot consumers have behavior-preservation coverage
- the contract and owner are approved in writing
- the expected simplification is concrete
- rollback can restore each consumer independently
- otherwise, record no extraction and skip Day 46 implementation

## 9. Day 46 - One Pilot Migration

### Goal

Migrate only the approved pilot pair and prove behavioral parity.

### Implementation order

1. If required, add the shared or feature-local contract with direct unit coverage.
2. Migrate the lower-risk consumer first.
3. Run its focused tests and inspect its exact diff.
4. Stop and attribute any failure before changing behavior or tests.
5. Migrate the second consumer only after the first passes.
6. Remove only duplication made unreachable by both migrations.
7. Search for stale imports, selectors, tests, and styles within the pilot boundary.
8. Run the complete family gate.

### Production behavior that must remain local

- search/filter state ownership
- record matching and domain normalization
- API/server query behavior
- URL parsing and serialization
- page and row-selection reset rules
- permission-driven options and visibility
- sorting, grouping, export, and bulk-selection behavior
- filtered and unfiltered dataset meaning

### Responsive and user-journey checks

Validate at minimum:

- 390 x 844 mobile
- 768 or 820 px transition/tablet width when relevant
- 1440 x 960 desktop
- no active filters
- search active
- one structured filter active
- search plus structured filter active
- individual chip clear
- reset all
- filtered empty
- long search text and long option label
- keyboard opening/closing and focus return for a mobile drawer
- light and dark presentation if shared styles change

## 10. Validation Commands and Evidence

Commands must be adjusted to the selected consumers, but the minimum final gate is:

```text
npx prettier --check <changed files>
npx eslint <changed JS/JSX files>
npx vitest run <shared primitive tests> <consumer A tests> <consumer B tests>
npx playwright test <targeted filter/search journey> --config=playwright.config.mjs --workers=1
npm run build
git diff --check
```

Also run:

- import/reference searches for the old and new ownership
- focused SCSS selector searches when styles changed
- `npm run test:e2e:coverage-contract` if a new E2E spec or route mapping is added
- full ESLint at the Days 44-46 checkpoint

The complete Vitest suite is required only if the migration changes `TableFilters`, its hook, mobile drawer, or another shared contract used beyond the pilot pair. If the pilot adopts the existing component unchanged, focused shared and consumer tests plus the production build are proportionate.

## 11. Failure Attribution Rules

For every failure, record:

1. exact command, test, viewport, and state
2. whether it reproduces on the pre-migration baseline
3. application defect, migration regression, stale test, environment issue, or unrelated pre-existing failure
4. evidence supporting the attribution
5. smallest justified correction

Do not:

- loosen assertions simply to obtain a pass
- alter debounce duration, defaults, labels, or reset behavior without explicit evidence
- make a test depend on internal CSS when an accessible user contract exists
- broaden the migration to fix unrelated code
- treat a full-suite failure as caused by the pilot without reproduction

## 12. Mishap and Stop Controls

Stop the migration when:

- the candidate requires domain-aware branches
- the two consumers have different debounce, clear, URL, permission, or empty-state contracts
- the new API needs many optional booleans or consumer-specific render branches
- focus or mobile drawer behavior cannot be preserved
- the extraction increases total ownership or hides state flow
- characterization cannot run reliably
- unrelated worktree changes overlap the selected files
- the first consumer cannot pass independently

If stopped, retain the current implementation, record the reason and removal condition, and still close the stage honestly.

## 13. Worktree, Build, and Environment Safety

- Preserve all existing Day 43 and audit changes in the worktree.
- Inspect the exact target files before editing and do not format unrelated files.
- Use loopback-only browser/API origins under the Day 43 controlled API contract.
- Do not start or repair the normal PostgreSQL cluster for mocked journeys.
- If authenticated coverage is essential, use only the guarded disposable E2E environment and its existing run-lock process.
- Build into a disposable output directory when possible.
- Before deleting generated output, resolve and verify the exact path is inside the workspace.
- Do not modify tracked `build/` output; if a command does, restore only generated build changes after validating the cleanup target.
- Do not touch ports or processes not started for this stage.
- Do not print environment values, credentials, payloads, or personal data into durable records.

## 14. Commit and Rollback Boundaries

Use independently reversible boundaries:

1. Days 44-45 inventory, dispositions, and untouched-source characterization
2. shared contract or existing-primitive extension, if any
3. consumer A migration
4. consumer B migration and now-unreachable cleanup
5. validation/execution record and index update

Do not commit generated builds, screenshots, traces, raw payloads, or temporary logs.

Rollback order:

1. revert consumer B
2. revert consumer A
3. revert the new/extended contract if it has no remaining consumer
4. revert characterization only if it no longer describes supported baseline behavior
5. retain the inventory and decision record as historical evidence

## 15. Final Days 44-46 Exit Gate

The stage may be marked passed only when:

- the inventory covers all 18 current `TableFilters` importers and all credible manual record-filter candidates
- specialist searches are explicitly classified and retained
- characterization passed before migration
- no more than one pilot pair was migrated
- application-owned data and domain behavior remained local
- focused and required full tests pass
- targeted mobile/desktop Playwright passes when runtime UI changed
- the production build passes when runtime source changed
- formatting, lint, reference searches, and `git diff --check` pass
- generated artifacts and listeners are cleaned
- the execution record documents changes, non-changes, evidence, residual risks, and rollback

If no candidate clears the evidence gate, a documented no-extraction result is a valid passed outcome for Days 44-46.

## 16. Expected Handover

Create:

```text
upgrade-works/FRONTEND_MODULE_CONSISTENCY_STAGE_6_FILTER_SEARCH_EXECUTION_2026-08-05.md
```

That record must include the complete inventory/disposition table, candidate scores, characterization evidence, selected contract or no-extraction decision, exact implementation boundary, validation results, cleanup, rollback, and the recommendation for Days 47-49.
