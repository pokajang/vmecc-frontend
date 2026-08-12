# Frontend Module Consistency Stage 6 Filter/Search Execution

**Date:** 2026-08-05  
**Application:** `vmecc-frontend`  
**Stage boundary:** Days 44-46  
**Plan:** [Stage 6 Filter/Search Plan](../90-archive/actioned-plans/FRONTEND_MODULE_CONSISTENCY_STAGE_6_FILTER_SEARCH_PLAN_2026-08-05.md)  
**Status:** Implemented and passed locally  
**Production migration:** One two-consumer Inspection pilot only

## 1. Outcome

Days 44-46 completed the repository-wide filter/search inventory, characterized the selected behavior before production changes, and migrated exactly one pilot pair.

The existing Inspection-owned `ManagedCheckToolbar` now presents the repeated Fire Extinguisher and FRT row-search controls. Each consumer still owns its records, search state, matching rules, loading meaning, empty-state meaning, and validation side effects. No API, URL, permission, persistence, pagination, workflow, backend, dependency, cPanel, or GitHub Actions behavior changed.

The production diff for the shared component and two consumers is 83 added lines and 95 removed lines: a net reduction of 12 lines while adding direct shared-contract coverage.

## 2. Day 44 - Production Inventory

### 2.1 Canonical general record-filter contract

`TableFilters` remains the canonical general record-list primitive. Its implementation owns:

- controlled desktop and mobile search presentation
- a 250 ms local emission debounce in `useTableFilters`
- controlled period and select-filter presentation
- clear/reset presentation and active-filter chips
- a mobile drawer with Escape dismissal, focus trapping, initial focus, and focus return

Consumers continue to own filtering, API requests, paging, URL/deep-link policy, option permissions, sorting, selection, and domain interpretation.

### 2.2 All 18 production `TableFilters` consumers

|   # | Consumer                               | Route family                    | Contract observed                                                | URL/side-effect ownership                                                             | Disposition                          |
| --: | -------------------------------------- | ------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------ |
|   1 | `UserManagementTableSection`           | Users administration            | Search, period, sort, role and status                            | Parent/controller owns query, sort and paging effects                                 | Retain canonical adopter             |
|   2 | `StaffDetails`                         | Staff directory                 | Search, period, status and role                                  | Component owns local filtering; profile navigation remains separate                   | Retain canonical adopter             |
|   3 | `ClaimsSection`                        | Payroll claims                  | Search, period, sort, category and status                        | Parent owns claim data and clear effects                                              | Retain canonical adopter             |
|   4 | `LeaveRecordsSection`                  | Employee leave                  | Search, period, sort, type and status                            | Leave controller owns data and reset effects                                          | Retain canonical adopter             |
|   5 | `OvertimeRecordsSection`               | Employee overtime               | Search, period, sort and status                                  | Overtime controller owns data and reset effects                                       | Retain canonical adopter             |
|   6 | `AssignmentsTab`                       | Leave management                | Search, sort, type and team; no period                           | Tab owns assignment filtering and reset                                               | Retain canonical adopter             |
|   7 | Staff-management `LeaveRecordsSection` | Leave management                | Search, period, sort, type and status                            | Management controller owns data and reset                                             | Retain canonical adopter             |
|   8 | `SalarySettingsTab`                    | Payroll configuration           | Search, sort and team; no period                                 | Tab owns assignment filtering and reset                                               | Retain canonical adopter             |
|   9 | `SalaryRecordsTab`                     | Payroll records                 | Search, period, sort and status                                  | Tab owns payroll-month and status meaning                                             | Retain canonical adopter             |
|  10 | `HolidaysTab`                          | Leave management                | Search, sort, year, scope and state; no period                   | Tab owns holiday filtering and reset                                                  | Retain canonical adopter             |
|  11 | `OvertimeRecordsTab`                   | Overtime management             | Search, period, sort, status, type and team                      | Tab owns grouping, selection and workflow effects                                     | Retain canonical adopter             |
|  12 | `RecordsTab`                           | Leave management                | Search, period, sort, type and status                            | Tab owns grouping, selection and workflow effects                                     | Retain canonical adopter             |
|  13 | `ClaimRecordsTab`                      | Salary/claims management        | Search, period, sort, type and status with explicit defaults     | Tab owns workflow and record state                                                    | Retain canonical adopter             |
|  14 | `AuditLogs`                            | Audit administration            | Search, period/range and action                                  | Component owns custom-range dates and clear behavior                                  | Retain canonical adopter             |
|  15 | `AiHelperKnowledge`                    | AI knowledge administration     | Search, review status, scope and visibility; no period           | Component initializes review status from the URL and owns permission-filtered options | Retain canonical adopter             |
|  16 | `AllExtinguishersSection`              | Inspection extinguisher records | Search, period, sort, location, lifecycle and compliance filters | Feature owns saved view state, issue deep-link initialization, remote data and paging | Retain canonical adopter             |
|  17 | `ReportRecordsSection`                 | Reporting record lists          | Search, period, sort, type and status                            | Report owner supplies options, data and reset behavior                                | Retain canonical adopter; no wrapper |
|  18 | `InspectionRecordsFilters`             | Inspection records              | Search, period, sort, type, status and checklist presence        | Inspection owner supplies options, data and reset behavior                            | Retain canonical adopter; no wrapper |

The similar Reports and Inspection configurations were not wrapped again. They already delegate presentation to `TableFilters`; another wrapper would hide state flow without removing meaningful ownership.

### 2.3 Manual and specialist search families

| Family                             | Production owners                                                                    | Timing/state                                                                          | Clear, empty, responsive and accessibility contract                                              | Classification and disposition                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Managed Inspection row search      | SCBA already shared; Fire Extinguisher, FRT, Hydraulic, High Angle and ER Aux manual | Immediate local controlled state; local field matching; no URL or API query ownership | Named search, conditional Clear, result count and domain empty state; toolbar wraps responsively | Feature-local duplicate. Select only Fire + FRT pilot; defer the remaining three |
| Inspection location selection      | `InspectionLocationOptionPicker` and setup-section consumers                         | Immediate local selection search                                                      | Shared picker owns search/clear; selection, flow and focus remain in setup owner                 | Intentional specialist; already shared                                           |
| Roster filtering                   | `RosterFilter`                                                                       | Immediate controlled search plus day/week/custom-range navigation                     | Team filter, date navigation, multi-month calendar selection, active chips and clear             | Intentional specialist; retain                                                   |
| Permission discovery               | `RolePermissionMatrixSections`                                                       | Immediate local role/group/text/changes-only filtering                                | Result count, view-mode switch and edit-only behavior                                            | Intentional specialist; retain                                                   |
| Message contact lookup             | `Messages`                                                                           | Remote request through `fetchMessageContacts`                                         | Contact selection and conversation creation, not record-list narrowing                           | Intentional remote lookup; retain                                                |
| Staff lookup                       | `StaffSelect` consumers in Leave, Salary and Fitness                                 | Searchable selection with loading and selected identity                               | Combobox selection contract, not a filter summary                                                | Intentional shared lookup; retain                                                |
| Bank and creatable location lookup | `BankingSection`, Fire Extinguisher shared-location fields and location selects      | Searchable/creatable select state                                                     | Portal/menu/creation behavior and dependent selections                                           | Intentional specialist; retain                                                   |
| Scanner and asset lookup           | Fire Extinguisher scanner and asset/location selectors                               | Device/input-driven lookup and focused workflow                                       | Scan result, registration, duplicate and location workflow                                       | Intentional specialist; retain                                                   |

No dead filter/search component or exclusive style owner met the removal proof. The remaining manual Hydraulic, High Angle and ER Aux toolbar blocks are live and intentionally deferred so this stage stays within its one-pilot boundary.

## 3. Candidate Scoring and Decision

| Candidate                                 | Structure | Behavior | Consumers | Existing fit | Tests | Isolation | Simplification | Risk |     Total | Decision                          |
| ----------------------------------------- | --------: | -------: | --------: | -----------: | ----: | --------: | -------------: | ---: | --------: | --------------------------------- |
| Inspection managed row-search family      |         2 |        2 |         2 |            1 |     2 |         2 |              2 |    2 | **15/16** | Approve Fire + FRT pilot only     |
| Reports/Inspection `TableFilters` wrapper |         1 |        2 |         1 |            2 |     2 |         1 |              0 |    1 |     10/16 | Reject wrapper; no simplification |
| Roster to `TableFilters`                  |         1 |        0 |         1 |            0 |     1 |         0 |              0 |    0 |      3/16 | Retain specialist                 |
| Permission matrix to `TableFilters`       |         1 |        0 |         1 |            0 |     1 |         1 |              0 |    0 |      4/16 | Retain specialist                 |
| Lookup/select/search family               |         0 |        0 |         2 |            0 |     1 |         0 |              0 |    0 |      3/16 | Retain specialist contracts       |

Fire Extinguisher and FRT were chosen from the wider Inspection family because both had strong direct tests, identical toolbar order, immediate local search, conditional search-only Clear, count presentation, no URL/API ownership, and independently reversible consumer blocks.

## 4. Day 45 - Untouched-Source Characterization

Before production source changed, the following command passed:

```text
npx vitest run src/views/inspection/__tests__/FireExtinguisherSection.test.jsx src/views/inspection/__tests__/FrtInspectionChecks.mobile.test.jsx --environment jsdom
```

Result: **2 files / 34 tests passed**.

New characterization proved:

- exact accessible search names and effective button type
- immediate controlled-value updates rather than debounce
- one-of-total and zero-of-total result counts
- search-specific empty states
- Clear restores all rows and removes itself and the active count
- Fire initial loading disables search
- Fire refresh with existing rows leaves search enabled and shows `Refreshing units...`
- FRT validation focus requests continue to clear search and surface the target row

### Approved shared contract

`ManagedCheckToolbar` may own only:

- controlled search input presentation
- distinct accessible name and placeholder
- optional disabled presentation
- optional conditional Clear action
- existing optional next-incomplete/expand/collapse actions
- active result count or an idle status message

It must not own records, matching, debounce, URL state, permissions, API requests, page resets, row selection, validation targeting, loading interpretation, or empty-state meaning.

## 5. Day 46 - Implementation

### Shared owner

`ManagedCheckToolbar` received backward-compatible optional inputs:

- `searchLabel`
- `searchDisabled`
- `onClearSearch`
- `clearSearchLabel`
- `idleStatus`

Managed action buttons now render only when their callback exists. SCBA supplies all three existing callbacks, so its visible behavior and ordering remain unchanged. No module-name switch, domain record, filtering callback, route mode, permission, or API dependency was added.

### Consumer A - Fire Extinguisher

The manual toolbar was replaced with `ManagedCheckToolbar`. Fire retains:

- local `search` state and `filterFireExtinguisherRows`
- immediate filtering
- initial-loading disable rule
- refresh-with-existing-rows status
- exact placeholder and accessible names
- result counts and both empty-state meanings
- focused scan-mode and read-only visibility rules

### Consumer B - FRT

The manual toolbar was replaced with `ManagedCheckToolbar`. FRT retains:

- local `search` state and `rowContainsSearch` field lists
- immediate filtering across daily and one-off rows
- validation-event search reset
- exact placeholder and accessible names
- result counts and registered/filtered empty-state meanings
- read-only visibility rule

## 6. Validation Evidence

| Gate                                           | Result                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Untouched-source characterization              | 2 files / 34 tests passed                                                                        |
| Final focused shared + Fire + FRT + SCBA tests | 4 files / 48 tests passed                                                                        |
| Complete Vitest suite                          | **323 files / 1,780 tests passed** with four workers in 362.26 seconds                           |
| Changed-file ESLint                            | Passed                                                                                           |
| Full ESLint                                    | Passed                                                                                           |
| Prettier                                       | Passed after formatting the two new characterization blocks and browser spec                     |
| Production build                               | Passed; 6,493 modules transformed using a valid HTTPS API placeholder                            |
| Controlled component Playwright                | **2/2 passed**: Fire at 390 x 844 and FRT at 1440 x 960                                          |
| Inspection visual Playwright                   | **1/1 passed** across its 10 representative mobile/tablet/desktop cases                          |
| Browser harness origin safety                  | Non-loopback HTTPS origin rejected before tests were listed                                      |
| E2E coverage contract                          | 50/50 catalog modules mapped                                                                     |
| Reference search                               | Three `ManagedCheckToolbar` consumers; only the three explicitly deferred manual toolbars remain |
| `git diff --check`                             | Passed                                                                                           |

The first full-suite attempt exceeded a four-minute command ceiling and left its child workers active. That timeout was not counted as a pass or failure. Only those exact Vitest/ESLint child processes were stopped, and the suite was rerun with four workers and a ten-minute ceiling to obtain the recorded complete pass.

The first attempted browser assertion used the visual QA matrix, but inspection showed that route intentionally renders `StructuredSectionStub` rather than the real structured sections. The invalid assertion was removed instead of weakening it. A loopback-only Vite browser-component journey was added and passed against the real source components without API or database access.

## 7. Cleanup and Worktree Safety

- The tracked `build/` directory was restored to its pre-validation state.
- Only the previewed untracked hashed build assets created by this run were removed.
- The disposable `.qa/stage6-filter-search` build and Playwright output were sent to the Windows Recycle Bin after their exact paths were verified inside the workspace.
- The exact preview and Vite development-server PIDs were stopped.
- Port 4173 has no remaining listener.
- Pre-existing Day 43, audit and documentation changes were preserved.
- No database or backend service was started, repaired, reset, or written.

## 8. Rollback

Rollback remains independently bounded:

1. restore the FRT manual toolbar and remove its `ManagedCheckToolbar` import
2. restore the Fire Extinguisher manual toolbar and its direct `CFormInput` import
3. revert the optional `ManagedCheckToolbar` inputs and direct shared test if no consumer remains
4. retain characterization tests that continue to describe supported behavior
5. remove the browser component spec only if another controlled real-component journey replaces it

No data or environment rollback is required.

## 9. Residual Risks and Explicit Deferrals

- Hydraulic, High Angle and ER Aux still contain the same manual Inspection toolbar composition. They are live and testable, but migrating them now would exceed the approved pilot pair.
- The controlled browser component spec requires a local Vite development server because it imports real source modules. It fails closed for non-loopback origins and performs no API calls.
- The repository retains its existing build chunk-size and mixed static/dynamic import advisories; this stage did not change bundle strategy.
- Authenticated live Fire Extinguisher coverage already contains a search/Clear journey, but it was not run because it writes through the local backend/database. The controlled browser test covers the migrated interaction without that risk.

## 10. Recommendation for Days 47-49

Proceed to the planned page-header and action-bar inventory. Do not automatically continue migrating the three deferred Inspection toolbars in the next stage; retain them as a proven follow-on candidate and revisit them only after the header/action-bar boundary is completed or the parent plan is explicitly reprioritized.

The next stage should again begin with route/header ownership and untouched-source characterization, then migrate no more than one evidence-backed pair.
