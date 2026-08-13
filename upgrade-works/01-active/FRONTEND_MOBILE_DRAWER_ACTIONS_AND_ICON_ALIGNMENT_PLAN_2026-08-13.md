# Frontend Mobile Drawer Actions and Icon Alignment Plan

Date: 13 August 2026  
Status: Completed  
Scope: Repository-wide drawer action presentation and icon-label alignment

Execution record: `FRONTEND_MOBILE_DRAWER_ACTIONS_AND_ICON_ALIGNMENT_EXECUTION_2026-08-13.md`

## 1. Objective

Make mobile drawer controls lighter, more compact and more consistent without changing any workflow, validation, saved data or action behavior.

This stage will:

1. replace heavy outlined drawer choices and ordinary drawer actions with borderless, soft-background pill treatments;
2. preserve clear selected, destructive, primary, disabled and loading states;
3. correct the vertical alignment of icons and labels, beginning with inspection Remark and Photo actions and preventing the same defect across shared consumers; and
4. verify the result at component and browser level, including narrow mobile layouts, keyboard use and both themes.

## 2. Approved visual direction

### 2.1 Drawer choice controls

- Remove the visible border from unselected choices.
- Use a subtle neutral background for unselected choices.
- Use a stronger soft teal/accent surface and text for the selected choice.
- Use a fully rounded pill shape.
- Reduce visible vertical padding and surrounding row gaps.
- Keep the effective tap target at least 44px high.
- Preserve a visible focus ring, disabled state and `aria-pressed` state.
- Do not rely on color alone: selected choices must also retain programmatic pressed state and a visibly stronger weight/surface.

### 2.2 Ordinary drawer actions

- Apply the same borderless, soft, rounded visual language to non-destructive action rows in More actions drawers.
- Preserve semantic tones for edit, navigation and other ordinary actions.
- Keep destructive actions visually distinct and clearly labelled.

### 2.3 Icon-label actions

- Render icon and label in one inline-flex layout with geometric vertical centering.
- Use a consistent gap instead of per-icon margin utilities.
- Make decorative icons `aria-hidden`; the visible label supplies the accessible name.
- Keep icon dimensions stable and prevent SVG flex shrinking.

## 3. Safety boundary

Do not add a global `.mobile-bottom-drawer .btn` style. Drawers contain controls with different meanings, and flattening all of them would damage action hierarchy.

Explicit exclusions from the generic pill treatment:

- Save, Cancel, Done, Submit and Confirm footer actions;
- Delete, Reject, Reset, Discard and navigation-guard confirmations;
- drawer close, edit, kebab and other icon-only controls;
- Take photo and Upload photo command pairs where primary/secondary hierarchy is required;
- setup selector/list rows;
- notification and table-filter drawer systems;
- loading controls whose existing progress treatment is required.

No API, payload, validation, persistence, permissions or backend changes are allowed in this stage.

## 4. Task 1 - Mobile drawer action system

### 4.1 Inventory and classify

Create a checked inventory of every `MobileBottomDrawer` consumer and classify each control as:

1. categorical/status choice;
2. ordinary action;
3. primary/commit action;
4. destructive action;
5. cancel/close action; or
6. icon-only utility.

Record the intended style contract for each category before changing CSS.

### 4.2 Shared inspection status choices

Use `InspectionStatusSegment` as the shared implementation seam for Good, Not Good, Yes, No and N/A choices used by:

- ER Auxiliary;
- Fire Extinguisher;
- Fire Truck Daily Readiness;
- High Angle;
- Hydraulic; and
- SCBA.

Add an explicit drawer presentation contract, such as a `presentation="drawer"` prop or dedicated drawer choice/group classes. Do not infer the treatment from a broad ancestor selector.

Required states:

- unselected: borderless neutral soft surface;
- selected: soft teal surface, stronger teal text and `aria-pressed="true"`;
- hover/active: slightly stronger semantic surface;
- focus-visible: high-contrast focus ring that is not clipped;
- disabled: muted surface/text with no hover affordance; and
- validation error: group-level error treatment without turning every pill into a red outlined button.

Compact the visual pill while retaining a 44px effective hit area. Prefer reduced group gaps and an inner visual surface over shrinking the actual button target.

### 4.3 More-actions drawers

Reconcile the shared record-detail action rendering in:

- `RecordDetailActions.js`; and
- the legacy mobile action path in `ReportDetailSection.js`.

Give ordinary actions an explicit shared drawer-action class/component. Preserve each action's handler, disabled state, loading state, test id and semantic tone. Destructive items must use a separate danger variant and remain unmistakable.

### 4.4 Drawer exclusions regression

Add assertions proving the new styling does not leak into confirmation drawers, footer commit actions, photo command actions, selector rows or header icon buttons.

## 5. Task 2 - Repository-wide icon-label alignment

### 5.1 Fix the shared root cause

Harden `CreateActionButton` so every importance variant uses a consistent inline-flex alignment contract.

Implementation contract:

- button: `inline-flex`, centered cross-axis alignment and centered content;
- icon wrapper: `.create-action-button__icon`, `display: inline-flex`, `flex: none`, `line-height: 1`;
- label wrapper: `.create-action-button__label` with a controlled line-height;
- spacing: component-level `gap`, not `me-1`; and
- decorative SVGs: `aria-hidden="true"`.

Remove the component's default `align-text-bottom` and margin workaround.

### 5.2 Migrate inspection optional-info actions

Remove repeated baseline utilities from the Remark and Photo actions in:

- `InspectionItemAdditionalInfo` (FRT and High Angle);
- `ErAuxInspectionChecks`;
- `HydraulicEquipmentCheckCard`;
- `ScbaSectionSupport`; and
- `fireExtinguisherCheckCards`.

Where the existing handler contracts permit it safely, introduce a small shared `InspectionAdditionalInfoActions` composition for the optional Remark/Photo row. It must remain presentation-only and must not own form state, photo state or inspection rules.

### 5.3 Follow-up direct-button contract

Audit direct CoreUI buttons that combine Lucide icons and text. Use a scoped shared `.icon-label-action` or equivalent primitive for genuine horizontal icon-label actions.

Do not globally style every `.btn svg`. Exclude:

- icon-only buttons;
- status/list icons;
- input-group icons;
- prose/inline chevrons; and
- vertically stacked bottom-navigation icon/label controls.

## 6. Verification plan

### 6.1 Component tests

Add or extend tests for:

- `CreateActionButton`: default/custom icon structure, flex alignment, accessible name, disabled behavior and all importance variants;
- `MobileBottomDrawer`: styling isolation, close behavior and focus restoration;
- `InspectionStatusSegment`: pressed state, keyboard activation, disabled state and drawer presentation;
- ER Aux, Fire Extinguisher, FRT, High Angle, Hydraulic and SCBA Remark/Photo rows;
- `RecordDetailActions` and `ReportDetailSection`: ordinary versus destructive action variants; and
- confirmation/footer drawers: regression protection against style leakage.

### 6.2 Playwright journeys

Run representative `/inspection/new` journeys for all six structured inspection types and open an equipment/item drawer containing status choices and optional actions. Also cover:

- inspection detail More actions;
- report detail More actions;
- evidence/photo drawer;
- add item/compartment drawer; and
- discard/reset confirmation drawer.

Extend the existing mobile drawer and cross-type suites rather than creating overlapping harnesses where practical.

### 6.3 Browser matrix

- Viewports: 320x700, 390x844, 575x800 and 768px regression.
- Themes: light and dark.
- Input: touch/pointer and keyboard-only.
- States: default, hover, focus-visible, selected, unselected, disabled, loading and destructive.
- Content: short labels, `Not Good`, long/localized labels and wrapping labels.
- Motion: normal and reduced motion for open/close behavior.

### 6.4 Acceptance criteria

- No visible border on approved soft-pill choices/actions.
- Pill geometry and backgrounds are token-driven and correct in both themes.
- Selected and unselected states are immediately distinguishable.
- Every interactive target is at least 44x44px or has an equivalent effective hit area.
- No clipped labels, overlap or horizontal drawer overflow at 320px.
- Icon and label centerlines differ by no more than 1px in browser geometry checks.
- Tab order follows visual order; Enter and Space activate the expected control.
- Focus rings remain visible and are not clipped by pill or drawer overflow.
- Closing a drawer restores focus to the originating control.
- Save/Cancel/Confirm/destructive hierarchy is unchanged.
- Inspection values, validation, draft state and submission behavior remain unchanged.

## 7. Execution order

1. Freeze and record the current drawer inventory and screenshots.
2. Add the explicit `InspectionStatusSegment` drawer presentation contract.
3. Implement tokenized pill styles and responsive density rules.
4. Align ordinary More-actions drawer controls through the shared action renderer.
5. Harden `CreateActionButton` and migrate the six inspection optional-info implementations.
6. Apply the scoped icon-label contract to verified direct-button cases.
7. Run targeted unit/component tests.
8. Run Playwright across the viewport, theme and input matrix.
9. Compare before/after screenshots and repair any hierarchy, contrast, wrapping or focus regression.
10. Run the broader inspection regression suite and production build.
11. Write an execution record with changed files, screenshots, test results, exclusions and release verdict.

## 8. Definition of done

This stage is complete only when the two shared seams are implemented, all six structured inspection types are visually reconciled, ordinary More-actions drawers follow the approved visual language, protected drawer categories remain unchanged, icon-label geometry passes browser checks, and the targeted plus broader regression suites pass without functional changes.
