# Inspection Form Pattern Detection Map

## Purpose
A per-type map for Foundation + Pattern Detection that classifies which parts of each inspection form are shared vs custom and why.

## Shared goal board

Progress is safe when each checkpoint is fully verified before moving to the next:

1) Foundation lock: all forms mapped to shell/action/continuation primitives.
2) Exception governance: custom branches require a documented rationale.
3) State matrix parity: all forms validated across the four pre-submission states.
4) Visual consistency: shared classes used where behavior is shared.
5) Consolidation with parity: custom extraction only after behavior is stable.

## Shared primitive inventory

- **Shell/body orchestration (all forms):**
  - `form/components/InspectionFormShell.js`
  - `form/components/InspectionFormBodySections.js`
  - `form/components/InspectionFormDisplaySections.js`
- **Continuation renderer (most forms):** `InspectionNextLocationCard` inside `InspectionFormBodySections.js`.
- **Action rows (most forms):**
  - Desktop: `InspectionFormActions` / `inspection-form-actions`
  - Mobile sticky: `InspectionFormDraftOnlyActions` / `inspection-form-inline-actions`
- **Evidence card (all full/structured form bodies):** `InspectionGeneralEvidenceCard`.
- **Validation/readiness entry:** `form/inspectionReviewReadiness.js`.

## Per-form usage map

| Type | Edit section implementation | Read-only section implementation | Continuation source | Custom continuation behavior | Drawers/modals path |
|---|---|---|---|---|---|
| ER Aux | `ErAuxEquipmentChecks` via `ErAuxEditSection` | `ErAuxEquipmentChecks` readOnly via `ErAuxReadOnlySection` | `buildMainLocationContinuationOptions` | shared condition (`isDone` + current scope complete) | shared pattern via `form/components` checks only |
| Fire Extinguisher | `FireExtinguisherInspectionChecks` + `FireExtinguisherListView` via `FireExtinguisherEditSection` | same shared component set (readOnly prop mode) via `FireExtinguisherReadOnlySection` | `buildSubLocationContinuationOptions` | shared next-location card, with scan mode replacing continue action with `Scan another FE` | dedicated list/drawer workflow (search, row detail drawer, staged evidence, reset confirm) |
| Fire Truck Daily | `FrtDailyInspectionChecks` via `FrtDailyEditSection` | `FrtDailyInspectionChecks` readOnly via `FrtDailyReadOnlySection` | `buildSubLocationContinuationOptions` | shared next token (`Next compartment`) and parent trunk label | shared component + dedicated remarks section in body (`FrtGeneralRemarksField`) |
| Hydraulic | `HydraulicEquipmentChecks` via `HydraulicEditSection` | custom `HydraulicReadOnlySection` card grid | `buildMainLocationContinuationOptions` | shared condition (`isDone` + current scope complete) | shared checks component, custom read-only card presentation |
| SCBA | `ScbaInspectionChecks` via `ScbaEditSection` | `ScbaInspectionChecks` readOnly via `ScbaReadOnlySection` | `buildMainLocationContinuationOptions` | shared condition (`isDone` + current scope complete) | shared pattern |
| High Angle | `HighAngleInspectionChecks` via `HighAngleEditSection` | `HighAngleInspectionChecks` readOnly via `HighAngleReadOnlySection` | `buildMainLocationContinuationOptions` | shared condition (`isDone` + current scope complete) | shared pattern |
| Health Safety Environment | `HseEditSection` custom mobile+desktop workflows | `HseReadOnlySection` custom | none | no in-form continuation; zone/main-location completion gates body access instead | dedicated observation editor and evidence drawer flow for HSE details |
| General | `isFullInspectionForm` path; findings rendered directly from `GeneralReadOnlySection` in read mode | `GeneralReadOnlySection` only | none | no in-form continuation; zone/main-location completion gates body access instead | generic full-form layout and no inline structured findings editor |

## Consolidation candidates (ranked)

1. **Keep as-is for now (high confidence custom):**
   - `fire-extinguisher/section.js` (session-aware, mobile drawer + reset/defect workflows)
   - `hse/section.js` (custom observation/editor workflow)
2. **Review for optional standardization (medium risk):**
   - `hydraulic/section.js` read-only rendering style only (`inspection-hydraulic-card*`)
   - `general/section.js` dedicated read-only findings wrapper (if a future shared findings shell is desired)
3. **Shared pattern already in place (low/zero risk):**
   - `er-aux`, `frt-daily`, `scba`, `high-angle` check sections are already wrapped around shared components.

## Consolidation execution status (governed by behavior parity)

- [x] `fire-extinguisher/section.js` remains custom due scan-mode session flow, list/detail drawer interactions, and staged evidence actions.
- [x] `hse/section.js` remains custom due domain-specific observation/editor interaction, zone-completion flow, and multi-state mobile drawer behavior.
- [x] `hydraulic/section.js` custom read-only shell is blocked from extraction today because it carries defect/evidence/remark rendering patterns not represented by existing shared primitives.
- [x] `general/section.js` remains custom until a shared findings shell exists and is proven against the matrix contract; this is no longer treated as an open extraction task for the current goal.

## Measurable stage gate this pass

- [x] All inspection types have an explicit edit/read implementation mapped to a shared/custom classification.
- [x] All continuation sources and continuation action behavior differences are explicit.
- [x] All customization that affects UX interaction flow is documented with rationale.
- [x] Remaining candidates above are intentionally retained unless a future parity pass proves a safe extraction.

## In-form continuation matrix (state snapshot)

| Form | Empty | Partial | Missing required | Complete + next location |
|---|---|---|---|---|
| ER Aux | no continuation | setup prompt or edit section hidden | blocked by validation | `Next location` |
| Fire Extinguisher | no continuation | setup prompt or edit section hidden | blocked by validation | `Next location` (or `Scan another FE` in scan mode) |
| Fire Truck Daily | no continuation | setup prompt or edit section hidden | blocked by validation | `Next compartment` |
| Hydraulic | no continuation | setup prompt or edit section hidden | blocked by validation | `Next location` |
| SCBA | no continuation | setup prompt or edit section hidden | blocked by validation | `Next location` |
| High Angle | no continuation | setup prompt or edit section hidden | blocked by validation | `Next kit` |
| Health Safety Environment | no continuation | completion prompt when zone flow is active | blocked by validation | `Next location` |
| General | no continuation card in full-form path | zone/location prompt states only | n/a | n/a |
