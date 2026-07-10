# Inspection UX Consistency Audit

Last updated: 2026-07-09

This document is the active working artifact for the shared-form UX objective.

## Shared objective

Make all forms in `src/views/inspection/` feel like one UX family (same interaction rhythm and visual language) while preserving each form’s technical behavior.

## Scope and baseline truth

1) Shared shell/entry points
2) Cross-form behavior for in-form continuation (pre-submission)
3) Section wrappers and check display composition
4) Action placement and drawer patterns
5) Mobile/desktop rhythm (sticky actions and sequencing)
6) Error-to-action and blocked-review loops

## Shared goal (iteration-safe)

Make all inspection forms in `src/views/inspection/` feel like one UX family (rhythm, interaction sequencing, and visual language) while preserving each form's technical behavior and data contract.

### Active checkpoint board

1. Foundation inventory
   - [x] Shared shell/body and continuation primitives documented.
   - [x] Per-type composition map complete.
2. State matrix
   - [x] Scenario matrix represented in matrix test file.
   - [x] Capture route implemented at `/inspection/ux-matrix` with `viewport`, `state`, and `type` filters.
3. Pattern detection
   - [x] Shared/custom classification documented with rationale.
4. Behavior consistency
   - [x] Continuation, action, and blocked-review ordering stabilized in tests.
5. Visual consistency
   - [x] Shared visual audit harness wired to the same state matrix fixture as the tests.
6. Consolidation
   - [x] Open consolidation candidates were reduced to explicit keep-custom decisions unless parity is proven later.

## High-success-rate iteration plan

1) Foundation inventory
   - Goal: lock reusable inspection primitives and identify non-negotiable type-specific contracts.
   - Pass/fail:
     - Each inspection entry path is mapped to a shared shell/section path.
     - No behavior-critical flow is hidden in duplicate local assumptions.
     - Evidence file: this document + `app/inspectionTypeRegistry.js`.

2) Surface-level state matrix (4 states x desktop/mobile)
   - Goal: create and maintain one behavior matrix for all forms with `empty`, `partial`, `missing-required`, `complete-with-next-location`.
   - Pass/fail:
     - Each state is represented for all registered definitions.
     - Prompt text, action placement, and continuation visibility are asserted consistently.
     - No state-dependent regressions in pre-submission progression.
   - Evidence file: `__tests__/InspectionFormBodySections.matrix.test.jsx`.

3) Pattern detection
   - Goal: classify each form by shared primitive usage and flag removable duplicates.
   - Pass/fail:
     - Shared check-list and evidence/finding shells are enumerated per form.
     - Every custom implementation is linked to a behavior rationale.
     - Candidate duplicates are tracked with owner + removal risk.

4) Interaction flow consistency
   - Goal: unify continuation, actions, and blocked-review behavior across forms without changing business logic.
   - Pass/fail:
     - Continuation appears in the same relative order and with the same trigger semantics.
     - Mobile sticky actions and desktop action alignment are equivalent when body states match.
     - Validation-to-review blockers show the same feedback path.

5) Visual language alignment
   - Goal: standardize spacing, card shells, helper text style, and control labels used by all forms.
   - Pass/fail:
     - Shared class contracts are documented and applied consistently (`inspection-next-location-card`, `inspection-form-inline-actions`, etc.).
     - Non-shared variants are explicitly justified by workflow constraints.
     - No visual regressions in shared shell for unchanged behavior.

6) Consolidation pass
   - Goal: extract/fix shared abstractions only where equivalent behavior is proven.
   - Pass/fail:
     - No data-flow changes outside test-covered behavior.
     - Shared component extractions are limited to structure/style duplication.
     - Existing custom flow exceptions (FE/HSE/custom read shells) remain unless behavior parity is proven.

7) Verification and governance
   - Goal: re-run matrix + acceptance checks and publish the contract.
   - Pass/fail:
     - Matrix assertions pass for all states and both viewports.
     - Any form-specific exception is documented.
     - Shared contract is updated before merging future inspection types.

## Iteration 1 – Foundation inventory (done)

1. Shared runtime owner confirmed as `form/components/InspectionForm.js`.
2. Shared body orchestration confirmed as `form/components/InspectionFormBodySections.js`.
3. Shared continuation primitives confirmed in:
   - `types/continuationHelpers.js`
   - `form/useInspectionStructuredHandlers.js`
   - `form/inspectionFormStructuredSection.js`
4. Registered inspection definitions confirmed in `app/inspectionTypeRegistry.js`:
   - `er-aux`
   - `fire-extinguisher`
   - `frt-daily`
   - `high-angle`
   - `hydraulic`
   - `scba`
   - `hse`
   - `general`

## Type matrix (behavioral baseline)

| Type | formMode | Continuation source | Scope | Next-location UI in body | Special continuation state |
|---|---|---|---|---|---|
| `general` | `generic` | None | n/a | No in-form next-location card | Uses zone-flow gating before section body appears |
| `er-aux` | `structured` | `buildMainLocationContinuationOptions` | location (main) | Shared card (via `InspectionNextLocationCard`) when current location complete | Standard shared complete-in-location check |
| `fire-extinguisher` | `structured` | `buildSubLocationContinuationOptions` with sub-location scope | location (sub-location) | Shared card (`Next location`) rendered from shared component when completion allows; scan mode uses `Scan another FE` action | Additional completion rule: `entryMode === 'scan'` suppresses continuation card |
| `frt-daily` | `structured` | `buildSubLocationContinuationOptions` | compartment (sub-location) | Shared card with label `Next compartment` | Continuation derived from truck compartments |
| `hydraulic` | `structured` | `buildMainLocationContinuationOptions` | location (main) | Shared card (`Next location`) | Standard |
| `scba` | `structured` | `buildMainLocationContinuationOptions` | location (main) | Shared card (`Next location`) | Standard |
| `high-angle` | `structured` | `buildMainLocationContinuationOptions` | location (main) | Shared card (`Next location`) | Standard |
| `hse` | `structured` | None | n/a | No in-form next-location card | Zone-flow prompt logic differs from non-zone forms |

### Type-level continuation status (current)

1. `er-aux`: PASS for shared pre-submission continuation behavior and handler flow.
2. `fire-extinguisher`: PASS for completion-aware progression; PASS for scan-mode suppression and scan-another path.
3. `frt-daily`: PASS for compartment continuation with continuation label `Next compartment`.
4. `hydraulic`: PASS for location continuation with standard shared label and flow.
5. `scba`: PASS for location continuation with standard shared label and flow.
6. `high-angle`: PASS for location continuation with standard shared label and flow.
7. `hse`: PASS for zone-driven setup gating; no in-form continuation card by design.
8. `general`: PASS for zone-location completion gating; no in-form continuation card by design.

## Section composition inventory (shared vs custom)

1. Strong shared patterns
   - `ErAuxEquipmentChecks`, `HighAngleInspectionChecks`, `ScbaInspectionChecks`, `HydraulicEquipmentChecks`, `FrtDailyInspectionChecks` are consumed directly as shared edit/read wrappers.
   - `InspectionGeneralEvidenceCard` and `InspectionFormActions/InspectionFormDraftOnlyActions` are globally shared.
2. High-cardinality custom implementations
   - `fire-extinguisher/section.js` is bespoke and manages its own row cards/drawers/session copy.
   - `hse/section.js` is bespoke by domain and does not reuse a single shared check list component.
   - `general/section.js` uses only `normalizeInspectionIssues` rendering for read-only findings.

   Pattern evidence: [INSPECTION_FORM_UX_PATTERN_MAP.md](./INSPECTION_FORM_UX_PATTERN_MAP.md)

## In-form interaction baseline for “Next location” and action rhythm

1. Shared rendering anchor point is one shared component:
   - `InspectionNextLocationCard` in `form/components/InspectionFormBodySections.js`.
2. The card is rendered in both full + structured flow, after findings/evidence and before action buttons.
3. Shared handler precedence is:
   - `onSelectNextScope` -> `onSelectNextLocation` -> `onSelectNextFireExtinguisherLocation`
4. Completion gate for showing the card:
   - multiple options exist
   - selected scope has current value
   - current scope is complete
   - FE scan mode must not be active (for FE catalog flow)
5. Shared `scopeContinuation` comes from definition/handler contracts and flows to `InspectionFormBodySections`; FE scan-mode uses the same shared rendering path with a mode-based continuation branch (`Scan another FE` when `entryMode === 'scan'` and current scope is complete).

## Surface-level inconsistency watchlist (first pass)

1. `general` and `hse` were intentionally excluded from some card-like generic patterns in earlier UX history; this is by design (`isFullInspectionForm` gate + custom ordering).
2. `frt-daily` is the only form with dedicated compartment-specific naming and remarks field between section and evidence.
3. `fire-extinguisher` has unique scan-path behavior and additional “Scan another FE” CTA path.
4. `hse` injects findings only after the edit section, unlike other structured types that inject findings earlier.

## Cross-form state matrix (for manual/visual audit)

1. Empty (no location selected)
2. Partially complete (setup location selected, checks not started)
3. Missing required (validation blocked before review)
4. Complete-with-next-location (current scope complete and continuation visible)

### Capture instructions

1. Open `/inspection/ux-matrix?viewport=desktop` and `/inspection/ux-matrix?viewport=mobile`.
2. Use `state` and `type` query parameters when you need a focused capture:
   - `/inspection/ux-matrix?viewport=mobile&state=partial`
   - `/inspection/ux-matrix?viewport=desktop&type=fire-extinguisher-inspection`
3. Capture mobile and desktop for each form at the four states above.
4. For each capture, confirm:
   - setup/body segment order
   - continuation label/text (`Next location`/`Next compartment`/none)
   - action panel location (`desktop right aligned`, `mobile sticky`, status text)
   - visibility of prompts like “Choose a location…” vs continuation shortcuts

## Verification checkpoints (per iteration)

1. Baseline file references unchanged and documented.
2. Continuation matrix updated with actual observed values after any behavior change.
3. No behavior changes to data model unless explicitly approved.
4. Visual rhythm for shared actions and next-location card aligns to shared classes:
   - `inspection-next-location-card`
   - `inspection-form-inline-actions`
   - sticky action wrappers in `scss/features/inspection/core/`
5. Existing tests to preserve or extend:
   - `src/views/inspection/__tests__/InspectionFormBodySections.mobile.test.jsx`
   - `src/views/inspection/__tests__/InspectionForm.workflow.test.jsx`
   - `src/views/inspection/__tests__/continuationHelpers.test.js`

### Immediate pass/fail gate for next pass

1. `er-aux`: continuation card hidden until current location is complete.
2. `frt-daily`: `Next compartment` visible only when current compartment is complete.
3. `fire-extinguisher`: continuation card hidden in scan mode and visible after completion in non-scan mode.
4. `hse` and `general`: location-completion prompts show in partial state as expected.
5. shared action container position remains consistent after continuation in both desktop and mobile.

## Governance draft (first public contract)

1. New inspection types must define continuation via definition-level `buildContinuationOptions` and not by duplicating `InspectionNextLocationCard`.
2. New UI sections should consume shared check-list primitives unless there is a verifiable workflow constraint.
3. Next-location labels should reuse existing terms:
   - `Next location`
   - `Next compartment`
4. All shared continuation handlers must flow through `structuredSectionHandlers` and `onSelectNextScope` first.
5. Completion condition for showing continuation card must remain explicit and user-state based (never auto-advance without an explicit click).
6. Any scan-mode exceptions must be documented in definition + handler layer, with tests verifying the branch.
7. Before merging any inspection form updates, run and pass the three in-repo coverage anchors:
   - `InspectionFormBodySections.mobile.test.jsx`
   - `InspectionForm.workflow.test.jsx`
   - `continuationHelpers.test.js`

Published contract: [`INSPECTION_FORM_UX_CONTRACT.md`](./INSPECTION_FORM_UX_CONTRACT.md)

## Next active tasks

1. Run the current desktop + mobile capture sweep from `/inspection/ux-matrix` and record any visual drift.
2. Triage any type-specific visual drift against these classes:
   - `inspection-next-location-card`
   - `inspection-next-location-options`
   - `inspection-form-inline-actions`
   - sticky action wrappers under `scss/features/inspection/core`
3. Resolve duplicated custom wrappers only after explicit behavior parity validation per form.

4. Validate future consolidation candidates only after behavior parity is proven against the matrix contract.

## Iteration 3 status

1. Matrix harness added in
   - `vmecc-frontend/src/views/inspection/__tests__/InspectionFormBodySections.matrix.test.jsx`
2. Coverage added for all registered inspection definitions across 4 in-form pre-submission states:
   - empty
   - partial
   - missing-required
   - complete-with-next-location
3. Each case validates:
   - prompt behavior (zone/location and FRT/FE continuation prompts)
   - continuation card visibility and label
   - expected "Next ..." order relative to evidence section and structured section
   - continuation selection callback for complete states where card is visible
4. Rhythm checks now include:
   - action shell and sticky shell class presence
   - sticky action spacer class presence
   - continuation card/options class presence

## Iteration 4 status

1. Pattern detection docs are aligned:
   - `INSPECTION_FORM_UX_PATTERN_MAP.md` (consolidation candidates + exception notes)
   - `INSPECTION_FORM_UX_CONTRACT.md` (continuation token + exception notes)
2. No behavior-risking shared extraction has been made while matrix parity is being validated.

## Pattern detection baseline

1. Shared section composition confirmed for core check-list screens:
   - `ER Aux Equipment Inspection` → `ErAuxEquipmentChecks`
   - `Hydraulic Rescue Tools Inspection` → `HydraulicEquipmentChecks`
   - `Fire Truck Daily Readiness` → `FrtDailyInspectionChecks`
   - `High Angle Rescue Equipment Inspection` → `HighAngleInspectionChecks`
   - `SCBA Inspection` → `ScbaInspectionChecks`
2. Forms with substantial custom section implementations:
   - `Fire Extinguisher Inspection` uses custom rows/details/edit drawers (`fireExtinguisherCheckCards`, dedicated section component).
   - `Health Safety Environment Inspection` uses a custom full observation editor and read-only summary flow.
   - `Hydraulic Rescue Tools Inspection` uses a custom read-only card layout while edit flow stays shared by component.
   - `General Inspection` read-only output is a dedicated findings list wrapper.
3. Current duplication hypothesis for cleanup pass:
   - `inspection-hydraulic-card-grid`/`inspection-hydraulic-card` patterns should be reviewed against existing shared read-only rendering utilities before introducing any broader extraction.
   - Keep FE/HSE/custom read-only shells intact until behavior parity is confirmed form-by-form.

## Open risk notes

1. No screenshot capture has been attached yet; treat matrix as behavior baseline only.
2. “General Inspection” and zone-driven forms include required-location prompts that can be mistaken for missing continuation bugs if expected-state matrix is not consulted.
3. FE scan mode can hide continuation even after completion; this is intentional and must be retained for session correctness.

## Iteration 5 status (behavior consistency lock)

1. Cross-form behavior matrix assertions now include explicit pre-submission flow checks and passed fully:
  - File: `src/views/inspection/__tests__/InspectionFormBodySections.matrix.test.jsx`
  - Command: `npx vitest run src/views/inspection/__tests__/InspectionFormBodySections.matrix.test.jsx`
  - Result: `128 passed, 0 failed`
2. Verified invariants for shared forms in this run:
   - continuation card/action classes are present where expected
   - continuation button labels and callbacks are test-verified
   - evidence appears before continuation in shared render order
   - desktop and mobile action shells (`inspection-form-actions`, `inspection-form-inline-actions`) are present with spacer
3. Snapshot baseline remains captured at:
   - `src/views/inspection/__tests__/__snapshots__/InspectionFormBodySections.matrix.test.jsx.snap`

## Iteration 6 status (scan-mode exception guardrails)

1. Added explicit mobile behavior coverage for Fire Extinguisher scan-mode continuation suppression:
   - File: `src/views/inspection/__tests__/InspectionFormBodySections.mobile.test.jsx`
   - Scenario: completed FE location check in `fireExtinguisherEntryMode === 'scan'` with a focused asset key
   - Assertions:
   - Shared continuation card remains hidden for scan mode.
   - `Scan another FE` renders inside `.inspection-next-location-card`.
   - `onOpenScanner` is called from the scan card action.
   - Shared `onSelectNext...` continuation handler is not invoked.
2. Scan-mode guardrail re-run:
   - File: `src/views/inspection/__tests__/InspectionFormBodySections.mobile.test.jsx`
   - Result: `28 passed (28)`

## Iteration 7 status (roadmap synchronization)

1. Added checkpoint board and continuation-state snapshots to this audit and contract docs.
2. Kept FE/HSE/custom read-only branches as intentional exceptions where behavior parity is not yet generalized.
3. Open risk remains: visual alignment verification requires screenshot matrix attachment.

## Open risks (current)

1. Visual artifact capture for the four requested states remains pending for external design-tool review; matrix snapshots are DOM/behavior baselines.
2. `general` and HSE domain prompts are intentional exception paths and should be treated as non-continuation partial states in manual visual reviews.
3. FE scan-mode continuation suppression is an intentional exception and should remain test-covered.

## Next iteration candidates (high-success path)

1. Convert this matrix into full artifact-based verification with state snapshots once visual tooling is attached.
2. Normalize naming/presentation tokens used in continuation labels via one shared constant map.
3. Audit mobile/desktop spacing tokens in continuation/action cards and align if drift is observed.
4. Resolve any duplicated custom wrappers only after explicit behavior parity is validated per form.
