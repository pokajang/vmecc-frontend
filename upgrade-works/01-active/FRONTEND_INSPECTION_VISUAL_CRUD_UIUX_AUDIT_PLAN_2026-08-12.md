# Frontend Inspection Visual CRUD UI/UX Audit Plan

**Date:** 2026-08-12  
**Status:** Ready for execution  
**Scope:** `src/views/inspection/` and inspection-owned routes, overlays, fixtures, and styles  
**Method:** Visual-first Playwright UAT using the `uiux-journey-tester` perspective

## 1. Purpose

Audit the complete Inspection module as users actually see and operate it. The audit will decide:

- which current visual arrangement best supports the user's task;
- which screens can be simplified without removing useful context;
- which labels, borders, cards, accordions, badges, controls, and repeated text create uncertainty;
- whether equivalent states across inspection types look and behave consistently;
- what users are likely to ask or misunderstand at each step;
- whether users can complete and recover the full create, read, update, delete, and workflow lifecycle;
- which visual patterns should become the preferred inspection-wide system in a later remediation stage.

This is not primarily a source-code reuse or component-refactoring audit. Source and tests may be inspected to understand reachable states, but findings must be supported by rendered evidence and described in user terms.

## 2. Starting sample and governing principles

The HSE detail issue is the reference case:

- one observation is split between an observation accordion and a separate follow-up/evidence accordion;
- the image is placed inside nested bordered and tinted containers;
- `HSE evidence` repeats context already supplied by the section;
- a photo caption may repeat `Unsafe Condition`, producing another redundant label;
- users must combine content from two disclosures to understand one event.

The audit will apply these principles throughout Inspection:

1. One conceptual entity should normally use one disclosure.
2. Use one meaningful visual boundary per hierarchy level.
3. Keep the finding, description, corrective action, and evidence visibly associated.
4. Show a label once, adjacent to the content it identifies.
5. Show photo captions only when they add meaningful user-entered context.
6. Never use a device filename as visible presentation content.
7. Display images directly in their semantic section unless selection or editing requires a frame.
8. Make status understandable without requiring users to open every card.
9. Present one unmistakable primary action at each step.
10. Use progressive disclosure for secondary metadata, administration, and uncommon actions.
11. Do not make a whole card, a caret, and a kebab appear to compete for the same interaction.
12. Every screen must answer: **Where am I? What can I do now? What happens next?**

## 3. Boundaries

### 3.1 In scope

- `/inspection`
- `/inspection/new`
- `/inspection/new/:newSection`
- `/inspection/review`
- `/inspection/:reportId`
- `/inspection/:reportId/edit`
- `/inspection/all-extinguishers`
- `/inspection/all-extinguishers/new`
- `/inspection/all-extinguishers/:extinguisherId`
- inspection aliases under `/report/inspection*`
- `/inspection/ux-matrix` as a controlled fixture surface only
- inspection-owned drawers, side panels, modals, menus, confirmation dialogs, photo viewers, sticky actions, and feedback
- inspection-owned catalogue/type/location/equipment management reached from the above journeys
- the complete fire-extinguisher asset and managed-issue lifecycle

### 3.2 Inspection types

1. Emergency Response Auxiliary Equipment
2. Fire Extinguisher
3. Fire Truck Daily Readiness
4. High Angle Rescue Equipment
5. Hydraulic Rescue Tools
6. SCBA
7. Health Safety Environment
8. General Inspection

No type may be omitted because it is below **Show more**, has fewer live records, or follows a different submission path.

### 3.3 Out of scope

- report modules outside `src/views/inspection/`;
- generic application redesign not needed by Inspection;
- implementation or refactoring during baseline capture;
- changing backend rules, permissions, catalogues, workflow configuration, or `.env` to make a test pass;
- treating visual similarity alone as proof that two implementations should be merged.

## 4. User roles and questions

### 4.1 Personas

| Persona | Primary job |
| --- | --- |
| Frontline inspector | Start, conduct, save, resume, submit, and correct an inspection, usually on mobile |
| Returning/interrupted inspector | Recover a draft or queued report and understand what was preserved |
| Reviewer | Find submitted reports, understand findings/evidence, review or reject |
| Approver | Confirm reviewed content and approve or reject with confidence |
| Inspection administrator | Manage reports, types, catalogues, locations, equipment, and eligible deletions |
| Extinguisher issue manager | Assign, work, resolve, reopen, or cancel managed issues |
| Independent verifier | Verify corrective work without verifying their own resolution |
| Read-only user | Browse permitted records without being offered misleading actions |

### 4.2 Questions recorded at every checkpoint

- Where am I?
- What am I inspecting or reviewing?
- What has been completed?
- What still needs attention?
- Is this status about the equipment, the finding, the workflow, or missing form data?
- Does this photo belong to this issue?
- Was my work saved?
- Can I safely leave and return?
- What will the primary action do?
- What should I do after this action succeeds or fails?

Each finding must cite at least one unanswered or misleading user question.

## 5. Evidence environments and safety

### 5.1 Controlled environment

Use the controlled local/UAT environment for the complete mutable lifecycle:

- create, update, submit, delete, review, approve, and reject;
- draft persistence and recovery;
- offline queue, reconnect, retry, and conflict resolution;
- media errors and upload persistence;
- permission and API error injection;
- catalogue CRUD;
- deterministic before/after evidence.

All mutations must use run-marked fixtures and an initialized cleanup ledger.

### 5.2 Live deployment

Keep the existing production-safe mutation guard. Live Playwright may verify:

- authentication and role visibility;
- home, chooser, setup, list, detail, filters, disclosures, overlays, and navigation;
- existing submitted records;
- responsive layout, accessibility, overflow, and production diagnostics.

Do not weaken the current guard to prove production mutations. Real create, update, delete, submit, workflow transitions, catalogue mutation, upload persistence, offline sync, and conflict resolution must be reported as **controlled-only** unless separately authorized.

### 5.3 Evidence integrity

- Record commit SHA, build ID, environment, browser, timestamp, persona, permissions, route, fixture, viewport, and theme.
- Use unique run-owned markers and never alter records belonging to another user.
- Capture the current baseline before any visual remediation.
- Treat older screenshots as historical references, not current proof.
- Record console errors, page errors, failed requests, overflow, focus loss, and cleanup results beside each checkpoint.

## 6. Deterministic fixture matrix

Prepare stable fixtures for:

- no records and no draft;
- one submitted record;
- 25 or more mixed records and statuses;
- empty, partial, missing-required, complete, and complete-with-next-scope forms;
- local draft, server draft, syncing, synced, failed, and conflicted draft;
- queued, retrying, failed, and conflicted offline submissions;
- Submitted, Reviewed, Approved, Rejected, returned-for-update, and locked records;
- editable owner record, foreign record, and administrator-editable record;
- stale/concurrent edit;
- removed catalogue item retained inside a historical report.

Content must cover:

- zero, one, and many findings;
- all-good, mixed, issue, not-checked, and N/A conditions;
- very long equipment, location, type, status, and user names;
- multiline descriptions, corrective actions, remarks, and workflow comments;
- special characters and text resembling translated expansion;
- no photo, portrait photo, landscape photo, and multiple photos;
- empty, meaningful, redundant type-only, and device-filename photo descriptions;
- slow, broken, expired, failed, and retrying images/uploads;
- empty catalogue, large catalogue, no search result, and one exact result;
- HSE unsafe act only, unsafe condition only, and both selected with shared action/evidence.

## 7. Viewport and presentation matrix

### 7.1 Mandatory matrix for all eight types

| Profile | Dimensions | Theme |
| --- | --- | --- |
| Primary mobile | 390 × 844 | Light |
| Desktop | 1366 × 768 | Light |

### 7.2 Stress matrix

Apply to HSE, Fire Extinguisher, Fire Truck, SCBA, and every surface that produces a finding:

- 320 × 700 narrow mobile;
- 430 × 932 large mobile;
- 768 × 1024 tablet portrait;
- 1024 × 768 narrow desktop;
- 1440 × 960 large desktop;
- dark mode where officially supported;
- reduced motion;
- representative 200% browser zoom/text scaling;
- keyboard-only navigation and visible focus.

Do not multiply every fixture across every viewport. Use the mandatory pair for all types, then target the stress matrix at visually complex or failing states.

## 8. Agent workstreams

### Workstream A — Lifecycle and persona journey

Trace entry, create, conduct, draft, resume, review, submit, detail, edit, workflow, download, delete, and recovery. Verify role-dependent actions and next-step clarity.

### Workstream B — Cross-type visual comparison

Capture equivalent states for all eight inspection types and compare hierarchy, density, status, cards, disclosures, navigation, actions, validation, and feedback side by side.

### Workstream C — Media, overlay, and evidence hierarchy

Audit image presentation, captions, upload states, nested visual containers, accordions, drawers, modals, side panels, menus, focus return, and background-scroll behavior.

### Workstream D — Consolidated user verdict

Reconcile the three evidence sets, distinguish intentional domain differences from accidental inconsistency, propose the simplest preferred visual arrangement, and prioritize remediation without changing application code.

## 9. Execution stages

### Stage 0 — Freeze and inventory the baseline

1. Confirm deployed/local commit and build ID.
2. Enumerate all routes, types, permissions, overlays, and lifecycle actions.
3. Validate fixtures and required personas without exposing credentials.
4. Initialize screenshot, diagnostics, mutation, and cleanup manifests.
5. Confirm the working tree before capture.
6. Do not change application implementation after the first baseline screenshot.

**Gate:** Every route, type, persona, fixture, and planned checkpoint has an owner or an explicit blocked reason.

### Stage 1 — Entry, discovery, and records

Capture and assess:

- first-use empty home;
- collapsed and expanded type chooser;
- recent records and **Mine/All**;
- saved draft and queued-sync indicators;
- desktop record table and mobile record cards;
- sparse, dense, loading, error, empty, and no-result states;
- search, filters, pagination, scope changes, and clear-filter recovery;
- row/card action menus under each relevant role;
- conduct permission absent and direct unauthorized access.

Decide whether starting, resuming, viewing, and administering are visually distinct and correctly prioritized.

### Stage 2 — Create and setup

For every type, capture:

1. type selected;
2. setup empty;
3. selector/drawer opened;
4. setup partially complete;
5. setup complete;
6. returning to change an earlier choice;
7. unavailable, empty, duplicate, and long-option states;
8. custom type/location/equipment management where reachable;
9. scanner/manual mode and scanner recovery where applicable.

Assess whether setup reads as one progressive journey rather than unrelated cards, buttons, and overlays.

### Stage 3 — Conduct each inspection type

Use this shared checkpoint sequence, recording non-applicable states with reasons:

| ID | Checkpoint |
| --- | --- |
| `01-entry` | Selected type, header, Back action, current context |
| `02-pristine` | First unstarted scope and item |
| `03-item-open-clean` | Expanded clean item |
| `04-clean-set` | Successful good/pass selection |
| `05-issue-open` | Issue/defect/finding expanded |
| `06-issue-evidence` | Remarks/action plus one photo |
| `07-many-long` | Many rows, long labels, long content, multiple photos |
| `08-partial` | Mixed completed and incomplete state |
| `09-validation` | Missing-required attempt and focus transfer |
| `10-scope-complete` | Completed current scope |
| `11-continuation` | Next location, compartment, kit, group, or section |
| `12-sticky-actions` | Bottom/sticky actions at final content |
| `13-save-resume` | Draft save, exit, and resume |
| `14-review-or-direct` | Review or HSE direct-submit confirmation |
| `15-back-to-edit` | Return with data and context preserved |
| `16-submitted` | Success feedback and next meaningful action |

Cross-type questions:

- Does one item card represent one inspectable entity?
- Is the entire card actionable, and if so, are caret and kebab controls redundant or misleading?
- Can users identify the current status without expanding the item?
- Are issue terms such as Finding, Defect, Issue, Not Good, and Not checked predictable?
- Are progress and incompleteness expressed as form state rather than missing physical equipment?
- Are primary mobile actions full width, with secondary actions stacked beneath?
- Are borders, fills, accordions, and cards creating hierarchy or merely visual layers?

### Stage 4 — Type-specific conduct coverage

#### Emergency Response Auxiliary Equipment

- Location and equipment selection/search.
- Quantity and condition controls.
- OK, Defect, and N/A states.
- Defect evidence versus optional information.
- Custom equipment add/edit/delete and protected entries.
- Next-location continuation.

#### Fire Extinguisher

- Zone, main area, and sub-location progression.
- List, scanner, manual fallback, permission denied, and locator-not-found states.
- Incomplete rescan and another-inspector reset confirmation.
- Unit checklist, defect evidence, asset editing warning, and next location.

#### Fire Truck Daily Readiness

- Truck, shift, compartment, daily, reading, and scheduled/one-off distinctions.
- Search, empty compartment, custom item, dirty drawer cancellation, and continuation.

#### High Angle Rescue Equipment

- Kit, compartment, subgroup, standard/custom equipment, issue evidence, optional information, catalogue management, and continuation.

#### Hydraulic Rescue Tools

- Location, multiple status fields, mark-all/card OK, Defect/N/A validation, retained evidence, catalogue management, and continuation.

#### SCBA

- Location, back plate, cylinder, face mask, custom sections/items, group navigation, mark-group-good, archive/restore/delete, search, collapse/expand, and continuation.

#### General Inspection

- Location hierarchy, zero/one/many findings, add/edit/delete finding, category, description, evidence, report-level evidence, review, and detail.

#### Health Safety Environment

- Unsafe act, unsafe condition, and both-selection states.
- Description, required observation photo, and optional immediate action.
- Direct submit and submitted detail.
- Explicitly compare the current split disclosure with a proposed single observation disclosure containing description, action, photos, and one meaningful caption.

### Stage 5 — Media and evidence audit

For each distinct evidence surface, test:

- no photo, one photo, many photos;
- portrait and landscape images;
- loading, broken, expired, and failed-upload images;
- camera denied/unsupported/cancelled;
- file picker cancelled, invalid type, oversized image, and partial upload failure;
- empty caption, meaningful caption, redundant caption, and device filename;
- removal, replacement, viewer open/close, and focus return.

Record separately:

- section/disclosure title;
- evidence heading;
- image container layers;
- visible caption;
- accessible image name;
- count summary;
- edit/remove/view actions.

**Acceptance:** The evidence relationship is understandable, the image is not buried inside decorative card-on-card layers, text is not duplicated, and accessible naming remains intact when visible duplication is removed.

### Stage 6 — Review and submission

Audit both existing review models:

- single-type review section;
- multi-type review dashboard;
- review detail drawer;
- issue-free, mixed, and issue-heavy reports;
- missing required data and blockers;
- Save draft, retry sync, confirm submit/update, queued warning;
- busy, success, server failure, and recovery states.

Determine whether the number of pending types causes unnecessary changes in hierarchy or interaction and define one preferred visual model with justified variations.

### Stage 7 — Read/detail, edit, workflow, and delete

For every inspection type, capture:

- submitted detail with disclosures closed;
- one finding expanded and multiple findings expanded;
- all-good and issue-heavy reports;
- no/one/many/broken evidence images;
- long metadata, context, findings, actions, and history;
- mobile detail drawer and desktop detail view;
- return to records with search/filter/scroll context preserved;
- eligible prefilled edit and rejected correction;
- unsaved edit navigation and update review;
- stale conflict and locked/foreign/approved records;
- review, approve, reject, and request-update dialogs;
- required remarks, busy, success, and failure states;
- download available/unavailable/in-progress/failure;
- draft/report delete confirm, cancel, failure, and post-delete state.

Explicit decision question: should full report metadata precede findings on mobile, or should secondary metadata be collapsed so users reach the inspection result sooner?

### Stage 8 — Fire-extinguisher asset and issue lifecycle

Capture the inspection-owned sub-system separately:

- empty/dense catalogue, filters, search, no results, pagination, export;
- mobile cards versus desktop table;
- create one and batch create;
- staged rows, duplicates, validation, dirty close, success/add-more/done;
- asset overview, loading/error, latest inspection, no/long history;
- historical issue and photo detail;
- edit, out of service, return to service, retire, and restore;
- issue assign/reassign/unassign, start, severity/due date, resolve with evidence, independently verify, close, reopen, and cancel;
- retired/restored restrictions, self-verification prevention, stale issue version, and failed assignee loading;
- transition consistency among page, side panel, modal, and bottom drawer.

### Stage 9 — Resilience, access, and accessibility

Sample primary journeys against:

- slow response, timeout, 401, 403, 404, 409, 422, and 500;
- offline before entry, connectivity loss midway, queue, reconnect, retry, and conflict;
- two-tab concurrent editing;
- catalogue refresh while selected rows remain visible;
- double-click and double-submit prevention;
- keyboard order, visible focus, disclosure state, focus trapping and focus restoration;
- screen-reader names and status announced without color reliance;
- reduced motion and 200% zoom;
- touch targets below 44 px;
- horizontal overflow, fixed-footer overlap, clipped overlays, and background-scroll leaks.

### Stage 10 — Comparison boards and verdict

Generate side-by-side boards for:

- entry and setup selectors;
- pristine, clean, issue, and completed item cards;
- status and progress language;
- evidence and photo presentation;
- scope navigation and continuation;
- validation and feedback;
- primary, secondary, destructive, and overflow actions;
- review models;
- detail disclosures;
- confirmation dialogs;
- empty, loading, error, offline, and conflict states;
- equivalent mobile and desktop states.

For each surface, select one of:

- retain current visual;
- adopt an existing better inspection visual;
- simplify the current visual;
- create a new preferred inspection pattern;
- retain an intentional type-specific exception.

The choice must state what the user gains and cite screenshot evidence.

## 10. Visual scoring rubric

Score each applicable checkpoint from 0 to 2:

- `2` — clear, consistent, efficient, and accessible;
- `1` — usable but contains a justified variation or minor friction;
- `0` — confusing, inaccessible, broken, or materially inconsistent.

Dimensions:

1. Orientation and current context.
2. Information hierarchy and density.
3. Primary-action clarity.
4. Status and progress comprehension.
5. Item-card and disclosure behavior.
6. Finding/action/evidence association.
7. Image, caption, and media controls.
8. Validation and error recovery.
9. Draft, queue, and save confidence.
10. Review/detail/workflow continuity.
11. Mobile reachability and responsive layout.
12. Keyboard, focus, contrast, and non-color communication.

Intentional domain differences are not penalized unless they create unnecessary relearning or uncertainty.

## 11. Finding format

Rank findings as **Blocker**, **High**, **Medium**, or **Low**. Each finding must contain:

- affected persona and journey step;
- inspection types and routes;
- screenshot/checkpoint IDs;
- verified behavior versus inference;
- the user's likely question;
- why the issue matters to task completion or confidence;
- current visual hierarchy;
- preferred simplified hierarchy;
- smallest viable remediation;
- whether the remedy is inspection-wide or type-specific;
- acceptance and regression checkpoints.

Begin the verdict with verified strengths. Separate functional defects from visual friction.

## 12. Evidence structure

```text
.qa/<RUN_ID>/inspection-visual-crud-audit/
  run-manifest.json
  route-lifecycle-matrix.json
  checkpoint-ledger.json
  diagnostics.json
  mutation-cleanup-ledger.json
  screenshots/
    controlled/<persona>/<viewport>/<theme>/<type>/
    live-readonly/<persona>/<viewport>/<theme>/<type>/
  contact-sheets/
    by-type/
    by-lifecycle/
    cross-type/
    mobile-vs-desktop/
  INSPECTION_VISUAL_UIUX_VERDICT.md
  INSPECTION_VISUAL_REMEDIATION_BACKLOG.md
```

Suggested filename:

```text
<sequence>--<route>--<state>--<persona>--<viewport>--<theme>.png
```

Every manifest entry must include environment, commit, build, fixture, permissions, expected outcome, actual outcome, user question, verdict, severity, diagnostics, and cleanup status.

## 13. Known high-risk areas to verify, not assume

- HSE observation and follow-up/evidence split across sibling accordions.
- Nested `DetailEvidenceBlock` and photo-preview containers.
- Multiple evidence cards within ER Aux and Fire Truck items.
- Per-field plus general evidence layers in Hydraulic and SCBA.
- Generic evidence headings and captions repeating type/status text.
- Multiple photo presentation models across form, review, detail, and viewer.
- metadata preceding the main findings throughout long mobile details.
- different review presentations for one versus multiple pending inspection types.
- full mobile offcanvas details versus page-based editing.
- Fire Extinguisher catalogue mixing page, side panel, modal, and bottom drawer patterns.
- inconsistent status/badge/chip vocabulary.
- visible malformed characters such as `Â·` and `â€¦` in detail summaries.

These are investigation targets, not accepted findings until reproduced in the rendered application.

## 14. Mishap prevention

- Baseline capture and remediation must be separate stages and commits.
- Do not update golden screenshots automatically.
- Do not infer that an unreachable fixture state is live behavior.
- Do not submit, approve, reject, delete, or edit non-run-owned records.
- Do not expose credentials in screenshots, logs, reports, or Git.
- Preserve original screenshots even when contact sheets are generated.
- Mark every omission `not-supported`, `permission-blocked`, `data-blocked`, or `controlled-only`.
- Keep source changes out of the visual audit unless they only add isolated, guarded test fixtures or evidence tooling.
- Stop and reconcile any mutation or cleanup mismatch before continuing.

## 15. Deliverables

1. Inspection route and CRUD coverage matrix.
2. Persona and permission matrix.
3. Deterministic fixture manifest.
4. Timestamped screenshot and diagnostics library.
5. Per-type contact sheets.
6. Cross-type lifecycle comparison boards.
7. Live-versus-controlled verification ledger.
8. Ranked visual findings with user questions.
9. Current-versus-preferred visual hierarchy proposals.
10. Shared inspection visual-pattern candidate matrix.
11. Prioritized remediation waves.
12. Cleanup report.
13. Regression screenshot manifest for later fixes.

## 16. Completion gates

### Gate 1 — Inventory complete

- All eight types, inspection routes, roles, and CRUD/workflow states are mapped.
- Required fixtures and permissions are available or explicitly blocked.

### Gate 2 — Safe harness ready

- Mutation guard, unique run marker, serial execution, diagnostic capture, and cleanup ledger are active.
- Credentials and production records are protected.

### Gate 3 — Baseline complete

- Every type has mandatory mobile and desktop evidence for each applicable lifecycle phase.
- Every omission has a written status and reason.
- Fresh images, full-page views, and focused overlay states are traceable through the manifest.

### Gate 4 — Full lifecycle reconciled

- Create, read, update, delete, workflow, draft, recovery, and catalogue evidence exists in the controlled environment.
- Live read-only behavior is reconciled after deployment without weakening mutation protection.

### Gate 5 — Verdict defensible

- Every finding cites current rendered evidence and a real user question.
- Intentional differences are separated from accidental inconsistency.
- Each preferred visual has a concrete user benefit and regression checkpoint.

### Gate 6 — Audit cleanly closed

- Mutation cleanup is reconciled.
- No unintended application changes or credentials exist in Git.
- The audit verdict and remediation backlog are written before implementation begins.

## 17. Execution order

1. Freeze baseline and prepare fixtures/manifests.
2. Capture entry, discovery, and records states.
3. Capture setup and conduct journeys for all eight types.
4. Run the dedicated media/evidence pass.
5. Capture review and submission variants.
6. Capture detail, edit, workflow, delete, and recovery.
7. Audit the Fire Extinguisher catalogue and issue lifecycle.
8. Run responsive, accessibility, permission, and failure-state sweeps.
9. Build contact sheets and reconcile controlled versus live evidence.
10. Write the visuals-first verdict and prioritized remediation backlog.
11. Review and approve the remediation direction before changing production UI.

