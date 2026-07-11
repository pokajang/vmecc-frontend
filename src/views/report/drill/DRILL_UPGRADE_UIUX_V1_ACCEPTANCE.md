# Drill Upgrade UI/UX V1 - Acceptance Record

Date: 2026-07-11

## Automated evidence

- Frontend report ESLint: passed for `src/views/report`.
- Frontend report test suite: 23 files and 87 tests passed.
- Responsive browser smoke: eight scenarios passed. The complete five-stage flow and shared
  review route passed at 320, 360, 390, and 430 CSS-pixel mobile widths, 844 x 390 landscape,
  and 1440 x 900 desktop, with no document-level horizontal overflow.
- Narrow-width stress coverage passed with 10 managed-photo records, long field content,
  25 chronology rows, and shared-review rendering at 320 CSS pixels.
- A simulated camera-return file passed through the real hidden camera input, mocked managed-media
  upload, analysis preview, review handoff, and session/route retention at 390 CSS pixels.
- Production frontend build: passed with existing chunk-size/dynamic-import warnings only.
- Backend report draft/workflow regression: 8 tests and 63 assertions passed.

Covered behaviors include:

- Legacy and Drill V2 normalization.
- Managed-photo lease metadata preservation.
- Record construction and Drill-specific change summary.
- Five-stage form candidate handoff to shared review.
- Truthful server draft failures and edits made during an in-flight save.
- Unknown stage fallback and server draft restoration.
- Personnel preservation after roster hydration.
- Exclusive Drill role validation.
- Chronology identity-preserving reorder.
- Partial photo success, camera user-gesture preservation, same-input reset, and cancellation.
- ERCO compatibility after shared photo extraction.
- Drill review/detail fields, per-section edit routing, managed photo rendering, and workflow labels.
- Real application-shell routing and server-draft hydration across setup, personnel, details,
  chronology, analysis, and review at mobile and desktop breakpoints (API responses mocked).

## Reference report content audit

The source DOCX text was re-audited for all three supplied reports:

- `Drill Report 240125 1X BV Lab Staf fainted at Sampling Area Level 3 CT 10.docx`
- `Drill Report April 25 - BUs accident near CCR2 with 2 casualties - 22 April 25.docx`
- `Drill Report Aug 25 - Major Fire At CT09 - 27 July 25.docx`

Their exercise date, issuance date, time, weather, location, primary type, multi-category markers,
SC/ASC/TRT personnel, multiple ERP/Annex references, narrative details, summary, chronology,
strengths, mobilised resources, improvement opportunities, photographs, and prepared/review
workflow roles all have explicit Drill V2 entry or workflow presentation fields. No source-document
content category remains without a frontend representation. This is a content/schema audit; final
PDF reproduction remains part of the separately deferred backend/PDF work.

## Production build result

The Vite production build completed successfully. Existing warnings remain for large chunks and a module imported both statically and dynamically; they are not introduced as Drill runtime failures.

## Backend dependency discovered

Live Drill photo upload is not yet releasable because the backend media controller and media-link service currently allow only `inspection` and `erco`. Final report create/update also links managed media only in the inspection branch. See `DRILL_UPGRADE_BACKEND_PDF_FOLLOWUP.md`.

The frontend intentionally sends `module=drill`; it does not disguise Drill media as ERCO media.

## External-device acceptance still required

The following checks require a deployed backend with Drill media enabled and physical devices, and were not available in this workspace run:

- Lower-memory Android Chrome camera capture/return.
- Current Android Chrome camera capture/return.
- iOS Safari camera capture/return.
- Embedded-browser fallback behavior on a real device.
- Slow/mobile network upload of the maximum photo set.
- Final submitted-record media durability after server draft deletion.

Do not mark the complete Drill photo feature production-ready until these checks pass and their device/browser versions are recorded.
