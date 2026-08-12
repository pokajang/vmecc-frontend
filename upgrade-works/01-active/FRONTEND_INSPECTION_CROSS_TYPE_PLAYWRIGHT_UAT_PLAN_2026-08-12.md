# Frontend Inspection Cross-Type Playwright UAT Plan

Date: 2026-08-12  
Status: Executed; see the linked execution verdict  
Scope: `src/views/inspection/` and the inspection journeys reachable from `/inspection`  
Primary lens: UI/UX journey consistency across every implemented inspection type

Execution record: [Frontend Inspection Cross-Type Playwright UAT Execution](./FRONTEND_INSPECTION_CROSS_TYPE_PLAYWRIGHT_UAT_EXECUTION_2026-08-12.md)

## 1. Objective

Run one evidence-led Playwright pass beginning at the mobile **Conduct Inspection** page and walking every implemented inspection type through each meaningful view and state. Capture named screenshots at every checkpoint, consolidate them into comparable contact sheets, and produce a UI/UX verdict that distinguishes:

- intentional domain differences;
- accidental presentation or interaction inconsistencies;
- shared patterns that should remain shared;
- duplicated patterns worth migrating into the shared component system;
- genuine defects that obstruct or confuse the inspection journey.

This stage is an audit and evidence exercise. It must not mix broad refactoring into the evidence run. Any recommended code changes will be written as a separate remediation plan after the verdict is reviewed.

## 2. Implemented inspection types in scope

The runtime registry currently exposes eight implemented types:

| Key                 | Inspection type                        | Journey characteristic                                           |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `er-aux`            | Emergency Response Auxiliary Equipment | Structured equipment and location flow                           |
| `fire-extinguisher` | Fire Extinguisher                      | Zone, location, catalog/scanner and continuation flow            |
| `frt-daily`         | Fire Truck Daily Readiness             | Truck, shift, compartment and scheduled checks                   |
| `high-angle`        | High Angle Rescue Equipment            | Rescue-kit and equipment flow                                    |
| `hydraulic`         | Hydraulic Rescue Tools                 | Location and equipment flow                                      |
| `scba`              | SCBA                                   | Multi-section equipment flow: back plate, cylinder and face mask |
| `hse`               | Health Safety Environment              | Location-led observation flow with direct submission             |
| `general`           | General Inspection                     | Generic location, finding and evidence flow                      |

No type may be omitted merely because it is hidden below **Show more** on the mobile home view.

## 3. User and environment assumptions

- Primary persona: a frontline inspector conducting inspections on a phone, often one-handed and potentially interrupted.
- Secondary persona: the same inspector returning on desktop to complete, review or inspect a saved record.
- Use only the existing dedicated UAT account recorded outside the repository in `../UAT/creds.md`.
- Never print, attach, screenshot or commit credentials.
- Record the target build ID, frontend URL, API URL, user identity, browser version and run timestamp before the first screenshot.
- Use a unique marker such as `INSPECTION-UIUX-20260812-HHMMSS` for any controlled draft or record created during execution.
- Do not act on records belonging to another user.

## 4. Safety boundary

### 4.1 Default behavior

- Begin read-only: authenticate, confirm build identity, inventory visible types and verify required catalogs.
- Filling a live form may trigger autosave. Treat it as a mutation even if **Submit** is never pressed.
- Use only the UAT user and run-marked data.
- Maintain a mutation and cleanup ledger containing created draft IDs, report IDs and cleanup result.
- Never change `.env`, module activation, workflow rules, permissions, catalogs or production configuration to make the test pass.
- Do not approve, reject, delete or alter non-UAT records.

### 4.2 Submission boundary

- Capture all pre-submission steps for every type.
- Submit one run-marked record per type only when the existing controlled-UAT mutation guard is deliberately enabled and the exact target URLs are confirmed.
- If controlled submission cannot be made safely, mark the submission/detail checkpoint **policy-blocked**, use the existing deterministic local/stubbed journey for that state, and do not describe it as live-verified.
- HSE must be assessed according to its intentional direct-submission flow; it must not be penalized for lacking the normal review transition.

### 4.3 Cleanup

- Remove only artifacts created by the current run, using their exact recorded identifiers.
- Verify deletion individually and retain the cleanup ledger.
- If safe cleanup is unavailable, retain the clearly marked UAT records and report them explicitly; do not attempt broad deletion.

## 5. Playwright evidence harness

Create a dedicated test and support matrix rather than extending the large CRUD smoke test:

- `tests/e2e/live-uat/inspection-cross-type-journey.live.spec.js`
- `tests/e2e/live-uat/inspection-cross-type-matrix.js`
- reuse credential and diagnostic utilities already present under `tests/e2e/live-uat/`;
- reuse inspection fixtures/helpers only where their behavior matches the live journey;
- add a package script only if it improves repeatability and does not alter existing scripts.

The test must run serially with one worker so local workspace, autosave and screenshots cannot bleed between types.

### Required viewport coverage

| Profile        | Size       | Coverage                                                                     |
| -------------- | ---------- | ---------------------------------------------------------------------------- |
| Primary mobile | 390 x 844  | Every checkpoint for all eight types                                         |
| Desktop        | 1440 x 900 | Every checkpoint for all eight types                                         |
| Narrow mobile  | 360 x 800  | Overflow and action-access sweep at representative checkpoints for all types |
| Tablet         | 768 x 1024 | Home, populated form, review and detail samples                              |

Run the main matrix in light mode. Repeat the home, populated form, evidence UI, validation and review/detail checkpoints in dark mode. Apply reduced motion during screenshot capture to remove animation noise.

### Screenshot discipline

- Wait for fonts, route loading, skeletons, network activity and transitions to settle.
- Disable animations only for capture stability, not during interaction testing.
- Use stable run-owned fixture content and a neutral synthetic evidence image.
- Capture both a viewport screenshot and, where content extends materially below the fold, a full-page screenshot.
- Do not update Playwright golden snapshots automatically. These are audit artifacts, not approval of new baselines.
- Attach console errors, page errors and failed API responses to the matching checkpoint.

## 6. Journey and snapshot matrix

### Phase A - Entry and orientation

Capture once per viewport:

1. `/inspection` mobile home on first load.
2. **Choose type** with the default three visible entries.
3. Expanded **Show more** list showing all enabled types.
4. Recent records with **Mine/All** and **View all** controls.
5. Keyboard focus on the first inspection type.
6. Loading, empty and recoverable error states where safely reproducible.

Questions to answer:

- Is **Conduct Inspection** unmistakably the current task?
- Can a first-time user find every inspection type?
- Are row height, icon placement, chevron placement and text wrapping consistent?
- Does **Add type** appear as a secondary administration action rather than competing with conducting an inspection?
- Do recent-record controls and cards look related to the rest of the inspection module?

### Phase B - Per-type form journey

For each of the eight types, start from the visible type row rather than navigating directly to an internal route. Capture these checkpoints when applicable:

| ID                    | Checkpoint                           | Required evidence                                                               |
| --------------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| `01-entry`            | Type selected                        | Header, Back treatment and retained type context                                |
| `02-setup-empty`      | Initial setup                        | Empty location/zone/truck/kit selectors and guidance                            |
| `03-setup-open`       | Selector open                        | Drawer, modal, list or picker used to choose context                            |
| `04-setup-complete`   | Required context selected            | Collapsed setup summary and transition into checks                              |
| `05-checks-pristine`  | First check section                  | Section header, progress, item cards and initial actions                        |
| `06-item-open`        | Item detail/editor expanded          | Labels, controls, spacing and close/back behavior                               |
| `07-status-set`       | Good/pass state                      | Selected-state visibility and movement to next item                             |
| `08-issue-state`      | Defect/not-good state                | Remarks requirement, status emphasis and recovery path                          |
| `09-evidence-open`    | Evidence camera/upload UI            | Drawer/card hierarchy, image treatment and action labels                        |
| `10-evidence-added`   | Image attached                       | Image sizing, description, removal control and absence of device filename noise |
| `11-partial-progress` | Mixed completed/incomplete state     | Progress language and resumability                                              |
| `12-validation`       | Attempt to advance with missing data | Field association, scroll/focus behavior and actionable copy                    |
| `13-section-complete` | Current scope complete               | Completion cue and primary next action                                          |
| `14-continuation`     | Next location/compartment/kit        | Consistency of continuation card/drawer and current-scope context               |
| `15-review`           | Review or direct-submit confirmation | Summary hierarchy, status, evidence and action placement                        |
| `16-back-to-edit`     | Return from review                   | State preservation, scroll/focus restoration and predictable Back behavior      |
| `17-submitted`        | Successful controlled submission     | Confirmation, identifier, status and next meaningful action                     |
| `18-detail`           | Submitted record detail              | Metadata, findings, evidence, action bar and mobile borders/overflow            |

If a checkpoint is not part of a type's domain flow, record it as **not applicable with reason** rather than silently omitting it.

### Phase C - Type-specific checkpoints

#### Emergency Response Auxiliary Equipment

- Location selection and custom/location-manager affordance.
- Equipment row compact and expanded forms.
- Condition/defect remarks and per-item evidence.
- Next-location continuation.

#### Fire Extinguisher

- Zone to main location to sub-location sequence.
- Scanner/manual entry choice and permission-denied fallback.
- Catalog item card, status, certification/condition fields and evidence.
- Next-location continuation without losing progress.

#### Fire Truck Daily Readiness

- Truck and shift selection.
- Daily versus scheduled/one-off section distinction.
- Reading row versus condition row presentation.
- Compartment continuation and progress.

#### High Angle Rescue Equipment

- Rescue-kit selection.
- Standard versus custom equipment presentation.
- Equipment row drawer/editor, condition, remarks and evidence.
- Next-kit continuation.

#### Hydraulic Rescue Tools

- Main-location selection.
- Tool list, compact status selection and issue expansion.
- Remarks/evidence behavior.
- Next-location continuation.

#### SCBA

- Section navigation among back plates, cylinders and face masks.
- Consistency of row identity, status controls and progress across sections.
- Custom SCBA section if available to the UAT user.
- Next-location continuation.

#### Health Safety Environment

- Location selection.
- Unsafe act/unsafe condition selection and conditional fields.
- Immediate corrective action and observation evidence.
- Direct-submit confirmation and resulting detail view.

#### General Inspection

- Zone/main/sub-location setup.
- Finding category, description and evidence.
- Validation and normal review transition.
- Submitted detail presentation.

## 7. Interaction and resilience checks

For every type, verify:

- Back from the form returns to Conduct Inspection without accidental submission;
- Back from review restores entered state;
- changing type warns or preserves work appropriately;
- reload/resume behavior accurately communicates draft status;
- long equipment names, locations, remarks and validation messages wrap without horizontal overflow;
- sticky actions do not obscure the final form fields;
- opening and closing drawers restores focus to the invoker;
- visible buttons have accessible names and practical mobile touch targets;
- keyboard order follows the visual order;
- status is conveyed by text as well as color;
- one primary action is visually dominant at each stage;
- failed requests do not discard entered work or strand the user;
- photos are not nested inside unnecessary cards and device filenames are not displayed;
- no unexplained left border, double container, clipped drawer or background strip appears at 360/390px.

## 8. Cross-type consistency rubric

Score each checkpoint from 0 to 2:

- `2` - consistent and usable;
- `1` - intentional variant or minor inconsistency;
- `0` - confusing, inaccessible, broken or materially divergent.

Compare these dimensions:

1. Page header, title, Back action and current-type context.
2. Setup selector order, labels, summaries and edit affordances.
3. Section title, helper copy, progress and completion language.
4. Item-card density, identity hierarchy and expansion behavior.
5. Good/issue/status controls and selected-state clarity.
6. Remarks, validation and error recovery.
7. Evidence upload, preview, description and removal.
8. Sticky/in-flow action groups and primary-action placement.
9. Continuation to the next location, compartment or kit.
10. Review summary, evidence representation and submission confirmation.
11. Submitted detail layout, metadata and workflow actions.
12. Responsive behavior, dark mode, keyboard and focus management.

An intentional difference receives a finding only when its presentation creates unnecessary relearning or uncertainty.

## 9. Consolidated evidence output

Store generated evidence outside source-controlled application code:

```text
.qa/<RUN_ID>/inspection-cross-type-uat/
  run-manifest.json
  checkpoint-ledger.json
  mutation-cleanup-ledger.json
  console-network-summary.json
  screenshots/
    mobile/<type>/<checkpoint>-viewport.png
    mobile/<type>/<checkpoint>-full.png
    desktop/<type>/<checkpoint>-viewport.png
    desktop/<type>/<checkpoint>-full.png
    dark/<type>/<checkpoint>.png
  contact-sheets/
    by-step/<checkpoint>.png
    by-type/<type>.png
    mobile-vs-desktop/<type>.png
  INSPECTION_CROSS_TYPE_UIUX_VERDICT.md
```

Contact sheets must preserve readable resolution and label every cell with type, checkpoint, viewport, build ID and evidence filename. The original screenshots remain the source of truth.

## 10. Verdict format

The final UI/UX report will:

1. Start with verified strengths.
2. State coverage: types, checkpoints, viewports, live/local status and blocked items.
3. Provide a cross-type scorecard.
4. Rank findings as **Blocker**, **High**, **Medium** or **Low**.
5. For each finding include:
   - affected user and journey step;
   - inspection types affected;
   - observed evidence and screenshot IDs;
   - why it matters in user terms;
   - whether it is verified live or inferred from controlled fixtures;
   - smallest concrete remediation;
   - likely shared component or token owner.
6. Separate consistency findings from functional defects.
7. End with one of these verdicts:
   - consistent enough; no remediation stage required;
   - consistent with targeted fixes required;
   - inconsistent enough to justify a focused shared-component remediation stage;
   - blocked/inconclusive due to missing data, access or unsafe mutation requirements.

## 11. Shared-component reconciliation targets

The audit should test evidence before proposing consolidation around:

- mobile/page Back navigation;
- inspection setup selector and collapsed context summary;
- location/zone/sub-location pickers;
- inspection section shells and progress summaries;
- equipment/item cards and row drawers;
- status segmented controls;
- remarks/issue expansion;
- evidence upload and preview;
- validation feedback and focus routing;
- form action groups and continuation panels;
- review summaries and read-only detail sections.

Do not merge components solely because screenshots look similar. Recommend sharing only when semantics, state contract, accessibility behavior and responsive interaction also match.

## 12. Execution gates

### Gate 1 - Inventory ready

- All eight registry types appear in the matrix.
- Required UAT data and permissions are available.
- Build ID and target URLs are recorded.
- No credentials are present in planned artifacts.

### Gate 2 - Harness safe

- Serial execution and unique run marker are enforced.
- Mutation guard and exact live origins are enforced.
- Screenshot names are deterministic and unique.
- Cleanup ledger is initialized before any autosave or submission.

### Gate 3 - Evidence complete

- Every applicable checkpoint has mobile and desktop evidence.
- Every omission has a written reason.
- Console, page and failed-response diagnostics are reconciled.
- Contact sheets have been generated from the original screenshots.

### Gate 4 - Verdict defensible

- Findings cite evidence rather than preference.
- Intentional domain differences are separated from accidental inconsistency.
- Recommended shared components have matching behavior, not merely matching appearance.
- Blockers and policy-blocked states are explicit.

### Gate 5 - Repository unaffected

- Audit code and plan changes are scoped and reviewable.
- No application implementation is changed during the audit.
- Existing unrelated working-tree changes remain untouched.
- Any live artifacts are cleaned or explicitly retained as marked UAT data.

## 13. Completion criteria

This task is complete only when:

- all eight inspection types have been traversed from the Conduct Inspection entry point;
- every applicable journey checkpoint has traceable screenshot evidence;
- mobile/desktop and cross-type contact sheets exist;
- responsive, dark-mode, keyboard, focus and recovery samples are recorded;
- the mutation cleanup ledger is reconciled;
- the consolidated UI/UX verdict identifies strengths, inconsistencies and reusable-component opportunities;
- no remediation claim is made without a screenshot or reproducible interaction supporting it.
