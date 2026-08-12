# Frontend Inspection Remaining Consistency Remediation Plan

Date: 12 August 2026  
Status: Completed  
Source findings: UAT-INS-01 and UAT-INS-02 in `FRONTEND_INSPECTION_CROSS_TYPE_PLAYWRIGHT_UAT_EXECUTION_2026-08-12.md`

Execution record: `FRONTEND_INSPECTION_REMAINING_CONSISTENCY_REMEDIATION_EXECUTION_2026-08-12.md`

## 1. Objective

Complete the remaining inspection-form consistency work without changing inspection rules, saved data, validation outcomes or submission behavior.

This stage will:

1. give Fire Truck, High Angle and SCBA one predictable scope-selection and scope-resumption pattern; and
2. give ER Aux, Fire Extinguisher, Fire Truck, High Angle, Hydraulic and SCBA one compact progress-summary vocabulary.

The intended user outcome is that an inspector can move between inspection types without relearning where the current scope is shown, how another scope is selected, what has been checked or where issues remain.

## 2. Confirmed baseline

The work must build on the existing shared foundation rather than replace it:

- `InspectionMobileCollapsedSelectorRow` already presents a selected mobile setup value.
- `InspectionLocationOptionPicker` already provides searchable responsive option selection.
- `MobileSetupSummaryRow`, `MobileChoiceList` and `MobileSetupSelectorDrawer` provide shared workflow primitives.
- `InspectionStatusSegment` already aligns row-level status controls.
- `InspectionNextLocationCard` and `continuationHelpers.js` already model continuation between scopes.
- Fire Truck, High Angle and SCBA already calculate item, checked and issue counts; their presentation is the inconsistent part.
- UAT-INS-06 through UAT-INS-08 are complete. This stage must not restore mobile card carets, closed-card kebabs, generic `n missing` badges or narrow sticky actions.

## 3. Scope

### In scope

- A shared scope-navigation presentation contract.
- A pure shared progress-summary formatter and compact renderer.
- Small type-specific adapters that map existing summaries into those contracts.
- Fire Truck compartment selection and progress.
- High Angle compartment selection and progress.
- SCBA group selection and progress.
- Compact summary reconciliation for all six structured inspection types.
- Responsive, keyboard, draft-restoration and Playwright regression coverage.
- Updated UAT documentation and evidence.

### Out of scope

- Changing inspection fields, required checks or issue rules.
- Merging Fire Truck, High Angle or SCBA state handlers.
- Changing API payloads, database models, backend endpoints or seeders.
- Changing review, direct-submit, approval or record-detail workflows.
- Reworking General or HSE forms solely to make them resemble equipment checklists.
- Reintroducing a generic missing-data count on item cards.
- General visual redesign outside the inspection journey.
- Deployment, committing or pushing unless separately requested.

## 4. UX contracts to approve in code

### 4.1 Scope navigator contract

Create a small `InspectionScopeNavigator` composition around the existing selector primitives. It should accept presentation data, not own domain state.

Each scope option should support:

- stable key and display title;
- domain label such as `Compartment`, `Kit` or `Group`;
- item count;
- checked count and total count;
- issue count;
- selected state;
- completed state;
- optional `next incomplete` state;
- optional edit/add capability supplied by the type adapter; and
- existing selection, reset, edit and add callbacks.

Required presentation behavior:

- Before selection, use `Choose {scope label}` consistently.
- Each option uses the same information order: title, item count, progress, then issues.
- Use `1 item`/`2 items` and `1 issue`/`2 issues`; remove `(s)` wording.
- Mark the selected option consistently without relying on color alone.
- Mark the next incomplete option with explicit text such as `Next`, not only an icon or color.
- After mobile selection, keep the current scope summary above the checklist and expose clear `Change`/`Reset` actions.
- Include the selected scope's progress in the collapsed summary row.
- Do not render a long option list above the checklist once a mobile scope is selected.
- On scope change, move focus to the new checklist heading; when a selector drawer closes without a change, restore focus to its trigger.
- Preserve desktop option-card layout while normalizing its content and selected-state semantics.

### 4.2 Progress-summary contract

Add a pure formatter beside `InspectionStatusSegment`, supported by a small semantic renderer such as `InspectionProgressSummary`.

Canonical compact order:

1. `{checked}/{total} checked`
2. `{issue count} issue/issues`, when greater than zero
3. an explicit `Complete` state only where it adds information beyond the count

Examples:

- `0/9 checked`
- `4/9 checked`
- `9/9 checked`
- `9/9 checked • 1 issue`
- `7/9 checked • 2 issues`

Rules:

- Do not show `n missing` in a compact card or scope summary.
- Keep actionable missing-field explanations in validation and field-error regions.
- Use `issues` as the cross-type summary term; retain domain-specific `Defect` or `Not Good` wording inside the relevant row editor.
- Clamp or safely normalize malformed counts so presentation cannot show negative values or checked counts above totals.
- Provide one readable accessible label and visible text; do not communicate state with color alone.
- Keep icons decorative unless they convey meaning absent from the text.

## 5. Implementation stages

### Stage 0 — Freeze the behavioral baseline

Tasks:

1. Record the exact current selectors, callbacks, summary objects and draft fields used by Fire Truck, High Angle and SCBA.
2. Capture current controlled screenshots at 390 × 844 and 1440 × 900 for:
   - no scope selected;
   - first scope selected;
   - partially checked scope;
   - completed scope;
   - scope containing issues; and
   - return to a saved draft.
3. Record current emitted form payloads before and after scope changes.
4. Identify existing dirty worktree changes and restrict this stage to named files; do not overwrite unrelated work.

Exit gate:

- Baseline screenshots and payload fixtures exist.
- Existing relevant component tests pass before implementation.
- Every proposed adapter has a documented source summary and callback mapping.

### Stage 1 — Build and test the progress-summary primitive

Expected files:

- new formatter/renderer under `src/views/inspection/form/components/patterns/`;
- export update in `patterns/index.js`;
- focused unit and component tests.

Tasks:

1. Implement a pure count normalizer and summary-token formatter.
2. Implement the semantic compact renderer using existing typography and color tokens.
3. Cover zero, partial, complete, single-issue, multiple-issue and malformed-count cases.
4. Confirm the renderer does not output `missing`, `(s)` or duplicate completion wording.
5. Keep row-level `InspectionStatusSegment` behavior unchanged.

Exit gate:

- Formatter tests pass independently.
- Output order and singular/plural wording match this plan.
- No validation or domain helpers are modified.

### Stage 2 — Build the scope-navigation shell without migrating behavior

Expected files:

- new `InspectionScopeNavigator.js` under inspection form components;
- minimal extensions to `InspectionSetupSelectorControls.js` only when existing props cannot express the contract;
- component tests for the new shell.

Tasks:

1. Compose existing mobile summary, choice-list and option-card primitives.
2. Support loading, empty, selected, incomplete, complete, issues, long labels and disabled/read-only states.
3. Support add/edit/reset controls only through passed callbacks.
4. Add stable test identifiers at the shared boundary rather than per-type DOM traversal.
5. Implement focus transfer and restoration.
6. Verify 44 px touch targets and keyboard activation.

Exit gate:

- The shell works with fixture data and no inspection type is migrated yet.
- Selecting an option calls its callback exactly once.
- The component does not mutate option data or own inspection form state.

### Stage 3 — Migrate SCBA and High Angle adapters

SCBA first provides the clearest existing progress reference. High Angle follows because it has similar grouped equipment but custom-compartment management.

Tasks:

1. Map SCBA section summaries into the navigator option contract.
2. Replace `x/y checked | n issue(s)` with the shared progress renderer.
3. Preserve SCBA add-section, selection, reset, expanded-section and mobile drawer behavior.
4. Map High Angle groups into the same contract.
5. Preserve High Angle add/edit/delete compartment behavior and its custom-item handlers.
6. Preserve next-incomplete calculation; expose it through the common `Next` presentation.
7. Confirm selected scope and search state remain correct after editing or deleting a custom scope.

Exit gate:

- SCBA and High Angle share presentation but retain separate handlers.
- Existing form payloads are byte-equivalent for the same user actions, excluding irrelevant timestamps.
- Draft restore returns the inspector to the correct scope and checklist.

### Stage 4 — Migrate Fire Truck compartment presentation

Fire Truck setup is integrated into `InspectionFormSetupSections.js`, so this migration occurs only after the shared contract is stable.

Tasks:

1. Adapt existing compartment options and counts to the scope-navigation contract.
2. Preserve truck selection as a prerequisite and retain `Compartment` terminology.
3. Preserve custom compartment creation, duplicate detection, normalization and reset behavior.
4. Keep Fire Truck daily/one-off checklist rules and handlers untouched.
5. Ensure a selected mobile compartment collapses to the shared current-scope summary above its checklist.
6. Ensure long compartment lists remain searchable and are not left expanded above active work.

Exit gate:

- Truck and compartment selection order is unchanged.
- Existing custom-compartment tests remain green.
- Switching compartment does not leak checks or evidence between scopes.

### Stage 5 — Reconcile compact summaries across all structured types

Tasks:

1. Use the shared progress formatter for ER Aux aggregate summaries.
2. Use it for Fire Extinguisher aggregate/location summaries while keeping row-level `Defect` semantics.
3. Use it for Fire Truck section/scope summaries.
4. Use it for High Angle compartment summaries.
5. Use it for Hydraulic aggregate summaries.
6. Use it for SCBA group summaries.
7. Remove remaining user-facing `issue(s)` and inconsistent `checks`/`checked` progress strings within the compact form journey.
8. Do not change submitted-detail prose or exported report wording unless the same compact component renders it.

Exit gate:

- The six structured types display the same summary order and pluralization.
- No `n missing` badge returns.
- Row-level domain labels and validation remain correct.

### Stage 6 — Functional and UI regression audit

Component and integration coverage:

- formatter normalization and pluralization;
- scope navigator empty/loading/selected/next/complete/issue states;
- Fire Truck compartment create, select, change and reset;
- High Angle compartment select, custom edit/delete and next scope;
- SCBA group select, add and reset;
- ER Aux, Fire Extinguisher, Hydraulic and structured row status rendering;
- draft save/restore and edit-mode restoration;
- review readiness and validation focus routing;
- mobile drawer actions introduced in the previous remediation.

Playwright journeys:

1. First-time inspector selects the first scope and completes one item.
2. Returning inspector resumes a partial draft in the saved scope.
3. Inspector completes a scope and moves to the indicated next incomplete scope.
4. Inspector changes scope with unsaved item changes and receives the existing protection/recovery behavior.
5. Inspector encounters one and multiple issues and understands progress without opening every row.
6. Inspector uses keyboard-only navigation through selection, change, reset and checklist entry.
7. Inspector uses 360 px and 390 px mobile widths, 1440 px desktop, light/dark themes and reduced motion.

Required automated assertions:

- no horizontal overflow;
- no nested interactive controls;
- exactly one selected scope;
- explicit text for the next incomplete scope;
- consistent progress token order;
- correct singular/plural labels;
- no generic `n missing` summary;
- focus lands at the new checklist after selection;
- no unexpected console/page errors;
- action and validation callbacks fire once;
- request payloads and route transitions match the baseline.

Exit gate:

- Targeted ESLint and formatting pass.
- All affected Vitest suites pass.
- Controlled Playwright cross-type tests pass.
- Production build passes with no new warning category.
- Before/after screenshot contact sheets show improved consistency without hiding domain context.

### Stage 7 — Audit record and release verdict

Tasks:

1. Append execution evidence to the inspection UAT record or create a focused execution report.
2. Record files changed, tests run, screenshot locations and any deliberately retained differences.
3. Reconcile the active-work README.
4. Run deployment checks only when a commit/deployment is requested.
5. Perform read-only live confirmation after deployment; do not mutate production inspection records for visual verification.

## 6. File ownership map

| Area                       | Primary files                                                           | Allowed change                                   |
| -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| Shared progress            | `form/components/patterns/`                                             | New pure formatter and renderer                  |
| Shared scope UI            | `InspectionSetupSelectorControls.js`, new `InspectionScopeNavigator.js` | Presentation and accessibility only              |
| Fire Truck adapter         | `InspectionFormSetupSections.js`, FRT presentation files                | Map existing state/callbacks; no rule changes    |
| High Angle adapter         | `HighAngleInspectionChecks.js`                                          | Map groups and preserve custom management        |
| SCBA adapter               | `ScbaInspectionChecks.js`                                               | Map sections and preserve expansion/add behavior |
| Other structured summaries | ER Aux, Fire Extinguisher and Hydraulic presentation components         | Replace display formatting only                  |
| Regression evidence        | inspection Vitest suites and controlled Playwright specifications       | Add behavioral assertions and snapshots          |

## 7. Mishap prevention controls

- Do not replace per-type summary helpers; adapt their outputs at the presentation boundary.
- Do not rename payload keys, IDs, storage keys or API fields.
- Do not use array indexes as scope identities.
- Do not infer completion from issue count; use each type's existing completion result.
- Do not automatically change scope while an item drawer has unsaved changes.
- Do not make `Next` activate automatically; it remains an explicit user action.
- Do not hide zero progress when it is needed to distinguish not started from unavailable.
- Do not show stale progress after a row save; derive navigator options from the latest form summary.
- Keep mobile and desktop markup semantically aligned even where layout differs.
- Keep DOM and visual order identical for keyboard accessibility.
- Preserve dark-theme tokens and avoid hard-coded status colors.
- Treat snapshot updates as review evidence, not automatic approval.
- If a migration changes emitted form data or readiness decisions, stop and revert that adapter before continuing.

## 8. Rollback strategy

The shared primitives must be additive until all adapters pass. Each type migration should be isolated so it can return to its prior selector/summary presentation without reverting another type.

Rollback order:

1. revert only the failing type adapter;
2. retain the tested shared primitive if unused behavior remains inert;
3. rerun that type's component and Playwright baseline;
4. remove the primitive only if its independent contract is defective.

No database or backend rollback should be required because this plan does not authorize data-contract changes.

## 9. Definition of done

This remediation is complete only when:

- Fire Truck, High Angle and SCBA use the shared scope-navigation presentation;
- all six structured types use the shared compact progress vocabulary;
- mobile users can see and change the current scope without scrolling through the complete option list;
- next-incomplete guidance is explicit and consistent;
- no generic missing-data badge is present on compact cards;
- draft restoration, validation, evidence, review and submission work as before;
- accessibility, responsive, component, Playwright and production-build gates pass; and
- the execution report provides a clear proceed/fix-first verdict.

## 10. Planned execution order

Execute one stage at a time and stop at every exit gate:

1. baseline and mappings;
2. progress primitive;
3. scope-navigation shell;
4. SCBA adapter;
5. High Angle adapter;
6. Fire Truck adapter;
7. remaining structured summaries;
8. full regression and reconciliation;
9. documentation and release verdict.

This order minimizes blast radius and makes a regression attributable to one adapter rather than a repo-wide simultaneous rewrite.
