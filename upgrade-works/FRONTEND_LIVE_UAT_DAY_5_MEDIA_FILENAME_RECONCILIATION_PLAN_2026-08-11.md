# Frontend Live UAT Day 5 Media and Filename Reconciliation Plan

**Date:** 2026-08-11  
**Status:** Ready to execute  
**Primary objective:** Complete the repository-wide media render-site audit and define the smallest safe shared-component migration boundary  
**Execution type:** Read-only discovery, rendered verification, component-contract design, and Day 6 implementation handoff  
**Production data:** Must remain unchanged

## 1. Why Day 5 exists

Day 4 verified the corrected Inspection HSE detail route and exposed the broader code-quality concern: image evidence is presented through several implementations that can differ in framing, labels, alternative text, preview behavior, and responsive layout.

Day 5 will determine exactly which implementations are truly equivalent and worth consolidating. It will also trace every place where a device-generated image filename can reach visible or accessible UI.

This is not a visual redesign. The desired outcome is a reliable ownership map and a bounded shared-component design that Day 6 can implement without changing uploads, persistence, permissions, or workflows.

## 2. Required outcomes

Day 5 must produce:

1. a complete inventory of production image and attachment render sites;
2. a consumer map showing which modules use each render implementation;
3. a separate trace of visible filename output and internal-only filename use;
4. a classification of genuinely equivalent and intentionally different media behaviors;
5. the proposed API and ownership location for the smallest viable shared media primitives;
6. a migration sequence for Day 6, ordered by shared impact and regression risk;
7. static and rendered evidence covering filename privacy, nested framing, responsive sizing, fallback behavior, and accessibility; and
8. a `GO`, `CONDITIONAL GO`, or `HOLD` verdict for implementation.

## 3. Scope

### 3.1 Included media surfaces

Inventory every production render path involving:

- native `<img>` and framework image components;
- background images that represent user or operational content;
- read-only evidence thumbnails, grids, galleries, and full-size viewers;
- editable upload previews and description editors;
- camera and gallery-selected image previews;
- Inspection evidence, including HSE, General, FRT, SCBA, Hydraulic, High Angle, ER Auxiliary, and Fire Extinguisher paths;
- ERCO, Fitness Test, and Drill report photos;
- message-thread images and composer previews;
- Leave and Overtime evidence;
- Payroll and salary-claim receipts or supporting attachments;
- staff/team/profile avatars and logos;
- administrative knowledge or content imagery;
- missing, failed, pending, and unavailable image states; and
- mixed attachment previewers that support both images and documents.

### 3.2 Included filename surfaces

Trace image filenames through:

- visible text and captions;
- headings and viewer metadata;
- `alt`, `title`, `aria-label`, and other accessible names;
- validation, error, progress, success, and toast messages;
- upload queues and editor headers;
- modal or drawer labels;
- download/open actions; and
- generated report-view UI.

Internal fields such as `fileName`, `filename`, `originalName`, `original_name`, attachment names, MIME metadata, upload keys, API payload values, and download names remain in the inventory even when they are correctly not rendered.

### 3.3 Exclusions

Day 5 will not:

- change backend endpoints, database records, seeders, or environment files;
- mutate live records or upload new production media;
- change stored filenames, media IDs, MIME detection, object URLs, or download naming;
- change camera capture, upload queue, retry, delete, draft, lease, or submission behavior;
- remove useful filenames from PDFs, spreadsheets, or other documents where the filename identifies the document;
- merge avatars, logos, chat images, document viewers, editors, and report evidence merely because each renders an image;
- add a new design framework or dependency;
- redesign surrounding report cards, workflow sections, or forms; or
- implement the Day 6 production migration before the audit gate is accepted.

## 4. Non-negotiable presentation contract

### 4.1 Image evidence

- An individual evidence image must not receive an extra decorative card, tinted panel, shadow, or border solely because it is an image.
- Layout wrappers may still provide grid placement, overflow control, viewer activation, editor controls, or semantic grouping, but should remain visually neutral.
- Images must preserve aspect ratio, remain within their content column, and avoid horizontal page overflow.
- Multiple images may use a responsive grid or list without turning every image into a nested card.
- User-authored descriptions remain visible as supporting text.
- Loading, missing, broken, and unavailable states must be intentional and understandable.

### 4.2 Filename privacy and noise

- Device-generated image filenames must not appear as visible labels, captions, headings, tooltips, toast details, or accessible names.
- Image filenames must not be used as `alt` text.
- When a visible or accessible identifier is required, use the user description or contextual copy such as `HSE evidence photo 1`, `Receipt image 2`, or `Message image`.
- Internal filename values remain available for upload compatibility, type detection, deduplication, download behavior, and diagnostics.
- Non-image document filenames may remain visible where they help users identify or retrieve the document.

### 4.3 Viewer and accessibility behavior

- A clickable image must use a semantic control with an accessible name.
- Keyboard activation, visible focus, Escape dismissal, and focus return must remain coherent.
- Modal and drawer headings must describe the content without exposing a device filename.
- Viewer navigation must announce position for multiple images.
- Missing-image fallback text must not depend on the filename.
- Reduced-motion and narrow-width use must not weaken access to close or navigation controls.

## 5. Media-family classification

Every render site must be assigned to one of these families before consolidation is proposed.

| Family                    | Typical responsibility                                                              | Default consolidation decision                                                |
| ------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Read-only evidence        | Responsive thumbnail/gallery, description, fallback, optional viewer                | Primary shared-component candidate                                            |
| Editable photo collection | Preview, description editing, remove/retry state, focus recovery                    | Retain a separate editor component; share only the image primitive where safe |
| Mixed attachment preview  | Image/PDF/document detection, zoom, open/download, object-URL lifecycle             | Keep document behavior separate; share neutral image rendering selectively    |
| Chat image                | Inline message layout, local optimistic preview, lightbox, message deletion context | Preserve chat ownership unless the low-level image primitive fits unchanged   |
| Avatar/logo               | Identity crop, initials fallback, fixed aspect/shape, decorative semantics          | Do not merge with evidence media                                              |
| Generated/export media    | PDF/export-specific identity and formatting                                         | Keep outside interactive UI consolidation                                     |

An implementation is equivalent only when its data shape, interaction, error lifecycle, accessibility role, sizing contract, and consumer expectations align—not simply because both paths contain `<img>`.

## 6. Day 5 work plan

### Task 5.1 — Freeze the audit boundary

1. Record the starting commit and all existing tracked/untracked changes.
2. Confirm the deployed build and pre-Day 5 live-gate evidence remain unchanged.
3. Preserve the current live-test hardening and execution documentation.
4. Confirm generated evidence paths and credential files remain ignored.
5. Establish that Day 5 source inspection is repository-wide while browser activity remains local or production-safe and read-only.

**Pass condition:** the audit can distinguish pre-existing work, Day 5 artifacts, generated evidence, and credentials without overwriting user changes.

### Task 5.2 — Build the mechanical render-site inventory

Search production source for:

- `<img>`, image components, CSS background-image declarations, and inline image styles;
- blob/data/object URLs, `FileReader`, `URL.createObjectURL`, and preview lifecycle code;
- image/attachment viewers, galleries, editors, queues, camera controls, and fallbacks;
- `fileName`, `filename`, `originalName`, `original_name`, attachment-name, and MIME fields;
- visible rendering through JSX text, `alt`, `title`, `aria-label`, headings, toast content, and error strings; and
- nested card/border/shadow/background classes around images.

For every production site, record:

- owning file and component;
- importing consumers and route/module;
- media family;
- source data shape;
- read-only or editable behavior;
- visible filename behavior;
- accessible-name source;
- wrapper styling and number of visible framing layers;
- preview/viewer behavior;
- loading/error/fallback behavior;
- responsive sizing and cropping rule;
- document-versus-image handling; and
- likely shared owner or documented exception.

Exclude test fixtures, icons, static decorative assets, charts, and generated output from the user-uploaded-media count, but record the exclusion rule so the audit is reproducible.

**Pass condition:** every production render site is accounted for once and every filename field is classified as visible, accessible-only, internal-only, document-functional, or uncertain.

### Task 5.3 — Trace shared ownership and consumers

Start with the established report-workflow layer:

- `ReportPhotoImage` and `PhotoPreview` in `ReportViewComponents`;
- `ReportPhotoGallery`;
- `PhotoEditorGallery`;
- Inspection display and detail adapters; and
- the shared ERCO/Drill/Fitness Test photo section.

Then compare specialist consumers:

- Inspection type-specific evidence;
- messages;
- Leave and Overtime;
- payroll and salary-claim attachment previewers;
- staff/team/profile identity images; and
- administrative knowledge surfaces.

For each candidate, calculate:

- current production consumer count;
- duplicated presentation or helper logic;
- behavior differences that prevent merging;
- styling differences that should become variants rather than forks; and
- migration risk if the shared owner changes.

**Pass condition:** every proposed shared primitive has at least two behaviorally compatible consumers and a clear reason to live at its selected ownership layer.

### Task 5.4 — Reproduce the three reported UI concerns locally

Use representative controlled data containing a sentinel image name such as `DEVICE_PRIVATE_IMG_987654.jpg`.

Verify:

1. an Inspection detail evidence image is not wrapped by a redundant image-specific card;
2. the sentinel filename is absent from visible content and accessible names;
3. the user-authored description remains visible;
4. the image remains responsive and uncropped unless the consumer intentionally defines a crop;
5. one-image, multiple-image, no-image, pending-image, and failed-image states remain usable; and
6. viewer open, navigation, close, and focus return work by keyboard and pointer.

Use 360, 390, 768, 928, 929, and 1440 px where the relevant surface supports those widths. Confirm light/dark tokens where the application supports them.

**Pass condition:** each concern has a reproducible test or a documented data/route block; absence of live fixtures is not treated as proof.

### Task 5.5 — Audit filename exposure separately from storage

Create a field-to-output trace for each filename-like property.

The audit must distinguish:

- image filenames incorrectly rendered to users;
- image filenames incorrectly used as accessible names;
- image filenames retained internally and never rendered;
- document filenames intentionally rendered for identification/download;
- filenames used only for MIME/type fallback; and
- uncertain cases requiring domain confirmation.

Static search alone is insufficient. Confirm computed visible text, `alt`, `title`, and accessible names in rendered tests for every distinct image-presentation owner.

**Pass condition:** the plan can remove image filename noise at presentation boundaries without deleting or changing internal filename data.

### Task 5.6 — Audit redundant image framing

For each rendered image, inspect visible ancestors up to the enclosing semantic section and record:

- border widths;
- backgrounds;
- box shadows;
- radii;
- padding;
- overflow behavior; and
- whether the wrapper performs a functional interaction.

Classify wrappers as:

- functional and visually neutral;
- required editor workspace;
- required message bubble or identity crop;
- redundant decorative image card; or
- surrounding domain section that must remain.

The surrounding report section/card is not automatically a defect. The target is the additional image-only framing inside an already grouped module.

**Pass condition:** proposed removals target only redundant image-level decoration and preserve domain grouping, editors, focus rings, and interaction affordances.

### Task 5.7 — Define the Day 6 shared-component contract

Design the smallest practical contracts. The expected direction is:

1. a low-level resilient image primitive for full/thumbnail fallback, dimensions, loading, and final-error notification;
2. a neutral read-only evidence item/gallery for contextual alternative text, description, responsive layout, and optional viewer activation; and
3. continued specialist ownership for editable galleries, mixed document previews, chat layout, and identity images, optionally consuming the low-level primitive.

The proposed API must define:

- accepted normalized media shape;
- contextual label/description inputs;
- deterministic fallback labels by domain and position;
- thumbnail/full-size selection;
- viewer enablement;
- fit/crop behavior;
- error and empty behavior;
- class/variant boundaries;
- focus and keyboard behavior; and
- forbidden inputs, including filename-derived visible labels.

Avoid an all-purpose component with upload, edit, document, chat, avatar, and gallery modes.

**Pass condition:** the design removes meaningful duplication while leaving workflow state and domain transformations with their current owners.

### Task 5.8 — Prepare regression contracts

Prepare or identify the Day 6 tests required to prove:

- sentinel image filenames are absent from visible text, titles, tooltips, toasts, and accessible names;
- internal image filename fields survive normalization and upload/persistence code where required;
- non-image document filenames remain available where functional;
- evidence images do not have redundant card-like ancestors;
- descriptions and captions remain visible;
- thumbnail-to-full-size fallback still works;
- missing/broken-image states remain meaningful;
- multi-image navigation and focus management remain usable;
- object URLs are revoked correctly in previewers;
- upload/remove/retry/edit flows remain unchanged; and
- no responsive overflow appears at the agreed widths.

Prefer focused component tests and controlled local Playwright journeys. Do not create brittle screenshot-only assertions where semantic or computed-style assertions can express the contract.

**Pass condition:** every Day 6 migration batch has a before/after regression gate tied to observable behavior.

### Task 5.9 — Produce the migration matrix and verdict

Group proposed Day 6 changes into bounded batches:

1. shared report-workflow read-only evidence owner;
2. Inspection consumers;
3. ERCO, Fitness Test, and Drill consumers;
4. editor filename/accessibility cleanup;
5. mixed attachment previewers where compatible;
6. Leave, Overtime, Payroll, messages, profile/team, and administration only where the shared contract fits; and
7. documented exceptions retained unchanged.

For every batch, state:

- files and consumers;
- intended visual/semantic change;
- behaviors explicitly preserved;
- focused tests;
- representative browser journey;
- rollback boundary; and
- residual risk.

**Pass condition:** the execution record gives a precise Day 6 scope with no unresolved ownership ambiguity.

## 7. Deliverables

Day 5 execution must create or update:

1. `FRONTEND_LIVE_UAT_DAY_5_MEDIA_RENDER_SITE_INVENTORY_2026-08-11.md`;
2. `FRONTEND_LIVE_UAT_DAY_5_MEDIA_COMPONENT_MAP_2026-08-11.md`;
3. `FRONTEND_LIVE_UAT_DAY_5_MEDIA_FILENAME_EXECUTION_2026-08-11.md`;
4. focused static/rendered audit tests or scripts, if gaps are found in the existing harness; and
5. `upgrade-works/README.md` with the verdict and next action.

Generated screenshots, raw DOM/style dumps, and Playwright output must stay in ignored evidence directories. Credentials, production payloads, real record identifiers, personal information, and uploaded images must not enter committed Markdown or test fixtures.

## 8. Verification strategy

### 8.1 Static gates

- production render-site search reconciled to the inventory;
- importer/consumer search reconciled to the component map;
- filename-field searches reconciled to the output trace;
- CSS wrapper searches reconciled to rendered measurements;
- no unexplained production `<img>` or equivalent image renderer remains; and
- no credential or production-data pattern appears in changed files.

### 8.2 Component gates

- sentinel filename suppression;
- contextual alternative text;
- description preservation;
- neutral framing;
- responsive intrinsic sizing;
- thumbnail/full-size fallback;
- missing-image fallback;
- viewer focus/navigation; and
- document-filename exception.

### 8.3 Controlled browser gates

Use representative source-backed or deterministic fixture journeys for:

- Inspection read-only detail;
- one emergency-report detail path shared by ERCO/Drill/Fitness Test;
- editable Inspection/report photo flow;
- mixed payroll attachment preview;
- message image preview; and
- one identity-image surface if the audit finds shared low-level behavior.

At minimum, validate 390 and 1440 px for every representative family. Run 360, 768, 928, and 929 px for layouts whose structure or boundary changes at those widths.

### 8.4 Live boundary

Day 5 does not require production mutation or fresh uploads. Existing read-only live evidence may confirm a naturally available route, but missing live image fixtures remain `data-blocked`. Controlled local fixtures provide the deterministic filename and image-state coverage.

## 9. Severity and decision rules

Classify findings by user impact:

- **Blocker:** image handling prevents task completion, loses media, exposes sensitive data, or creates a serious accessibility failure;
- **High:** image evidence is unavailable/misleading, upload or preview recovery is broken, or an important workflow is likely to fail;
- **Medium:** device filename noise, redundant card-on-card framing, inconsistent viewer behavior, or recurring responsive friction;
- **Low:** minor spacing, copy, or visual polish with no material journey impact.

Issue the Day 6 verdict as follows:

- **GO:** inventory is reconciled, shared boundaries are evidence-backed, no Blocker/High uncertainty remains, and every migration batch has regression coverage;
- **CONDITIONAL GO:** bounded Medium/Low uncertainties remain with explicit exclusions and no risk to the first migration batch; or
- **HOLD:** render sites remain unaccounted for, component ownership is ambiguous, or a proposed shared change risks upload, persistence, permissions, accessibility, or document behavior.

## 10. Stop conditions

Stop and investigate before proposing implementation if:

- a filename is part of a contractual visible identifier rather than incidental device metadata;
- removing a wrapper also removes an interaction, focus boundary, error state, or editor affordance;
- two candidate consumers use incompatible media lifecycles or security rules;
- a viewer performs an unexpected write request;
- image URLs or attachments require permissions not represented by controlled fixtures;
- live testing attempts an unapproved mutation;
- production data or credentials appear in evidence; or
- the worktree contains overlapping user changes that cannot be safely separated.

## 11. Rollback and mishap controls

Day 5 should change only plans, inventories, test/audit harnesses, and execution documentation. If an audit helper is incorrect:

1. revert only that new helper or assertion;
2. retain raw evidence outside tracked source;
3. rerun the prior established contracts; and
4. do not reinterpret an unexplained failure as a pass.

No production component migration belongs in this day. That keeps rollback trivial and ensures Day 6 begins from an accepted, reviewable scope.

## 12. Completion definition

Day 5 is complete only when:

- every production user-content image renderer is inventoried or explicitly excluded;
- all filename-like fields have a documented presentation classification;
- every redundant image-frame candidate has rendered evidence;
- shared versus specialist ownership is decided for each media family;
- the proposed shared API does not depend on device filenames for visible or accessible copy;
- representative responsive, keyboard, fallback, and document-exception tests are identified or implemented;
- unavailable live records remain explicit data blocks;
- the Day 6 batch plan is bounded and reversible; and
- the execution record contains an evidence-backed verdict.
