# Frontend Mobile Drawer Actions and Icon Alignment Execution

Date: 13 August 2026  
Status: Completed  
Plan: `FRONTEND_MOBILE_DRAWER_ACTIONS_AND_ICON_ALIGNMENT_PLAN_2026-08-13.md`

## 1. Outcome

The mobile drawer and icon-label alignment plan was implemented without changing inspection values, validation, persistence, permissions or submission behavior.

Delivered outcomes:

- inspection status choices in equipment detail drawers now use borderless soft pill surfaces;
- selected choices use a stronger teal soft state while retaining `aria-pressed`;
- choice and ordinary action pills retain a minimum 44px mobile target;
- More actions drawer items use a scoped borderless soft action treatment;
- destructive drawer actions retain a separate danger surface;
- confirmation, commit, photo-command, selector and header controls are not affected by the generic drawer treatment;
- `CreateActionButton` now owns a stable icon/label layout contract across all consumers;
- the inspection Remark/Photo implementations no longer use baseline-alignment workarounds;
- `BulkActionButton` and verified direct CoreUI icon-label actions use a shared alignment class; and
- remaining `align-text-bottom` occurrences are intentional non-button prose/table lock icons and dropdown chevrons.

## 2. Shared implementation seams

### 2.1 Drawer choices

`InspectionStatusSegment` now emits:

- `inspection-drawer-choice-group` on the status group;
- `inspection-drawer-choice` on every option;
- `data-selected="true"` on the active choice; and
- the existing `aria-pressed` state.

Drawer-scoped SCSS applies the pill presentation only below the mobile breakpoint and only inside inspection equipment/fire-extinguisher detail drawer bodies.

### 2.2 Drawer actions

`RecordDetailActions` and the legacy report review action drawer now emit an explicit `inspection-drawer-action` class with a semantic tone modifier. The shared `record-action-sheet` scope prevents the treatment from leaking to unrelated drawers.

### 2.3 Icon-label alignment

`CreateActionButton` now renders dedicated icon and label wrappers and uses inline-flex centering with a component-owned gap. Icon margins and baseline utilities are neutralized at the shared seam.

A scoped `icon-label-action` contract covers verified direct CoreUI buttons, while `BulkActionButton` uses the same flex geometry. Decorative icons are hidden from the accessibility tree where migrated.

## 3. Inspection coverage

The shared status and optional-info seams cover:

- ER Auxiliary;
- Fire Extinguisher;
- Fire Truck Daily Readiness;
- High Angle;
- Hydraulic; and
- SCBA.

The optional Remark/Photo row was reconciled in `InspectionItemAdditionalInfo`, `ErAuxInspectionChecks`, `HydraulicEquipmentCheckCard`, `ScbaSectionSupport` and `fireExtinguisherCheckCards`. FRT and High Angle consume the shared additional-info component.

## 4. Repository-wide alignment coverage

In addition to inspection, the shared/direct correction reaches create, edit, download, print, export, preview and bulk actions in user management, messages, leave, payroll, overtime, roster, settings, reports and staff salary claims.

Intentional exclusions retained:

- table/prose lock indicators;
- ERCO dropdown chevrons;
- icon-only buttons; and
- vertically stacked navigation controls.

## 5. Tests and verification

### Passed

- Targeted Vitest inspection/shared suite: 8 files, 75 tests passed.
- Direct-consumer Vitest regression suite: 6 files, 15 tests passed.
- Total targeted component/module coverage: 14 files, 90 tests passed.
- Playwright `inspection-mobile-status-drawer-layout.spec.js`: 4 tests passed.
- Playwright viewports: 320x700 and 390x700.
- Playwright drawer bodies: generic equipment and Fire Extinguisher.
- Playwright themes: light and dark state distinction checked.
- Playwright assertions: no visible pill borders, selected-state distinction, rounded geometry, 44px targets, no overflow/clipping, icon/label centerline delta at most 1px, and distinct destructive action surface.
- ESLint on all changed JavaScript/JSX: passed.
- `git diff --check`: passed.
- Production `npm run build`: passed; 6,501 modules transformed.
- Generated build: version 5.5.0, build ID `8d8d24181cfe-20260813030433`.

The build retains existing Vite advisory warnings about large chunks and the mixed static/dynamic `WorkflowNotifications` import. No new build error was introduced.

### Broader-suite observations

- The authenticated High Angle/mobile UI suites were environment-blocked at login because no backend was listening on local port 8000. The inspection UI was never reached, so these are not product failures.
- The controlled all-type screenshot suite was hardened to accept either `localhost` or `127.0.0.1` local API origins. Its full screenshot matrix exceeded the five-minute command window, and the isolated all-type form case exceeded three minutes. No pass is claimed for those timed-out runs.
- A full unfiltered Vitest run also exceeded the five-minute command window without producing a final result. Targeted shared, inspection and direct-consumer suites completed successfully and are the release evidence for this stage.

## 6. Functional safety assessment

The change is presentation-only:

- no inspection handler was replaced;
- no status value or option was renamed;
- no action ordering was changed;
- no disabled/loading rule was removed;
- no draft or submission payload changed; and
- no backend file or environment configuration changed.

## 7. Verdict

The requested drawer-pill and repo-wide icon-label alignment work is complete and passes its targeted functional, accessibility, visual and build gates. It is ready for review and inclusion in the next frontend commit, with the broader authenticated/full-matrix checks recorded as environment/time-limited rather than falsely reported as passed.

## 8. Compact visual-surface refinement

A subsequent mobile review found that the full 44px touch target was also being painted as the status pill. This made short choices look vertically heavy and made the short `Save` label appear almost circular.

The shared implementation was refined as follows:

- `InspectionStatusSegment` now separates the accessible button target from an inner compact visual surface.
- The outer status control retains the 44px mobile hit area.
- The visible choice pill is approximately 32px high with small semibold text and tighter spacing.
- Selected, unselected, hover, disabled and focus treatments remain semantically distinct.
- A shared `InspectionDrawerFooterAction` now gives drawer commit actions a 44px target around an approximately 34px visual surface.
- Footer actions use a consistent minimum width so short labels such as `Save`, `Done` and `Add` remain visibly elongated.
- Fire Extinguisher now consumes the same `InspectionElementDrawerFooter` as ER Auxiliary, FRT, High Angle, Hydraulic and SCBA.
- The same compact footer action is used by inspection photo editing, general evidence, High Angle custom-record editing and the FRT add-item drawer.
- More Actions rows, destructive confirmations, icon-only controls, Back navigation and main workflow CTAs remain excluded.

No lint, test, Playwright or build command was run for this refinement, following the explicit instruction for this working pass. The earlier verification evidence in this document predates these latest visual-surface changes and must not be interpreted as verification of this addendum.
