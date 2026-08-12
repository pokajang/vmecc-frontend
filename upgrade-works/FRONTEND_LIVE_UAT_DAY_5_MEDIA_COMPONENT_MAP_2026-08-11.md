# Frontend Live UAT Day 5 Media Component Map

**Date:** 2026-08-11  
**Status:** Accepted for Day 6 handoff  
**Design principle:** Share resilient presentation behavior; retain domain workflow ownership

## 1. Current ownership graph

| Owner                               | Direct consumers                                                          | Downstream modules                            | Verdict                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| `ReportPhotoImage`                  | `PhotoPreview`, `ReportPhotoGallery`, report editor, Inspection review/AI | Inspection, ERCO, Drill, Fitness Test         | Retain and harden as low-level primitive                                          |
| `PhotoPreview`                      | `PhotoEditorGallery`, Inspection `PhotoGallery`, `PhotosGrid`             | Inspection and report editors/details         | Retain; stop overriding caller alt with filename                                  |
| `ReportPhotoGallery`                | Reports detail and review                                                 | ERCO, Drill, Fitness Test                     | Evolve into neutral read-only evidence gallery                                    |
| `PhotoEditorGallery`                | Inspection drawer editor and report mobile editor                         | Inspection, ERCO, Drill, Fitness Test         | Retain specialist editor; remove filename presentation                            |
| Inspection `PhotoGallery`           | Five direct gallery calls plus viewer                                     | All Inspection types                          | Split presentation policy by read-only/editor without changing workflow ownership |
| `InspectionPhotoEvidenceSummary`    | Eight direct consumers                                                    | All equipment/issue-oriented Inspection types | Retain as action/count summary; it does not render images                         |
| `ReportPhotoSection`                | Three report forms                                                        | ERCO, Drill, Fitness Test                     | Retain upload/camera lifecycle owner; delegate presentation                       |
| `InspectionReviewInlinePhotoGroups` | Inspection review dashboard                                               | All Inspection types                          | Migrate to neutral shared read-only evidence item/grid                            |
| `PhotosGrid`                        | Fire Extinguisher resolution evidence                                     | Fire Extinguisher                             | Migrate or retire after shared gallery adoption                                   |
| Two attachment preview modals       | Payroll employee and management flows                                     | Payroll/Salary Claim                          | Keep state owners separate; optionally share pure image body later                |
| `AttachmentImage`/chat lightbox     | Message thread                                                            | Messages                                      | Keep specialist ownership                                                         |
| Avatar/team renderers               | Group headers, profile, roster, team, salary assignment                   | Cross-module identity                         | Exclude from evidence migration                                                   |

## 2. Proposed shared contracts

### 2.1 Low-level resilient image

Keep `ReportPhotoImage` as the existing foundation. Its responsibility remains:

- choose thumbnail or full-size source;
- fall back between available variants;
- expose intrinsic width/height when known;
- lazy load and asynchronously decode;
- notify the owner after final failure; and
- accept caller-owned contextual `alt` text.

Required Day 6 correction: never infer or replace `alt` with `photo.fileName` inside `PhotoPreview`.

### 2.2 Contextual photo-label helper

Add a small pure helper near the report-workflow media layer:

```text
resolvePhotoLabel({ photo, index, contextLabel })
```

Contract:

1. use a trimmed user-authored description when suitable;
2. otherwise return `${contextLabel} ${index + 1}`;
3. never use `fileName`, `name`, `originalName`, or URL text; and
4. allow domain copy such as `Inspection evidence photo`, `Report photo`, `Receipt image`, or `Message image`.

The helper supplies accessible names and optional generic visible identifiers. It does not alter stored media objects.

### 2.3 Neutral read-only evidence gallery

Evolve `ReportPhotoGallery` or introduce a narrowly named sibling only if API compatibility requires it.

Proposed inputs:

```text
photos
title
contextLabel
showDescriptions
viewerEnabled
emptyState
className
```

Required behavior:

- filter only displayable images;
- use a neutral grid/list without per-image decorative card styling;
- preserve image aspect ratio;
- display user descriptions as supporting text;
- provide semantic viewer buttons with contextual accessible names;
- preserve modal focus, Escape close, position navigation, fit/original controls, and full-size fallback; and
- render meaningful missing/error states without filenames.

Forbidden responsibilities:

- upload, camera capture, removal, retry, persistence, media leasing, document preview, chat layout, avatar cropping, or workflow transitions.

### 2.4 Editable photo collection

Retain `PhotoEditorGallery`. It already owns progressive description editing and focus return.

Day 6 changes should:

- replace filename headings with `Photo n of total`;
- keep `Description added` state;
- use contextual non-filename `alt` text;
- keep remove/edit controls and handlers unchanged;
- keep duplicate-row identity fallback internal; and
- remove decorative preview borders only where they do not represent the editor boundary.

### 2.5 Upload feedback

Keep upload queue and failure construction with their current workflow owners. Replace device filenames in user-facing image feedback with position/context:

- `Photo 2 could not be decoded`;
- `Selected photo exceeds the allowed source size`; or
- `This photo needs attention`.

Internal queue items retain `fileName` for identity, retry, logging, and API compatibility.

## 3. Intentionally specialist components

### Mixed document previewers

Do not move fetch, object-URL, zoom, open, download, or MIME/PDF logic into the evidence gallery. A later shared body may accept `kind`, `src`, contextual image label, document filename, and zoom state, but only after image/document branching tests exist.

### Chat

Chat requires authenticated blob loading, optimistic previews, bubble layout, and message deletion. It may reuse the contextual label helper or low-level image behavior, but not the report gallery.

### Avatars and team imagery

Identity images intentionally crop or frame content and need initials/preset fallbacks. Their visual contract conflicts with evidence photos.

## 4. Day 6 migration batches

### Batch 1 — Foundation and shared report evidence

Files:

- `ReportViewComponents.js`;
- `ReportPhotoGallery.js`;
- their SCSS and tests; and
- report detail/review consumers.

Changes:

- contextual labels;
- no filename alt/viewer metadata;
- neutral gallery item styling;
- preserved descriptions, viewer controls, fallback, and order.

Reach: ERCO, Drill, and Fitness Test read-only surfaces.

### Batch 2 — Inspection read-only evidence

Files:

- `InspectionDisplayShared.js`;
- `InspectionReviewDashboard.js`;
- `ReportViewComponents.js` `PhotosGrid` consumer or replacement;
- associated Inspection SCSS and tests.

Changes:

- remove per-image card wrappers and filename text;
- keep surrounding domain sections and evidence summaries;
- preserve modal/drawer routing and photo descriptions.

Reach: all Inspection types, including Fire Extinguisher resolution evidence.

### Batch 3 — Editable report and Inspection galleries

Files:

- `PhotoEditorGallery.js`;
- `ReportPhotoSection.js`;
- Inspection default/editor gallery branches;
- upload/editor tests.

Changes:

- remove visible filenames and filename-derived labels;
- align mobile/desktop description semantics;
- retain upload, camera, remove, retry, cancellation, focus, and persistence ownership.

### Batch 4 — Upload status and AI confirmation

Files:

- report photo failure copy;
- Inspection validation/queue status;
- Inspection AI confirmation; and
- focused error/accessibility tests.

Changes:

- contextual image labels in errors, status, and AI preview;
- internal filename fields unchanged.

### Batch 5 — Mixed attachments and chat

Proceed only after Batches 1–4 pass.

- suppress filename-derived image labels by resolved media type;
- retain functional document filenames;
- improve chat image button/dialog/focus semantics without importing report layout; and
- preserve object-URL and authenticated-loading lifecycles.

### Deferred identity batch

Grouped user labels and team images have separate duplication opportunities. Defer them to an identity-component audit so Day 6 remains focused.

## 5. Required regression gates

Each batch must use a sentinel filename such as `DEVICE_PRIVATE_IMG_987654.jpg` and prove:

- it is absent from visible text, `alt`, `title`, tooltips, toasts, status messages, and accessible names for image branches;
- user descriptions remain present;
- contextual image labels remain meaningful;
- internal filename values survive normalization and persistence;
- document filenames remain present where functional;
- no redundant image-only card ancestor remains;
- image sizing and fallback are unchanged;
- editor actions and focus recovery remain unchanged;
- viewer navigation and Escape/focus behavior remain unchanged; and
- 390 and 1440 px browser journeys have no overflow or clipped controls.

## 6. Ownership decision

**GO for Day 6 Batches 1–4.**

**Conditional for Batch 5:** proceed only with explicit media-kind branching and specialist lifecycle tests.

**Excluded:** avatars, logos, static artwork, generated exports, and backend/storage changes.
