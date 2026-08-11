# Frontend Live UAT Day 4 Deep-Record Plan

**Date:** 2026-08-11  
**Status:** Executed; see `FRONTEND_LIVE_UAT_DAY_4_DEEP_RECORD_EXECUTION_2026-08-11.md`  
**Stage:** Day 4 — Inspection and report deep-record UAT  
**Environment:** Deployed frontend at `https://vmecc.amiosh.com`  
**Expected build:** `54acd0e2d079-20260810102950`  
**Change boundary:** Audit harness, local evidence, and documentation only; no application-source correction in this batch

## 1. Objective

Audit representative Inspection, ERCO, Fitness Test, and Drill journeys deeply enough to:

1. confirm whether the reported mobile Inspection Details border, nested image-card presentation, and visible device filename are present in the deployed build;
2. verify that detail and review surfaces remain usable at narrow and wide viewports;
3. compare equivalent concepts across the four module families using real rendered behavior rather than source resemblance alone;
4. identify the smallest evidence-backed shared-component candidates without changing workflow behavior, permissions, data contracts, or production records; and
5. issue a clear `GO`, `CONDITIONAL GO`, or `HOLD` decision for Day 5's repository-wide image and filename audit.

This is a deep representative audit, not another full route sweep and not an implementation stage.

## 2. Entry conditions

Execution may start only when all of the following remain true:

- the public `version.json` identifies build `54acd0e2d079-20260810102950`;
- the post-deployment gate remains accepted at 6/6 persona/viewport journeys and 24/24 route/session entries;
- the local ignored credential record resolves Tactical Response Team and Incident Commander accounts without printing secret values;
- the live-UAT mutation guard, request pacing, credential-redaction, and artifact-location contracts pass;
- no unrelated production incident or deployment is in progress; and
- the working-tree boundary is recorded before new Day 4 files are created.

If the build ID changes, stop. Reconcile the deployed commit and repeat the post-deployment identity gate before attributing Day 4 evidence.

## 3. Scope

### 3.1 Inspection coverage

Use existing read-only records, where available, for all eight registered inspection types:

1. General Inspection;
2. HSE Inspection;
3. Fire Extinguisher Inspection;
4. Hydraulic Rescue Equipment Inspection;
5. High Angle Rescue Equipment Inspection;
6. ER Auxiliary Equipment Inspection;
7. SCBA Inspection; and
8. Fire Truck Daily Readiness Inspection.

Inspect the following applicable surfaces:

- Inspection record list and safe filters;
- submitted record detail;
- reviewer-facing detail or review presentation;
- read-only evidence/photo presentation;
- metadata, status, context, findings/checks, remarks, next action, reviewer feedback, and history;
- All Extinguishers list;
- an existing extinguisher detail/history record, if available; and
- the edit/new shell only in a controlled environment or after proving that merely opening it cannot issue a mutation.

### 3.2 Report coverage

Cover each of these report families:

- ERCO;
- Fitness Test; and
- Drill.

For each family, inspect:

- list/home orientation and safe filters;
- a submitted detail record;
- review/read-only presentation where the role exposes it;
- metadata and workflow status;
- domain content, remarks, reviewer feedback, and history;
- evidence/photo presentation where supported; and
- new-form shell only under the same controlled-only rule used for Inspection.

### 3.3 Reported UI/UX defects

The audit must explicitly reproduce and trace:

1. the unexplained left border on mobile Inspection Details;
2. the extra visible container/card around each uploaded image; and
3. device-generated filenames displayed beneath or alongside uploaded images.

### 3.4 Out of scope

- creating, editing, submitting, reviewing, approving, rejecting, deleting, acknowledging, or otherwise mutating live data;
- seeding additional production records during Day 4;
- changing backend payloads or stored filenames;
- removing useful filenames from PDFs or other non-image documents;
- general visual redesign, token overhaul, dependency upgrade, or component extraction;
- treating a missing production state as a passing state; and
- claiming all eight inspection types passed from one generic Inspection record.

## 4. Personas and user journeys

### 4.1 Tactical Response Team

Primary job: find a submitted operational record, understand what was recorded, inspect its evidence, and identify what happens next.

Journey:

1. authenticate and confirm role identity;
2. enter the module through normal navigation;
3. locate an existing record through safe search/filter controls;
4. open its detail surface;
5. scan identity, timestamp, submitter, status, context, findings, evidence, remarks, and next action;
6. open and dismiss any read-only image viewer;
7. return to the record list without losing context; and
8. repeat a session-focus check after the deep record has loaded.

### 4.2 Incident Commander

Primary job: inspect submitted work, understand its completeness and status, and locate review information without accidentally changing the record.

Journey:

1. authenticate and confirm role identity;
2. open the review/list surface;
3. use only safe filters and sorting;
4. open the same representative detail where permissions allow;
5. verify reviewer-oriented status, next action, feedback, and history;
6. verify that mutating actions are not activated by the test;
7. close or navigate back with focus and context preserved; and
8. confirm the authenticated shell remains stable.

## 5. Viewport and state matrix

### 5.1 Required viewports

| Viewport   | Coverage                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- |
| `360x800`  | Reported mobile defect, narrow wrapping, close/back controls, image sizing, and horizontal overflow |
| `390x844`  | Complete representative mobile journey for every available module/type record                       |
| `768x1024` | Detail-surface breakpoint ownership, drawer/panel transition, and content density                   |
| `1440x900` | Desktop divider intent, metadata layout, media width, actions, and behavior-parity reference        |

Every representative module must pass at `390x844` and `1440x900`. The `360x800` and `768x1024` probes target each distinct detail/media implementation, not merely the first route encountered.

### 5.2 Required data states

Seek and record these independently:

- a populated submitted record;
- a sparse record;
- long identifiers, remarks, descriptions, or labels;
- one image;
- multiple images;
- a missing or failed image, if naturally available or reproducible without live mutation;
- no-image state; and
- permission-blocked or data-blocked outcomes.

Unavailable states must be labelled `data-blocked`, `permission-blocked`, or `controlled-only`. They are not failures unless the route contract says representative data must exist, and they are never converted to passes by inference.

## 6. Safety and mishap controls

### 6.1 Production request boundary

- Permit only `GET`, `HEAD`, `OPTIONS`, and the already-approved login `POST`.
- Abort the test immediately on any unapproved `POST`, `PUT`, `PATCH`, or `DELETE`.
- Retain the 750 ms minimum production API pacing interval.
- Do not click Save, Submit, Approve, Reject, Delete, Remove, Upload, Acknowledge, Mark as read, or equivalent actions.
- Do not open a form route when source/runtime evidence indicates route entry can autosave, lease media, or initialize a server draft.
- Treat image viewing and downloads as safe only after request-method observation proves they are read-only.

### 6.2 Evidence protection

- Store raw evidence under the ignored `.qa/live-uat/` root.
- Disable Playwright trace and video for the live suite.
- Capture the smallest useful screenshot region; avoid unrelated personal or operational data.
- Never print credentials, authorization headers, cookies, tokens, or complete sensitive response bodies.
- Use generated evidence labels and record aliases rather than device filenames in artifact names.
- Scan all text evidence and planned tracked files for exact credential-value matches before completing the run.

### 6.3 Functional-preservation boundary

- Day 4 must not edit application source.
- A confirmed UI defect is documented with owner selector/component, computed evidence, affected consumers, severity, and proposed correction boundary.
- If a Blocker or High issue prevents safe task completion, stop the affected batch and issue a corrective plan before continuing dependent journeys.
- If the harness causes the failure, repair only the harness, rerun the smallest affected batch, and retain both the rejected and accepted run IDs in the execution record.
- Do not weaken assertions, hide errors, or update visual expectations merely to obtain a pass.

## 7. Execution tasks

### Task 4.0 — Freeze identity and baseline

1. Record UTC/local timestamp, deployed build ID, frontend commit association, browser version, and working-tree status.
2. Run live-UAT credential and safety preflight without revealing values.
3. Verify the target roles can authenticate and that their visible role matches the expected persona.
4. Create a Day 4 run ID and ignored evidence directory.

**Output:** reproducible audit header and accepted preflight result.

### Task 4.1 — Resolve representative records

1. Query only existing safe report/list endpoints through the browser session.
2. Classify records by module/type, status, media count, text length, and intended persona.
3. Prefer submitted records containing evidence and descriptions.
4. Resolve at least one record per report family and one per available inspection type.
5. Record exact gaps without creating substitute production data.
6. Keep record identifiers in ignored evidence; tracked documentation uses aliases unless an identifier is already public and non-sensitive.

**Output:** sanitized fixture matrix with `resolved`, `data-blocked`, `permission-blocked`, or `controlled-only` status.

### Task 4.2 — Reproduce and trace the mobile border

1. Open a submitted General or HSE Inspection detail at `360x800` and `390x844`.
2. Measure document overflow and the detail surface's left/right position against the viewport.
3. Walk the ancestor chain from visible content to dialog, drawer, offcanvas, or page root.
4. Capture computed `border-left-width/style/color`, outline, box-shadow, background, padding, and bounding rectangle for each likely owner.
5. Distinguish the intended desktop divider from the mobile artifact by repeating at `768x1024` and `1440x900`.
6. Verify close/back visibility, keyboard focus, Escape dismissal, and focus return.

**Pass condition:** no unintended mobile border and no horizontal overflow. Otherwise record the exact owning selector/component and breakpoint as a defect.

### Task 4.3 — Audit image presentation and filename noise

For each distinct evidence implementation encountered:

1. identify the image, its nearest semantic wrapper, and each visible ancestor surface;
2. count visible borders, backgrounds, shadows, radii, and padding layers around the image;
3. confirm the image stays within its content column and preserves its aspect ratio;
4. distinguish user-authored description/caption from stored or device-generated filename;
5. inspect accessible name/alternative text and confirm it does not use the filename;
6. open and close any viewer using pointer and keyboard;
7. verify missing/no-image handling does not expose broken layout or meaningless filename text; and
8. compare one-photo and multi-photo layouts where data exists.

**Pass condition:** an individual image has a visually neutral layout wrapper, meaningful contextual text, no displayed device filename, and usable preview behavior.

### Task 4.4 — Complete Inspection type matrix

For each of the eight inspection types:

1. verify route and type identity;
2. confirm the user can answer “Where am I?”, “What was found?”, and “What happens next?”;
3. inspect metadata, status, checks/findings, remarks, evidence, and reviewer information;
4. measure overflow and clipped content at required viewports;
5. verify long values wrap without hiding adjacent meaning;
6. verify status is communicated by text, not color alone;
7. record the rendered component/selector family for detail, metadata, evidence, and actions; and
8. mark missing state coverage explicitly.

Include All Extinguishers and one extinguisher detail/history record as separate rows because their user job and data contract differ from submitted inspection reports.

### Task 4.5 — Complete ERCO, Fitness Test, and Drill matrix

For each report family:

1. inspect list/home orientation and safe filtering;
2. open a submitted detail record;
3. inspect review state where permitted;
4. verify metadata, status, domain sections, evidence, feedback, history, and next action;
5. test close/back behavior, direct navigation, refresh, and focus return;
6. measure responsive overflow and image presentation at all applicable probes; and
7. document intentionally specialist concepts, including ERCO chronology, Fitness participant/results presentation, and Drill exercise/chronology content.

Do not force these specialist concepts into a common component solely because they use similar cards or headings.

### Task 4.6 — Accessibility and recovery probes

Across each distinct detail surface:

1. traverse headings and landmarks in logical order;
2. keyboard-reach close, back, safe tabs, and image-view controls;
3. confirm visible focus and meaningful accessible names;
4. verify dialog/drawer focus containment, Escape dismissal, and focus return;
5. refresh the dynamic route and confirm the same record/task context recovers;
6. background and refocus the page, then confirm session identity remains intact; and
7. collect console, page, request, response, and overflow diagnostics after late requests settle.

### Task 4.7 — Reconciliation and component scoring

Create a side-by-side matrix for these concepts:

- detail surface and mobile/desktop shell;
- record title, metadata, status, and next-action summary;
- section heading and content grouping;
- findings/check rows;
- evidence image/gallery/viewer;
- captions/descriptions and media fallback;
- reviewer feedback and history;
- close/back controls; and
- read-only action rows.

Score each candidate on:

1. same user job;
2. compatible data shape;
3. same actions and state transitions;
4. same responsive recomposition;
5. same accessibility behavior; and
6. differences expressible through a small explicit API.

Assign exactly one disposition:

- `reuse existing component`;
- `extract shared component later`;
- `align tokens/markup only`;
- `keep module-local`; or
- `reject abstraction`.

An extraction candidate needs at least two verified consumers with the same semantic contract. APIs requiring module-name switches, numerous booleans, or workflow-specific knowledge are rejected.

### Task 4.8 — Findings and Day 5 decision

For every finding, record:

- severity (`Blocker`, `High`, `Medium`, or `Low`);
- affected persona, route, viewport, and journey step;
- verified evidence and accepted run ID;
- why the issue matters to the user;
- likely owner component/selector;
- smallest proposed remediation boundary;
- regression surface and tests required; and
- whether the observation is verified, data-blocked, permission-blocked, or inferred.

Produce the Day 4 execution record and issue one decision:

- **GO:** no Blocker/High regression; all mandatory representative surfaces are evidenced or precisely blocked; Day 5 can perform the repo-wide media render-site audit.
- **CONDITIONAL GO:** bounded Medium/Low defects exist but do not prevent Day 5 discovery; corrective implementation remains deferred.
- **HOLD:** a Blocker/High functional, permission, data-safety, session, or accessibility defect requires a separate corrective checkpoint first.

## 8. Planned automation and artifacts

Expected tracked additions:

- `tests/e2e/live-uat/day4-deep-record.live.spec.js` — production-safe deep-record journeys;
- `tests/e2e/live-uat-day4-contract.spec.js` — schedule, mutation-boundary, and evidence-schema contracts;
- `tests/e2e/live-uat/day4-record-matrix.json` — sanitized route/type/state schedule without credentials;
- `upgrade-works/FRONTEND_LIVE_UAT_DAY_4_DEEP_RECORD_EXECUTION_2026-08-11.md` — final evidence, findings, reconciliation matrix, and verdict.

Expected ignored evidence:

- `.qa/live-uat/<run-id>/day4-ledger.json`;
- narrowly cropped screenshots for verified findings;
- computed-style and bounding-box diagnostics;
- sanitized console/network summaries; and
- rejected rerun evidence retained only long enough for attribution and then handled under the existing artifact policy.

No production component, stylesheet, API service, payload mapper, or build output is an expected Day 4 change.

## 9. Validation commands

The execution record must capture exact commands and results. At minimum:

1. format and lint the new harness and tracked data;
2. run the live-UAT safety contracts;
3. run the Day 3 route/schedule contracts to prevent regression of the established inventory;
4. run the new Day 4 contracts;
5. run the bounded Day 4 live projects with explicit production opt-in and expected build ID;
6. scan tracked files and text evidence for credential values;
7. confirm no trace or video artifact exists;
8. confirm no mutation-violation artifact exists;
9. run `git diff --check`; and
10. inspect `git status --short` and classify every changed file.

The full Vitest corpus and production build are not required for an audit-only harness/documentation batch. They become mandatory when a later corrective stage changes application source.

## 10. Acceptance criteria

Day 4 is complete only when:

- the build identity and safety preflight pass;
- both intended personas are exercised where permissions require them;
- Inspection, ERCO, Fitness Test, and Drill have representative mobile and desktop evidence or an explicit blocked reason;
- every available inspection type has its own matrix row;
- the mobile border has an evidence-backed pass or exact owner diagnosis;
- image wrappers, filename visibility, alternative text, sizing, and viewer behavior are recorded for every distinct implementation encountered;
- maximum horizontal overflow is recorded per tested surface;
- console, page, request, response, session, and mutation diagnostics are reconciled;
- shared-component candidates have semantic scoring and explicit dispositions;
- no application source or production record changed;
- no credential or sensitive live artifact enters Git; and
- the execution record gives a Day 5 `GO`, `CONDITIONAL GO`, or `HOLD` verdict.

## 11. Stop conditions

Stop the affected run immediately if:

- deployed build identity differs from the expected build;
- an unapproved mutation is attempted or observed;
- authentication becomes unstable or a role gains unexpected access;
- repeated 429 or 5xx responses make evidence unreliable;
- a screenshot or log captures sensitive data outside the ignored evidence boundary;
- the test would need production seeding to continue;
- route entry creates a draft, upload lease, acknowledgement, or other state change;
- a Blocker/High defect makes continued traversal unsafe; or
- harness behavior cannot be distinguished from application behavior.

## 12. Handoff to later stages

Day 4 produces evidence and decisions only.

- Day 5 will inventory every repository image render site and trace visible filename output separately from internal filename use.
- Confirmed UI corrections and shared-component migrations remain Day 6 work, implemented in small reversible slices with characterization tests first.
- Controlled upload, edit, submit, review, and cleanup journeys remain Day 7 work against disposable non-production records.
- No Day 4 finding authorizes a broad component rewrite or production data change.
