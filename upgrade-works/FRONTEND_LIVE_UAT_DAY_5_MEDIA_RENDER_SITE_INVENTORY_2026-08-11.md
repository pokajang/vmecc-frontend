# Frontend Live UAT Day 5 Media Render-Site Inventory

**Date:** 2026-08-11  
**Status:** Reconciled  
**Source boundary:** `src/**/*.{js,jsx,ts,tsx}` excluding tests  
**Production data:** Unchanged

## 1. Inventory method

The inventory combines:

- a deterministic scan of native and established shared media render tags;
- importer and consumer searches;
- filename-field and presentation-output searches;
- CSS inspection for image-level borders, backgrounds, shadows, padding, and sizing;
- rendered jsdom characterization of the existing components; and
- the previous read-only live HSE gate.

The reproducible gate is `npm run audit:media-render-sites`. It fails when a production media renderer or likely filename-presentation path is not assigned to a reviewed category.

## 2. Reconciled totals

| Measure                                       | Count |
| --------------------------------------------- | ----: |
| Production source files inspected             |   923 |
| Classified media render calls                 |    36 |
| Files containing media render calls           |    25 |
| Native `<img>` elements                       |    21 |
| Filename-like field mentions                  |   405 |
| Files containing filename-like fields         |    94 |
| Likely presentation-output lines              |    48 |
| Files containing likely presentation output   |    25 |
| Unclassified media render sites               |     0 |
| Unclassified filename-presentation candidates |     0 |

The 405 filename mentions count every matched filename-like token, not just source lines. Internal normalization, API, download, and persistence uses are intentionally included before classification.

## 3. Render-tag totals

| Render tag           | Calls | Meaning                                                                      |
| -------------------- | ----: | ---------------------------------------------------------------------------- |
| `img`                |    21 | Native brand, identity, chat, low-level media, and attachment preview images |
| `ReportPhotoImage`   |     6 | Managed report/Inspection full-or-thumbnail image rendering                  |
| `PhotoPreview`       |     3 | Shared image fallback and preview framing                                    |
| `PhotoEditorGallery` |     2 | Shared editable photo collections                                            |
| `ReportPhotoGallery` |     2 | Report detail/review gallery entry points                                    |
| `PhotosGrid`         |     1 | Fire Extinguisher resolution evidence                                        |
| `AttachmentImage`    |     1 | Authenticated message image wrapper                                          |

## 4. Media-family inventory

### 4.1 Static brand assets — 6 calls

Owners:

- `src/components/AppSidebar.js`;
- `src/views/pages/login/Login.js`;
- `src/views/pages/forgot-password/ForgotPassword.js`; and
- `src/views/pages/reset-password/ResetPassword.js`.

These render packaged VMECC or provider artwork. They are not uploaded evidence and have no device-filename output. Keep them outside the evidence component system.

### 4.2 Avatar and identity images — 9 calls

Owners:

- `src/components/GroupedTableHeader.js`;
- `src/views/overtime/components/GroupedHeaderLabels.js`;
- `src/views/profile/AccountSection.js`;
- `src/views/roster/RosterStat.js`;
- `src/views/staff/salary-claims-management/components/SalaryAssignmentFormSections.js`;
- `src/views/team/TeamView.js`;
- `src/views/team/components/TeamCard.js`; and
- `src/views/team/components/EditTeamModal.js`.

Identity images intentionally use fixed circles, crops, team cards, initials fallbacks, or preset selectors. Their visible framing has a functional identity/layout purpose and is not the reported evidence-card problem.

There is code duplication between the two grouped user labels and among team-image displays, but it belongs to a later identity-component pass. It should not broaden Day 6 evidence work.

### 4.3 Chat images — 4 calls

Owner:

- `src/components/messages/ChatThread.js`.

The component owns authenticated attachment loading, optimistic local preview, message-bubble placement, lightbox state, and deletion context. It is not behaviorally equivalent to report evidence.

Finding: `original_name` currently becomes image `alt` text. The message image and lightbox also use native click behavior rather than one coherent dialog/focus contract. Keep chat ownership but remove filename-derived accessibility copy in a later bounded batch.

### 4.4 Shared media foundation — 3 calls

Owner:

- `src/components/report-workflow/ReportViewComponents.js`.

Components:

- `ReportPhotoImage` provides thumbnail/full-size fallback, intrinsic dimensions, lazy loading, async decode, and final-error notification;
- `PhotoPreview` provides a missing-preview state; and
- `PhotosGrid` presents Fire Extinguisher resolution evidence.

Strength: `ReportPhotoImage` is the correct low-level shared owner and should be extended rather than replaced.

Findings:

- `PhotoPreview` substitutes `photo.fileName` for caller-provided `alt` text in thumbnail mode;
- `PhotosGrid` adds `CCard`/`CCardBody` around each image; and
- `PhotosGrid` displays `photo.fileName`.

### 4.5 Read-only evidence — 7 calls

Owners:

- `src/components/report-workflow/ReportPhotoGallery.js`;
- `src/views/report/components/ReportDetailSection.js`;
- `src/views/report/components/ReportReviewSection.js`;
- `src/views/inspection/records/InspectionReviewDashboard.js`;
- `src/views/inspection/records/FireExtinguisherManagementPanel.js`; and
- `src/views/inspection/ui/InspectionAiConfirmPanel.js`.

Consumer reach:

- `ReportPhotoGallery` is called by the shared Reports detail and review surfaces and therefore reaches ERCO, Drill, and Fitness Test;
- `InspectionReviewDashboard` reaches the cross-type Inspection review workflow;
- `PhotosGrid` reaches Fire Extinguisher resolution evidence; and
- the AI confirm panel is a specialist pre-commit review surface.

Findings:

- the report gallery button uses a bordered card around each image;
- the report viewer displays `selectedPhoto.fileName` and falls back to filenames in accessible labels;
- Inspection review renders an additional bordered `.inspection-review-photo-card`, filename text, and filename title;
- Fire Extinguisher resolution evidence inherits `PhotosGrid` card and filename output; and
- the AI confirm panel displays and announces `photo.fileName`.

### 4.6 Editable photo collections — 5 calls

Owners:

- `src/components/report-workflow/PhotoEditorGallery.js`;
- `src/views/inspection/form/components/InspectionDisplayShared.js`; and
- `src/views/report/shared/emergency-report/ReportPhotoSection.js`.

Consumer reach:

- Inspection's `PhotoGallery` has five direct render calls and its compact `InspectionPhotoEvidenceSummary` has eight direct consumers across General, HSE, Hydraulic, FRT, SCBA, ER Auxiliary, High Angle, and Fire Extinguisher paths;
- `ReportPhotoSection` has three direct consumers: ERCO, Drill, and Fitness Test; and
- both Inspection and Reports use `PhotoEditorGallery` for compact/mobile editing.

Strengths:

- description editing is progressively disclosed;
- editor focus moves into the textarea and returns to the triggering control;
- removal actions have explicit accessible names; and
- report upload state, cancellation, retry, camera recovery, and managed media persistence remain separately owned.

Findings:

- `PhotoEditorGallery` visibly renders `photo.fileName` and includes it in `alt` text;
- Inspection's default `PhotoGallery` adds a bordered/padded wrapper and filename beneath every photo;
- the desktop emergency-report editor duplicates a bordered per-image panel and uses filenames in `alt` and textarea labels; and
- mobile and desktop editor presentations therefore expose different markup and labels for equivalent photo-description work.

### 4.7 Mixed attachment previewers — 2 calls

Owners:

- `src/views/payroll/components/claim-form/AttachmentPreviewModal.js`; and
- `src/views/staff/salary-claims-management/components/AttachmentPreviewModal.js`.

These surfaces must detect and preview images and PDFs, manage object URLs, offer open/download behavior, and switch between modal and mobile drawer layouts.

Filename display is functional for documents. For image branches, filenames should not become image `alt` text or unnecessary viewer labels. A shared pure preview body may be viable later, but their state/data ownership differs enough that they should not be merged during the first Day 6 batch.

## 5. Filename-output classification

| Category                    | Candidate lines | Decision                                                                            |
| --------------------------- | --------------: | ----------------------------------------------------------------------------------- |
| Image remediation candidate |              18 | Remove filename-derived visible/accessibility copy while preserving internal fields |
| Document functional         |              25 | Retain filename where it identifies a PDF/document or download                      |
| Mixed attachment review     |               5 | Branch by resolved media type; retain for documents, suppress for images            |

### 5.1 Confirmed image remediation owners

- `ChatThread`;
- `PhotoEditorGallery`;
- `ReportPhotoGallery`;
- `ReportViewComponents`;
- `reportMediaApi` user-facing photo failure messages;
- Inspection `PhotoGallery`;
- Inspection upload queue;
- Inspection photo validation messages;
- Inspection review dashboard;
- Inspection AI confirmation; and
- emergency-report `ReportPhotoSection`.

### 5.2 Confirmed functional document owners

The AI knowledge reader/list, Leave/O​vertime document details, Payroll/Salary Claim attachment lists, PDF viewers, and download actions use filenames to identify non-image documents. These must not be removed by a global string or field deletion.

### 5.3 Mixed cases

Leave and claim attachment flows accept both images and documents. Presentation decisions must use resolved MIME/type plus attachment kind rather than the presence of an `attachmentName` field.

## 6. Redundant-framing findings

Confirmed image-level decorative wrappers:

- Inspection `PhotoGallery`: `rounded-3 border border-light-subtle p-2`;
- `PhotosGrid`: nested `CCard` and `CCardBody`;
- Inspection review dashboard: `.inspection-review-photo-card` border, padding, radius, and background;
- report gallery: bordered `.report-photo-gallery__card`; and
- desktop `ReportPhotoSection`: `rounded-3 border p-2` per image.

The surrounding domain section, modal/drawer, editor area, message bubble, identity crop, focus outline, and dark viewer stage are not classified as redundant image cards.

## 7. Evidence and confidence

Verified evidence:

- the static audit accounts for every current media render and likely filename output;
- existing rendered tests explicitly show Inspection filename text and filename-derived report editor labels;
- media component characterization passed 8 files and 27 tests;
- the Day 5 deterministic inventory contract passed 2/2; and
- the deployed HSE gate previously passed route, divider, overflow, and diagnostics checks.

Browser limitation:

- the optional local Inspection UX matrix could not reach an assertion because local PostgreSQL was stopped;
- a live-session/local-preview attempt was blocked by Chromium's controlled DNS rule; and
- Firefox was not installed.

These are infrastructure/data blocks, not UI passes. Day 6 must rerun deterministic 390/1440 browser journeys after implementation.
