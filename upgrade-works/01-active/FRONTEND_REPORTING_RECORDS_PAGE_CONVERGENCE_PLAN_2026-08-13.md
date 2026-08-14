# Frontend Reporting Records Page Convergence Plan

Date: 13 August 2026  
Status: Planned  
Scope: Inspection, ERCO, Drill, and Fitness Test records pages

## 1. Objective

Make all four Reporting records routes feel like one product from the page header through the final pagination row. Equivalent controls must use the same component, spacing, responsive behavior, interaction states, and terminology.

The convergence must preserve module-specific data, permissions, filters, workflow actions, inspection offline/sync behavior, and route state.

## 2. Current problem

Inspection records and report records were implemented through separate section components:

- `src/views/inspection/records/InspectionRecordsSection.js`
- `src/views/report/components/ReportRecordsSection.js`

ERCO, Drill, and Fitness Test already share `ReportRecordsSection`, while Inspection uses its own implementation. Shared primitives exist, but presentation options were enabled independently. This allowed ERCO to retain boxed Mine/All and filter controls after Inspection had moved to the lighter mobile treatment.

A tactical local fix now passes the compact presentation options from `ReportRecordsSection`. The durable solution is to extract the common records-page composition and protect it with cross-module contract tests.

## 3. Required experience contract

All four records pages must share this top-to-bottom order:

1. module records title;
2. prominent chromeless Back action;
3. text-only Mine/All scope control;
4. optional module-owned primary action;
5. pill-shaped search field and borderless theme-green filter trigger on mobile;
6. active-filter summary and clear action, when filters are applied;
7. loading, empty, error, or populated records region;
8. consistently styled mobile record cards with a trailing kebab action;
9. compact mobile footer in one row: `View [value]` and `shown of total`;
10. desktop table and footer following the same information hierarchy.

Equivalent states must look and behave alike at the same viewport. Module-specific content may differ inside those shared regions.

## 4. Legitimate module differences

The convergence must not erase meaningful differences:

- Inspection retains offline queue, sync conflict, recovery, and checklist filters.
- ERCO retains incident-specific fields and filters.
- Drill retains drill-specific fields and filters.
- Fitness Test retains test-specific fields and filters.
- Card and table data columns remain appropriate to each record type.
- Available actions continue to follow record status, ownership, permissions, and workflow configuration.
- Empty-state wording names the relevant module.

These differences must be injected as content or slots rather than copied page structures.

## 5. Safety boundaries

- No backend, API, route, payload, permission, database, or workflow-state changes.
- Do not merge module-specific filtering logic into a generic state object.
- Do not remove Inspection queue recovery or offline diagnostics.
- Do not change Mine/All query semantics or record ownership rules.
- Do not reduce mobile interactive targets below 44px.
- Preserve keyboard activation, visible focus, accessible names, loading states, and disabled states.
- Avoid global button or form-control selectors; use explicit shared component variants.
- Preserve search, filters, scope, row count, and return-route state.

## 6. Stage 1 — Baseline and route inventory

Record the current implementation for:

- `/inspection` records view;
- `/report/erco` records view;
- `/report/drill` records view; and
- `/report/fitness-test` records view.

For each route, capture mobile and desktop states for:

- loading;
- empty Mine;
- empty All;
- one record;
- multiple records;
- active filters;
- no filter matches;
- long record title/location text;
- restricted actions; and
- rows-per-page selection.

Document computed layout differences before refactoring so intentional behavior is not mistaken for drift.

Exit gate: every visible region and module-specific exception is mapped to an owner.

## 7. Stage 2 — Extract the shared records-page shell

Create a shared composition component under `src/components/report-workflow/`, provisionally named `RecordsPageCollection` or `ReportingRecordsSectionShell`.

The shell should own only shared presentation and responsive structure:

- mobile/desktop wrappers;
- scope-control placement;
- primary-action placement;
- filter-region placement;
- loading/empty/content switching;
- record-list/table content slots;
- footer placement; and
- shared test anchors and semantic regions.

The shell must accept explicit render props or children for:

- queue/banner content;
- filters;
- mobile records;
- desktop records;
- empty message;
- primary action; and
- optional module notices.

It must not know ERCO, Drill, Fitness Test, or Inspection record schemas.

Exit gate: no common mobile or desktop page scaffold remains duplicated between `InspectionRecordsSection` and `ReportRecordsSection`.

## 8. Stage 3 — Standardize the shared primitives

Harden these primitives as the single presentation seams:

- `RecordScopeSegmentedControl` for text-only Mine/All;
- `TableFilters` or a shared mobile filter-header contract for search and filter trigger;
- `MobileRecordList` and its module-specific item adapters;
- `DataTableFooter` for compact mobile row selection and count;
- `CreateActionButton` for the optional New action; and
- `MobileModuleBackAction` for Back navigation.

Replace module/ancestor-specific styling flags with named variants where practical, for example:

- `presentation="records-text"`;
- `mobilePresentation="compact"`; and
- `filterPresentation="mobile-records"`.

Keep compatibility temporarily if removing existing class-based options would enlarge the change unnecessarily.

Exit gate: the visual contract can be invoked intentionally without knowing Inspection CSS ancestry.

## 9. Stage 4 — Migrate all four modules

### 9.1 Inspection

Move the common page frame into the shared shell while retaining:

- queue banner and details modal;
- offline health and recovery actions;
- inspection filters;
- inspection card/table adapters; and
- inspection action resolver.

### 9.2 ERCO, Drill, and Fitness Test

Move `ReportRecordsSection` onto the same shell once. Confirm that all three routes inherit it without report-type branches for presentation.

Retain their existing record adapters, workflow actions, filtering, download behavior, and labels.

Exit gate: all four routes render through one structural shell, with no route-specific CSS workaround for equivalent controls.

## 10. Stage 5 — Visual and interaction consistency

Reconcile the complete records page:

- header typography and vertical rhythm;
- Back alignment;
- scope/search/filter spacing;
- search radius and height;
- filter icon size, color, focus, active-filter indication, and hit area;
- record-card border, padding, hierarchy, status position, and kebab alignment;
- empty/loading spacing;
- footer typography, selected value, caret alignment, and one-row mobile layout;
- desktop card/table boundary and footer spacing; and
- light/dark theme tokens.

Do not force identical record fields. Standardize position, hierarchy, density, and interaction.

Exit gate: side-by-side screenshots show no unexplained structural or stylistic differences.

## 11. Stage 6 — Automated regression coverage

### 11.1 Component tests

Add contract tests for the shared shell and each adapter:

- scope change calls the supplied handler once;
- compact visual variants are present on every reporting route;
- search and filters preserve their callbacks;
- empty/loading/content states are mutually exclusive;
- footer preserves numeric and `All` selections;
- card click and kebab actions do not trigger each other;
- New and Back actions retain their route behavior;
- Inspection queue content remains available only when supplied; and
- permissions continue to hide unavailable actions.

### 11.2 Playwright matrix

Exercise all four routes at:

- 320 × 700 narrow mobile;
- 390 × 844 standard mobile;
- 768 × 1024 tablet; and
- 1440 × 900 desktop.

Verify:

- no horizontal overflow;
- consistent element order and computed styles;
- at least 44px interactive hit targets;
- keyboard focus and activation;
- Mine/All selection persistence;
- search and filter interaction;
- rows-per-page selection persistence;
- long-text wrapping;
- card/kebab event isolation;
- Back context restoration; and
- light/dark visual snapshots.

Use deterministic local/UAT records. Do not mutate production data.

Exit gate: component suites and the four-route Playwright matrix pass with reviewed snapshots.

## 12. Stage 7 — Repository and deployment qualification

Run the applicable `DEPLOYMENT.md` gates:

1. inspect the final diff for unrelated changes;
2. run formatting and lint;
3. run focused records-page tests;
4. run the full frontend test suite;
5. run the production build;
6. verify production API configuration and absence of localhost references;
7. review generated build changes; and
8. record the execution results and final build identity.

Exit gate: no Blocker or High regression, no unexplained snapshot update, clean source/build reconciliation, and a clear commit/push verdict.

## 13. Acceptance criteria

The work is complete only when:

- Inspection, ERCO, Drill, and Fitness Test share one records-page shell;
- all four match from header through footer at equivalent breakpoints;
- legitimate module-specific functionality remains intact;
- no boxed Mine/All control returns on any of the four mobile routes;
- search, filter, cards, empty states, and footer follow one responsive contract;
- rows-per-page values persist correctly;
- keyboard, touch-target, overflow, and theme checks pass;
- focused and full automated tests pass;
- production build succeeds; and
- an execution record documents evidence, residual risks, and commit readiness.

## 14. Rollback strategy

Implement the shared shell without changing module state ownership. Each module should remain recoverable by restoring its previous composition while keeping its data and action adapters unchanged.

If a module fails during migration:

1. stop at that module;
2. keep the last verified routes on the shared shell;
3. restore only the affected module composition;
4. record the failed acceptance criterion; and
5. do not weaken tests or remove module behavior to force convergence.

## 15. Deliverables

- shared reporting records-page shell;
- migrated Inspection and shared report records sections;
- explicit shared presentation variants;
- updated component tests;
- four-route Playwright visual/interaction suite;
- reviewed responsive snapshots; and
- `FRONTEND_REPORTING_RECORDS_PAGE_CONVERGENCE_EXECUTION_2026-08-13.md` with the final verdict.
