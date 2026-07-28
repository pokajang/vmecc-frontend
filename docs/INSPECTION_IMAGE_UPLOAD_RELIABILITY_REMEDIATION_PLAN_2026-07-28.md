# Inspection image upload reliability remediation plan

Date: 2026-07-28  
Branch: `fix/inspection-image-upload-reliability`  
Scope: `vmecc-frontend`, `vmecc-backend`, and shared cPanel production configuration

## Implementation status

Implemented on `fix/inspection-image-upload-reliability`:

- one visible queue item and stable upload identity for every selected file;
- sequential, bounded uploads with transient retry and per-file progress/failure feedback;
- explicit inspection-wide capacity failures instead of silent truncation;
- browser preprocessing for ordinary JPEG/PNG/WebP files, with large and unsupported sources
  passed directly to the authoritative server processor;
- persisted eligible upload Blobs for reload recovery and per-file retry;
- final-submission and unsaved-navigation guards while retained items are unresolved;
- verified full-image and thumbnail writes before media-row creation, with atomic cleanup on
  failure;
- batch-correlated backend logs and structured storage failure codes;
- regression coverage for five-file success, mixed partial failure, stable retry identity,
  persistence recovery, failed storage, and five verified backend records.

Production rollout still requires the cPanel checks and physical-device qualification in this
document. Those environment checks cannot be proven by the repository test suite.

## Outcome

Selecting five supported inspection images must create five visible upload items. Every retained
item must either reach a confirmed, durable `uploaded` state or remain visible with a specific,
retryable failure. The application must never silently reduce a five-image selection to two or
three images.

An image may be labelled `uploaded` only after:

1. the normalized full image and thumbnail have been written and verified;
2. the backend media record has been committed;
3. the media reference has been attached to the current inspection draft or report; and
4. the frontend has received and persisted the confirmed media identity.

The form may remain usable while uploads run. Final submission must not proceed while a retained
image is preparing, queued, uploading, attaching, retrying, or failed. A user may explicitly
remove a failed image and continue when the inspection rules allow fewer images.

## Problem statement

All inspection types use the shared photo runtime. The current runtime uploads selected files
sequentially but treats each file independently and returns only successful results. Per-file
failures are swallowed after notification, repeated failures with the same code are collapsed
into one toast, and only the successful subset is committed to the form. The progress UI does not
show a batch summary or failed filenames.

This creates two user-visible failure classes:

1. **Partial attachment:** five files are selected, but only two or three successful uploads are
   added to the inspection.
2. **Broken preview:** five photo records exist, but only two or three stored images or thumbnails
   can be retrieved.

The backend has a separate durability gap. The local filesystem disk is configured with failed
writes returning `false`, while report-media writes do not check their return values. A media row
can therefore be created even when a full image or thumbnail was not stored successfully.

The code also enforces a ten-photo inspection-wide limit across root, finding, equipment, and
defect evidence. A selection can be truncated to the remaining slots without first presenting the
inspection-wide count to the user.

## Reliability contract

### Selection contract

- Represent every selected file immediately, before preprocessing or network work begins.
- Give each file a stable `clientUploadId`; give the selection a shared `batchId`.
- Show selected count, allowed remaining count, completed count, failed count, and pending count.
- Never slice or filter a selection without a corresponding visible result for each rejected file.
- Treat duplicate filenames as distinct files. Use identities and checksums, not filenames.
- If the inspection limit would be exceeded, keep the selection UI open and require the user to
  choose which images to retain.

### Per-file state model

Use explicit states instead of one form-wide processing boolean:

```text
selected
preparing
queued
uploading
server_processing
attaching
uploaded
retry_waiting
failed
cancelled
removed
```

Each queue item must retain:

- `batchId`
- `clientUploadId`
- original filename, MIME type, byte size, and last-modified timestamp
- local preview URL or persisted Blob reference
- target kind, target row/issue identity, section key, and photo field key
- attempt count, next retry time, latest error code, and user-safe message
- upload progress and server media identity
- draft/report attachment confirmation

### Completion contract

A batch is complete only when every retained item is `uploaded`. Partial success is a valid
intermediate state, not a successful batch result. The UI must display, for example:

> 5 selected · 3 uploaded · 1 retrying · 1 needs attention

The final result must be one of:

- `5 of 5 uploaded`;
- `4 of 4 uploaded, 1 removed by user`; or
- an unresolved state that remains visible and prevents final submission.

## Target architecture

```text
File picker/camera
        |
        v
Persistent client queue -- one entry for every selected image
        |
        v
Memory-bounded preparation -- one image at a time
        |
        v
Idempotent per-file upload -- batch ID + client upload ID
        |
        v
Backend validate -> normalize -> thumbnail -> durable write verification
        |
        v
Media DB transaction -> lease -> response
        |
        v
Attach media to latest inspection draft -> confirm attachment
        |
        v
Queue item becomes uploaded
```

Retryable failures return to the queue with bounded exponential backoff. Permanent failures remain
visible until the user replaces or removes the file.

## Workstream 1 — Backend storage durability

Primary repository: `vmecc-backend`

Files expected to change:

- `config/filesystems.php`
- `app/Http/Controllers/ReportMediaController.php`
- `app/Services/ReportImageService.php`
- `app/Services/ReportThumbnailService.php`
- `app/Services/PhotoUploadCapacityService.php`
- report-media feature tests

Changes:

1. Introduce a dedicated private report-media disk with failed writes configured to throw, or
   explicitly check every write result. Avoid changing unrelated disks without reviewing their
   callers.
2. Write the normalized image and thumbnail to unique temporary paths.
3. Verify that both writes succeeded, both files exist, their byte sizes are non-zero, and their
   checksums match the generated content.
4. Move verified files to final paths before committing the media row. Use atomic moves where the
   filesystem supports them.
5. Wrap media-row and lease creation in a database transaction. Delete temporary/final files if
   the transaction fails.
6. Return HTTP 201 only after durable storage and database commit. Never return a media identity
   for a missing file.
7. Confirm the authenticated user can attach every managed media reference. Do not accept a
   media ID owned by another user merely because it belongs to the inspection module.
8. Add structured error codes for full-image write failure, thumbnail write failure, verification
   failure, quota exhaustion, processor unavailability, and cleanup failure.
9. Log `batch_id`, `upload_id`, user ID, module, source, source/normalized bytes, dimensions,
   processor, attempt, outcome, failure code, and duration. Do not log image contents.
10. Extend the health response to report:
    - temporary and permanent storage writability;
    - available bytes and configured reserve;
    - PHP upload/post/input-time/memory limits;
    - GD, EXIF, HEIC/HEIF/AVIF, ImageMagick, and libvips capability;
    - scheduler/prune freshness where it can be measured safely.

Backend acceptance:

- A simulated failed full-image or thumbnail write returns a non-2xx response and creates no
  active media row.
- A retry with the same upload ID returns the same successfully stored media record.
- Two distinct upload IDs with the same filename create two distinct media records.
- An uploaded image cannot be attached by another user.

## Workstream 2 — Batch-aware frontend queue

Primary repository: `vmecc-frontend`

Files expected to change or be introduced:

- `src/services/api/reportMediaApi.js`
- `src/views/inspection/form/useInspectionFormPhotos.js`
- `src/views/inspection/form/inspectionPhotoUtils.js`
- `src/views/inspection/form/components/InspectionFormShell.js`
- `src/views/inspection/form/components/InspectionDisplayShared.js`
- a focused upload queue/reducer module and persistence adapter
- focused API, hook, component, and workflow tests

Changes:

1. Replace the successful-photo-only return value with a batch result that preserves a result for
   every selected file:

   ```js
   {
     batchId,
     items: [
       { clientUploadId, status: 'uploaded', photo },
       { clientUploadId, status: 'failed', failure },
     ],
   }
   ```

2. Add all selected files to UI state synchronously. Do not wait for the first upload response.
3. Process the queue sequentially by default on shared hosting. Keep concurrency configurable for
   future object-storage deployments.
4. Commit each successful photo to the latest form/draft immediately instead of waiting for the
   whole selection to finish.
5. Confirm draft attachment before marking a queue item `uploaded`. If attachment fails, keep the
   uploaded media identity and retry attachment without uploading the bytes again.
6. Use stable target identities rather than stale row objects. Re-resolve the target from the
   latest form before every attachment.
7. Preserve queue items across drawer/modal close. Closing an editor must not cancel unrelated
   uploads.
8. Provide per-file Retry, Remove, and Cancel actions plus Retry all failed.
9. Show aggregate progress and per-file progress. Include filenames in failure feedback.
10. Keep the form usable during upload, but integrate queue readiness with the existing unsaved
    changes and submission readiness guards.
11. Revoke object URLs and release decoded image/canvas memory when queue items complete or are
    removed.

## Workstream 3 — Mobile-safe preprocessing

Primary repository: `vmecc-frontend`, with authoritative validation in `vmecc-backend`

Policy:

- Supported sources: JPEG, PNG, WebP, HEIC, HEIF, and AVIF where a browser or server decoder is
  available.
- Reject SVG, GIF, BMP, TIFF, RAW formats, animated images, empty files, and undecodable content
  with explicit feedback.
- Default maximum source size: 30 MB per file.
- Default maximum source dimensions: 100 megapixels.
- Normalize stored images to JPEG, 1600–2048 px on the long edge, with a target of 500 KB–1 MB and
  a hard maximum of 1.5 MB.
- Strip GPS and unnecessary EXIF metadata; preserve correct visual orientation.

Changes:

1. Inspect size/type before allocating decode memory.
2. Decode and normalize only one image at a time.
3. Feature-detect browser decoding. If HEIC/HEIF/AVIF cannot be decoded safely in-browser, upload
   the original to the server processor.
4. Use a worker/off-main-thread path where supported, with a bounded main-thread fallback.
5. If client normalization fails because of low memory, retain the original queue item and attempt
   the server path. Do not discard the selection.
6. Keep server-side content-based MIME validation, pixel limits, decoding, re-encoding, and
   metadata stripping authoritative.

## Workstream 4 — Limits and inspection-wide capacity

The initial product policy remains ten photos per inspection and 12 MB of normalized stored image
data unless product owners approve a different evidence requirement.

Changes:

1. Calculate and show inspection-wide usage before opening the picker:
   `7 of 10 photos used; 3 remaining`.
2. Count current draft photos, nested row evidence, pending queue items, and server-confirmed items
   exactly once.
3. Reserve capacity for selected queue items so parallel UI flows cannot overbook the limit.
4. Do not silently truncate selections that exceed remaining capacity.
5. Treat size limits as normalized-storage limits after successful processing. Source limits remain
   a server-protection boundary.
6. Apply rate limits by authenticated user and uploaded bytes as well as request count. Return
   `Retry-After` for temporary throttling.

If more than ten images are a genuine inspection requirement, revise the product rule separately.
Do not solve that requirement by removing all limits.

## Workstream 5 — Draft persistence, reload, and offline recovery

1. Persist queue metadata and eligible file Blobs in IndexedDB after selection.
2. Recover pending queue entries on page reload, authentication refresh, browser `pageshow`, and
   application foreground.
3. Treat offline state as `waiting for connection`, not a terminal failure.
4. Retry network errors, 502/503/504, processing locks, and safe timeouts with exponential backoff
   and jitter.
5. Refresh CSRF/session state before retrying authentication-related failures.
6. Never promise background completion after a browser or PWA has been force-closed. Mobile
   operating systems may stop web background work; the recovered queue must resume on next open.
7. Renew or finalize existing media leases while attachment is pending.
8. Merge photo references during draft concurrency resolution. A stale draft save must not replace
   a newer photo list.
9. Save Draft may preserve pending queue metadata. Final submission requires every retained item
   to be attached or explicitly removed.

## Workstream 6 — Shared cPanel production requirements

Because the application uploads one source image per HTTP request, PHP limits apply per image, not
to the full five-image selection.

Recommended starting values:

```ini
file_uploads = On
upload_max_filesize = 32M
post_max_size = 36M
max_input_time = 300
max_execution_time = 180
memory_limit = 256M
max_file_uploads = 20
```

Deployment must verify the effective values used by the domain's PHP-FPM pool. It must also verify:

- Apache, PHP-FPM, CDN, WAF, and reverse-proxy body-size and timeout limits;
- writable PHP temporary and Laravel storage directories;
- sufficient cPanel disk and inode quota with an operational reserve;
- ImageMagick or libvips availability and permission to execute the processor;
- HEIC/HEIF/AVIF delegate availability when those formats are advertised;
- GD and EXIF fallback capability;
- the Laravel scheduler running from cPanel Cron;
- report-media pruning and lease cleanup completing successfully;
- authenticated `/api/report-media/health` returning ready before rollout.

Do not rely on permanently increasing PHP limits for arbitrarily large originals. If the supported
source limit must exceed what the shared host can receive reliably, add resumable 5–8 MB chunk
uploads or move uploads to S3-compatible object storage with presigned multipart requests.

References:

- [cPanel MultiPHP INI Editor](https://docs.cpanel.net/whm/software/multiphp-ini-editor/)
- [PHP file-upload pitfalls](https://www.php.net/manual/en/features.file-upload.common-pitfalls.php)
- [Laravel failed filesystem writes](https://laravel.com/docs/10.x/filesystem#failed-writes)

## Workstream 7 — Observability and support diagnostics

Add one batch-level event and one event per state transition:

- batch selected/completed/abandoned;
- file preparation started/completed/failed;
- request started/retried/completed/failed;
- storage verified/failed;
- attachment completed/failed;
- queue recovered/expired/removed.

Operational dashboards should show:

- selected-to-uploaded completion ratio;
- partial batch rate;
- failure codes by browser family, OS, source MIME, and source-size band;
- p50/p95 preparation, upload, processing, and attachment duration;
- storage write/verification failures;
- media 404 rate;
- retry recovery rate;
- quota headroom and orphan cleanup volume.

The UI should expose a copyable diagnostic reference containing only batch ID, upload IDs, safe
environment capability information, and error codes.

## Workstream 8 — Test and qualification matrix

### Frontend automated tests

- five successful files produce five queue items and five attached photos;
- mixed result `success, failure, success, failure, success` retains all five item results;
- repeated failure codes remain visible per filename;
- a retry reuses the same upload ID and does not duplicate media;
- attachment retry does not re-upload bytes;
- selection above remaining capacity is not truncated;
- form changes during upload merge with the latest photo list;
- final submission is blocked while retained items are unresolved;
- object URLs and abort controllers are cleaned up;
- offline/reload recovery resumes eligible items.

### Backend automated tests

- full-image and thumbnail write failures are atomic;
- missing or checksum-mismatched storage cannot return 201;
- idempotent replay returns a verified existing row;
- image format, size, dimensions, animation, and decode failures have stable codes;
- processing lock, rate limit, quota, and disk-reserve failures return retry metadata;
- ownership is enforced during attachment;
- prune does not remove attached or actively leased media.

### Browser and physical-device qualification

At minimum:

- current iOS Safari and installed PWA;
- current Android Chrome and Samsung Internet;
- desktop Chrome, Edge, Firefox, and Safari;
- JPEG, PNG, WebP, HEIC/HEIF, and AVIF samples;
- portrait/landscape EXIF orientations;
- five ordinary photos, ten ordinary photos, and mixed-size batches;
- one 25–30 MB source photo;
- one corrupt file and one unsupported file within a valid batch;
- slow connection, mid-upload disconnect, offline selection, session expiry, and page reload;
- low-storage and failed-write server simulations;
- camera capture, gallery selection, root evidence, finding evidence, and every structured
  inspection row/defect target.

## Delivery phases

### Phase 0 — Reproduction and telemetry

- Add batch identity and structured per-file diagnostics.
- Capture whether reported incidents are partial uploads, capacity rejection, attachment loss, or
  media retrieval failures.

Exit criterion: a five-file attempt can be reconstructed end-to-end without using filenames as
identities.

### Phase 1 — Required correctness

- Make storage writes atomic and verified.
- Preserve every selected file as a queue item.
- Add per-file results and batch summary.
- Attach each successful file immediately.
- Block final submission on unresolved retained items.
- Make capacity rejection explicit.

Exit criterion: five supported files on a healthy connection result in five durable, attached,
reload-safe media records.

### Phase 2 — Recovery and mobile resilience

- Add memory-bounded client normalization.
- Add retries, attachment-only recovery, IndexedDB persistence, and offline waiting.
- Complete physical-device qualification.

Exit criterion: interrupted supported uploads can be recovered without reselecting successful
files.

### Phase 3 — Hosting scale option

- Add chunked uploads or direct object-storage multipart uploads only if observed source sizes,
  concurrency, or cPanel resource limits require them.

Exit criterion: the documented larger-source policy is reliable without increasing shared-host
request limits beyond safe values.

## Rollout and rollback

1. Protect the new queue and attachment workflow with a temporary feature flag.
2. Deploy backend durability and backward-compatible response fields first.
3. Verify production media health and cPanel limits.
4. Enable the frontend queue for internal users, then a small user cohort.
5. Compare batch completion, retry recovery, media 404, and draft conflict metrics.
6. Expand only when five-image completion and reload persistence meet the acceptance thresholds.
7. Retain the old frontend path for one release as rollback, but do not roll back the backend
   storage-write verification.

## Definition of done

- Selecting five supported images displays five distinct queue items immediately.
- On a healthy supported path, all five become uploaded and remain visible after reload.
- Every uploaded label corresponds to verified full and thumbnail files, a media row, and an
  inspection attachment.
- No failed, rejected, or over-capacity file disappears silently.
- Recoverable failures can be retried without duplicate media.
- Final submission cannot hide unresolved retained images.
- All inspection types and photo targets use the same reliable behavior.
- Shared cPanel configuration and scheduler requirements are documented and verified in the
  deployment checklist.
- Automated and physical-device qualification passes for the defined browser, format, batch,
  network, and storage matrix.

## Non-goals

- Unlimited image counts or unbounded source sizes.
- Preserving original RAW or full-resolution source files as inspection evidence.
- Guaranteed upload completion after the operating system force-closes the browser/PWA.
- Replacing shared cPanel storage with object storage before measurements show it is required.
