# Shared Evidence Gallery and Lightbox Execution — 2026-08-13

## Outcome

The frontend now has one read-only evidence gallery and one image viewer for inspection and reporting modules. Evidence images render directly in their owning section with rounded corners, retain portrait or landscape orientation, and open the selected image in a shared zoomable lightbox.

## Shared implementation

- Added `EvidencePhotoGallery` as the canonical read-only gallery.
- Added `PhotoLightbox` as the canonical desktop-modal and mobile-fullscreen viewer.
- Added `EvidenceImage` with thumbnail/full-image fallback, unavailable state, and loading treatment.
- Added shared utilities for media URL resolution, deduplication, accessible labels, filename suppression, contextual caption suppression, and zoom limits.
- Added one shared SCSS layer for responsive grids, uncropped rounded images, keyboard focus, viewer controls, pan/zoom presentation, mobile layout, and reduced motion.

## Migrated inspection surfaces

- All eight submitted inspection detail types inherit the shared gallery through the read-only branch of `PhotoGallery`.
- Fire Extinguisher submitted details no longer use the nested evidence card or the photo-count / `View photos` indirection.
- Fire Extinguisher findings show photos directly beneath the affected criterion and suppress a caption that duplicates the criterion remarks.
- Root-level general inspection evidence uses the same gallery.
- Inspection review photo groups use the same gallery and lightbox.
- Fire Extinguisher asset overview issue evidence, mobile historical issue evidence, and opened historical-record criteria use the shared inline gallery.
- The obsolete submitted-inspection viewer state and callback plumbing were removed from `InspectionDetailSection`.

## Migrated reporting surfaces

- `ReportPhotoGallery` now delegates to the shared gallery instead of owning a separate modal implementation.
- ERCO and Drill review/detail evidence keeps its existing section ownership while inheriting the shared viewer.
- Fitness Test photographs are now visible in both review and submitted-detail views.
- Generic workflow `PhotosGrid` consumers, including issue-resolution evidence, inherit the shared gallery.
- Repeated analysis text and device-style filenames are suppressed as visible captions while meaningful captions remain.

## Viewer behavior delivered

- Selected-photo opening with focus restoration on close.
- Fit, 100%, zoom-in, and zoom-out controls with 50%–300% limits.
- Previous/next navigation and position counter for image groups.
- Arrow-key navigation, plus/minus zoom, `0` reset, and modal `Escape` close behavior.
- Pointer panning outside Fit mode.
- Double-click and touch double-tap Fit/zoom toggling.
- Full-screen mobile presentation and large desktop presentation.
- Full-resolution source with thumbnail fallback.

## Intentionally retained implementations

- Upload, caption-edit, remove, retry, and active form evidence editors remain separate from the read-only gallery.
- Compact evidence triggers remain in dense Fire Extinguisher history tables, where embedding full image grids inside table cells would harm scanability. Opening the record detail exposes the inline shared gallery.
- Existing inspection photo-viewer plumbing remains where it supports active editing and upload workflows.
- Avatars, logos, decorative images, chat attachments, signatures, and camera/input previews remain out of scope.

## Removed obsolete code

- Removed the reporting-only photo modal and its gallery/viewer styles.
- Removed submitted inspection-detail viewer state and Fire Extinguisher detail callbacks.
- Removed the old inspection review thumbnail-item styles after migrating the markup.
- Removed the obsolete read-only inspection preview override superseded by shared media styles.

## Deferred verification

No tests, lint, Playwright, formatting command, or production build was run, following the explicit instruction for this implementation pass. Runtime and responsive verification therefore remain pending before deployment or a release-readiness verdict.

## Current verdict

Code implementation is complete against the plan, with verification intentionally deferred. This record does not declare the branch ready to commit, push, or deploy until the requested verification gates are later authorized and completed.
