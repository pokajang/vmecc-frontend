# Frontend Module Consistency Stage 6 Inspection Toolbar Completion Plan

**Date:** 2026-08-06  
**Application:** `vmecc-frontend`  
**Parent plan:** [Frontend Module Consistency and Reuse Plan](./FRONTEND_MODULE_CONSISTENCY_AND_REUSE_PLAN_2026-08-05.md)  
**Stage boundary:** Days 47-49  
**Status:** Completed locally; see the linked execution record in the upgrade index  
**Authorization boundary:** Characterize and migrate Hydraulic, ER Aux and High Angle to the proven Inspection toolbar contract; no new abstraction

## 1. Objective

Complete the Inspection row-search presentation family before moving to unrelated page-header work.

The existing `ManagedCheckToolbar` contract was proven during Days 44-46 by SCBA, Fire Extinguisher and FRT. Hydraulic, Emergency Response Auxiliary Equipment and High Angle still manually render the same search, conditional Clear action and active-result count structure.

This stage will migrate those three remaining live consumers only when their current behavior can be preserved with the existing API. Success means one coherent Inspection toolbar owner, fewer manual compositions and unchanged inspection workflows—not additional shared props or broader redesign.

## 2. Verified Starting Point

Repository inspection on 2026-08-06 established:

- `ManagedCheckToolbar` is owned by `src/views/inspection/form/components/InspectionDisplayShared.js`.
- Its current production consumers are SCBA, Fire Extinguisher and FRT.
- It already supports the inputs required by the three remaining candidates:
  - controlled `search` and `onSearch`
  - distinct `searchPlaceholder` and `searchLabel`
  - optional `searchDisabled`
  - optional `onClearSearch` and `clearSearchLabel`
  - `resultCount` and `totalCount`
  - optional `idleStatus`
  - optional managed actions
  - `readOnly`
- The remaining manual owners are:
  - `HydraulicEquipmentChecks.js`
  - `ErAuxInspectionChecks.js`
  - `HighAngleInspectionChecks.js`
- All three use immediate local search and domain-owned filtered collections.
- None of the three delegates search to an API, URL, permission resolver or workflow service.
- No shared SCSS change is expected because the existing and target markup use the same toolbar classes.
- Direct test files already exist:
  - `HydraulicEquipmentChecks.mobile.test.jsx`
  - `ErAuxEquipmentChecks.mobile.test.jsx`
  - `HighAngleInspectionChecks.mobile.test.jsx`
- A loopback-only real-source browser harness already covers Fire Extinguisher and FRT in `tests/e2e/inspection-filter-search-component.spec.js` and can be extended for these consumers.

## 3. Consumer Behavior Matrix

| Contract                   | Hydraulic                                                       | ER Aux                                                          | High Angle                                                               |
| -------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Search state               | Local, immediate                                                | Local, immediate                                                | Local, immediate                                                         |
| Matching owner             | Consumer-filtered `visibleChecks`                               | Consumer-filtered `visibleChecks`                               | Consumer-filtered selected-group rows                                    |
| Toolbar visibility         | Editable view only when visible rows exist                      | Editable view only when visible rows exist                      | Editable view only after a group is selected                             |
| Initial loading            | Loading state and empty-row behavior remain consumer-owned      | Loading message; toolbar absent without rows                    | No equivalent catalog-loading contract in the toolbar block              |
| Refresh with reliable rows | External `Refreshing equipment...` status remains above toolbar | External `Refreshing equipment...` status remains above toolbar | Not applicable to current toolbar contract                               |
| Clear                      | Search-only; conditional button                                 | Search-only; conditional button                                 | Search-only; conditional button                                          |
| Active count               | Filtered checks / visible checks                                | Filtered checks / visible checks                                | Filtered selected-group rows / all visible-group rows                    |
| Filtered empty             | Hydraulic-specific message                                      | ER Aux-specific message                                         | High Angle selected-group message                                        |
| Unfiltered empty           | No equipment for location                                       | Loading or no registered equipment                              | Group selection/no-row workflow                                          |
| Search reset side effects  | Search-only                                                     | Search-only                                                     | Also reset by selection, selector reset/change and continuation paths    |
| Read-only                  | Toolbar hidden                                                  | Toolbar hidden                                                  | Toolbar hidden; rows remain readable                                     |
| Domain actions             | Mark/add/edit/reset remain outside toolbar                      | Mark/add/edit/reset remain outside toolbar                      | Group selection, add/edit/delete and continuation remain outside toolbar |

This matrix is authoritative for characterization. Migration must not normalize these differences.

## 4. Ownership Boundary

### `ManagedCheckToolbar` may continue to own

- toolbar DOM structure and existing classes
- controlled search-input presentation
- accessible search name and placeholder
- conditional search-only Clear button
- active result-count presentation
- optional presentation-only status and managed actions already supported by the contract

### Every consumer must continue to own

- search state and immediate timing
- searchable fields, normalization and matching
- source rows, groups and filtered collections
- loading and refresh interpretation
- filtered, unfiltered and registration-empty messages
- selected group or compartment
- validation focus and search-reset side effects
- read-only and permission visibility
- add, edit, delete, mark-good, reset, photo and drawer workflows
- API, persistence, route, session and continuation behavior

No consumer may pass raw records, matching callbacks, domain status interpretation, module names, permissions, API clients or workflow modes into the shared toolbar.

## 5. Day 47 - Untouched-Source Characterization and Approval

### Goal

Prove each remaining consumer's current contract before changing production source.

### Hydraulic tasks

1. Render two distinct equipment rows with searchable fields.
2. Verify exact accessible name and placeholder.
3. Verify filtering is immediate and updates the controlled value.
4. Verify one-of-total and zero-of-total counts.
5. Verify filtered-empty and unfiltered-empty messages remain distinct.
6. Verify Clear has effective `type="button"`, restores all rows and removes the active count and itself.
7. Verify toolbar absence with zero rows, initial loading and read-only mode.
8. Verify refreshing reliable rows remains announced outside the toolbar and does not hide rows.

### ER Aux tasks

1. Render two distinct ER Aux equipment rows.
2. Verify exact accessible name and placeholder.
3. Verify immediate filtering, counts, filtered empty and Clear restoration.
4. Verify the toolbar is absent when no visible rows exist.
5. Verify initial loading and registered-empty messages remain distinct.
6. Verify reliable rows stay visible while refresh status is announced.
7. Verify read-only and mobile detail-drawer behavior remain unchanged.

### High Angle tasks

1. Render at least two groups and two searchable rows in the selected group.
2. Verify the toolbar is absent until an editable group is selected.
3. Verify exact accessible name, placeholder, immediate filtering, counts, filtered empty and Clear restoration.
4. Verify switching groups clears stale search and shows the selected group's rows.
5. Verify the migration does not add search-reset side effects to group/item mutation callbacks.
6. Verify continuation to the next compartment/group clears search as before.
7. Verify read-only presentation and mobile row drawer remain unchanged.

### Day 47 commands

```text
npx vitest run src/views/inspection/__tests__/HydraulicEquipmentChecks.mobile.test.jsx src/views/inspection/__tests__/ErAuxEquipmentChecks.mobile.test.jsx src/views/inspection/__tests__/HighAngleInspectionChecks.mobile.test.jsx --environment jsdom
npx prettier --check <Day 47 changed test files>
npx eslint <Day 47 changed test files>
git diff --check
```

### Day 47 exit gate

- all new characterization passes against untouched production source
- all three consumers fit the existing shared API without extension
- each visibility, loading, empty-state and search-reset difference is explicit
- rollback can restore each consumer independently
- otherwise stop the affected consumer and record why it remains manual

## 6. Day 48 - Hydraulic and ER Aux Migration

### Goal

Migrate the two lower-complexity consumers independently.

### Hydraulic implementation order

1. Import `ManagedCheckToolbar` from the existing Inspection shared owner.
2. Replace only the manual `inspection-check-toolbar` block.
3. Pass the existing search state setter, labels, counts and search-only clear callback.
4. Leave the external refresh announcement where it is.
5. Leave loading, filtered-empty, unfiltered-empty and read-only branches local.
6. Remove `CFormInput` only if no other Hydraulic use remains; retain `CButton` where still used.
7. Search for stale toolbar markup and inspect the exact diff.
8. Run Hydraulic and shared-toolbar tests before continuing.

### ER Aux implementation order

1. Proceed only after Hydraulic passes independently.
2. Replace only the manual toolbar inside the existing `!readOnly && visibleChecks.length > 0` condition.
3. Preserve the condition rather than moving it into `ManagedCheckToolbar`.
4. Pass the existing search state setter, labels, counts and search-only clear callback.
5. Leave refresh, loading, registered-empty and filtered-empty branches local.
6. Remove only imports made unreachable by the replacement.
7. Search for stale markup and inspect the exact diff.
8. Run ER Aux, Hydraulic and shared-toolbar tests.

### Day 48 exit gate

- both consumers pass independently and together
- no new `ManagedCheckToolbar` prop is added
- no loading/status/empty-state markup moved into shared ownership
- existing DOM classes and control order remain equivalent
- no API, persistence, drawer, photo, validation or domain-action code changed

## 7. Day 49 - High Angle Migration and Family Checkpoint

### Goal

Migrate the higher-context consumer last and close the Inspection toolbar family.

### High Angle implementation order

1. Reconfirm Day 47 group-selection and search-reset tests.
2. Replace only the manual toolbar within `showEquipmentRows && !readOnly`.
3. Keep `showEquipmentRows`, selected-group derivation and group filtering local.
4. Pass the existing search state setter, labels, selected-group counts and search-only clear callback.
5. Preserve every existing `setSearch('')` call associated with group selection, selector reset/change and continuation.
6. Leave add/edit/delete, row drawer, continuation and filtered-empty composition unchanged.
7. Remove only imports made unreachable by the replacement.
8. Run the complete affected Inspection toolbar family.

### Final browser journeys

Extend the loopback-only real-source browser test rather than relying on the UX matrix's `StructuredSectionStub`.

Validate:

- Hydraulic at 390 x 844 mobile
- ER Aux at 820 x 1000 tablet transition width
- High Angle at 1440 x 960 desktop
- exact accessible names and placeholders
- a matching query and one-of-total count
- a non-matching query and domain filtered-empty message
- conditional Clear and full-row restoration
- High Angle toolbar absence before group selection and search reset after changing group
- no page errors
- non-loopback source origins still fail closed

Do not add screenshots or traces to durable source. Existing light/dark and overflow coverage is sufficient unless styles change.

### Day 49 final gate

```text
npx prettier --check <all Days 47-49 changed files>
npx eslint <all changed JS/JSX files>
npx vitest run src/views/inspection/__tests__/InspectionDisplayShared.test.jsx src/views/inspection/__tests__/ScbaInspectionChecks.mobile.test.jsx src/views/inspection/__tests__/FireExtinguisherSection.test.jsx src/views/inspection/__tests__/FrtInspectionChecks.mobile.test.jsx src/views/inspection/__tests__/HydraulicEquipmentChecks.mobile.test.jsx src/views/inspection/__tests__/ErAuxEquipmentChecks.mobile.test.jsx src/views/inspection/__tests__/HighAngleInspectionChecks.mobile.test.jsx --environment jsdom
npx playwright test tests/e2e/inspection-filter-search-component.spec.js --config=playwright.config.mjs --workers=1
npm run test:e2e:coverage-contract
npm run lint
npm run build
git diff --check
```

Also run the complete Inspection test partition at the family checkpoint. Run the complete repository Vitest suite only if the shared toolbar contract, shared styles, test harness contract or code outside the three consumers changes. This keeps validation proportional to the implementation.

## 8. User-Journey Acceptance Matrix

| User lens                | Journey                                   | Required result                                                               |
| ------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------- |
| First-time inspector     | Opens a location/group without search     | All eligible rows and correct first-use/loading state are understandable      |
| Returning inspector      | Searches a known equipment identifier     | Matching rows appear immediately with an accurate count                       |
| Low-confidence inspector | Searches for a missing item               | Domain-specific no-results copy explains the state without implying data loss |
| Interrupted inspector    | Clears search or changes High Angle group | Full context returns and stale search does not hide the next task             |
| Mobile inspector         | Searches and opens a row at 390 px        | Search remains usable and the row-detail drawer workflow is unchanged         |
| Tablet inspector         | Uses ER Aux around the layout transition  | Toolbar and actions remain ordered, visible and unclipped                     |
| Keyboard user            | Tabs through search and conditional Clear | Accessible names, order and effective button type remain correct              |
| Read-only user           | Opens submitted inspection evidence       | No edit/search toolbar appears; recorded rows remain readable                 |

## 9. Stop and Mishap Controls

Stop an individual migration when:

- its characterization cannot pass against untouched source
- the current `ManagedCheckToolbar` API cannot express it without a domain-specific prop
- visibility would need to move from the consumer into the shared component
- loading, refresh or empty-state meaning would be merged or reordered
- High Angle selected-group or continuation behavior changes
- mobile drawer, row action, photo, reset or add/edit/delete behavior changes
- unrelated worktree changes overlap the exact consumer block

When a failure occurs:

1. record the command, consumer, viewport and state
2. reproduce against the pre-migration consumer where possible
3. attribute application regression, stale test, environment issue or pre-existing behavior
4. make only the smallest in-scope correction
5. revert or retain the individual consumer if parity cannot be proven

Do not loosen assertions, change labels, debounce behavior, search fields or result meaning merely to complete the migration.

## 10. Worktree and Environment Safety

- Preserve all existing Days 43-46 and audit changes.
- Do not reformat unrelated files.
- Do not modify tracked `build/` output; prefer a disposable outDir.
- Use explicit loopback browser/module origins only.
- Do not start, repair or write through the normal PostgreSQL cluster.
- Do not run authenticated write-capable smoke tests for this presentation migration.
- Start preview/development servers hidden, record exact PIDs and stop only those PIDs.
- Verify cleanup paths are inside `C:\laragon\www\vmecc` before removal.
- Do not retain screenshots, traces, generated builds, raw payloads or personal data.
- GitHub Actions, cPanel and deployment remain out of scope.

## 11. Commit and Rollback Boundaries

Keep independently reversible boundaries:

1. untouched-source characterization for all three consumers
2. Hydraulic migration
3. ER Aux migration
4. High Angle migration
5. controlled browser extension, validation record and index update

Rollback order:

1. restore High Angle's manual toolbar and imports
2. restore ER Aux's manual toolbar and imports
3. restore Hydraulic's manual toolbar and imports
4. retain shared `ManagedCheckToolbar` because SCBA, Fire Extinguisher and FRT still use it
5. retain characterization where it continues to describe supported behavior

No data, backend or environment rollback is required.

## 12. Expected Handover

Create:

```text
upgrade-works/FRONTEND_MODULE_CONSISTENCY_STAGE_6_INSPECTION_TOOLBAR_COMPLETION_EXECUTION_2026-08-06.md
```

The execution record must include:

- untouched-source results
- per-consumer behavior matrix and final disposition
- exact shared-versus-local ownership
- per-consumer diffs and rollback boundaries
- focused, Inspection-partition, browser, lint and build evidence
- failure attribution and cleanup
- confirmation that no manual `inspection-check-toolbar` production owner remains outside the shared component, or an explicit retained exception
- the revised recommendation for Days 50-52 page headers and action bars

## 13. Stage 6 Schedule Effect

This follow-on stage intentionally extends Stage 6 rather than compressing later work:

- Days 47-49: Inspection toolbar completion
- Days 50-52: page headers and action bars
- Days 53-55: form sections and validation presentation
- Days 56-58: detail and summary presentation
- Days 59-60: loading, empty, error and recovery states
- Day 61: final consistency audit and handover

The quality boundary and proportional validation policy remain unchanged.
