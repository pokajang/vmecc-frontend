# Frontend Live UAT Pre-Day 5 Corrective Plan

**Date:** 2026-08-11  
**Status:** Executed locally; deployment verification pending  
**Trigger:** Day 4 deep-record UAT HOLD verdict  
**Scope:** Inspection detail route recovery and full-width shared detail-drawer border  
**Deployment boundary:** Frontend source and tests only; deployment and live verification remain explicit later steps

## 1. Objective

Remove the two issues blocking progression to Day 5 without broadening the change into the media redesign:

1. make an authorized Inspection record opened from `All` remain available after refresh and through a durable detail URL; and
2. remove the stray left border while the shared detail drawer occupies the complete viewport, while retaining the intentional desktop side-panel divider.

The checkpoint must preserve existing record permissions, list behavior, workflows, API payloads, mobile/desktop actions, and cPanel deployment assumptions.

## 2. Confirmed causes

### 2.1 Inspection detail scope loss

- `useInspectionRecords` initializes `recordScope` to `mine` on every fresh mount.
- Incident Commander can select `All` and open an authorized foreign-owned record while the component remains mounted.
- The resulting `/inspection/:reportId` URL does not encode the selected scope.
- Refreshing or cold-opening that URL reloads only `mine` records.
- `selectedRecord` searches only the loaded record collection and therefore renders `Report not found.`

This is a state-recovery defect, not an API permission failure. The backend must remain the authority over which records `scope=all` returns.

### 2.2 Full-width drawer border

- `.inspection-detail-drawer.offcanvas` uses `width: min(100vw, 58rem)`.
- CoreUI's end offcanvas retains a left divider.
- Live measurement found a `1px` left border at 360, 390, and 768 px while the surface began at `left: 0` and occupied the complete viewport.
- At 1440 px the drawer was 928 px wide and began at `left: 512`; the divider is useful in that true side-panel state.

The correction belongs to the shared detail-drawer style contract, not to Inspection-only page CSS or a global `.offcanvas` override.

## 3. Non-goals

Do not include nested image/card cleanup, visible filename cleanup, photo-component extraction, report workflow refactoring, a general query-state framework, dependency upgrades, global design changes, generated build commits, or production data mutation. The media work remains Day 5 discovery and Day 6 implementation.

Do not change backend authorization, schemas, payloads, or endpoints unless source inspection proves the current frontend cannot recover safely without an existing read-by-ID contract. Do not change the default Inspection list scope from `Mine` to `All`.

## 4. Required behavior contract

### 4.1 Scope semantics

| Entry path                    | Required loaded scope               | Required result                                                 |
| ----------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `/inspection`                 | `mine`                              | Existing personal list behavior remains unchanged               |
| `/inspection?scope=all`       | `all`                               | Authorized all-scope list loads and the All control is selected |
| Mine row → detail             | Current `mine` context              | Own record renders exactly as before                            |
| All row → detail              | Durable `all` context               | Authorized record renders and URL survives refresh              |
| Direct authorized detail URL  | Server-authorized detail scope      | Record renders after a cold load                                |
| Refresh authorized All detail | Same effective `all` context        | No false `Report not found`                                     |
| Close/back from All detail    | `All` Inspection list               | List scope is retained                                          |
| Invalid or unauthorized ID    | No permission expansion             | Existing safe missing/forbidden behavior remains                |
| `/inspection/:reportId/edit`  | Existing edit authorization         | No newly editable record is exposed                             |
| `scope=actionable` route      | Existing action/status/team filters | Review and approval queues remain unchanged                     |

### 4.2 Query contract

- Accept only known scope values: `mine`, `all`, and the existing `actionable` flow.
- Unknown or empty values fall back safely; do not pass arbitrary scope text to the API.
- Detail links opened from All must carry `scope=all` in a deterministic URL.
- Mine detail links may omit the default scope.
- Closing a detail must retain only the navigation context needed for the originating list.
- Characterize `action`, `status`, `team_id`, `date_from`, and `date_to` before deciding whether they survive detail navigation.

### 4.3 Permission contract

- `scope=all` means all records authorized by the backend, not unrestricted access.
- Do not infer access from frontend roles alone.
- Do not replace the backend list with local filtering of a wider unauthorized dataset.
- Do not convert a 403 to a missing record or suppress unexpected authorization errors.
- Detail entry remains read-only until an authorized workflow action is explicitly selected.

### 4.4 Drawer contract

- When the drawer equals the viewport, both outer edges are visually flush with no vertical outer divider.
- Above the 58 rem maximum, retain the intentional left side-panel divider.
- Header, feedback, internal section, finding accent, focus, and image borders remain untouched.
- Inspection and report detail drawers using the shared class receive the same correction.
- Inspect Fire Extinguisher create/edit drawers because they reuse `inspection-detail-drawer`.

## 5. Implementation strategy

### 5.1 Characterize before changing

Add or extend focused tests proving:

1. default Inspection list loads `mine`;
2. All selection causes an authorized `scope=all` read;
3. a record opened from All renders while state is retained;
4. a cold detail route currently loses that record;
5. actionable routes retain action/status/team filters;
6. own-record detail and edit behavior remain unchanged; and
7. the drawer is full-width at 360/390/768 and capped at 58 rem on desktop.

Include a failing characterization that turns green only through the intended correction. Do not rewrite unrelated snapshots.

### 5.2 Normalize the requested scope

Introduce the smallest pure helper or local function that:

- reads `scope` from `location.search`;
- returns only a supported scope;
- selects `all` for a fresh detail route when required to recover an authorized record;
- defaults ordinary list entry to `mine`; and
- can be tested without mounting the complete application.

Preferred current-architecture behavior:

- list route with no scope → `mine`;
- list route with `scope=all` → `all`;
- fresh detail route → load the server-authorized `all` collection so own and permitted team records resolve;
- already-mounted Mine or All navigation → retain the user's current scope; and
- actionable queue → preserve the existing API contract.

If authorized `all` is materially expensive, use an existing authorized read-by-ID endpoint. Do not invent a backend endpoint inside this frontend-only slice.

### 5.3 Initialize record state safely

Extend `useInspectionRecords` with a bounded `initialRecordScope` input:

- normalize it before calling the hook;
- initialize state lazily;
- keep the current setter and UI-control API unchanged;
- do not reset scope on every render or query change;
- prevent stale `mine` requests from replacing a newer `all` request; and
- retain the existing cancelled-result protection.

The hook must not become aware of React Router. URL interpretation stays in the module/navigation layer.

### 5.4 Preserve durable list/detail context

Replace inline detail URL construction with one small tested helper or caller-local builder:

- encode the report ID once;
- append `scope=all` when the current scope is All;
- preserve only approved queue/date context;
- build the correct close/back destination; and
- avoid role checks or workflow switches.

Update all Inspection record-open callers through their common callback. Do not duplicate query construction inside row components.

### 5.5 Correct the shared drawer border

In the stylesheet already owning `.inspection-detail-drawer.offcanvas`:

1. give the 58 rem maximum one local Sass variable if this prevents width/breakpoint drift;
2. set `border-left-width: 0` at or below that maximum;
3. retain the CoreUI divider above the threshold;
4. do not use `border: 0`; and
5. do not change width, transform, backdrop, z-index, scroll, safe-area, header, or body padding.

| Width | Drawer              | Required left border |
| ----: | ------------------- | -------------------: |
|   360 | 360 px full-width   |                 0 px |
|   390 | 390 px full-width   |                 0 px |
|   768 | 768 px full-width   |                 0 px |
|   928 | Full-width boundary |                 0 px |
|  929+ | Capped side panel   |        Existing 1 px |
|  1440 | 928 px side panel   |        Existing 1 px |

## 6. Planned source boundary

Expected production files are limited to the smallest subset of:

- `src/views/inspection/app/InspectionModule.js` — interpret route scope and provide navigation context;
- `src/views/inspection/state/useInspectionRecords.js` — accept normalized initial scope;
- `src/views/inspection/app/InspectionModuleSections.js` or an existing UI helper — build scoped record-detail navigation once;
- `src/views/inspection/app/InspectionModuleLayout.js` — retain scoped close destination only if it owns that callback; and
- `src/scss/features/inspection/core/_modals-and-detail.scss` — full-width border rule.

Focused tests may include:

- `src/views/inspection/__tests__/InspectionModule.routes.test.jsx`;
- a pure route/scope helper test;
- `src/views/inspection/__tests__/InspectionModuleLayout.test.jsx`;
- `src/views/inspection/__tests__/InspectionRecordsSection.test.jsx`;
- a narrow detail-drawer Playwright layout test; and
- `tests/e2e/live-uat/day4-deep-record.live.spec.js` for post-deployment confirmation.

Do not extract `RecordDetailDrawer` in this checkpoint. Combining extraction with functional recovery would enlarge the rollback surface.

## 7. Test plan

### 7.1 Unit and component tests

Test:

- scope normalization for absent, `mine`, `all`, `actionable`, mixed-case, and invalid input;
- default list state remains Mine;
- `/inspection?scope=all` initializes All;
- fresh detail can resolve an authorized foreign-owned record;
- All row navigation produces a durable URL;
- refresh semantics through remounting at that URL;
- close returns to the correct scope;
- own Mine record still renders;
- invalid ID remains missing;
- edit permissions do not expand;
- actionable filters remain intact; and
- read-only navigation issues no mutation.

### 7.2 Controlled browser tests

1. Authenticate as Incident Commander.
2. Open Inspection and select All.
3. Open a foreign-owned submitted HSE record.
4. Reload and confirm the same detail remains visible.
5. Close and confirm All remains selected.
6. Reopen by keyboard and verify Escape/back and focus recovery.
7. Directly open an invalid or unauthorized ID and confirm safe handling.
8. Repeat layout checks at 360, 390, 768, 928, 929, and 1440 px.
9. Measure border widths and overflow.
10. Check Fitness Test or another report detail to protect the shared CSS consumer.

### 7.3 Local quality gates

After correction:

1. format touched files;
2. run focused scope/navigation/component tests;
3. run focused drawer Playwright tests;
4. run the complete Inspection Vitest group;
5. run established controlled Inspection browser journeys;
6. run Day 3 and Day 4 UAT contracts without live credentials;
7. run full ESLint;
8. run the complete Vitest corpus within the established execution window;
9. run the production build;
10. run `git diff --check` and review the complete diff; and
11. remove only newly generated artifacts after recording results.

## 8. Post-deployment live gate

After commit, push, build, and manual cPanel deployment:

1. verify `version.json` matches the new build;
2. run credential and live-UAT safety preflight;
3. open the existing HSE record through Incident Commander → All;
4. refresh and confirm the same detail renders;
5. cold-open the scoped URL and confirm it renders;
6. close and verify All context;
7. measure border and overflow at 360, 390, 768, 928, 929, and 1440 px;
8. verify the divider exists only in the capped side-panel state;
9. repeat the border measurement on Fitness Test; and
10. confirm zero mutations, 429, 5xx, page errors, unexpected 4xx, or credential leakage.

Production remains read-only. Do not create missing records to increase coverage.

## 9. Mishap controls

- Do not initialize the ordinary list to All.
- Do not make `scope=all` a frontend permission bypass.
- Do not use `window.history` when React Router owns navigation.
- Do not preserve arbitrary query parameters.
- Do not reset scope in an effect that overwrites user selection.
- Do not allow stale Mine responses to replace All responses.
- Do not hide `Report not found` globally.
- Do not remove internal, header, feedback, image, or focus borders.
- Do not change shared drawer width or placement.
- Do not update screenshots or assertions without inspecting differences.
- Do not modify media presentation in this diff.

## 10. Stop conditions

Stop if:

- backend permission enforcement would be weakened;
- detail load fetches a materially larger or unauthorized dataset;
- actionable queues lose filters;
- Mine becomes All on ordinary list entry;
- edit or workflow action availability changes;
- refresh creates request loops or stale-state flicker;
- the border override affects unrelated offcanvas or internal styling;
- overflow exceeds 1 px;
- a controlled or live test attempts mutation; or
- deployed build identity differs from the tested correction.

## 11. Rollback boundary

- Route/scope rollback: revert scope normalization, hook initialization, and scoped URL builder together.
- Style rollback: revert only the full-width drawer border rule.
- Test rollback: revert only the new two-contract assertions.
- Deployment rollback: restore the last verified frontend build through the existing cPanel procedure.

No backend or database rollback should be required.

## 12. Exit criteria

Issue `GO` for Day 5 only when:

- All-scope Incident Commander detail survives refresh and cold scoped navigation;
- close/back returns to All;
- Mine list and own-record behavior remain unchanged;
- invalid and unauthorized IDs remain safe;
- edit/review/approve permissions do not expand;
- actionable filters remain intact;
- full-width detail drawers have no outer left border through 928 px;
- capped desktop drawers retain the divider above 928 px;
- HSE Inspection and Fitness Test have zero overflow;
- focused, Inspection-wide, lint, build, and browser gates pass;
- live verification targets the deployed correction and remains mutation-free; and
- the execution record provides evidence, residual risks, rollback, and an explicit Day 5 verdict.
