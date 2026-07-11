# Drill Backend and PDF V2 - Local Acceptance Record

Date: 11 July 2026

## Verdict

The backend, managed-media lifecycle, payload contract, coordinated frontend limits, and Drill PDF
V2 are locally accepted. The implementation is ready for a staging deployment with new Drill
uploads still disabled by default.

Production acceptance is intentionally not claimed yet. It still requires the staging data audit,
physical Android/iOS flow, reconciliation dry-run, controlled upload enablement, and production
canary described below.

## Release controls

- `REPORT_MEDIA_DRILL_UPLOAD_ENABLED` defaults to `false` in the backend example environments.
- Disabling the flag blocks only new Drill uploads. Existing Drill media remains linkable,
  viewable by authorized users, hydratable for PDF, and eligible for normal lifecycle cleanup.
- The frontend has no separate Drill-media rollout flag. Deploy its upload affordance only after
  the backend support code is present, and enable the backend upload flag in the target environment
  as part of the same controlled release window.
- No database migration is required for this Drill delivery: media module and parent identifiers
  are stored in generic string columns. Live schema constraints must still be checked before
  rollout.

## Implemented safeguards

- One central media-module policy controls support, upload enablement, and permissions.
- Drill upload and Drill draft/report writes require the assignment-aware Drill report permission
  or `reports.manage`.
- Same-module upload retries remain idempotent; cross-module upload-ID reuse returns a stable 409
  conflict without exposing or renewing the other media record.
- Draft/report link reconciliation validates ownership, stored module, unique count, and stored
  bytes before changing links, locks media deterministically, and runs transactionally.
- Draft deletion, final report create/update, workflow state, versions, timeline entries, and media
  links commit or roll back together.
- Drill V2 validates draft and final shapes separately, preserves legacy/additive data, rejects
  unsupported schema versions and remote photos, and shares explicit limits with the frontend.
- PDF media hydration requires the expected module and exact durable parent link, uses private
  stored image data, prefers thumbnails, and never fetches arbitrary remote URLs.
- Drill PDF V2 renders the complete exercise, personnel, chronology, analysis, photographs, and
  current-revision sign-off sections.
- The reconciliation command is explicit, bounded, dry-run capable, idempotent, and never relabels
  mismatched media.

## Verification evidence

- Local database audit: 33 Inspection media rows, no Drill/ERCO media rows, no orphan final-report
  links, and no schema migration pending. This is development evidence only and does not replace
  the staging/production audit.
- Current local reconciliation dry-runs: ERCO scanned 2 reports and Drill scanned 1 report; all 3
  were already correct, with 0 repairs and 0 rejections. No data was changed.
- Backend focused report/media/PDF regression: **83 passed, 871 assertions**.
- Backend full suite: **517 passed, 3441 assertions**.
- Frontend Drill/shared focused suite: **10 files, 33 tests passed**.
- Targeted frontend ESLint: passed.
- Targeted backend Pint check: passed.
- Frontend production build: passed. Vite reported only the repository's existing dynamic/static
  import and chunk-size advisories.
- Blade view cache compilation: passed.
- Actual DomPDF stress render: passed with ten photos and 250 chronology rows.
- All three supplied DOCX scenarios now round-trip through persisted V2 reports, durable managed
  media links, and the real PDF endpoint. Section mapping and the April eleven-photo exception are
  recorded in `DRILL_REFERENCE_PDF_COVERAGE_V1.md`.
- A representative persisted-style three-page PDF was rendered through Poppler and visually
  inspected. Chronology continuation, fresh-page photograph layout, bounded images, descriptions,
  current-revision sign-offs, and page footers were clean.
- Scoped PDF regression coverage for Drill, ERCO, and Inspection passed.
- Reconciliation coverage passed for dry-run rollback, repair, idempotency, module mismatch, and
  invalid command arguments.
- `git diff --check` found no whitespace errors in either repository.

## Staging execution checklist

Keep Drill uploads disabled until steps 1-4 pass.

1. Back up the database and private report-media storage; confirm image processing and free space.
2. Verify `report_media.module`, `parent_type`, and `parent_key` have no live enum/check constraint,
   then run `php artisan migrate:status` without introducing a Drill migration.
3. Record media, lease, and link counts. Investigate any pre-existing Drill media; do not relabel
   media based on filenames or report content.
4. Run the ERCO reconciliation dry-run with a conservative batch and review every rejected row:

   ```bash
   php artisan report-media:reconcile-reports --module=erco --dry-run --batch=100
   ```

5. Enable Drill uploads only in staging and rebuild the backend configuration cache before
   deploying/testing the frontend upload affordance.
6. Complete upload -> draft -> reload/resume -> submit -> delete draft -> reopen report -> PDF with
   an authorized owner and reviewer, then repeat unauthorized access checks.
7. Test current Android Chrome, a lower-memory Android device, and current iOS Safari. Include
   same-file reselection, ten photos, one failed upload, slow network, retry, cancellation,
   background/foreground return, and expired-session behavior.
8. Advance an unlinked test photo beyond the prune threshold and prove linked final-report media
   survives while the genuinely unlinked media is removed.

## Production canary and rollback

- Deploy linking, authorization, viewing, hydration, and reconciliation support before or with the
  upload flag.
- Run and review the production ERCO dry-run before applying repairs or resuming aggressive prune
  activity.
- Enable Drill upload for a controlled canary only. Monitor upload conflicts, processing duration,
  reconciliation rejection, missing storage objects, PDF memory/time, leases, and prune counts.
- Never log image bytes, base64 values, descriptions, or report narratives.
- First rollback action: set `REPORT_MEDIA_DRILL_UPLOAD_ENABLED=false` and rebuild configuration
  cache. Do not remove support for existing Drill media, relabel rows, or bulk-delete files.
- Stop rollout on unexplained ownership/module mismatches, partial transaction behavior, camera
  return logout/draft loss, PDF memory failure, or any prune of durably linked media.

## Remaining acceptance gates

- Staging reconciliation results recorded with no unexplained anomaly.
- Physical Android and iOS results recorded.
- Successful controlled production canary with stable monitoring.
- Media remains available after draft deletion and a prune cycle beyond the unlinked threshold.
