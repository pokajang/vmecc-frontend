# Frontend Live UAT Day 6 Media Component Implementation Plan

**Date:** 2026-08-11  
**Status:** Ready to execute  
**Source:** Accepted Day 5 media inventory and component map  
**Primary objective:** Implement the shared report/Inspection media presentation contract without changing workflow behavior  
**Production data:** Must remain unchanged

## 1. Day 6 outcome

Day 6 will implement the four batches approved by the Day 5 verdict:

1. harden the shared image foundation and report read-only gallery;
2. migrate Inspection read-only evidence presentations;
3. align editable report and Inspection photo collections; and
4. remove device-filename noise from upload status, validation feedback, and Inspection AI confirmation.

The work must remove image filename output and redundant image-only framing at the highest safe shared owner. It must preserve descriptions, upload/persistence contracts, document filenames, viewer behavior, workflow state, responsive usability, and accessibility.

## 2. Scope boundary

### 2.1 Included production owners

- `src/components/report-workflow/ReportViewComponents.js`;
- `src/components/report-workflow/ReportPhotoGallery.js`;
- `src/components/report-workflow/PhotoEditorGallery.js`;
- related report/Inspection media SCSS;
- `src/views/report/components/ReportDetailSection.js`;
- `src/views/report/components/ReportReviewSection.js`;
- `src/views/report/shared/emergency-report/ReportPhotoSection.js`;
- `src/views/inspection/form/components/InspectionDisplayShared.js`;
- `src/views/inspection/records/InspectionReviewDashboard.js`;
- Fire Extinguisher resolution-evidence presentation;
- `src/views/inspection/ui/InspectionAiConfirmPanel.js`;
- Inspection upload queue and photo validation feedback; and
- report photo failure copy.

### 2.2 Included consumers

- all implemented Inspection types;
- ERCO;
- Drill;
- Fitness Test; and
- Fire Extinguisher resolution evidence.

### 2.3 Explicitly deferred

- Messages/chat images and lightbox behavior;
- Payroll and staff mixed attachment previewers;
- Leave and Overtime mixed image/document attachments;
- avatars, profile images, team imagery, and logos;
- PDF/document filename presentation;
- backend media storage or API changes; and
- release deployment or production mutation.

These remain classified and must not be accidentally changed by shared selectors, global filename removal, or broad component replacement.

## 3. Non-negotiable invariants

### Data and API invariants

- Keep `fileName`, `name`, `originalName`, media IDs, MIME types, sizes, dimensions, URLs, and thumbnail URLs in models and payloads.
- Keep upload ordering, retry, cancellation, removal, camera recovery, draft persistence, media leasing, submission, and cleanup behavior unchanged.
- Keep API endpoints, methods, request bodies, headers, and response normalization unchanged.
- Keep document download names and visible document filenames unchanged.
- Do not modify the backend, database, seeders, or `.env` files.

### UI and interaction invariants

- Preserve user-authored image descriptions.
- Preserve photo ordering and multi-photo counts.
- Preserve thumbnail/full-size fallback and intrinsic sizing.
- Preserve viewer open, previous/next, fit/original, Escape close, and focus return.
- Preserve editor open/close, description editing, caption chips, remove confirmation, retry, and Add More behavior.
- Preserve mobile drawer and desktop modal ownership.
- Preserve surrounding report/Inspection section boundaries.
- Preserve focus outlines even when visible image-card borders are removed.
- Preserve image aspect ratio and prevent horizontal overflow.

### Accessibility invariants

- Every image receives contextual alternative text unrelated to its device filename.
- Every clickable thumbnail remains a semantic control.
- Icon-only actions retain meaningful accessible names.
- Status/error announcements remain understandable without filenames.
- Missing/broken image states remain perceivable and actionable.

## 4. Shared presentation contract

### 4.1 Contextual label resolution

Introduce one pure helper in the report-workflow media layer:

```text
resolvePhotoLabel({ photo, index, contextLabel })
```

Rules:

1. use a trimmed user-authored description when it is suitable as the accessible label;
2. otherwise use `${contextLabel} ${index + 1}`;
3. fall back to `Evidence photo ${index + 1}` only when the owner supplies no context;
4. never read filename-like fields or URLs; and
5. never mutate the media object.

Expected context labels include:

- `Inspection evidence photo`;
- `Inspection finding photo`;
- `HSE evidence photo`;
- `Report photo`;
- `Resolution evidence photo`; and
- `AI review photo`.

### 4.2 Neutral read-only evidence

Read-only image presentation must provide:

- a responsive grid/list;
- an unframed or visually neutral image wrapper;
- optional description text;
- semantic viewer activation;
- full-size viewer behavior; and
- meaningful missing/error handling.

It must not provide upload, edit, remove, retry, document, avatar, chat, or workflow behavior.

### 4.3 Editable collections

Editable photo collections may keep functional editor separation, action regions, description controls, and focus treatment. They must not show or announce the device filename.

Use `Photo 1 of 2`, domain context, and description state to orient the user.

## 5. Implementation sequence

Only one batch may be in progress at a time. Complete its focused tests and diff audit before beginning the next batch.

### Task 6.0 — Freeze baseline and prepare rollback points

1. Record the starting commit and current tracked/untracked worktree.
2. Preserve the Day 4 post-deployment and Day 5 audit changes.
3. Run the Day 5 media inventory and contract before modifying production source.
4. Run the existing eight-file media characterization group.
5. Record current build-artifact state so any verification build can be restored precisely.
6. Confirm no backend/frontend preview process is already owned by this task.

**Gate:** baseline audit and 29 tests pass; no unknown worktree overlap exists.

### Task 6.1 — Add regression contracts before each source change

Use the sentinel filename `DEVICE_PRIVATE_IMG_987654.jpg` in controlled fixtures.

Add focused tests proving that image filenames are absent from:

- visible text;
- `alt` attributes;
- `title` attributes;
- accessible button names;
- textarea labels;
- upload queue/status text;
- validation and fallback messages; and
- AI confirmation previews.

At the same time, prove that:

- the sentinel remains in normalized/internal media objects where required;
- report/Inspection serialization retains the internal filename;
- upload/remove/retry callbacks still receive the original media object or ID;
- descriptions remain visible and editable; and
- a PDF/document filename remains visible in a representative attachment test.

Tests may be introduced alongside the smallest source correction so the branch does not remain knowingly red for an extended period.

**Gate:** each affected owner has one positive privacy assertion and one preservation assertion.

### Task 6.2 — Batch 1: shared foundation and report read-only gallery

#### Foundation changes

1. Add and export `resolvePhotoLabel` near the existing report media foundation.
2. Require callers of `PhotoPreview` to own contextual alternative text.
3. Remove `photo.fileName` fallback from `PhotoPreview` alternative text.
4. Preserve `ReportPhotoImage` source selection, fallback, dimensions, lazy loading, decoding, and error callbacks.

#### Report gallery changes

1. Replace filename fallback in `ReportPhotoGallery` labels.
2. Remove filename text from the full-size viewer metadata row.
3. Keep position text such as `1 of 3` and descriptions.
4. Remove the decorative per-photo border/background/card treatment.
5. Keep the thumbnail as a semantic button with the existing focus-visible outline.
6. Keep responsive grid, modal title, Fit/100%, previous/next, Escape dismissal, and selected-index reset.

#### Consumer validation

Verify the shared Reports detail and review surfaces for:

- ERCO;
- Drill; and
- Fitness Test.

**Batch 1 gate:** sentinel absent from the report thumbnail/viewer accessible tree; description, ordering, source fallback, focus, and viewer navigation unchanged.

### Task 6.3 — Batch 2: Inspection read-only evidence

#### Inspection shared gallery

1. Update the read-only `PhotoGallery` branch to consume the shared label/presentation contract.
2. Remove filename text beneath images.
3. Remove the redundant `rounded-3 border border-light-subtle p-2` image wrapper.
4. Keep responsive grid placement, full-width viewer mode, descriptions, and empty-state behavior.
5. Do not remove the surrounding `EvidenceBlock`, finding section, modal, or drawer.

#### Inspection review dashboard

1. Replace `.inspection-review-photo-card` presentation with the shared neutral evidence item/grid or equivalent shared renderer.
2. Remove filename text/title and filename-derived alternative text.
3. Preserve group titles, location grouping, expansion controls, descriptions, and photo counts.

#### Fire Extinguisher resolution evidence

1. Migrate `PhotosGrid` or its only production consumer to the neutral read-only contract.
2. Remove nested `CCard`/`CCardBody` and filename labels.
3. Preserve the `Uploaded Photos` section label and descriptions.

#### Type coverage

Verify representative evidence structures for:

- General and HSE;
- Hydraulic and High Angle;
- FRT and SCBA;
- ER Auxiliary; and
- Fire Extinguisher.

**Batch 2 gate:** no Inspection evidence image has a redundant image-only card ancestor or visible/accessibility filename; domain grouping and viewer flows remain intact.

### Task 6.4 — Batch 3: editable report and Inspection photo collections

#### Shared editor

1. Remove visible filename text from `PhotoEditorGallery` headers.
2. Replace filename-derived preview alt with contextual position labels.
3. Keep `Photo n of total`, description state, Edit, Remove, Done, caption chips, focus entry, and focus return.
4. Retain internal filename use only for identity fallback when no stable ID/URL exists.
5. Remove the preview border only if the editor section still has a clear functional boundary and focus state.

#### Emergency-report desktop editor

1. Use the same contextual labels as the mobile shared editor.
2. Replace `Description for <filename>` with `Description for photo n`.
3. Remove the per-image decorative border panel while preserving layout, textarea, remove action, and description maximum length.
4. Do not change upload, processing, progress, cancellation, camera, retry, removal API, or storage-limit behavior.

#### Inspection editable gallery

1. Align default desktop/modal rendering with the shared editor/neutral preview contract.
2. Preserve Inspection caption chips, descriptions, Add More, Save/Cancel, and row-specific handlers.
3. Ensure mobile drawer and desktop modal expose the same photo identity semantics.

**Batch 3 gate:** editor workflows remain functionally identical while filenames disappear from visible and accessible copy at 390 and 1440 px.

### Task 6.5 — Batch 4: upload feedback and AI confirmation

#### Report upload feedback

1. Update `reportPhotoFailureMessage` so user-facing copy refers to `Selected photo` or contextual position rather than filename.
2. Keep failure codes and internal failure objects unchanged.
3. Keep rate-limit, quota, storage, network, session, and cancellation messages unchanged except where they expose a filename.

#### Inspection validation and upload queue

1. Remove device filenames from image validation errors.
2. Replace failed queue item headings with `Photo n` or stable contextual order.
3. Replace filename-derived Remove accessible names with contextual photo labels.
4. Keep internal queue identity, retry/remove IDs, batch grouping, live-region severity, progress, and persistence unchanged.

#### AI confirmation

1. Replace filename alt and visible filename text with `AI review photo` context and/or user-authored description.
2. Preserve the photo preview, AI warning, editable summary, actions, and approval flow.

**Batch 4 gate:** image feedback identifies the affected item without leaking the device filename; failure recovery and AI confirmation behavior remain unchanged.

### Task 6.6 — Reconcile the Day 5 audit after implementation

1. Rerun `audit:media-render-sites`.
2. Reclassify corrected image paths from remediation candidates to compliant presentation where applicable.
3. Update exact Day 5/Day 6 contract counts only from tool output.
4. Confirm all media render calls remain classified.
5. Confirm all remaining filename-presentation candidates are document-functional, mixed/deferred, or internal.
6. Search for the sentinel and device-style filename patterns in production output paths.

**Gate:** zero unclassified sites and zero approved-scope image filename presentation.

### Task 6.7 — Controlled user-journey verification

Prepare a self-contained test session/fixture layer for media presentation journeys so the gate does not depend on local PostgreSQL, live API access, or an extra browser engine.

The harness may stub authentication/session and read-only route data. It must not bypass the production component tree being tested.

Run source-backed journeys at 390 and 1440 px for:

1. Inspection detail with one evidence photo and a description;
2. Inspection detail/review with multiple photos;
3. Inspection editable photo drawer/modal;
4. report detail/review gallery shared by ERCO/Drill/Fitness Test;
5. report editable photo section; and
6. failed/missing image fallback.

At 360, 768, 928, and 929 px, probe any layout whose wrapper, modal/drawer, or grid changes at that boundary.

For each journey assert:

- sentinel filename absent from visible and accessible UI;
- description present;
- no redundant image-only card ancestor;
- image within content width with preserved aspect ratio;
- no horizontal overflow;
- keyboard viewer/editor actions work;
- focus returns after close/edit completion; and
- no console, page, request, or mutation error.

**Gate:** all mandatory 390/1440 journeys pass; any unavailable optional route is explicitly data-blocked rather than counted as passing.

### Task 6.8 — Full regression and build qualification

After all batches pass focused gates:

1. run scoped formatting and lint throughout implementation;
2. run all affected report-workflow, Inspection, ERCO, Drill, Fitness Test, and Fire Extinguisher tests;
3. run the complete Inspection test group;
4. run Day 3, Day 4, and Day 5 UAT contract suites;
5. run repository-wide lint;
6. run the repository's applicable full jsdom test corpus;
7. run the controlled media Playwright journeys;
8. run a production build and asset-reference checks;
9. verify no local API origin appears in production assets;
10. run diff whitespace and secret-pattern checks; and
11. restore only generated build/test artifacts when the build is not being prepared for deployment.

**Gate:** no Blocker/High regression, no unexplained failure, and no unrelated generated artifact remains.

## 6. Required test matrix

| Contract                       | Minimum evidence                                                          |
| ------------------------------ | ------------------------------------------------------------------------- |
| Low-level source fallback      | thumbnail→full and full→thumbnail tests                                   |
| Image filename privacy         | sentinel absent from visible/accessibility output for every changed owner |
| Internal filename preservation | normalized/persisted media object still contains sentinel                 |
| Document exception             | PDF/document filename still visible and downloadable                      |
| Description preservation       | multiline description visible in editor, review, detail, and viewer       |
| Neutral framing                | computed ancestors contain no redundant card border/background/shadow     |
| Responsive image               | contained, uncropped where required, no horizontal overflow               |
| Multi-photo viewer             | order, previous/next, position, Fit/100%, Escape, focus return            |
| Editor behavior                | edit, caption, remove, Add More, Save/Cancel, focus return                |
| Upload recovery                | progress, retry, cancel, failure live-region, no filename copy            |
| Cross-module parity            | Inspection, ERCO, Drill, Fitness Test, Fire Extinguisher                  |

## 7. Expected source changes by batch

### Batch 1

- shared media helper/component tests;
- `ReportViewComponents.js`;
- `ReportPhotoGallery.js`;
- report media SCSS; and
- report detail/review tests.

### Batch 2

- `InspectionDisplayShared.js`;
- `InspectionReviewDashboard.js`;
- Fire Extinguisher evidence consumer;
- Inspection media/review SCSS; and
- Inspection detail/review tests.

### Batch 3

- `PhotoEditorGallery.js`;
- `ReportPhotoSection.js`;
- Inspection editor consumers; and
- focused editor/upload tests.

### Batch 4

- report photo failure copy;
- Inspection validation and upload queue presentation;
- `InspectionAiConfirmPanel.js`; and
- focused feedback/accessibility tests.

Do not add a new dependency or parallel design system.

## 8. Mishap prevention

- Never delete filename properties from media models.
- Never use a broad repository replacement of `fileName` or `attachmentName`.
- Never apply a global `img`, `.card`, `.border`, or `.offcanvas` CSS override.
- Remove only image-level decoration; retain domain section, editor, viewer, focus, and error boundaries.
- Do not change keys from stable IDs to array indexes when stable IDs exist.
- Do not alter event callback signatures during presentation migration.
- Do not update exact audit counts manually before rerunning the audit.
- Do not relax a privacy/accessibility assertion to accommodate a failing renderer.
- Do not classify browser infrastructure failure as application success.
- Preserve unrelated worktree changes and review every cleanup target explicitly.

## 9. Stop conditions

Stop the affected batch and investigate if:

- a media upload, retry, remove, draft, submit, or cleanup request changes;
- descriptions, ordering, or media IDs are lost;
- a PDF/document filename disappears;
- a viewer/editor loses keyboard access, Escape dismissal, or focus return;
- an image becomes cropped where the prior contract required containment;
- responsive overflow exceeds 1 px;
- a missing image produces a blank or inaccessible state;
- a global CSS change affects avatars, chat, identity cards, or unrelated images;
- the deterministic inventory develops an unclassified site; or
- tests require backend/database mutation to verify presentation-only behavior.

## 10. Rollback strategy

Each batch is a separate rollback boundary.

1. Revert only the failing batch's source and tests.
2. Rerun the last passing batch gate.
3. Preserve the Day 5 inventory and audit classification.
4. Keep internal media data untouched, so no database or API rollback is required.
5. If a shared owner causes excessive downstream regressions, restore that owner and migrate one consumer family at a time.

## 11. Deliverables

Day 6 execution must produce:

1. corrected shared media components and local styles;
2. migrated approved-scope consumers;
3. sentinel privacy and internal-preservation tests;
4. deterministic responsive browser coverage;
5. reconciled media inventory/contract counts;
6. `FRONTEND_LIVE_UAT_DAY_6_MEDIA_COMPONENT_EXECUTION_2026-08-11.md`;
7. a consumer migration table showing changed and intentionally retained owners; and
8. an updated `upgrade-works/README.md` verdict.

Raw screenshots, traces, DOM dumps, and generated test/build output remain ignored and must not contain credentials, production payloads, personal information, or real uploaded images.

## 12. Completion criteria

Day 6 is complete only when:

- the approved shared report/Inspection image surfaces show no device filename visibly or accessibly;
- internal image filename data remains intact;
- functional document filenames remain intact;
- redundant image-only card wrappers are removed without flattening domain structure;
- descriptions, ordering, fallback, viewer, editor, upload, retry, and workflow behavior remain unchanged;
- all Inspection types plus ERCO, Drill, Fitness Test, and Fire Extinguisher are covered through shared owners and representative tests;
- 390 and 1440 px source-backed browser journeys pass;
- focused, affected, contract, lint, build, whitespace, and secret gates pass;
- no temporary service or generated artifact remains; and
- the execution record issues `GO`, `CONDITIONAL GO`, or `HOLD` for post-implementation audit/deployment preparation.
