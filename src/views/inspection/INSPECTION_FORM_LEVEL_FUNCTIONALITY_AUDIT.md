# Inspection Form-Level Functionality Consistency Audit

Last updated: 2026-07-10

Scope: registered inspection types from `app/inspectionTypeRegistry.js`, with Fire Extinguisher used as the practical reference for row/card-level system affordances. This audit intentionally ignores field-by-field technical differences that are domain-specific.

## Registered Types

- `er-aux`
- `fire-extinguisher`
- `frt-daily`
- `high-angle`
- `hydraulic`
- `scba`
- `hse`
- `general`

## Baseline System Affordances

The common row/card experience should be judged by these system-level affordances:

1. Row/card title, metadata, status, and issue/defect signal.
2. Row-level action menu for reset/edit/delete or type-specific management.
3. Search/filter toolbar with clear and result count for high-cardinality rows.
4. Loading or refreshing feedback when backing catalog rows are being loaded.
5. Mobile detail drawer with draft state, save/cancel footer, dirty-close guard, and discard confirmation.
6. Inline evidence affordances for issue/defect states.
7. Optional additional remarks/photos.
8. Validation-to-row visibility: header badges or equivalent row-local cues when missing required status/evidence.
9. Bulk or quick-mark actions where the domain supports a known-good shortcut.
10. Context helper text that explains previous/current submission state when that data exists.

## Type Matrix

| Type | Row/card shell | Row action menu | Search/filter | Mobile detail drawer | Dirty close guard | Issue evidence | Additional info | Quick mark | Row header validation cue | Context helper text |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Fire Extinguisher | Bespoke card | Yes | Yes | Yes | Yes | Yes | Yes | No row quick-good visible | Yes | Strong |
| FRT Daily | Shared `InspectionElementCard` | Yes | Yes | Yes | Yes | Yes | Yes | Bulk mark all | Yes | Partial, truck-level |
| ER Aux | Shared `InspectionElementCard` | Yes | Yes | Yes | Yes | Yes | Yes | Bulk mark all | Yes | No |
| Hydraulic | Shared card via `HydraulicEquipmentCheckCard` | Yes | Yes | Yes | Yes | Yes | Yes | Row and bulk OK | Yes | Retained evidence helper |
| High Angle | Shared card via `HighAngleInspectionRowCard` | Yes | Yes | Yes | Yes | Yes | Yes | Row and bulk Good | Yes | Retained evidence helper |
| SCBA | Shared `InspectionElementCard` in sections | Yes | Yes | Yes | Yes | Yes | Yes | Row All Good + group Good | Yes | Retained evidence helper |
| HSE | Single observation card | No row menu | No | Yes on mobile after selection | Yes | HSE photo actions | General HSE remarks | n/a | Inline/form-level | No |
| General | Generic findings/evidence flow | n/a | n/a | Shared evidence drawer only | Shared evidence guard | Findings/evidence | Report-level | n/a | Generic | No |

## Findings

### 1. "Checked" Does Not Mean The Same Thing Across Types - Resolved

Severity: High.

Fire Extinguisher and FRT Daily only show a row as checked when required issue/defect evidence is also complete. Other row-card types mark rows checked once status fields are filled, even if issue evidence is still missing and review will later block the form.

Evidence:

- Fire Extinguisher validation includes missing status, missing defect remarks, and missing defect photos before `isComplete` is true: `types/fire-extinguisher/helpers.js`.
- FRT Daily `isFrtRowComplete` requires issue remarks and photos for issue rows: `types/frt-daily/frtDailySectionCards.js`.
- ER Aux `getErAuxWorkflowState` only requires condition and quantity for `isComplete`: `form/components/ErAuxInspectionChecks.js`.
- Hydraulic `getHydraulicWorkflowState` only checks each hydraulic status field: `form/components/HydraulicEquipmentCheckCard.js`.
- High Angle `HighAngleStatusInline` treats any condition value as checked: `form/components/HighAngleInspectionRowCard.js`.
- SCBA `getScbaWorkflowState` only checks field values, not issue evidence completeness: `form/components/ScbaSectionCards.js`.

Impact: A user can see "Checked" on ER Aux, Hydraulic, High Angle, or SCBA while the row still lacks required evidence and will fail review. That is a system-level consistency problem, not a domain-specific detail.

Implemented: ER Aux, Hydraulic, High Angle, and SCBA now include their existing mandatory issue-evidence rules when calculating visible row completion and summary `checkedCount` values. Card status, progress, checklists, and continuation readiness therefore reflect review readiness, not merely a selected status.

### 2. High Angle Receives Quick-Mark Handlers But Does Not Use Them - Resolved

Severity: High.

`types/high-angle/section.js` passes both `onMarkRowOk` and `onMarkAllOk` into `HighAngleInspectionChecks`, but `HighAngleInspectionChecks` does not accept or render either affordance. Comparable row-card types expose these shortcuts:

- ER Aux: `Mark all OK`
- Hydraulic: `Mark all OK` and row `All OK`
- FRT Daily: `Mark status rows Checked + one-off Good`
- SCBA: `Mark group Good` and row `All Good`

Impact: High Angle has the handler plumbing but the user cannot access the function. This is likely an implementation omission.

Implemented: High Angle now renders `All Good` for an individual row and `Mark all Good` for the active list. Mobile row quick-mark updates the staged draft and remains subject to normal Save/Discard behavior.

### 3. HSE Mobile Drawer Can Drop Unsaved Draft Changes Without The Shared Dirty-Close Guard - Resolved

Severity: Medium-high.

Most row-card mobile drawers track `mobileDraftDirty`, route close through `requestCloseMobileDetailDrawer`, render `InspectionElementDrawerFooter`, and show a "Discard changes?" confirmation. HSE tracks `mobilePhotoDirty`, but drawer close/cancel calls `closeMobileDrawer` directly.

Impact: mobile HSE field/photo edits can be dismissed without the same dirty-state protection used by FE, FRT, ER Aux, Hydraulic, High Angle, and SCBA.

Implemented: HSE now compares staged fields and photos to the saved observation, routes close/cancel through a guarded close, and requires an explicit discard confirmation.

### 4. Validation Visibility Is Strongest In FE/FRT And Weaker Elsewhere - Resolved

Severity: Medium.

FE and FRT show row-header validation badges such as missing count and "Needs evidence". Other types usually show inline errors only after expansion/drawer open, plus a lower form-level error summary. ER Aux has a good detailed missing-row list, but not row-header badges. Hydraulic, High Angle, and SCBA do not surface missing evidence in the collapsed card header.

Impact: on mobile or collapsed cards, the user has less guidance about which row needs attention. FE/FRT make the target row obvious before opening it.

Implemented: `InspectionElementValidationBadges` now provides shared missing-count and `Needs evidence` cues. ER Aux, Hydraulic, High Angle, and SCBA feed their row workflow state into that shared presentation.

### 5. Context Helper Text Is FE-Specific - Partially Resolved

Severity: Medium.

Fire Extinguisher card headers include rich helper text such as certification validity, last submitted inspection, and current sync/submission state. Other catalog-backed row types mostly provide only metadata or retained-evidence context.

Impact: this is acceptable where the data does not exist, but the UI currently has no shared way to display equivalent per-row context if ER Aux/Hydraulic/SCBA/High Angle later gain last-inspection or certification metadata.

Implemented: `InspectionElementCard` accepts optional `helperLines`; Hydraulic, High Angle, and SCBA use it for retained-evidence audit context. Certification and prior-submission helpers remain Fire Extinguisher-specific until equivalent data exists for other types.

### 6. Loading/Refreshing Feedback Is Not Uniform - Resolved Where Loading State Exists

Severity: Low-medium.

Fire Extinguisher shows skeleton rows when empty and a "Refreshing units..." helper during background refresh. ER Aux/Hydraulic show simple "Loading equipment..." only when there are no visible rows. FRT Daily, High Angle, and SCBA do not currently receive an `isLoadingRows` style prop at the section level.

Impact: users get better feedback in FE when catalog rows are refreshing in-place. Other catalog-backed screens can look idle during refresh unless the empty-state path is hit.

Implemented: ER Aux and Hydraulic now show an in-place `Refreshing equipment...` status when rows remain visible; SCBA consumes its already-provided loading state and shows `Refreshing SCBA equipment...`. FRT Daily and High Angle do not currently expose a comparable asynchronous catalog-loading state, so no artificial refresh indicator was added.

## Intentional Exceptions

1. Fire Extinguisher remains bespoke because it supports scan mode, FE registration/editing, session sync, certification metadata, and previous submission context.
2. FRT Daily remains custom around truck compartments, daily vs one-off rows, truck metadata, and custom item creation.
3. HSE is an observation workflow, not a repeated equipment-row checklist. It should not be forced into row-card parity, but its mobile drawer save/discard behavior should still match the shared system pattern.
4. General Inspection is a generic finding/evidence form and does not have row-card parity requirements.

## Follow-up Opportunities

1. Add further context helper lines only when comparable data exists for the inspection type.

## Verification

- `inspectionFormHelpers.test.js`: 81 passed on 2026-07-10, including normalized managed-media expectations and evidence-aware completion regression coverage.
- `InspectionFormBodySections.matrix.test.jsx`: 128 passed on 2026-07-10. The snapshot baseline was reviewed and updated for intentional accessibility, lazy-image, and mobile-drawer markup changes; incidental action-class whitespace was removed in source.
- Focused inspection component suites cover High Angle quick-mark, HSE discard confirmation, evidence-aware row state, and ER Aux/Hydraulic/SCBA refresh feedback.
- Browser smoke was started against the local frontend and API. The CRUD Playwright worker exceeded its declared four-minute timeout and remained active, so its process tree was stopped. This is not recorded as a passing smoke run.
