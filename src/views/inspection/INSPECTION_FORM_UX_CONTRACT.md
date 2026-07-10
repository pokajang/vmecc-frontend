# Inspection Form UX Contract

## Scope
This contract applies to all inspection form implementations under `src/views/inspection/`.

## Shared goal (iterative)

Treat this as one shared goal with checkpointed passes:

1. Foundation inventory of shared primitives.
2. 4-state pre-submission matrix on all inspection types.
3. Pattern detection and exception mapping.
4. Behavior consistency lock for continuation, action, and readiness flow.
5. Visual language alignment through shared classes and helper text rhythm.
6. Safe consolidations only where parity is proven.
7. Re-verification before marking implementation complete.

### Checkpoint rule

- A checkpoint is considered complete only when the checks listed under it are both present and stable in docs/tests.
- A form that already passes is marked done and skipped in later checkpoints.
- Any custom branch must have an exception rationale in this contract before merge.

## Shared UX primitives that must stay consistent
1. Form shell and section rhythm
   - Setup + body split in `InspectionFormShell`.
   - Body entry always via `InspectionFormBodySections`.
   - Shared section wrapper class: `inspection-form-section`.

2. Continuation rhythm
   - Continuation cards must be rendered through `InspectionNextLocationCard`.
   - Shared continuation class contract: `inspection-next-location-card`, `inspection-next-location-options`.
   - Continuation text must follow `Next <label>` pattern.
   - Continuation selection flow must call `structuredSectionHandlers.onSelectNextScope`.

3. Action rhythm
   - Desktop action shell uses shared `inspection-form-actions` styles.
   - Mobile sticky shell uses shared `inspection-form-inline-actions` shell with `d-md-none`.
   - Mobile sticky container must include `inspection-form-inline-actions-spacer` spacing.

3a. Continuation token map

- `Next location`
- `Next compartment`
- `Next kit`

Default token rule: labels are always rendered as `Next <token>` where `<token>` is from the per-definition continuation label and is normalized by display logic (`location`, `compartment`, `kit`).

4. Evidence/photography
   - Evidence card is shared through `InspectionGeneralEvidenceCard` for both structured and full-form screens.
   - Shared class expectations: evidence appears after findings/section content and before continuation/draft footer sequence where configured.

## In-form continuation invariants

- Continuation renderer: `InspectionNextLocationCard` in `InspectionFormBodySections`.
- Shared gate: current scope selected, at least two scope options, current scope complete, no continuation on FE scan mode.
- Shared classes: `inspection-next-location-card`, `inspection-next-location-options`.
- Shared action label: follows `CONTINUATION_LABELS` token map (`Next location`, `Next compartment`, `Next kit`).
- Shared placement: continuation appears after findings/evidence and before action row.
- Stable exception: fire extinguisher scan mode intentionally uses `Scan another FE` flow.

5. Validation-to-action loop
   - Review availability is controlled by readiness gates, not by bespoke per-form action rendering.
   - Validation message flow must remain form-state-driven.
   - A visible row `Checked` state must mean its required status and required issue evidence are complete.
   - Collapsed managed rows must surface missing required values and missing issue evidence through shared row-header cues where the row-card pattern applies.

6. Mobile draft safety
   - Any mobile drawer that stages editable inspection data must compare its draft to saved state before close.
   - Close and Cancel must require an explicit discard confirmation when the draft is dirty.

7. Managed row-card context
   - `InspectionElementCard` is the shared presentation path for optional row helper lines and validation badges.
   - Helper text remains optional and must only present context supported by that inspection type's data.

## Per-form composition map
| Form type | Edit section source | Read-only section source | Continuation behavior |
|---|---|---|---|
| ER Aux | `ErAuxEquipmentChecks` | Shared with inline shell | Shared continuation (`buildMainLocationContinuationOptions`) |
| Fire Extinguisher | Dedicated `FireExtinguisherInspectionChecks` implementation | Dedicated | Shared continuation (`buildSubLocationContinuationOptions`) with scan-mode overrides |
| Fire Truck Daily | `FrtDailyInspectionChecks` | Shared with inline shell | Shared continuation (`buildSubLocationContinuationOptions`) |
| Hydraulic | `HydraulicEquipmentChecks` | Dedicated read-only card grid | Shared continuation (`buildMainLocationContinuationOptions`) |
| SCBA | `ScbaInspectionChecks` | Shared with inline shell | Shared continuation (`buildMainLocationContinuationOptions`) |
| High Angle Rescue Equipment | `HighAngleInspectionChecks` | Shared with inline shell | Shared continuation (`buildMainLocationContinuationOptions`) |
| Health Safety Environment | Dedicated observation editor | Dedicated read-only shell | No in-form continuation |
| General | N/A (read-only only in this screen) | Dedicated findings rendering | No in-form continuation |

## Non-default behavior exceptions

- Fire Extinguisher: continuation card and order are rendered through shared cards; during scan mode, continue action is replaced with `Scan another FE`.
- General and HSE: zone-driven completion prompts intentionally lead to different partial-state body rendering before section rendering, and neither type uses in-form next-location continuation.

## High-level non-negotiables for new inspection types
1. Register form definition in `app/inspectionTypeRegistry.js`.
2. Reuse `InspectionFormBodySections` entry points.
3. Prefer shared check components from `form/components` for checks/evidence when behavior matches.
4. Use `buildMainLocationContinuationOptions` or `buildSubLocationContinuationOptions` by default.
5. Use `inspection-form-actions` / `inspection-form-inline-actions` container classes for action rows.
6. Avoid introducing form-only layout primitives for already-shared interaction patterns.

## Pass/fail gates per goal stage
- Foundation: all forms and their shell usage are documented in this contract.
- Matrix: each registered inspection type renders expected prompts, continuation visibility, and action row presence for:
  - `empty`, `partial`, `missing-required`, `complete-with-next-location`.
- Pattern detection: any new custom implementation must include a behavior rationale.
- Behavior consistency: pre-review flows and continuation order are equivalent per state.
- Consolidation: any extracted shared abstraction must not alter continuation/input contracts.

## Pre-submission behavior acceptance checklist (for future inspections)
- Use `InspectionFormBodySections` as the body entry and keep shared action shells:
  - `.inspection-form-actions`
  - `.inspection-form-inline-actions`
  - `.inspection-form-inline-actions-spacer`
- Render continuation through shared path:
  - `InspectionNextLocationCard` with classes:
    - `.inspection-next-location-card`
    - `.inspection-next-location-options`
  - Label follows `Next <token>` where token is `location | compartment | kit` unless explicitly exempted.
- Keep continuation trigger semantics:
  - Explicit selection only via action button handlers.
  - Shared handler precedence remains `onSelectNextScope` first.
- Keep evidence rhythm:
  - Findings/edit content and evidence appear before continuation in the shared path.
  - Action rows render after evidence/continuation branch.
- Keep validation loop behavior:
  - Use readiness gating to disable review when required items are incomplete.
  - Keep block message path (`validationState`/`validationStatusMessage`) in shared shells.
- If any custom workflow exception is introduced (scan mode, zone prompts, drawers), document it in `CROSS_FORM_INSPECTION_UX_AUDIT.md` with rationale.

## Current verification stamp
- Matrix suite run: `npx vitest run src/views/inspection/__tests__/InspectionFormBodySections.matrix.test.jsx`
- Result: `128 passed / 0 failed` on 2026-07-10.
- Helper suite run: `npx vitest run src/views/inspection/__tests__/inspectionFormHelpers.test.js`
- Result: `81 passed / 0 failed` on 2026-07-10.
- Browser smoke remains pending a stable local Playwright run; the API-backed CRUD worker exceeded its declared timeout during the 2026-07-10 verification attempt.
- Visual capture route: `/inspection/ux-matrix?viewport=desktop` and `/inspection/ux-matrix?viewport=mobile`
- Matrix fixture source of truth: `src/views/inspection/visual/inspectionFormStateMatrix.jsx`
