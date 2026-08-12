# Frontend Inspection Cross-Type Playwright UAT Execution

Date: 2026-08-12  
Status: Executed; targeted remediation recommended  
Scope: all eight implemented inspection types under `src/views/inspection/`  
Verdict lens: `uiux-journey-tester`

## Executive verdict

The inspection module is **consistent with targeted fixes required**. It does not justify another broad component rewrite.

The common journey is already substantially shared: entry shell, page header and Back action, setup summary, selector controls, item-card foundation, status segment, evidence treatment, sticky actions, continuation panel, review shell and read-only detail shell. The remaining visible differences are mostly caused by genuinely different inspection models.

The next work should focus on two cross-type interaction gaps:

1. make scope selection and progress equally easy to understand for truck compartments, rescue-kit compartments and SCBA groups; and
2. normalize the compact status/progress language shown on equipment rows without erasing domain-specific field labels.

Do not merge the eight type implementations into one universal form component. Their data, validation and navigation contracts are materially different.

## Build and evidence boundary

### Live read-only pass

- Frontend: `https://vmecc.amiosh.com`
- API: `https://vmecc-api.amiosh.com/api`
- Version: `5.5.0`
- Build ID: `f21edf19b7c8-20260812014745`
- Built at: `2026-08-12T01:47:45.023Z`
- Evidence run: `VMECC-QA-20260812-122246-d1f45c`
- Result: the Conduct Inspection home and all eight mobile type-entry/setup screens were captured successfully.
- Mutation result: none. Draft GET requests were shadowed and no live report was created.
- Limitation: subsequent authentication attempts were blocked by live login throttling and then rejected. The live pass was stopped rather than weakening safeguards or changing environment configuration.

The deployed build still displayed the older outlined Back control. The current local `main` contains the already-committed chrome-free Back treatment, so this is a deployment-version difference rather than a newly discovered source regression.

### Controlled journey pass

- Broad matrix run: `VMECC-QA-20260812-130000-d7fa1c`
- Real component pass: `VMECC-QA-20260812-134500-b8c9d0`
- Accessibility/device run: `VMECC-QA-20260812-135000-c9d0e1`
- Final combined harness rerun: `VMECC-QA-20260812-141000-f2a3b4`
- Browser: Chromium/Chrome
- Data: deterministic inspection fixtures with guarded API interception
- Database/backend mutation: none

The broad matrix produced:

- 112 screenshots;
- 96 recorded checkpoints;
- 22 cross-type and per-type contact sheets;
- mobile, desktop, narrow-mobile, dark-mode, evidence-drawer and detail samples;
- zero page errors; and
- zero measured horizontal-overflow failures.

The real component pass supplemented the visual matrix because six structured checklist bodies in the matrix intentionally use a stub. It restored one completed fixture for each type into the real `/inspection/new` route and captured the genuine checklist UI. All eight types passed at 390 x 844 with:

- zero page errors;
- zero horizontal overflow;
- zero nested `.inspection-check-card` structures; and
- a clean controlled Fire Extinguisher session lifecycle.

Generated screenshots and contact sheets remain under `C:/laragon/www/vmecc/.qa/`; they are not committed application assets.

## Coverage reconciliation

| Journey area                                     | Live                         | Controlled                                                      | Verdict confidence                                                    |
| ------------------------------------------------ | ---------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| Conduct Inspection home and Show more            | Verified                     | Verified                                                        | High                                                                  |
| Type entry and initial setup                     | All 8 mobile                 | All 8 mobile                                                    | High                                                                  |
| Real type-specific checklist body                | Blocked after login throttle | All 8 mobile                                                    | High for local source; not live-deployment proof                      |
| Empty, partial, invalid and complete body states | Not mutated live             | All 8, mobile and desktop                                       | High for shared shell; structured item bodies supplemented separately |
| Evidence drawer                                  | Not mutated live             | All 8 representative states                                     | High                                                                  |
| Continuation panel                               | Not mutated live             | All applicable types                                            | High                                                                  |
| Review/direct-submit                             | Not safely submitted live    | Representative controlled states and component regression tests | Medium                                                                |
| Submitted detail                                 | Existing live entry only     | All 8, mobile and desktop                                       | High for layout; controlled data                                      |
| Narrow mobile                                    | Entry evidence               | All 8 at 360 x 800                                              | High                                                                  |
| Keyboard, enlarged text and touch devices        | Not repeated live            | Dedicated Playwright suite                                      | High                                                                  |
| Dark mode                                        | Not repeated live            | Shared-body matrix                                              | Medium; matrix framing itself is audit-only UI                        |

No claim is made that all destructive or submission checkpoints were live-verified.

## Cross-type scorecard

Scores use the planned scale: `2` consistent and usable, `1` intentional variant or minor inconsistency, `0` materially confusing or broken.

| Dimension                                  |     Score | Assessment                                                                                                                  |
| ------------------------------------------ | --------: | --------------------------------------------------------------------------------------------------------------------------- |
| Header, title, Back and type context       |         2 | Same mobile hierarchy in current source; Back is icon plus label and chrome-free.                                           |
| Setup order, labels and summaries          |         1 | Shared summary component is strong, but Fire Extinguisher mode and Fire Truck selection make the initial density different. |
| Section title and progress language        |         1 | Scope models are valid but progress wording and placement vary.                                                             |
| Item identity and expansion                |         1 | Shared card primitives exist; list/group navigation still requires type-specific relearning.                                |
| Status controls and selected-state clarity |         1 | Status segment behavior is shared, while compact summaries use different vocabulary.                                        |
| Remarks, validation and recovery           |         2 | Issue-dependent remarks and validation are consistently discoverable in tested states.                                      |
| Evidence upload and preview                |         2 | Evidence UI is shared, filenames are suppressed and no nested image cards were observed.                                    |
| Sticky and in-flow actions                 |         2 | Primary actions are visually consistent and no horizontal obstruction was reproduced.                                       |
| Next location/compartment/kit              |         2 | Shared continuation presentation correctly adapts the domain label.                                                         |
| Review/direct submit                       |         1 | HSE intentionally submits directly; controlled coverage is adequate but live submission was policy-blocked.                 |
| Submitted detail                           |         2 | All eight use the same drawer/detail hierarchy without the reported stray mobile border.                                    |
| Responsive and accessible interaction      |         2 | Device, enlarged-text, keyboard and overflow checks passed.                                                                 |
| **Total**                                  | **19/24** | **Consistent foundation; targeted interaction normalization remains.**                                                      |

## Verified strengths

### Shared structure is already doing useful work

- `InspectionFormShell` and `InspectionFormSetupSections` provide one form and setup architecture.
- `MobileSetupSummaryList`, `InspectionMobileCollapsedSelectorRow` and `InspectionLocationOptionPicker` align mobile setup behavior.
- `InspectionElementCard` is already used by ER Aux, Fire Extinguisher, Fire Truck, High Angle, Hydraulic and SCBA item presentations.
- `InspectionStatusSegment` already centralizes the status-control pattern across those structured types.
- `InspectionGeneralEvidenceCard` and the shared evidence drawer align evidence capture.
- `InspectionNextLocationCard` aligns the location, compartment and kit continuation pattern.
- Detail evidence showed one common Inspection Details shell across all eight types.

This means the visual variation is not evidence of eight unrelated implementations. Much of the foundational behavior has already been consolidated.

### The three reported mobile quirks remain corrected in current source

- No unexplained left border was reproduced on the controlled mobile detail views.
- Inspection images/evidence were not placed inside an extra nested inspection card.
- Device filenames were not shown in the evidence presentation.

### Responsive and accessibility checks passed

- No horizontal overflow was measured at 360, 390 or 1440 widths in the controlled matrix.
- The real eight-type form pass also measured zero overflow at 390.
- Enlarged text, long localized content, semantic controls and keyboard order passed the dedicated Playwright checks.

## Findings and corrective actions

### UAT-INS-01 — Scope selection has unequal effort across structured types

Severity: Medium  
Affected: Fire Truck, High Angle and SCBA; ER Aux/Hydraulic are comparison references  
Evidence: `actual-mobile-forms.png`, especially Fire Truck compartment list, High Angle compartment list and SCBA group list  
Verification: controlled real components

Fire Truck displays a long compartment list before an active compartment is chosen. High Angle and SCBA use hierarchical scope choices with different headings and progress treatments. Each model is valid, but a returning inspector must relearn where selection, progress and the next incomplete scope appear.

Corrective action:

- extract or extend a small `InspectionScopeNavigator` primitive around the existing collapsed-selector row;
- standardize title, item count, checked count, issue count, selected state and `next incomplete` affordance;
- retain domain labels such as Compartment, Kit and Group;
- on mobile, keep the current scope and the control for changing scope above the item list without forcing a long scroll;
- do not merge the underlying FRT, High Angle or SCBA validation/data handlers.

### UAT-INS-02 — Compact progress/status vocabulary drifts between types

Severity: Medium  
Affected: ER Aux, Fire Extinguisher, FRT, High Angle, Hydraulic and SCBA  
Evidence: real mobile form screenshots and actual-form ledger  
Verification: controlled real components

The same conceptual state is expressed as combinations of `Not checked`, `Checked`, `Defect`, `Issue`, `1 missing`, `1/9 checked` and `1 issue(s)`. The field-level vocabulary can remain domain-specific, but the compact list summary should read consistently.

Corrective action:

- add a shared status-summary formatter beside `InspectionStatusSegment`;
- use a common order such as `x/y checked` then `z issues` then `z missing`;
- preserve text-plus-icon semantics and do not rely on color alone;
- migrate the existing per-type inline status-summary wrappers incrementally.

### UAT-INS-03 — Initial setup density varies, but most variation is intentional

Severity: Low  
Affected: Fire Extinguisher and Fire Truck compared with the other six types  
Evidence: mobile entry contact sheet  
Verification: live entry plus controlled entry

Fire Extinguisher requires an inspection mode before the rest of setup is meaningful. Fire Truck requires a truck and compartment. Other structured types can expose date/time and main location immediately. This is not a reason to force an identical field sequence.

Corrective action:

- keep the domain sequence;
- ensure each entry screen always explains the single next required decision;
- retain the same collapsed summary row styling after a choice is made;
- add a cross-type test asserting that exactly one primary setup choice is emphasized at a time.

### UAT-INS-04 — Live evidence is incomplete because authentication became unavailable

Severity: Test limitation, not a product UI defect  
Affected: live deep-form, review and submission evidence  
Evidence: live UAT run ledger

Corrective action:

- rerun only the missing live checkpoints after the dedicated UAT login is usable;
- retain read-only/mutation guards;
- do not change `.env`, weaken rate limiting or use real user records to complete the audit.

### UAT-INS-05 — Deployed Back treatment trails current `main`

Severity: Release synchronization  
Affected: deployed Conduct Inspection entry  
Evidence: live screenshots versus controlled current-source screenshots

The deployed build shows an outlined Back button. Current `main` shows the approved icon-plus-label treatment. Deploy the current frontend build before judging this item again; no additional Back refactor is required by this audit.

### UAT-INS-06 — The mobile item-card caret and `missing` badge need clearer semantics

Severity: Medium  
Affected: ER Aux directly; other `InspectionElementCard` mobile-drawer consumers require reconciliation  
Evidence: ER Aux equipment cards showing `Not checked`, `1 missing`, a down-caret and a separate overflow menu  
Verification: source trace plus supplied mobile screenshot

The yellow `1 missing` badge is calculated progress, not a backend error. For ER Aux it counts missing required values among condition, quantity and defect remarks when applicable. In the supplied state, the default quantity is present, so the remaining missing value is normally the condition. The nearby `Not checked` label already communicates the incomplete state, making `1 missing` repetitive and less actionable because it does not name the missing field.

The caret is rendered by the shared `InspectionElementCard`. On desktop it can disclose the body inline. In the ER Aux mobile flow, activating the same summary opens a bottom drawer instead. The unchanged down-caret therefore suggests an accordion even though the interaction is drill-in/drawer navigation. The component is shared, but the signifier and accessibility state do not yet describe both interaction modes accurately.

Corrective action:

- keep the whole row summary as the large touch target;
- add an explicit `interactionMode` contract to `InspectionElementCard`, such as `inline` or `drawer`;
- remove the disclosure caret from mobile drawer cards because tapping the card already opens the detail drawer;
- retain a down-caret only where the card genuinely expands inline;
- expose an accessible action name such as `Open Fire Jacket inspection details` and drawer semantics rather than a misleading collapsed state;
- retain the overflow menu solely for secondary row actions;
- remove the generic `n missing` badge from all inspection item-card summaries because users can reasonably interpret it as missing equipment rather than incomplete data;
- retain the underlying missing-field calculations for validation, focus routing and detailed field errors;
- surface actionable field-level messages such as `Condition is required` only when validation is invoked.

### UAT-INS-07 — Mobile item-card kebabs duplicate drawer actions and appear on untouched rows

Severity: Medium  
Affected: ER Aux, Fire Extinguisher, Fire Truck Daily Readiness, High Angle, Hydraulic and SCBA  
Not applicable: General Inspection and HSE, which do not use equipment-row cards  
Evidence: supplied ER Aux/Hydraulic screenshots and source reconciliation of all `InspectionElementCard` consumers  
Verification: source trace plus controlled real-form screenshots

All six structured equipment/checklist types can render the shared three-dot `RowActions` menu on item cards. The usual actions are Reset check, Edit and Delete, with Edit/Delete conditional on catalog or custom-row permissions. Reset is currently made available from the presence of a reset callback rather than from whether the row actually contains data, so even an untouched `Not checked` row can carry a kebab whose only practical action is Reset.

The same actions are already available in the mobile detail drawer header for all six structured types. Keeping the kebab on the closed mobile card therefore adds another target beside the already-redundant caret, competes with the main open-details action and increases accidental-tap risk.

Corrective action:

- remove the kebab from closed item cards in mobile drawer mode;
- keep the entire card as the sole open-details target;
- keep applicable Reset/Edit/Delete actions in the drawer header;
- show Reset only after the item has user-entered or selected data to clear;
- keep Edit/Delete only for items the user is actually permitted to manage;
- remove FRT's menu-level Edit action where it merely opens the same details already opened by tapping the card;
- on desktop inline cards, retain a kebab only when at least one meaningful secondary action exists.

### UAT-INS-08 — Mobile inspection actions should use a full-width vertical hierarchy

Severity: Medium  
Affected: all inspection types using the shared compact-sticky form action group  
Evidence: supplied `Continue to Review` screenshot and shared action-row CSS  
Verification: source trace plus controlled mobile screenshots

The compact sticky action group always declares a two-column `2fr / 3fr` grid. When `Continue to Review` is the only action, it occupies only the first column, leaving unused space and forcing the label onto two lines. When another action is present, placing both actions side by side gives neither a clear mobile hierarchy and can wrap their labels.

Corrective action:

- make every inspection action span the full available width at mobile size;
- keep the label on one line when it fits naturally;
- stack multiple actions vertically, with `Continue to Review` first and secondary actions below it;
- apply the rule through the shared action-row layout, with an inspection-scoped selector if changing all `FormActionGroup` consumers would be too broad;
- preserve the status message above the full-width action and the existing bottom-navigation safe-area spacing.

## Intentional differences to retain

- HSE direct submission versus normal review is an explicit workflow difference.
- Fire Extinguisher session/scanner behavior is operationally different from ordinary equipment lists.
- FRT separates truck/compartment and daily/one-off checks.
- High Angle organizes equipment by rescue-kit compartments.
- SCBA separates back plate, cylinder and face-mask groups with different fields.
- General Inspection is findings-led rather than catalog-led.

These differences should share visual primitives and interaction rules, not a single state schema or universal checklist component.

## Shared-component decision

Recommended:

1. a shared scope-navigation shell for compartment/kit/group selection and progress; and
2. a shared compact status-summary formatter used by existing item cards;
3. an explicit mobile-drawer mode for `InspectionElementCard` that removes closed-card carets and kebabs while preserving drawer-header actions;
4. removal of generic `n missing` summary badges while retaining field-level validation; and
5. a full-width, primary-first vertical stack for compact mobile inspection action rows.

Not recommended:

- one universal inspection item editor;
- one universal checklist payload;
- forcing HSE through the review flow;
- converting all list/group layouts into identical cards solely for visual sameness; or
- another repo-wide styling pass before the two evidenced interaction gaps are addressed.

## Verification results

| Check                                                   | Result                                      |
| ------------------------------------------------------- | ------------------------------------------- |
| Final combined controlled cross-type Playwright harness | Passed: 2 tests in 2.5 min                  |
| Controlled broad cross-type Playwright matrix           | Passed: 112 screenshots; 96 checkpoints     |
| Controlled real eight-type form pass                    | Passed: 8/8 types; 8 additional screenshots |
| Device/accessibility Playwright pass                    | Passed: 3 tests                             |
| Inspection component regression tests                   | Passed: 4 files, 114 tests                  |
| Scoped Prettier and ESLint for new harness              | Passed                                      |
| `git diff --check`                                      | Passed                                      |
| Live mutations                                          | None                                        |
| Temporary drive mapping                                 | Removed                                     |
| Local Vite listener                                     | Stopped                                     |

One initial Vitest invocation used the unsupported Jest flag `--runInBand`; it was immediately rerun with the correct Vitest command and all 114 tests passed.

## Repository impact

This audit did not modify inspection production components. It added only:

- the cross-type live-safe journey harness;
- the controlled cross-type evidence harness;
- the shared inspection-type test matrix;
- this execution/verdict record; and
- the related active-work index entries.

Unrelated pre-existing working-tree changes and generated build changes were not altered or cleaned by this task.

## Accepted remediation execution — 12 August 2026

The accepted mobile card and action corrections from UAT-INS-06 through UAT-INS-08 are implemented.

- `InspectionElementCard` now distinguishes inline expansion from mobile drawer navigation. Drawer-trigger cards expose `aria-haspopup="dialog"`, use an explicit `Open … inspection details` accessible name, and show neither an accordion caret nor a closed-card kebab.
- ER Aux, Hydraulic, High Angle, SCBA, Fire Extinguisher and FRT use the shared drawer-mode contract. Their meaningful management actions remain available in the opened drawer header, and desktop inline cards retain their existing disclosure and secondary-action behavior.
- Generic `n missing` summary badges were removed across the structured inspection cards. Missing-field calculations, readiness checks, focus routing, detailed errors and `Needs evidence` warnings remain intact.
- Compact-sticky mobile inspection actions now occupy the full available width. Multiple actions are stacked vertically with the primary review/submit action first in both visual and DOM/keyboard order; secondary actions follow below.
- The footer behavior is inspection-scoped, so other modules using `WorkflowStageActions` retain their current layout.

Verification completed:

- targeted ESLint passed;
- seven targeted Vitest files passed: 71 tests;
- production Vite build passed;
- controlled Playwright real-form pass covered all eight inspection types at 390 × 844 with zero horizontal overflow;
- structured cards observed in that pass had zero mobile card carets, zero closed-card action menus, zero generic `n missing` badges and zero nested inspection cards;
- rendered mobile primary actions measured 348 px across a 350 px usable footer area (the 2 px difference is the footer border);
- a dedicated two-action browser contract confirmed both buttons are full width and the primary action precedes the secondary action vertically.

Verdict: UAT-INS-06 through UAT-INS-08 are complete and regression-guarded. UAT-INS-01 and UAT-INS-02 remain the next separate consistency-remediation scope.

### 12 August 2026 remediation addendum

UAT-INS-01 and UAT-INS-02 were subsequently remediated and regression-guarded. The implementation and verification evidence is recorded in `FRONTEND_INSPECTION_REMAINING_CONSISTENCY_REMEDIATION_EXECUTION_2026-08-12.md`. This addendum supersedes only the remaining-work statement above; the original audit evidence and point-in-time verdict are retained.

## Exit decision

Proceed to a **small inspection consistency remediation stage** covering UAT-INS-01 and UAT-INS-02. Follow it with the same focused screenshot comparison and regression suite. UAT-INS-06 through UAT-INS-08 require no further implementation work unless later UAT exposes a regression. The inspection experience is not blocked, and another broad refactor would be disproportionate to the remaining evidence.
