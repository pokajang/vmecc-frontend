# Shared Evidence Gallery and Lightbox Plan — 2026-08-13

## Objective

Create one consistent image presentation and viewing system for inspection and reporting evidence. Inline images must preserve their full portrait or landscape orientation, use rounded corners without card chrome, and open a shared accessible viewer with navigation and zoom controls.

## Product contract

### Inline evidence

- Display the complete image with `object-fit: contain`; never crop evidence.
- Apply the shared image radius directly to the image, not to an outer card.
- Do not add a border, card background, nested container, or image-count button.
- A single image uses the available content width while respecting a sensible maximum height.
- Multiple images use a responsive grid:
  - one column on narrow mobile;
  - two columns when sufficient width is available;
  - additional columns only when images remain readable.
- Portrait and landscape images keep their natural aspect ratio.
- Each image is directly actionable and receives a visible keyboard focus indicator.
- Use `cursor: zoom-in` as a supporting affordance; accessibility must not depend on the cursor.

### Caption behavior

- Never expose a device filename as visible caption text.
- Suppress captions that exactly duplicate the finding, remarks, corrective action, category title, or other visible contextual text.
- Preserve genuinely useful descriptions.
- Show a caption once per surface, immediately below its image.
- The lightbox may repeat the meaningful caption as viewer context because it replaces the underlying surface; it must not render the same description in two locations inside the viewer.

### Viewer behavior

- Open the selected image directly when its inline preview is clicked or keyboard-activated.
- Use a full-screen viewer on mobile and a large modal on desktop.
- Default to `Fit` mode.
- Provide:
  - Zoom in;
  - Zoom out;
  - Fit;
  - 100%;
  - previous and next image navigation;
  - current-position counter such as `2 of 4`;
  - close action.
- Allow panning only while zoomed beyond Fit.
- Constrain zoom to a safe range, provisionally 50%–300%.
- Use predictable zoom increments, provisionally 25%.
- Support:
  - `Escape` to close;
  - left/right arrow keys to navigate;
  - plus/minus keys to zoom;
  - `0` to reset to Fit;
  - double-click or double-tap to toggle between Fit and the last zoomed level.
- Restore focus to the image that opened the viewer.
- Announce the selected image position and zoom level to assistive technology.
- Disable previous/next controls when the gallery has only one image.
- Reset transient zoom and pan state when changing images.

## Shared component architecture

### 1. `EvidencePhotoGallery`

Create `src/components/media/EvidencePhotoGallery.js` as the canonical read-only evidence gallery.

Responsibilities:

- Normalize and deduplicate the photo collection.
- Resolve thumbnail and full-size image URLs.
- Apply filename and duplicate-caption suppression.
- Render orientation-safe inline previews.
- Manage the selected image index.
- Open the shared lightbox.
- Provide accessible image-button names and focus restoration.
- Support configuration for context label, hidden description values, and optional title.

The gallery must not own upload, remove, caption editing, or retry behavior.

### 2. `PhotoLightbox`

Create `src/components/media/PhotoLightbox.js` as the canonical read-only viewer.

Responsibilities:

- Render the selected full-resolution image with thumbnail fallback.
- Manage Fit, 100%, custom zoom, and pan state.
- Provide image-group navigation and position status.
- Implement desktop-modal and mobile-fullscreen presentation.
- Own keyboard commands, focus trap, close behavior, and focus restoration.
- Support loading, missing-image, and failed-full-resolution fallback states.
- Respect reduced-motion preferences.

### 3. Shared media utilities

Create or consolidate utilities under `src/components/media/` for:

- resolving photo identifiers and URLs;
- resolving accessible labels;
- determining meaningful captions;
- normalizing hidden comparison values;
- clamping zoom;
- resetting pan when the image or zoom mode changes.

Reuse existing `ReportPhotoImage`, `resolvePhotoLabel`, and inspection photo deduplication logic where practical rather than creating parallel rules.

## Migration sequence

### Phase 1 — Shared primitives

1. Create the media directory and shared utility functions.
2. Implement `PhotoLightbox`.
3. Implement `EvidencePhotoGallery` using the shared lightbox.
4. Add shared SCSS for:
   - rounded inline images;
   - orientation-safe sizing;
   - responsive gallery columns;
   - image-button reset and focus state;
   - viewer stage;
   - zoom/pan behavior;
   - mobile fullscreen layout;
   - reduced motion.

### Phase 2 — Inspection detail migration

1. Replace the read-only branch of `PhotoGallery` in `InspectionDisplayShared.js` with `EvidencePhotoGallery`.
2. Keep the editable `PhotoEditorGallery` branch unchanged.
3. Make `DetailEvidenceBlock` pass title, remarks, finding text, action text, and caller-provided hidden values into the shared caption filter.
4. Ensure all inspection definitions inherit the same rendering:
   - Fire Extinguisher;
   - ER Auxiliary;
   - Fire Truck Daily;
   - High Angle;
   - Hydraulic;
   - SCBA;
   - HSE;
   - General.
5. Remove obsolete Fire Extinguisher viewer plumbing and any remaining `View photos` summary indirection from submitted details.
6. Use the same gallery for root-level General photos and remarks.

### Phase 3 — Reporting detail and review migration

1. Make `ReportPhotoGallery` delegate to `EvidencePhotoGallery` or retire it after consumers migrate.
2. Preserve ERCO and Drill photo placement immediately beneath the owning post-analysis category.
3. Add the currently missing Fitness Test photo gallery to review and submitted-detail views, using the same component.
4. Migrate generic reporting `PhotosGrid` read-only consumers to the shared gallery.
5. Keep `ReportPhotoSection` and `PhotoEditorGallery` as editing/upload surfaces, but reuse shared image rendering and caption utilities.

### Phase 4 — Remaining evidence surfaces

Audit and migrate read-only evidence images in:

- Fire Extinguisher asset history and issue lifecycle;
- inspection review screens;
- workflow detail views;
- downloadable-report preview surfaces, where interactive viewing is available.

Explicit exclusions unless separately requested:

- avatars;
- logos;
- decorative images;
- dashboard illustrations;
- chat attachments, which have a separate messaging journey;
- image inputs and active upload editors.

### Phase 5 — Remove obsolete implementations

After every read-only consumer has migrated:

- remove duplicated inspection photo-viewer state and modal code;
- remove the old reporting-only viewer implementation;
- remove obsolete summary-card and `View photos` styles;
- consolidate duplicated photo-label and URL-resolution helpers;
- retain compatibility exports temporarily only where needed to avoid a broad import rewrite in one commit.

## Edge cases

- Zero images: render no gallery and retain existing empty-state ownership.
- One image: no previous/next navigation.
- Many images: responsive grid plus indexed viewer navigation.
- Portrait image: height constrained, full content visible, no crop.
- Very wide panorama: width constrained in Fit; horizontal panning available when zoomed.
- Tiny image: avoid forced enlargement beyond 100% unless the user explicitly zooms.
- Broken thumbnail with valid full image: fall back to full image.
- Broken full image with valid thumbnail: keep the thumbnail and communicate reduced quality.
- Both sources broken: render an accessible unavailable state.
- Slow image: preserve layout and show a loading state.
- Long caption: wrap without expanding the page horizontally.
- Duplicate descriptions differing only by case or surrounding whitespace: suppress as duplicates.
- Mixed image orientations in one gallery: size each independently without forcing crop.
- Mobile browser zoom and safe-area insets: viewer controls remain reachable.

## Accessibility requirements

- Inline images must be reachable as buttons through keyboard navigation.
- Each trigger must identify its position and meaningful context, for example `Open Operational Condition evidence photo 1 of 2`.
- Use the meaningful caption as alternative text where appropriate; otherwise generate a contextual label without a filename.
- Viewer controls require visible labels or accessible names.
- Focus remains trapped inside the viewer while open.
- Closing returns focus to the originating preview.
- Viewer status updates use a polite live region.
- Controls retain at least a 44px mobile hit target.
- Do not rely exclusively on hover, color, or gesture controls.
- Reduced-motion mode disables animated zoom and slide transitions.

## Code-level acceptance criteria

- One shared gallery renders inspection and reporting read-only evidence.
- One shared lightbox owns viewing, navigation, and zoom behavior.
- No submitted inspection detail uses a count card or `View photos` button before evidence can be seen.
- Inline images have rounded corners and no outer card chrome.
- Portrait and landscape evidence remain uncropped.
- Duplicate captions and device filenames are not displayed.
- Unique captions remain available.
- Clicking or keyboard-activating an image opens the correct selected image.
- Changing images resets zoom/pan safely.
- Viewer closure restores focus.
- Existing upload, edit, remove, retry, and draft behavior remains outside and unaffected by the read-only components.

## Deferred verification

Per the current working direction, do not run lint, tests, Playwright, or a production build during implementation unless explicitly requested.

When verification is later authorized, cover:

- all eight inspection detail types;
- ERCO, Drill, and Fitness Test review/detail views;
- mobile portrait, mobile landscape, tablet, and desktop widths;
- light and dark themes;
- single, multiple, portrait, landscape, broken, loading, long-caption, and duplicate-caption states;
- keyboard navigation, focus restoration, reduced motion, and zoom limits;
- regression checks for upload/edit/remove flows;
- final lint, focused unit tests, Playwright visual journeys, and production build.

## Completion record

After implementation, create `FRONTEND_SHARED_EVIDENCE_GALLERY_LIGHTBOX_EXECUTION_2026-08-13.md` documenting migrated consumers, intentionally excluded image families, obsolete code removed, known limitations, and any deferred verification results.

