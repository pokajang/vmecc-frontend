# Drill Upgrade - Hardened Backend and PDF Execution Plan

## 1. Purpose and release boundary

This plan covers the backend and PDF work deferred from Drill UI/UX V1. Its primary goal is to
make Drill managed photographs durable and authorized throughout upload, server draft, final
submission, update, review, download, deletion, and pruning. Its secondary goal is to bring the
generated Drill PDF to the same content coverage as the supplied DOCX reports.

Do not treat frontend browser tests with mocked media responses as backend acceptance. Production
acceptance requires persisted media records and links, a generated PDF from a persisted Drill V2
record, and physical mobile-device checks after deployment to staging.

The work should be delivered in two independently testable releases if needed:

1. **Backend media and Drill payload contract** — required before enabling live Drill uploads.
2. **Drill PDF V2** — may follow after media durability is proven.

Do not enable `module=drill` uploads before the complete draft and final-report link lifecycle is in
place. Enabling upload first would create media that can lose its lease without gaining a durable
final-report link.

## 2. Current-state audit

The following findings are confirmed against the current backend code.

| Area                      | Current behavior                                                                                                                     | Risk if only the obvious allowlist is changed                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Upload validation         | `ReportMediaController` accepts only `inspection,erco`.                                                                              | Drill uploads fail with 422.                                                                   |
| Link service              | `ReportMediaService::syncPayloadLinks()` supports only Inspection and ERCO.                                                          | Drill drafts and reports cannot obtain durable links.                                          |
| Draft save                | Draft create/update already calls `syncPayloadLinks()` for every report type.                                                        | It will work for Drill only after service support is added.                                    |
| Final create/update       | `ReportController` calls media sync only inside the Inspection branch.                                                               | Drill and ERCO final records can retain payload IDs without final-report links.                |
| Media viewing             | `ReportMediaAuthorizationService::REPORT_PERMISSIONS` omits Drill.                                                                   | Owners can view their own media, but authorized Drill reviewers cannot.                        |
| Upload authorization      | The upload endpoint validates module text but does not enforce the module-specific report permission.                                | Any authenticated user may attempt uploads under an enabled module.                            |
| Drill write authorization | Generic report create and draft endpoints do not consistently call the managed-module permission check for non-Inspection types.     | A media-only permission fix could leave Drill draft/report writes less protected than uploads. |
| Upload idempotency        | `client_upload_id` is unique per user, not per module. Existing uploads are replayed without checking the requested module.          | Reusing an upload UUID across modules can return the wrong module's media.                     |
| Draft deletion            | Draft links are removed before draft deletion and outside one encompassing transaction.                                              | A failure between operations can leave a draft referencing unlinked, prunable media.           |
| Link reconciliation       | The service validates before deleting old links, but transaction ownership is left to callers.                                       | A new caller could invoke reconciliation without an atomic parent update.                      |
| Media discovery           | The service recursively treats any nested `mediaId` or `data:image` value as a photograph.                                           | A malformed Drill payload can link media outside the intended photo collection.                |
| PDF hydration             | Existing hydration looks up media by public ID without requiring the media to be linked to the requested report or match its module. | A malicious or historical payload could embed unrelated private media.                         |
| Drill PDF controller      | It does not use the media service.                                                                                                   | Managed Drill photos cannot render.                                                            |
| Drill PDF template        | It renders only basic overview, details, chronology, and generic sign-offs.                                                          | Drill V2 fields and photographs are absent.                                                    |
| PDF sign-offs             | The template selects the first matching timeline action without respecting the current revision.                                     | A resubmitted report can display stale review/approval actors.                                 |
| Database schema           | `report_media.module` is a normal `varchar(32)` and parent links are generic strings.                                                | No schema migration is expected merely to add `drill`.                                         |

Two related behaviors must be protected during implementation:

- Inspection media already has extensive session/check-row behavior and must remain unchanged.
- ERCO upload and draft linking already exist, but final-report linking is missing. Moving generic
  final sync outside the Inspection branch will activate the intended ERCO final lifecycle too;
  characterize and test ERCO before making that move.

## 3. Non-negotiable invariants

These invariants apply to every implementation phase.

1. A media row keeps the module assigned at upload. Never relabel Inspection or ERCO media as
   Drill, and never make the frontend upload Drill photos under `erco`.
2. The server trusts `mediaId`, authenticated ownership, stored module, stored size, and durable
   links. It does not trust client-supplied URL, byte size, MIME type, dimensions, checksum, lease,
   owner, workflow actor, or workflow date.
3. A server draft may link media, but final submission must create a separate `report` link before
   the draft is cleared.
4. Removing a draft link must never remove a valid final-report link.
5. Removing a photo from a report reconciles only that report's links. Physical files are deleted
   later by the established unlinked-media pruning policy.
6. Failed create/update/link validation must roll back payload, version, timeline, workflow fields,
   and links together.
7. A reviewer may view linked media only when the same report permission would allow that reviewer
   to read the parent report.
8. New Drill V2 submissions use managed media. Legacy records remain readable, but arbitrary
   remote image URLs are never fetched by the PDF renderer.
9. Inspection and ERCO behavior must have regression coverage before and after shared-service
   changes.
10. Backend validation must remain compatible with the frontend contract; do not silently invent
    required fields or limits that the frontend cannot explain before submission.

## 4. Phase 0 - Baseline, data audit, and migration decision

### 4.1 Freeze authoritative fixtures

Before changing code, add or retain fixtures for:

- A legacy Drill payload without `schemaVersion`.
- A complete Drill V2 server-draft payload using editable fields such as
  `respondingAttendance`.
- A complete final Drill V2 payload using `respondingTeam.attendance`.
- A Drill V2 payload with ten managed photos and full lease/checksum metadata.
- An ERCO payload with managed photos.
- An Inspection report/session payload with nested defect photos.

Use the same fixture content in request, persistence, link, and PDF tests where practical. Avoid
slightly different hand-built contracts across test classes.

### 4.2 Run baseline tests

Record the results before implementation:

```bash
php artisan test --filter=ReportMediaHardeningTest
php artisan test --filter=ReportDraftApiTest
php artisan test --filter=ReportApiWorkflowTest
php artisan test --filter=InspectionPayloadGuardrailsTest
php artisan test --filter=InspectionSessionApiTest
php artisan test --filter=ErcoReportPdfTest
php artisan test --filter=DrillReportPdfTest
```

Do not proceed past a failing baseline without identifying whether the failure predates this work.

### 4.3 Audit existing production-like data

Use read-only queries or a dry-run command to count:

- Media rows grouped by module.
- ERCO final reports containing managed `mediaId` values but lacking `report` links.
- Unexpected existing `module=drill` rows.
- Media IDs referenced by more than one owner or mismatched module.
- ERCO records exceeding ten unique managed photos or 12 MB stored total.
- Final report links whose parent report no longer exists.

Do not infer that existing ERCO media should become Drill media from filenames or payload text.
Quarantine anomalies for manual review.

### 4.4 Migration verdict

The repository schema uses strings for `report_media.module`, `parent_type`, and `parent_key`;
therefore this change should require **no database migration**. Before production deployment, verify
the live schema has no out-of-repository enum or check constraint and run `php artisan
migrate:status`.

If the live schema differs, stop and create a separate additive migration. Do not edit an already
executed migration. No data relabelling migration is permitted.

## 5. Phase 1 - Central media-module policy

Replace duplicated literal allowlists with one authoritative registry, preferably configuration or
a small policy class. It must distinguish between a module being supported throughout the media
lifecycle and new uploads being temporarily enabled.

The registry must define at least:

```text
inspection  -> reports.inspection.view
erco        -> reports.erco.view
drill       -> reports.drill.view
```

Required operations:

- `isSupported(module)` for linking, viewing, and existing-media durability.
- `isUploadEnabled(module)` for the upload endpoint.
- `permissionFor(module)` for authorization.

Use a dedicated `REPORT_MEDIA_DRILL_UPLOAD_ENABLED` rollout flag that defaults to `false`.
Disabling new Drill uploads must not disable linking, viewing, PDF
hydration, or cleanup for Drill media that already exists.

Do not add `fitness-test` merely because it is a report type; it has no approved media contract in
this scope.

## 6. Phase 2 - Upload, authorization, and idempotency

### 6.1 Upload request

Update `ReportMediaController::store()` to:

1. Normalize the module key once.
2. Validate it against upload-enabled entries in the central registry.
3. Require `reports.manage` or the registry's module-specific view permission using the existing
   assignment-aware authorization service.
4. Preserve all established file, source, UUID, capacity, image-normalization, thumbnail, and
   concurrency controls.
5. Store `module=drill` exactly as `drill`.

Return the established structured 403/422 behavior; do not expose whether another user's upload
UUID or media ID exists.

### 6.2 Idempotent replay

For both the normal existing-row path and the unique-constraint recovery path:

- Lock or reload the existing media row.
- Verify its stored module equals the requested normalized module.
- If it differs, return a deterministic conflict such as HTTP 409 with code
  `upload_id_module_conflict`.
- Do not renew a lease or return metadata on a cross-module conflict.
- Preserve same-user, same-module replay behavior and the original media identity.

Tests must cover both the early replay path and the race/unique-constraint recovery path where
practical.

### 6.3 Media viewing

Add Drill to module-to-permission authorization. Test:

- Owner can view full image and thumbnail.
- Authorized Drill reviewer can view media linked to a readable Drill report.
- A user without Drill/report access receives 404, consistent with current anti-enumeration
  behavior.
- ERCO/Inspection permission alone does not grant Drill media access.
- Draft media remains visible only to its draft owner.

Do not broaden Drill PDF download ownership in this phase; current PDF endpoints are owner-scoped.
Any reviewer-download requirement needs a separate authorization decision and tests.

### 6.4 Related Drill write authorization

Do not secure only the upload endpoint while leaving its parent writes inconsistent. Characterize
the existing report/draft authorization behavior, then require the existing assignment-aware
`reports.manage|reports.drill.view` permission for Drill draft creation/update/deletion and Drill
report creation/update/deletion. Preserve owner scoping as an additional requirement; module
permission must not let one ordinary owner edit another owner's report.

Keep current owner-read semantics unchanged unless product policy explicitly requires access to
disappear when a permission is revoked. Do not conflate module activation settings with
authorization in this change.

## 7. Phase 3 - Atomic link lifecycle

### 7.1 Make reconciliation safe as a service boundary

Extend `ReportMediaService` support to Drill through the central registry. Preserve the special
Inspection draft multiplier. For Drill and ERCO, retain the report-wide limits of ten unique photos
and 12 MB stored bytes.

Harden reconciliation as follows:

- Extract/validate all candidate media before deleting existing links.
- Sort public IDs before row locking to reduce deadlock risk.
- Load media in one query and validate stored owner, module, and byte totals.
- Reconcile links inside a database transaction even if a caller forgets to open one; nested use
  from report/draft transactions must remain safe.
- Delete only links matching the exact `(parent_type, parent_key)`.
- Release leases only for media successfully linked during the committed transaction.
- Emit a structured reconciliation log with module, parent type, counts, and outcome, but no image
  bytes, descriptions, or personal filenames.

For Drill V2, validate only `postIncidentAnalysis.photos` as the approved photo collection before
calling the generic link service. Do not broaden the existing recursive Inspection traversal in the
same change. Add characterization tests before changing recursive collection behavior for any
existing module.

### 7.2 Draft create and update

The existing draft create/update calls are correctly positioned inside database transactions. Once
Drill is supported, prove that they:

- Create a `report_draft` link for each valid Drill media ID.
- Reconcile removed and added photos.
- Leave the prior payload, version, saved timestamp, and links unchanged on invalid/unauthorized
  media.
- Preserve the optimistic-version conflict response without changing links.
- Never require the client lease fields to authorize a link.

### 7.3 Draft deletion

Harden both bulk-by-type and by-ID draft deletion so locking the owned draft, removing its exact
links, and deleting the draft occur in one database transaction. For bulk deletion, operate on the
owned, selected report type only and use a bounded/locked set.

Tests must inject or simulate a failure between link removal and row deletion and prove the
transaction rolls back both. Deleting a draft after final submission must leave the final `report`
link untouched.

### 7.4 Final report create and update

Keep Inspection check-row synchronization inside the Inspection-only branch. Move the generic
report media reconciliation to a separate supported-media-module branch inside the same outer
report transaction:

```text
create/update report payload and workflow timeline
if Inspection: synchronize Inspection check rows
if report type supports report media: reconcile report media links
commit everything together
```

This must activate final linking for both ERCO and Drill without running Inspection row logic for
them.

Required failure semantics:

- Invalid, wrong-owner, or wrong-module media returns 422.
- Create failure leaves no report, timeline, workflow history, or report link.
- Update failure leaves the previous payload, status, version, revision, workflow fields, timeline,
  and links unchanged.
- A repeated `submission_key` returns the original report without duplicating links.
- A successful resubmission reconciles links exactly once.

### 7.5 Deletion and pruning

Keep report deletion and exact report-link removal in one transaction. Do not immediately delete
media files when a photo is removed from a report or draft. The established prune command should
delete a file only when:

- It has no remaining links of any parent type.
- It has no active lease.
- It is older than the configured threshold.

Add a lifecycle test covering:

```text
upload -> lease -> Drill draft link -> Drill report link -> delete draft
-> media survives -> remove from report -> no links -> prune after threshold -> files deleted
```

Also prove that a report link prevents owner deletion through the media endpoint.

## 8. Phase 4 - Drill V2 payload validation

Implement a focused Drill payload validator/service rather than adding Drill conditionals throughout
`ReportController` and `ReportDraftController`. Validation should be non-destructive: preserve
unknown additive fields and legacy payloads rather than rebuilding the payload from an allowlist.

### 8.1 Schema compatibility

- Missing or version-1 schema: retain legacy read/update compatibility and do not require V2-only
  fields.
- `schemaVersion: 2`: apply the complete V2 shape and submission rules.
- Unsupported future schema versions: reject writes with a clear 422 code instead of silently
  normalizing them as V2.
- Never mutate existing stored legacy records merely because they were read or downloaded.

### 8.2 Draft versus final record shapes

The validator must deliberately support two related shapes:

- **Server draft:** editable `respondingTeamName`, `respondingTeamShift`, and
  `respondingAttendance`, including `present: false` rows.
- **Final report:** `respondingTeam: { name, shift, attendance }`, produced by the frontend record
  factory.

Draft validation allows incomplete required text and partially entered repeatable rows so users can
save progress. It still enforces safe types, array bounds, media ownership/module, and payload size
constraints. Submit/update validation enforces the same business rules as the frontend.

### 8.3 V2 submission rules

Required on final submission:

- Primary Drill Type (`incidentType`).
- Condition (`weather`).
- Location.
- Exercise date and start time.
- Scenario/details.
- Outcome summary.
- At least one chronology row with both time and action.

Additional rules:

- `reportDate` and optional issuance date use `YYYY-MM-DD`.
- `reportTime` and chronology times use valid `HH:MM` values.
- Every non-empty ERP row has both annex number and title.
- Exclusive roles `SC`, `ASC`, `TRT1`, `TRT2`, `TRT3`, and `TRT4` occur at most once among
  present/final participants.
- Categories are distinct approved category values.
- Empty optional rows are ignored; partially completed required pairs are rejected.
- `postIncidentAnalysis.photos` contains at most ten entries and no duplicate managed media IDs.
- New V2 photo entries require a managed Drill `mediaId`; client URLs and lease metadata are
  informational only.
- Arbitrary HTTP(S) photo URLs are rejected for new V2 writes.

Keep analysis text and photographs optional, matching frontend V1.

### 8.4 Resource limits

Set explicit, documented limits to protect JSON parsing, PDF generation, and database size. Before
enforcing any limit, add the matching frontend guard or verify the existing UI cannot exceed it.
Recommended upper bounds for contract review are:

- 4 exercise categories.
- 25 objectives and 25 ERP references.
- 100 personnel rows.
- 250 chronology rows.
- 50 rows in each analysis list.
- 10 photos and 12 MB of unique stored managed-media bytes.
- 190 characters for identifiers/names/types/locations, 500 for ERP titles, 2,000 per list item or
  photo description, 4,000 per chronology action, and 20,000 for scenario/summary narratives.

Treat these as one coordinated frontend/backend contract change. Do not deploy a backend-only cap
that silently blocks data the current UI allows users to enter.

### 8.5 Backend-owned workflow fields

Do not trust client `timeline`, status, owner, prepared/reviewed/approved actors, or workflow dates.
The report controller and timeline table remain authoritative. PDF and API response construction
must overwrite any payload copies with canonical server data. Add a forged-client-timeline test.

## 9. Phase 5 - Existing-link reconciliation

Because ERCO final syncing is currently skipped, existing final ERCO reports may reference managed
media without a durable `report` link. Do not hide this repair inside a schema migration.

Create an idempotent, resumable console command with `--dry-run`, explicit `--module`, and bounded
batch size. It should:

1. Consider only supported report types explicitly requested by the operator.
2. Reuse the same ownership/module/count/byte validation as live reconciliation.
3. Add missing final-report links without removing valid draft or other-parent links.
4. Report anomalies and skip them rather than relabelling or guessing.
5. Produce counts for scanned, already correct, repaired, and rejected records.

Expected Drill backfill count is zero because the upload endpoint previously rejected Drill. If
unexpected Drill media exists, stop for manual investigation. Run the ERCO dry-run before enabling
pruning after deployment.

## 10. Phase 6 - Secure PDF media hydration

### 10.1 Replace unscoped hydration

Do not call the current unscoped `hydratePayloadForPdf(array $payload)` for Drill. Introduce a
parent-scoped method whose inputs include payload, parent type, parent key, and expected module.

The method must:

- Collect managed IDs from the approved payload photo path.
- Query all media in one batch, constrained by stored module and a matching durable parent link.
- Use stored MIME type and bytes, never the client URL.
- Prefer the normalized private thumbnail for PDF memory safety, with a controlled full-image
  fallback only when a thumbnail is unavailable.
- Verify the storage object exists; omit or mark a missing image without failing the whole PDF.
- Preserve the client description only as escaped text.
- Never fetch HTTP(S), `file://`, or other arbitrary schemes; keep DomPDF remote loading disabled.
- Avoid logging image bytes or base64 data.

Migrate Inspection and ERCO PDF callers to the scoped method in the same change or retain their old
method behind characterization tests until migrated. Do not leave a public unscoped method as the
default path after all callers are converted.

For legacy inline `data:image` values, use a separate sanitizer with strict MIME/base64 decoding and
combined byte caps. Do not grant legacy remote URLs an exception.

### 10.2 Drill PDF controller

Inject the media service and hydrate only media linked to the selected owner-scoped Drill report.
Preserve current report UID, version-conflict, permission, filename, no-store, `nosniff`, and
DomPDF remote-disabled behavior.

Continue deriving timeline data from `report_timeline_entries`, not payload timeline data.

### 10.3 Current-revision sign-offs

Build Prepared By, Station Commander Review, and VMM Review from canonical timeline entries for
the current report revision:

- Prepared By: current-revision `Submitted` or `Resubmitted` entry.
- Station Commander Review: current-revision `Reviewed` entry.
- VMM Review: current-revision `Approved` entry.
- Rejection: current-revision `Rejected` entry when applicable.

Select the latest matching action within the revision. Never display an approval from a previous
revision after resubmission. Use backend actor snapshots, timestamps, and remarks; labels are Drill
presentation labels and do not redefine authorization roles.

## 11. Phase 7 - Drill PDF V2 template

Render only non-empty sections for legacy compatibility. The V2 template must cover:

1. Exercise date/time and report issuance date.
2. Primary Drill Type and exercise categories as separate concepts.
3. Condition and location.
4. Exercise title and scenario/details.
5. Objectives.
6. Multiple ERP/Annex number-title references.
7. Exercise personnel with name, organisation/team role, exercise role, and team where present.
8. Outcome summary.
9. Chronology in entered order; do not silently sort times.
10. Strengths.
11. Resources/equipment/consumables mobilised.
12. Improvement opportunities.
13. Up to ten linked managed photographs with escaped descriptions.
14. Prepared By, Station Commander Review, and VMM Review with current-revision actors and dates.

DomPDF layout safeguards:

- Use tables/block layout rather than browser-only grid behavior.
- Repeat chronology table headers across pages.
- Do not apply `page-break-inside: avoid` to sections that can exceed one page.
- Keep photo dimensions bounded and use two-column layout only when it remains readable on A4.
- Keep individual photo/description units together where practical.
- Test long narratives, 250 chronology rows, long names, ten photos, and missing optional sections.
- Escape all user-entered text and never output raw HTML from payload fields.
- Do not place meaningful content beneath the fixed footer area.

## 12. Automated test plan

### 12.1 Media upload and authorization

- Authorized Drill camera and upload sources create `module=drill` media with thumbnail, checksum,
  lease, and idempotency metadata.
- Unauthorized users cannot upload under Drill.
- Same-user/same-module UUID replay returns the original row.
- Cross-module UUID replay returns `upload_id_module_conflict` and does not renew or expose media.
- Wrong-owner and wrong-module media cannot link to Drill.
- Drill reviewer access follows `reports.drill.view`; ERCO/Inspection-only access does not.

### 12.2 Draft and final lifecycle

- Drill draft create/update links and reconciles photos.
- Draft optimistic conflict changes neither payload nor links.
- Atomic draft deletion rolls back on injected failure.
- Final create links photos in the same transaction as report/timeline creation.
- Final update adds/removes links and increments version only on complete success.
- Invalid media causes full create/update rollback.
- Submission-key replay does not duplicate or lose links.
- Draft deletion after submission preserves final media.
- Report deletion removes only its report links.
- Prune deletes only old, unleased, fully unlinked media and both stored image variants.
- ERCO final linking gains equivalent coverage; Inspection link tests remain green.

### 12.3 Payload contract

- Complete V2 draft and final shapes pass.
- Drafts can save incomplete user progress.
- Final required fields and chronology rules match frontend validation.
- Partial ERP rows, duplicate exclusive roles, malformed dates/times, unknown schema, remote URLs,
  duplicate media IDs, excessive counts, and oversized stored totals fail with stable 422 errors.
- Legacy payloads remain readable and existing legacy records can still be downloaded.
- Client-forged workflow actors/timeline never appear as canonical sign-offs.
- Users without the Drill module permission cannot create/update/delete Drill drafts or reports,
  even if they can guess request shapes or identifiers.

### 12.4 PDF

- Controller uses owner-scoped, linked Drill media only.
- Unlinked, wrong-module, wrong-owner, missing-file, and remote-URL photos are not embedded.
- Managed thumbnails and descriptions render.
- Every Drill V2 field appears when populated and empty V2 sections disappear for legacy records.
- Current-revision sign-offs exclude stale prior approvals after resubmission.
- PDF response headers, version conflict, permission, and owner scope remain correct.
- An actual DomPDF render succeeds for ten photos, long text, and multi-page chronology—not only a
  mocked wrapper or Blade token test.

### 12.5 Required regression suites

After focused tests pass, run at least:

```bash
php artisan test --filter='ReportMediaHardeningTest|DrillReportMediaLifecycleTest'
php artisan test --filter='ReportDraftApiTest|ReportApiWorkflowTest|DrillPayloadValidationTest'
php artisan test --filter='InspectionPayloadGuardrailsTest|InspectionSessionApiTest'
php artisan test --filter='ErcoReportPdfTest|DrillReportPdfTest|InspectionReportPdfTest'
php artisan test
```

Run static analysis/formatting commands required by the backend repository. A narrow green Drill
test is not sufficient because shared report media and report transaction paths have a high blast
radius.

## 13. Execution order and merge gates

### Gate A - Characterization

- Baseline suites pass.
- Production-like data audit is recorded.
- No unexpected schema constraint or unexplained Drill media rows exist.

### Gate B - Media core with Drill upload still disabled

- Central registry, authorization, idempotency conflict, atomic reconciliation, final report links,
  and draft deletion hardening are implemented.
- Drill, ERCO, and Inspection lifecycle tests pass.
- `REPORT_MEDIA_DRILL_UPLOAD_ENABLED` remains false outside test/staging.

### Gate C - Drill validation

- Draft and final shapes are distinguished.
- Frontend/backend limits and messages agree.
- Legacy compatibility and full rollback tests pass.

### Gate D - Staging upload enablement

- Enable Drill upload only in staging.
- Complete upload -> draft -> resume -> review -> submit -> delete draft -> reopen report.
- Confirm reviewer image access and pruning safety.

### Gate E - PDF V2

- Scoped hydration and current-revision sign-offs pass security tests.
- Actual multi-page PDF render passes.
- All three supplied DOCX examples are recreated from persisted V2 records and compared section by
  section.

### Gate F - Production canary

- Deploy supported linking/viewing code before or with upload enablement.
- Run the reconciliation dry-run before resuming aggressive pruning.
- Enable Drill uploads for a controlled canary user/session.
- Observe upload, reconciliation, authorization, PDF, storage, and prune logs before wider rollout.

## 14. Deployment, observability, and rollback

### 14.1 Pre-deployment

- Back up the database and private report-media storage according to normal deployment policy.
- Confirm free disk space and image-processing health endpoint.
- Record counts of media, leases, and links by module/parent type.
- Rebuild/verify configuration cache so the upload flag and module registry are effective.

### 14.2 Observability

Monitor:

- Drill upload success/failure codes and processing duration.
- `upload_id_module_conflict` occurrences.
- Link reconciliation failures and rejected ownership/module references.
- Media lease creation/release and prune counts.
- Missing storage objects during PDF hydration.
- PDF generation duration, memory failures, and output errors.
- Unexpected increases in unlinked Drill media.

Never log photo bytes, base64 content, narrative descriptions, or other sensitive report payloads.

### 14.3 Safe rollback

The first rollback action is to disable **new Drill uploads** through configuration. Do not disable
support for linking, viewing, scoped PDF hydration, or cleanup of already-created Drill media.

Do not roll back the database by deleting Drill media rows or relabelling them. Existing drafts and
reports must remain able to reconcile and display their media. If PDF V2 alone fails, roll back or
feature-disable the PDF presentation independently while preserving media durability.

Pause the prune scheduler during an uncertain rollback only if link integrity is in question; do
not use manual bulk deletion as a recovery shortcut.

## 15. Manual staging and device acceptance

After backend staging deployment, record OS/browser versions and results for:

- Lower-memory Android Chrome camera capture and return.
- Current Android Chrome camera capture and return.
- iOS Safari camera capture and return.
- Embedded-browser detection and upload fallback.
- Same-file reselection.
- Multiple photos with one failed upload.
- Slow network, timeout, retry, cancellation, background/foreground return, and expired session.
- Ten-photo report with long chronology.
- Draft save, full reload/resume, review, submit, draft deletion, record reopening, and PDF download.
- Reviewer access versus an unauthorized user's access.

The pass condition is not merely that upload returns 201. The authenticated session must remain
usable, form text must survive, the photo must remain linked after draft deletion, and the final PDF
must contain the correct linked image and description.

## 16. Definition of done

Backend/PDF delivery is accepted only when:

- Drill upload is permission-checked, idempotent, module-correct, and feature-gated.
- Drill media links round-trip through server drafts and final create/update transactions.
- Failed writes cannot partially change reports, workflow history, versions, drafts, or links.
- Draft deletion and pruning cannot remove media still linked to a final report.
- Drill reviewers can view authorized linked media and unauthorized users cannot.
- Drill V2 validation matches frontend rules while preserving legacy records.
- Final ERCO linking and all existing Inspection behavior remain stable.
- PDF hydration requires the correct report link and module and never fetches arbitrary remote URLs.
- Drill PDF V2 renders all meaningful reference-document content and current-revision sign-offs.
- Focused and full backend suites pass.
- Reconciliation dry-run contains no unexplained anomalies.
- Physical Android/iOS staging results are recorded.
- Submitted media remains available after draft deletion and a prune cycle beyond the unlinked
  threshold.

## 17. Stop conditions

Stop implementation or rollout instead of improvising if:

- The live database has an enum/check constraint not represented by repository migrations.
- Existing ERCO/Drill media ownership or module mismatches cannot be explained safely.
- Moving final link synchronization changes Inspection check-row behavior.
- Draft or report failure tests show any partial payload/version/timeline/link commit.
- A payload limit cannot be aligned with the frontend before deployment.
- Scoped PDF hydration requires remote URLs or unlinked media to reproduce current reports.
- Ten-photo PDF generation exceeds acceptable memory/time limits even with thumbnails.
- Staging camera return causes logout, draft loss, or repeated upload instability.
- Pruning removes media that still has any durable parent link.

## 18. Expected files and change discipline

Likely backend touch points:

- `config/report_media.php`
- A small central report-media module policy/registry if configuration alone is insufficient.
- `app/Http/Controllers/ReportMediaController.php`
- `app/Services/ReportMediaAuthorizationService.php`
- `app/Services/ReportMediaService.php`
- `app/Http/Controllers/ReportDraftController.php`
- `app/Http/Controllers/ReportController.php`
- A focused Drill payload validator/service.
- `app/Http/Controllers/DrillReportPdfController.php`
- `resources/views/pdf/drill_report.blade.php`
- A dry-run reconciliation command.
- Focused media, payload, lifecycle, PDF, and regression tests.

Do not combine unrelated report-shell, Inspection UI, ERCO redesign, workflow-policy, or storage
architecture refactors into this delivery. No schema migration should be added unless Phase 0 proves
the live schema requires one.
