# Frontend Component Reuse Stage 4 Data Lists Plan

**Date:** 2026-08-04  
**Application:** `vmecc-frontend`  
**Branch:** `codex/frontend-upgrade-stage-1`  
**Starting revision:** `8352561`  
**Parent plan:** `FRONTEND_UPGRADE_PLAN_2026-08-03.md`, Revision 2  
**Prior checkpoint:** `FRONTEND_COMPONENT_REUSE_STAGE_4_EXECUTION_2026-08-04.md`  
**Scope:** Stage 4 Days 25–28 — data lists and standard states only  
**Status:** Planned; Days 25–28 application source work has not started  
**Authorization boundary:** Local, behavior-preserving frontend work only; no deployment, GitHub Actions, backend, API, route-definition, permission, persistence, dependency, or workflow changes

## 1. Purpose

This plan covers the second Stage 4 pattern-family batch: data-list composition, mobile/desktop record presentation, filters, loading states, empty states, error states, table footers, pagination controls, and sortable/grouped table headings.

The objective is to reuse the existing shared primitives where consumers already have equivalent state precedence and interaction behavior. It is not to build a universal table engine, redesign filters, convert all tables, standardize business-specific messages, or hide domain logic inside shared presentation components.

A documentation-only result is acceptable when the remaining manual implementations are specialized or when migration would change behavior. Existing adoption is already substantial, so the burden of proof is on each proposed migration.

## 2. Required Outcomes

By the end of Day 28:

- all direct uses and apparent bypasses of the applicable shared primitives have an evidence-backed disposition
- loading, empty, error, populated, filtered-empty, and paginated state precedence is recorded for every shortlisted consumer
- client-side and server-side pagination are distinguished before any footer change
- mobile and desktop record actions remain equally available
- filter values, defaults, reset behavior, option order, debounce/timing, and query semantics remain unchanged
- no privacy, selection, grouping, workflow, permission, or business rule moves into a shared component
- at most one bounded collection-shell pilot is migrated unless Day 25 proves a second consumer is the same implementation and rollback unit
- focused validation passes for the shared primitive and every changed consumer
- an execution record captures the outcome, exceptions, rollback boundary, and readiness for Days 29–32

## 3. Frozen Scope

### 3.1 In scope

Shared primitives and their direct contract tests:

- `src/components/ResponsiveRecordCollection.js`
- `src/components/MobileRecordList.js`
- `src/components/TableLoader.js`
- `src/components/PageState.js`
- `src/components/TableFilters.js`
- `src/components/table-filters/`
- `src/components/DataTableFooter.js`
- `src/components/TablePeriodSelect.js`
- `src/components/SortableTableHeader.js`
- `src/components/GroupedTableHeader.js`
- `src/components/__tests__/ResponsiveRecordCollection.test.jsx`
- `src/components/__tests__/DataTableFooter.test.jsx`
- applicable assertions in `src/components/__tests__/uiDebtPrimitives.test.jsx`

Representative consumers may enter the source batch only after Days 25–26 prove equivalence. Preliminary candidates are listed in Section 7.

Documentation in scope:

- this plan
- a Days 25–28 execution record under `upgrade-works/`
- status/index updates required to keep the programme traceable

### 3.2 Explicitly out of scope

- API requests, response mapping, cache behavior, persistence, exports, or backend pagination
- route definitions, permissions, module activation, role filtering, or privacy rules
- changing search fields, filter defaults, date boundaries, sort order, page size, or result counts
- changing when filters reset the page, selected row, expanded detail, or open drawer
- changing record identifiers, React keys, table columns, mobile fields, grouped totals, or status meaning
- moving row-action, selection, bulk-action, workflow, approval, download, or navigation decisions into shared components
- replacing server pagination with client slicing or client slicing with server pagination
- forcing Inspection record grids, payroll breakdown tables, report workflow lists, roster schedules, messages, AI helper lists, dashboards, or settings editors into a generic collection
- converting a table-embedded loader to a page-level loader when that changes layout or state visibility
- replacing business-specific inline error or empty messages merely for visual uniformity
- modifying `RecordCard`, `RowActions`, `BulkSelectionActionBar`, or workflow components in this batch
- new dependencies, framework upgrades, CoreUI upgrades, CSS framework changes, GitHub Actions, build configuration, or deployment work
- repository-wide formatting, import canonicalization, naming cleanup, or unrelated dead-code removal

## 4. Existing Shared Contracts

### 4.1 `ResponsiveRecordCollection`

Current stable responsibility:

- loading takes precedence over all collection content
- empty takes precedence over controls, mobile records, desktop content, and footer
- string empty messages render through `PageState`; valid React elements remain caller-owned
- populated order is caller children, mobile list, desktop renderer, then footer
- caller owns record transformation, filtering, sorting, pagination, actions, and the desktop table

Do not add query logic, table columns, row selection, workflow rules, domain-specific states, or server pagination to this component.

### 4.2 `MobileRecordList`

Current stable responsibility:

- remove falsey items and empty sections
- render caller-defined record-card items in card or list-group presentation
- preserve caller-provided labels, summaries, fields, status, actions, open/toggle behavior, and accessible names
- remain mobile-only through its established responsive class

Do not make it derive business fields, permissions, action menus, status colors, grouping keys, or empty-state meaning.

### 4.3 `TableLoader` and `PageState`

Current stable responsibility:

- `TableLoader` delegates a loading message and minimum height to `PageState`
- `PageState` supplies loading, empty, or error presentation with appropriate status/alert semantics
- callers own messages, retry actions, state precedence, and surrounding layout

Do not replace table-row loading or specialized compact states unless the rendered structure and timing remain equivalent.

### 4.4 `TableFilters`

Current stable responsibility:

- caller-controlled search, period, select filters, and clear action
- local search synchronization through the existing filter hook
- desktop controls and an accessible mobile drawer
- active-filter summary, focus trap, Escape close, and focus return
- caller-owned option values, labels, defaults, callbacks, and filtering semantics

Do not add domain queries, URL synchronization, server calls, permission filtering, or implicit page/selection resets.

### 4.5 `DataTableFooter`

Current stable responsibility:

- rows-per-page selection including the established `all` value
- visible/filtered/total count text
- optional caller-controlled previous/next pagination
- omission when the filtered count is zero
- optional fixed server page size through `showRowsPerPage={false}` and `visibleCount`

Do not infer remote totals, fetch pages, reset filters, change page size, or own selected-row state.

### 4.6 Table heading primitives

`SortableTableHeader` owns accessible caller-controlled sort presentation. `GroupedTableHeader` owns reusable grouped-row labels, totals, and badges. Both must remain presentation-only; field meaning, sort algorithms, group construction, and aggregation remain in callers.

## 5. Preliminary Evidence Snapshot

The 2026-08-04 planning scan found:

| Primitive                    |                                                                                Production import evidence | Preliminary interpretation                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------: | ----------------------------------------------------------------------------------------- |
| `ResponsiveRecordCollection` |                                                                                              15 consumers | Strong adoption; review remaining manual composition only                                 |
| `MobileRecordList`           | 13 importers including the barrel export and `ResponsiveRecordCollection`; 11 direct callers beyond those | Some are valid specialized mobile-only views; direct use is not automatically debt        |
| `TableLoader`                |                                                       36 importers including `ResponsiveRecordCollection` | Widely shared presentation; state placement differs materially                            |
| `TableFilters`               |                                                                                              18 consumers | Strong adoption; do not replace bespoke filters without interaction parity                |
| `DataTableFooter`            |                                                                                              22 consumers | Strong adoption across client and server pagination modes                                 |
| `SortableTableHeader`        |                                                                                               2 consumers | Narrow contract; review for true sortable-heading duplication only                        |
| `GroupedTableHeader`         |                                                                                               5 consumers | Domain grouping remains caller-owned                                                      |
| `PageState`                  |                                                            8 importers, primarily application/wrapper use | Direct use is intentionally limited; plain messages may have different density and layout |

These are planning counts, not quality targets. Day 25 must regenerate production-only import and render-site lists from the starting revision and record changes from this snapshot.

Existing tests already protect:

- `ResponsiveRecordCollection` loading precedence, custom loading text, standard/custom empty content, content order, and mobile variant
- `DataTableFooter` remote-page-size display and fixed server-page-size mode
- `MobileRecordList`, `TableFilters`, and grouped-header behavior in `uiDebtPrimitives.test.jsx`
- focused behavior in several candidate modules, including Work Shift, Assignments, Leave Records, and Payslips

Test presence alone is not sufficient. Day 26 must confirm that each shortlisted consumer's state timing and actions are asserted before migration.

## 6. Decision Rules

Classify each candidate as exactly one of:

1. **Reuse as-is** — substitute an existing primitive without changing its contract.
2. **Improve existing** — add one generic capability required by at least two equivalent consumers and protected against existing-consumer regression.
3. **Retain specialized** — keep the implementation local because its semantics or state placement differs.
4. **Defer** — record a credible opportunity that depends on a later product, API, style, or workflow decision.
5. **Remove later** — track only when zero production use is proven; deletion belongs to Stage 5.

A shared API proposal is rejected when it contains domain terms such as payslip, leave entitlement, inspection, report type, approval stage, selected records, payroll breakdown, or a particular API page.

Visual similarity is not enough. Equivalent candidates must match on state precedence, responsive visibility, record/action availability, count semantics, and callback timing.

## 7. Preliminary Candidate Matrix

| Candidate                             | Evidence                                                                                                           | Risk                        | Day 25–26 question                                                                                                                                | Default position                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Work Shift custom-shift collection    | Manual loader, empty message, mobile list, and desktop table; focused `WorkShift.test.jsx` exists                  | Low–medium                  | Can `ResponsiveRecordCollection` preserve the current loading precedence, empty copy, mobile actions, desktop table, and error placement exactly? | Strongest collection-shell pilot candidate                   |
| Login Records collection shell        | Manual desktop/mobile empty branches, `MobileRecordList`, and `DataTableFooter`                                    | Medium                      | Can only the collection shell be reused while leaving bespoke filter and detail-reset behavior unchanged?                                         | Review collection only; do not combine with filter migration |
| Login Records filters                 | Duplicated desktop/mobile controls resemble `TableFilters` but use a local collapse and reset expanded details     | Medium–high                 | Would a drawer/focus model change interaction or reset timing?                                                                                    | Retain unless exact parity is characterized                  |
| Leave Assignments collection          | Uses shared filters, loader, mobile list, and footer around matrix/list desktop modes                              | High                        | Can wrapper children preserve view toggles, detail entry, action ordering, and different row-count models?                                        | Characterize; not default pilot                              |
| Staff Leave Records collection        | Manual shared primitives plus bulk selection, grouped rows, workflow actions, and review mode                      | High                        | Can state precedence and bulk action placement remain exact without shared workflow props?                                                        | Retain unless unusually strong evidence emerges              |
| Salary Settings assignment collection | Manual mobile/table/footer composition with grouped salary data and audit history                                  | High                        | Is the collection shell separable from editing, privacy, and history behavior?                                                                    | Defer by default                                             |
| Payroll Payslips                      | Mobile and table-embedded loading/empty states plus expanded financial breakdowns and download restrictions        | High                        | Would wrapper loading precedence or markup change table layout or protected actions?                                                              | Keep specialized                                             |
| Mobile recent report records          | Mobile-only workflow section with compact loader/empty heights, scope control, and View All action                 | High false-abstraction risk | Is it a responsive desktop/mobile collection? No                                                                                                  | Keep workflow-specific                                       |
| Inspection records/extinguishers      | Already use shared primitives but retain specialized filters, offline state, scanning, exports, and record actions | High                        | Is any remaining bypass independent of these behaviors?                                                                                           | Audit only; no broad conversion                              |
| Roster mobile day list                | Schedule/day interaction rather than a normal record-card table                                                    | High false-abstraction risk | Does it share collection semantics beyond being a list?                                                                                           | Keep specialized                                             |
| Plain inline empty/error messages     | Numerous density- and context-specific messages                                                                    | Medium                      | Would `PageState` preserve semantics, minimum height, layout, and nearby controls?                                                                | No bulk replacement                                          |

The matrix authorizes investigation, not source edits. Day 26 selects the actual pilot or closes the batch with no source change.

## 8. Day 25 — Inventory and Behavior Classification

### Task 25.1 — Reconfirm the starting boundary

Before source changes:

1. Confirm `HEAD` is at or descended from `8352561`.
2. Record `git status --short`; stop if unrelated edits overlap candidate files.
3. Confirm `build/`, test artifacts, and temporary evidence are not staged.
4. Re-read the Days 21–24 execution record and Stage 3 responsive-collection contract decisions.

### Task 25.2 — Regenerate production usage evidence

Record exact file lists for:

- all primitives in Section 3.1
- direct `MobileRecordList` use outside `ResponsiveRecordCollection`
- direct `TableLoader` plus manual loading branches
- manual mobile/desktop collection pairs
- local search/select/date filters outside `TableFilters`
- pagination and rows-per-page controls outside `DataTableFooter`
- sortable and grouped headings outside their shared primitives
- inline loading, empty, filtered-empty, and error presentations outside `PageState`

Exclude tests from production counts, but record direct and integration test coverage separately.

### Task 25.3 — Capture each candidate's state machine

For every shortlisted consumer, record:

- loading, error, empty, filtered-empty, populated, and refreshing precedence
- whether stale records remain visible during refresh
- mobile and desktop render order
- filter controls and reset side effects
- local or server pagination and the meaning of filtered/total/visible counts
- mobile and desktop row fields and actions
- selection, bulk actions, expanded rows, group headings, and keyboard behavior
- permissions, privacy restrictions, workflow gates, and disabled reasons
- existing tests and missing characterization
- disposition from Section 6

### Task 25.4 — Produce the evidence matrix

The durable execution record must list every manual candidate and disposition. The raw search output may remain uncommitted local evidence; the decision summary belongs under `upgrade-works/`.

### Day 25 gate

Day 25 passes when every candidate is classified by behavior rather than component names or visual resemblance. Documentation-only work requires formatting, link, path, and diff checks; it does not require the unit suite or production build.

## 9. Day 26 — Contract Review and Pilot Approval

### Task 26.1 — Audit shared-contract coverage

Confirm tests protect:

- loading-over-empty precedence
- standard and custom empty-state rendering
- caller-child, mobile, desktop, and footer order
- mobile list filtering of falsey/empty sections
- card/list-group variants and accessible action names
- filter value synchronization, active summaries, mobile drawer focus/Escape/return behavior, and clear callbacks
- numeric and `all` page sizes
- client and fixed-size server pagination count semantics
- disabled previous/next boundaries
- sortable-heading accessible state and caller callback
- grouped labels/totals without caller aggregation moving into the component

Add characterization against untouched production code for any selected behavior that is not protected.

### Task 26.2 — Decide whether source work is justified

Preferred outcome order:

1. reuse `ResponsiveRecordCollection` as-is for one exact manual composition shell
2. reuse another existing primitive as-is only when it belongs to the same rollback unit
3. make no source change when equivalence is not proven

Changing a shared contract is not the default. It requires two current consumers with the same generic need, tests for all existing defaults, and a smaller API than the duplicated implementations.

### Task 26.3 — Select the maximum authorized batch

Default maximum:

- one consumer file
- one collection-shell substitution
- no filter migration in the same commit unless the filter implementation is itself the only selected pattern and exact interaction parity is proven
- no shared CSS change
- no domain prop or callback added to `ResponsiveRecordCollection`

The Work Shift custom-shift branch is the preliminary first choice only if characterization proves exact loading, empty, populated, error, responsive, edit, and delete parity. Otherwise evaluate the Login Records collection shell. Do not fall through automatically into a higher-risk workflow or payroll candidate.

### Day 26 gate

Source work may begin only when:

- the chosen primitive can be reused without a domain-specific prop
- state precedence and surrounding controls remain unchanged
- mobile and desktop actions and accessible names are characterized
- counts, pagination, filters, selection, and expanded state remain caller-owned
- the source diff can be reverted without affecting other modules
- the selected migration is materially clearer than the current composition

If no candidate passes, record a no-change result and proceed directly to the Day 28 documentation gate.

## 10. Day 27 — Characterization and Bounded Implementation

### Task 27.1 — Establish the untouched baseline

For the preliminary Work Shift pilot, likely anchors are:

```text
src/components/__tests__/ResponsiveRecordCollection.test.jsx
src/components/__tests__/uiDebtPrimitives.test.jsx
src/views/settings/components/__tests__/WorkShift.test.jsx
```

If a different candidate is selected, replace the third anchor with its direct suite and relevant integration suite.

Before source edits, protect at minimum:

- loading content and precedence
- exact empty and error messages
- populated desktop table availability
- populated mobile list availability
- edit/delete/open/download action presence and accessible names
- action callback behavior
- nearby controls that must remain visible or hidden in each state
- footer count/page behavior when applicable
- no rendering of stale or duplicate content

### Task 27.2 — Implement only the approved reuse

Implementation rules:

- keep all filtering, sorting, pagination, grouping, selection, actions, and data transformation in the consumer
- pass caller-built `mobileSections`, desktop content, and footer to the existing primitive
- preserve current messages, variants, classes, wrappers, test IDs, and action order
- preserve table markup when it carries layout, loading-row, sticky-cell, or accessibility behavior
- do not change shared defaults to make the pilot fit
- do not change API calls, effects, state variables, callbacks, route navigation, exports, or modal behavior
- remove imports and branches only when the shared wrapper replaces them exactly

### Task 27.3 — Immediate migration audit

After implementation:

- run changed-file ESLint and Prettier checks
- run the shared primitive and direct consumer suites
- compare the source diff with the approved file list
- inspect state precedence and callback arguments
- search for duplicated local composition only in the selected consumer
- confirm no domain term entered shared source
- confirm mobile and desktop fields/actions remain available
- revert the migration if parity requires workflow, permission, API, or layout-specific shared flags

### Day 27 gate

Day 27 passes only when the source is smaller and clearer, the shared contract remains generic, all characterized behavior passes, and no business or data-control responsibility moves into the shared layer.

## 11. Day 28 — Pattern-Family Checkpoint

### Task 28.1 — Required focused validation

Always run for a source migration:

- changed-file ESLint
- changed-file Prettier check
- `ResponsiveRecordCollection` and applicable shared primitive tests
- selected consumer's direct tests
- relevant module integration tests for actions, filters, pagination, permissions, or workflow gates
- import, render-site, state-branch, and obsolete-markup searches
- `git diff --check`
- full diff review from `8352561`

Run full repository lint and the complete unit suite only when:

- a shared primitive contract or default changed
- more than one consumer was migrated
- filter, selection, pagination, workflow, route, permission, API, or state timing was touched
- focused tests reveal undocumented coupling

Run `npm run build` when production source changed. Documentation-only or no-change outcomes do not require lint, unit, or build repetition after the passing Days 21–24 checkpoint.

Do not run hosted GitHub Actions. Do not deploy.

### Task 28.2 — Generated-build safety

If a build runs:

1. Run `npm run build`.
2. Inspect `git status --short -- build`.
3. Restore tracked output with `git restore --worktree -- build`.
4. Preview untracked removal with `git clean -nd -- build`.
5. Confirm every previewed path is under the resolved repository `build/` directory.
6. Remove only those generated files with `git clean -fd -- build`.
7. Confirm no build diff remains.

### Task 28.3 — Audit the final boundary

Confirm the batch contains no changes to:

- package or lock files
- route definitions
- API/service modules
- permissions or module activation
- persistence or workflow controllers
- unrelated styles
- GitHub Actions or deployment configuration
- committed generated output

### Task 28.4 — Record the result

Create:

```text
upgrade-works/FRONTEND_COMPONENT_REUSE_STAGE_4_DATA_LISTS_EXECUTION_2026-08-04.md
```

Record:

- starting and ending revisions
- final evidence and candidate matrix
- pre-change characterization
- exact production files changed or the documented no-change decision
- focused and proportional validation results
- intentional specialized exceptions
- generated-output status
- rollback commits
- whether Days 29–32 may begin

### Day 28 gate

The Days 25–28 batch passes when:

- every applicable list/state outlier has a disposition
- any migration preserves data, filter, count, action, responsive, accessibility, and state-precedence behavior
- no universal table engine or domain controller was introduced
- no specialized table was forced into the shared collection
- all required validation passes
- generated output and the worktree are clean
- the execution record is complete

## 12. Stop Conditions

Stop or revert a candidate when:

- the wrapper changes loading, error, empty, refreshing, or stale-data visibility
- mobile or desktop loses a field, action, expanded detail, selection control, or disabled reason
- count text no longer means the same thing
- filter or page-reset timing changes
- a shared prop needs domain or workflow terminology
- table markup must change to fit the wrapper
- server and client pagination become conflated
- existing tests expose undocumented API, privacy, permission, or workflow coupling
- the diff expands beyond the approved consumer and primitive boundary

Document the reason and retain the local implementation. A stopped pilot is evidence, not a failed programme outcome.

## 13. Commit and Rollback Boundaries

Preferred commits:

1. Days 25–28 plan
2. untouched-source characterization
3. one bounded collection-shell implementation
4. checkpoint audit and execution record

Do not mix source migration with unrelated documentation, formatting, dependency, or cleanup changes.

Rollback order:

1. revert the selected consumer implementation commit
2. retain characterization unless it encodes a rejected contract
3. revert any shared-contract commit separately if one was explicitly approved
4. run the shared and direct consumer suites

No stored-data rollback should be necessary because persistence changes are prohibited.

## 14. Definition of Done

Days 25–28 are complete when:

- usage evidence and state machines are documented
- each candidate has a semantic disposition
- any selected primitive is smaller and clearer than the manual composition it replaces
- standard, loading, empty, error, filtered-empty, responsive, and accessibility behavior is preserved where applicable
- filtering, sorting, pagination, selection, actions, API behavior, permissions, and workflows remain caller-owned
- focused validation passes and broader validation follows Section 11
- no unrelated or generated files enter the diff
- the execution record and programme index are current

## 15. Next Boundary

After the Days 25–28 gate passes, the next planned family is Stage 4 Days 29–32: actions, status, and workflow presentation.

That later batch must separately inventory action groups, create buttons, loading buttons, state badges, and workflow summaries. This plan does not authorize those changes.
