# Inspection Remediation V1

## 1. Purpose

This document is the audited implementation and release plan for hardening the complete inspection workflow across:

- Fire Extinguisher (FE)
- Hydraulic equipment
- Emergency Response Auxiliary (ER Aux)
- High Angle Rescue
- SCBA and custom SCBA sections
- Fire Response Team (FRT) daily and one-off checks
- General, HSE, and registry-driven inspection types that use the shared workflow

The target lifecycle is:

```text
Open inspection
-> edit/check an item
-> optionally capture or upload photos
-> save locally
-> sync the draft or FE session result
-> review
-> recover from retryable failures
-> submit exactly once
-> reset reliably when requested
-> retain valid media and records
```

The plan covers frontend and backend changes. Although this file lives in the frontend inspection folder, several release blockers are backend contract problems and cannot be fixed safely in the frontend alone.

## 2. Current Baseline and Non-Negotiable Constraints

At the time of this audit, both repositories contain uncommitted inspection work.

Frontend work includes the shared photo flow, persistent photo drawer behavior, reset UI changes, FE retry changes, inline validation feedback, tests, and regenerated tracked `build/` assets. Backend work includes managed-media draft handling, transactional media linking, media deduplication, and related feature tests.

Before starting remediation:

1. Preserve all existing user changes and unrelated work.
2. Record `git status --short`, `git diff --stat`, and the relevant focused test results for each repository.
3. Review the existing source diff separately from generated `build/` churn.
4. Do not discard, reset, or mass-format the dirty worktrees.
5. Use small commits divided by contract or capability. Do not produce one large cross-cutting commit.
6. Keep database changes additive and safe for a shared-hosting deployment where application and migration rollback may not be instantaneous.
7. Treat local persistence as user data. Never clear an old queue merely because a new queue implementation exists.

The previously observed frontend inspection run had 634 behavioral tests passing and 40 stale snapshots in `InspectionFormBodySections.matrix.test.jsx`. Snapshot regeneration is not a substitute for reviewing the intended UI changes.

## 3. Audited Risks in the Earlier Plan

The original remediation direction is sound, but the following execution mishaps must be prevented.

### 3.1 Changing the FE client ID alone does not provide idempotency

The current backend stores only the latest `client_result_id` on an extinguisher result. Generating a fresh ID for each edit fixes the immediate deterministic-ID bug, but it introduces another replay hazard:

1. Operation A succeeds.
2. Operation B succeeds and replaces the row's latest client ID.
3. A delayed retry of operation A arrives.
4. The row no longer carries A's ID, so A can be applied again over B.

Remediation must therefore include a durable, uniquely indexed operation ledger. Browser UUID generation by itself is insufficient.

### 3.2 A generic 409 cannot represent all conflicts

The current FE paths can treat any 409 containing row data as success and remove local work. A 409 can instead mean stale version, another inspector completed the row, a closed session, or an idempotent replay. Each outcome requires a distinct stable error code and frontend action.

### 3.3 Optional-photo changes must be atomic at the contract level

Changing only frontend validation makes Review appear ready while backend submission returns 422. Changing only backend validation leaves users unnecessarily blocked. The backend should be made backward-compatible first, followed immediately by the frontend release. Existing report rendering, PDF/export code, record summaries, and analytics must also tolerate empty photo arrays.

### 3.4 Draft permissiveness must not remove safety limits

Drafts may be incomplete, but they must not accept arbitrary structure, unauthorized media, excessive nesting, oversized arrays, or unbounded strings. Separating draft and submission completeness must retain structural, authorization, normalization, and size validation.

### 3.5 Coalescing queued save/reset operations can corrupt intent

A reset may supersede an unsent save, but it cannot erase an already in-flight request. The queue must preserve causal ordering and use base versions. UI state must be derived from the newest local intent while older server responses are ignored unless they are needed to advance the operation chain.

### 3.6 Moving queues to IndexedDB can lose existing work

Existing FE retries are stored in localStorage under versioned, user/session-specific keys. A new store must migrate those records idempotently, retain the originals until the new write is verified, and remove them only after server acknowledgement. It must also handle private browsing, quota errors, unavailable IndexedDB, logout, and shared devices.

### 3.7 Timed retry can create retry storms and cross-tab duplicates

Adding `setTimeout` to every mounted form would create competing workers. Mobile browsers also throttle background timers. A single coordinator per browser profile, a cross-tab lease, bounded jittered backoff, and online/visibility wake-ups are required. HTTP 401, 403, 419, 422, and semantic 409 responses must not enter an endless retry loop.

### 3.8 Media leasing can leak storage or delete live evidence

Blindly renewing leases forever allows abandoned uploads to live indefinitely. Cleanup can also race with a draft or report transaction. Lease ownership, maximum lifetime, renewal rules, live-link protection, cleanup locking, and idempotent final linking must be designed together. The current deletion endpoint protects report links only; draft, session-result, and pending-operation links must also be protected.

### 3.9 Draft concurrency must respect existing multi-draft behavior

The backend already has `draft_id` and per-user multi-draft support. Adding a version to a "latest draft" lookup without consistently using `draft_id` could update the wrong record. Version checks must be scoped by authenticated user and exact draft ID, with legacy endpoints kept compatible during rollout.

### 3.10 FE session scoping is a product/data decision, not a small refactor

The current client creates or resumes a broad active FE session without sending location scope. Changing scope immediately could orphan existing active sessions, split inspectors into unexpected batches, or allow duplicate active sessions. The batch identity, ownership, joining, completion, and submission rules must be approved before schema and resolver changes.

### 3.11 Tracked frontend builds constrain deployment order

Production deploys committed `build/` output. Source and build must be generated from the same reviewed commit and production API URL. Backend migrations and backward-compatible APIs must be deployed before a frontend that depends on them. Hashed build assets should be regenerated once at the release boundary, not after every source commit.

### 3.12 A mega-release would be difficult to verify or roll back

Optional photos and draft validation are safe contract corrections. Operation queues, media leases, concurrency, and session scoping are separate high-risk systems. They must be delivered as gated vertical slices with compatibility windows and feature flags where appropriate.

## 4. Target Invariants

All implementation decisions must preserve these invariants.

### 4.1 User-data invariants

- A successfully saved local edit is never silently discarded.
- A retry never changes the meaning of the original operation.
- A stale response never overwrites a newer local intent.
- Reloading or temporary offline operation does not restore a row the user already reset.
- A permanent server rejection remains visible and actionable.
- Logging out stops processing that user's operations; another user cannot read or send them.

### 4.2 Photo invariants

- Defect photos are optional for all inspection types.
- Remarks remain required for defect/failed states where the business rules require them.
- If a photo is supplied, it must exist, be authorized, meet type/size/count limits, and be linked transactionally.
- A pending but valid photo cannot be pruned while its owning operation is active.
- Removing a photo cannot delete media still referenced by a draft, result, report, or another active operation.

### 4.3 Sync invariants

- Each intentional FE save or reset has one immutable operation ID.
- Retries of that operation reuse its ID and payload.
- A later user action receives a new operation ID.
- The server processes an operation at most once and can return its original outcome on replay.
- Version conflicts never masquerade as successful synchronization.
- Only one browser worker actively drains a user's queue at a time.

### 4.4 Review and submission invariants

- Draft incompleteness does not cause a sync failure.
- Review readiness and backend submission validation implement the same completion rules.
- Submit is blocked while media processing, unsaved drawer edits, pending operations, permanent sync failures, or version conflicts exist.
- Submission is idempotent and an ambiguous network result is reconciled before another report is created.

## 5. Delivery Strategy

Use the following release trains rather than implementing every phase before receiving feedback.

| Train | Scope | Deployment shape | Gate |
| --- | --- | --- | --- |
| A | Baseline, optional-photo parity, draft validation split, error parsing | Backward-compatible backend, then frontend | All inspection-type contract tests pass |
| B | FE operation ledger, distinct conflicts, durable save/reset queue | Additive migration and backend API, then flagged frontend worker | Replay, reset, reload, and two-tab tests pass |
| C | Retry coordinator and media leases/protection | Additive backend and frontend persistence changes | Offline/retry/prune E2E passes |
| D | Draft concurrency | Backend version contract, then frontend conflict UI | Two-tab/device conflict tests pass |
| E | FE session scope and submission policy | Product-approved migration and feature-flagged rollout | Multi-inspector acceptance tests pass |
| F | Refactoring, accessibility, observability, full release gate | No contract break | Full suites and device smoke pass |

Each train must be independently deployable. A train is complete only after production-compatible verification; passing unit tests alone is not sufficient.

## 6. Train A — Contract Parity and Immediate Release Blockers

### A1. Freeze and document the current behavior matrix

Create a table in tests or test fixtures for each inspection type containing:

- accepted statuses
- statuses requiring remarks
- statuses allowing photos
- final fields required for submission
- fields allowed to be absent in drafts
- per-row and per-payload media limits

Use one canonical definition where practical. If backend and frontend cannot share source, mirror the matrix explicitly and add contract tests so drift is detected.

### A2. Make defect photos optional everywhere

Frontend:

1. Audit FE, Hydraulic, ER Aux, High Angle, SCBA/custom SCBA, FRT daily/one-off, General, HSE, and registry-driven checks.
2. Remove all `missingPhoto` or evidence-completeness blockers that require a photo.
3. Retain `Add photo (optional)` copy consistently.
4. Retain blockers for photos still processing, failed uploads, invalid media, count limits, and unsaved drawer changes.
5. Ensure record/review summaries render zero photos without an empty broken card.

Backend:

1. Remove submission rules requiring issue photos from `InspectionPayloadService`.
2. Remove the FE session controller's explicit defect-photo requirement.
3. Preserve remark requirements.
4. Preserve media ownership, existence, MIME, size, and count validation when media IDs are present.
5. Normalize absent photo fields to empty arrays where downstream code expects arrays.

Compatibility sequence:

1. Deploy the permissive backend first.
2. Confirm old frontend payloads still validate.
3. Deploy the frontend copy/validation change.

Tests per inspection type:

- defect + remarks + no photo: draft and submit accepted
- defect + no remarks: submission rejected for remarks only
- defect + valid photo: accepted
- invalid or unauthorized media ID: rejected
- mixed photographed and unphotographed defects: accepted
- record/detail/export rendering with empty photo arrays: no error

### A3. Separate structural, draft, and submission validation

Extract or clearly separate these backend responsibilities:

```text
normalizePayload
validateStructureAndLimits
validateMediaReferences
validateDraft
validateSubmissionCompleteness
```

`validateDraft` must permit incomplete SCBA, custom SCBA, High Angle, FRT, and every other inspection type. It must still enforce:

- payload and row shape
- supported inspection type/section keys
- string and array bounds
- maximum row/photo counts
- authorized and valid managed-media references
- safe normalization

`validateSubmissionCompleteness` adds mandatory statuses, inspector/date fields, required remarks, acknowledgements, and other final business rules.

Do not silently drop unknown security-sensitive fields. Either reject them or explicitly preserve only an allowlist according to existing compatibility requirements.

Tests:

- empty and partial drafts accepted for every type
- the same incomplete payload rejected on submission with field errors
- malformed, oversized, deeply nested, or unauthorized payload rejected in both paths
- multi-type drafts enforce aggregate media limits without requiring every section to be complete

### A4. Improve server-error mapping before adding more conflicts

Create a shared frontend API error normalizer that reads:

- HTTP status
- stable backend `code`
- top-level `message`
- Laravel `errors` field map
- retryability
- row/section path when available

The UI should show the first useful inline message and retain the complete field map for Review links. Avoid parsing English message text to make control-flow decisions.

### A5. Train A exit criteria

- Frontend and backend optional-photo rules agree.
- Partial drafts no longer generate `Retry sync` merely because they are incomplete.
- All relevant backend feature tests pass.
- Focused frontend validation, form, photo, Review, and record tests pass.
- The 40 snapshots are reviewed individually and updated only for intended inline-message changes.
- `git diff --check` passes in both repositories.

## 7. Train B — Correct FE Idempotency and Durable Reset

### B1. Add a server-side FE operation ledger

Add an append-only table such as `inspection_extinguisher_operations` with:

- internal ID
- `operation_uid` (client-supplied UUID/string)
- inspection session ID
- canonical asset key
- operation type (`complete` or `reset`)
- authenticated actor user ID
- base result version
- resulting result version, nullable until processed
- normalized payload hash
- outcome status/code
- response snapshot sufficient for idempotent replay
- timestamps

Constraints:

- unique operation UID within an unambiguous scope; preferably globally unique or unique by session
- index by session and asset
- operation type allowlist
- maximum identifier length compatible with the API

Processing algorithm inside one database transaction:

1. Lock/find the operation by UID.
2. If already completed, verify actor/session/asset/type/payload hash match and return the recorded outcome.
3. Reject reuse of the same UID for different content as `inspection_operation_id_reused`.
4. Lock the asset result.
5. Validate session state and base version.
6. Apply complete/reset exactly once.
7. Link media and update progress inside the transaction where safe.
8. Persist the resulting version/outcome in the ledger.
9. Return a stable response code and operation UID.

Do not rely on `client_result_id` on the result row as the operation history. Keep that column temporarily for backward compatibility and remove it only in a later, separately reviewed migration if it becomes obsolete.

Ledger retention must exceed the maximum client retry lifetime. Do not prune it using the media cleanup window.

### B2. Define stable conflict codes

Use distinct response codes, for example:

- `inspection_operation_replayed` — success-equivalent, queue may clear
- `inspection_operation_id_reused` — permanent client/data error
- `inspection_result_version_conflict` — preserve local work and reconcile
- `inspection_result_completed_by_other_user` — preserve local work and show owner
- `inspection_session_closed` — permanent for this session; offer recovery/export
- `inspection_session_not_found` — permanent until session reconciliation
- `inspection_payload_invalid` — permanent until the user fixes fields

Only a successful operation or verified replay may clear the queue. HTTP status alone must never decide this.

During the compatibility window, accept legacy requests without an operation UID using existing behavior, but mark responses as legacy and instrument their use. The new frontend must always send an operation UID.

### B3. Implement a versioned FE operation store

Create small cohesive frontend modules rather than extending the large form component:

- operation schema/normalizer
- IndexedDB adapter
- localStorage legacy importer/fallback
- operation reducer/supersession rules
- FE API adapter

Each record should contain at least:

```js
{
  schemaVersion,
  operationId,
  userId,
  sessionUid,
  assetKey,
  type,
  payload,
  payloadHash,
  baseVersion,
  state,
  attemptCount,
  nextRetryAt,
  createdAt,
  updatedAt,
  lastError
}
```

Use `crypto.randomUUID()` with a tested secure fallback for browsers that lack it. Keep IDs below backend limits.

Storage migration:

1. Detect existing `inspection_fe_session_complete_retry_v1_*` keys.
2. Validate each legacy record.
3. Generate one operation ID and import it once.
4. Verify the IndexedDB write by reading it back.
5. Mark the legacy key as imported; do not delete it yet.
6. Delete the corresponding legacy record only after server acknowledgement.
7. If IndexedDB is unavailable, continue through an explicit localStorage fallback and expose degraded persistence health.

Never claim queue success when optional-chained storage APIs did not write anything.

### B4. Unify FE complete and reset behavior

The `Reset check` action remains visible at all times and is idempotent on an empty row.

Rules:

- UI applies the newest local intent immediately.
- An unsent complete may be superseded by reset.
- An in-flight complete is retained until its response arrives; reset is queued after it with the appropriate causal version.
- A new complete after reset becomes a new operation.
- Stale responses update operation bookkeeping but cannot replace newer UI state.
- Reload reconstructs UI state from server result plus the ordered local operation overlay.
- Reset media unlinking occurs transactionally and never deletes shared/live media.

Reset requests must carry operation ID and base version just like completes.

### B5. Run the new worker behind a feature flag

Keep the existing FE-session feature flag and add a temporary operation-queue rollout flag if needed. Support:

- disabled: legacy client behavior remains functional against the new backend
- enabled for test users: operation ledger and new worker active
- enabled globally after telemetry and smoke tests

Do not maintain two workers over the same queue simultaneously.

### B6. Train B exit criteria

- Save, edit, retry, delayed replay, reset, save-after-reset, and reload tests pass.
- An old delayed operation cannot overwrite a newer save.
- A version conflict never clears the queue.
- Storage migration is idempotent and tested with corrupt/unavailable storage.
- Two tabs cannot send the same queued operation concurrently without server-side safety.
- Backend migration can be deployed while the old frontend is still live.

## 8. Train C — Reliable Scheduling and Media Lifetime

### C1. Introduce one inspection sync coordinator

The coordinator owns scheduling; React components only subscribe to state and request a flush.

Responsibilities:

- drain eligible operations in causal order
- serialize operations for the same FE asset
- avoid competing draft saves during an explicit retry
- schedule the earliest `nextRetryAt`
- wake on `online`, authenticated-session recovery, and `visibilitychange`
- pause on logout and user change
- publish progress/readiness state
- enforce one active cross-tab worker using `BroadcastChannel` plus a time-limited IndexedDB lease

Timers are advisory because mobile browsers suspend them. On every app resume, recalculate eligibility from persisted timestamps.

Backoff:

- exponential and bounded
- randomized jitter
- respect `Retry-After` for 429/503 where supplied
- cap attempts only for automatic frequency, not by deleting user work
- allow explicit user retry without creating a second worker

Error classification:

- retry: network/offline, timeout, 408, 429, and selected 5xx
- refresh/retry once: CSRF 419 using the existing CSRF recovery convention
- pause for authentication: 401
- permanent authorization: 403
- user-correctable validation: 422
- semantic handling by stable code: 409
- payload too large: 413, with row/photo-specific remediation

### C2. Add media leases without weakening authorization

Choose an additive design, preferably a dedicated lease table or explicit lease columns plus associations. A lease should include:

- media record
- authenticated owner
- client upload/operation or draft ID
- module
- expiry
- bounded renewal metadata

Upload should create the lease in the same transaction as the media record. Draft/result/report linking should create the durable link before releasing the temporary lease.

Rules:

- clients may renew only their own active media for an existing local/draft operation
- renewal extends by a bounded interval, not forever
- server enforces an absolute maximum abandoned lifetime
- durable draft, inspection-result, or report links protect media independently of the lease
- cleanup locks/rechecks the media and all links before deleting storage files and database rows
- cleanup is idempotent and safe if a file is already missing
- final-link transactions and cleanup cannot race into deleting committed evidence

Update deletion rules to protect every live link type. Return a stable `media_protected` response with no sensitive ownership details.

Do not place raw photo blobs in localStorage. IndexedDB blob retention, if used, must be bounded by count/size and must report quota failure to the user.

### C3. Harden the shared photo drawer state machine

Retain one shared flow for every inspection type. Model explicit states:

```text
idle -> acquiring -> processing -> editing -> saving -> saved
                                      |          |
                                      v          v
                                   failed     save_failed
```

Required behavior:

1. `Add photo` opens the drawer before acquisition.
2. Capture/upload completion inserts the preview into the still-open drawer.
3. The row's `View photos (n)` count changes only after local drawer save.
4. `Add more photo`, description, and remove operate within the drawer.
5. Late camera/file callbacks after cancel or unmount are ignored.
6. Object URLs and media streams are released deterministically.
7. Processing is bounded for low-memory phones and does not retain both unnecessary full-size copies.
8. Gallery upload does not force native camera capture.
9. Permission denial, corrupt files, unsupported formats, upload failure, and quota failure have recoverable states.
10. Closing with unsaved changes follows one consistent confirmation/preservation policy.

If upload succeeds but the drawer is cancelled, release the lease or allow bounded cleanup; do not immediately delete an object that another saved reference may use.

### C4. Train C exit criteria

- A 500 while still online retries automatically without navigation or another UI event.
- Reload and app visibility recovery resume pending work.
- Cross-tab worker lease expiry and takeover are tested.
- A valid pending photo survives beyond the old 24-hour unlinked-media cleanup boundary.
- Cleanup does not delete draft, result, report, or actively leased media.
- Android Chrome and iPhone Safari capture/gallery smoke tests pass, including low-memory and permission-denied paths.

## 9. Train D — Draft Concurrency

### D1. Add exact-draft optimistic concurrency

Add a `version` column to `report_drafts`, defaulting existing rows safely to 1. All new draft responses return:

- `draft_id`
- `version`
- `saved_at`

Updates by exact draft ID accept `base_version`. A matching version updates and increments atomically. A stale version returns `report_draft_version_conflict` with safe current metadata and, where authorized, the current normalized draft.

Do not infer the update target from "latest draft" when a draft ID is available. Keep legacy endpoints backward-compatible temporarily, and instrument usage before deprecation.

Database updates should use an atomic `WHERE id = ? AND user_id = ? AND version = ?` or an equivalent row lock. Authorization must be checked before returning conflict data.

### D2. Add conservative frontend conflict recovery

On conflict:

1. Preserve the local draft unchanged.
2. Fetch/retain the authorized server version.
3. Auto-merge only sections with provably independent stable identities and unchanged bases.
4. Otherwise present the server/local timestamps and explicit choices.
5. Never use last-write-wins silently.
6. Allow exporting/copying local remarks if automatic recovery is impossible.

Cross-tab draft update notifications can reduce conflicts, but the backend version remains authoritative.

### D3. Train D exit criteria

- Existing multi-draft selection still targets the correct `draft_id`.
- Two-tab and two-device stale update tests pass.
- Conflict responses do not expose another user's draft.
- Legacy clients remain functional during the compatibility window.

## 10. Train E — FE Session Scope and Multi-Inspector Policy

This train cannot start until the business owner approves the session identity and submission rules.

### E1. Required decisions

Document answers to:

- Is a session scoped by site, zone, date, shift, team, owner, or an explicit batch ID?
- May users join a session started by another inspector?
- Who may recheck or reset another inspector's result?
- Who may submit/close the session?
- What is the expected asset set, and is full completion required?
- What happens to active clients and queued operations after submission?
- Can a supervisor force-close or recover a session?

Recommended identity:

```text
organization/site + inspection date/shift + explicit batch/team
```

Locations should normally remain progress dimensions inside that batch rather than accidentally creating unrelated sessions, unless operations explicitly require per-location reports.

### E2. Migrate without orphaning active sessions

Use additive scope columns or a versioned canonical scope key. Backfill existing sessions as `legacy` scope. During transition:

- old clients resume legacy sessions through the legacy resolver
- new clients send an explicit scope version/key
- existing active sessions are either allowed to finish or migrated by an audited admin action
- uniqueness rules prevent duplicate active sessions within the new scope
- no migration silently closes or splits an active session

Add a server feature flag for the new resolver. Log legacy session creation/resume so the compatibility path can be removed later.

### E3. Enforce submission safety on the backend

Submission must lock/re-read the session and reject when:

- the session is no longer active
- the expected asset set is incomplete, if applicable
- server-known result operations are still processing
- the submitter lacks the required role/ownership
- another submission already completed
- the submitted session version is stale

Client-local queue state cannot be enforced by the backend for operations it has never received, so the frontend must also flush and confirm an empty durable queue before submit. The backend remains authoritative for received operations and session state.

Use the existing submission key plus a database uniqueness guarantee. On an ambiguous submit response, query session/report status before retrying.

### E4. Train E exit criteria

- Approved session policy is documented in code/tests.
- Existing active sessions are accounted for before deployment.
- Two inspectors editing, resetting, and submitting concurrently are covered by integration tests.
- Premature session closure is rejected by both UI and backend.
- Feature flag rollback returns to the legacy resolver without corrupting new data.

## 11. Train F — Review Truth, Accessibility, Refactoring, and Operations

### F1. Use one readiness model

Compute Review and Submit state from a single selector/service containing:

```js
{
  localValidationErrors,
  mediaProcessingCount,
  unsavedPhotoDrawerCount,
  pendingOperationCount,
  retryableFailureCount,
  permanentFailureCount,
  versionConflicts,
  persistenceHealth,
  sessionState,
  isReadyToSubmit
}
```

The Retry button, warning banner, Continue to Review, and Submit button must consume the same model. Retry progress should be explicit, such as `Syncing 2 of 5`. A permanent error must link to the affected section/row and must not appear as endlessly retryable.

Before submission:

1. Commit open drawer edits locally or block with a clear reason.
2. Finish or remove processing media.
3. persist the latest form snapshot
4. drain eligible operations
5. reconcile draft/session version
6. run final validation
7. submit idempotently
8. reconcile ambiguous responses before retrying

### F2. Accessibility requirements

- Use `aria-live="polite"` for sync progress/status.
- Use `role="alert"` for blocking failures.
- Associate errors using `aria-describedby`.
- Focus the first invalid row/section after a blocked Review or Submit action.
- Label icon-only photo removal controls.
- Trap and restore focus correctly in the photo drawer.
- Preserve adequate mobile touch targets and keyboard operation.

### F3. Refactor unstable boundaries only

Do not perform a wholesale inspection rewrite. Extract new responsibilities so already oversized files do not grow further.

Frontend candidates:

- inspection error normalizer
- readiness selector
- operation schema/store
- sync coordinator
- FE operation adapter
- shared photo drawer reducer/flow
- inspection-type validation definitions

Backend candidates:

- structural payload validator
- inspection-type completion validators
- media-reference validator
- FE operation service
- FE session resolver
- FE submission service

Controllers should handle request authorization/mapping and response formatting, not operation orchestration.

### F4. Observability and supportability

Add structured logs/metrics without photo data or sensitive remarks:

- operation ID, session UID, asset key hash, user ID, outcome code, duration
- queue depth and oldest-operation age on the client, aggregated where telemetry exists
- retry counts by status/code
- draft version conflicts
- media lease creation/renewal/finalization/cleanup
- session submission conflicts and idempotent replays
- legacy API/client usage during compatibility windows

Never log image bytes, data URLs, authentication tokens, or complete inspection payloads.

Provide a safe diagnostic view or export for support that lists operation metadata and errors without exposing other users' data.

## 12. Verification Matrix

### 12.1 Frontend unit/component tests

For every inspection type:

- defect without photo
- defect with one and multiple photos
- drawer remains open after capture
- add/remove/describe and save photos
- drawer cancel/close with unsaved work
- inline blocked-save reason targets the correct row
- Review readiness with no photos
- Review readiness with queued or failed photo operations
- server field errors map to the correct row

FE-specific:

- first completion
- edit after completion creates a new operation
- retry reuses the same operation
- delayed old response cannot overwrite a newer edit
- reset when empty
- reset after completion
- reset while completion is in flight
- completion after reset
- reload with pending complete/reset
- storage unavailable, corrupt, or quota exceeded
- multi-tab worker takeover

### 12.2 Backend feature/integration tests

- draft versus submission validation for every type
- optional-photo parity
- managed-media authorization and limits
- operation replay and ID-reuse rejection
- version conflict versus completed-by-other-user conflict
- complete/reset ordering and transaction rollback
- media lease renewal/finalization/cleanup races
- protection of draft/result/report media from deletion
- exact-draft version concurrency
- scoped session creation/resume
- multi-inspector authorization and submission
- final submission idempotency

### 12.3 Browser E2E tests

Automate at least:

1. Submit a complete inspection without images.
2. Submit mixed defects with and without images.
3. Upload succeeds, then the row-save response is lost.
4. Server returns 500 while the browser remains online; automatic retry succeeds.
5. Reload during a pending save.
6. Reload during a pending reset.
7. Edit an FE result after its first save.
8. Resolve or preserve a two-tab draft/result conflict.
9. Block submission while an operation or media item is unresolved.
10. Reconcile an ambiguous submission response without creating a duplicate report.
11. Retain a photo beyond the cleanup threshold while its operation remains valid.

Playwright may cover file input and mocked camera behavior. Hardware camera reliability requires real-device smoke tests.

### 12.4 Real-device smoke matrix

- current iPhone Safari
- current Android Chrome
- Samsung Internet if it is in the supported fleet
- representative low-memory Android device
- camera permission granted, denied, and interrupted
- gallery upload
- large image, HEIC where applicable, corrupt/unsupported file
- foreground/background during processing and sync
- offline capture followed by reconnect

## 13. Migration and Rollout Checklist

For every train:

### Before coding

- confirm current dirty-worktree baseline
- identify exact API/schema compatibility requirements
- add failing regression tests first for the observed defect
- decide whether a feature flag is needed

### Before local commit

- review source diff independently from generated assets
- run focused tests while iterating
- run `git diff --check`
- ensure no secrets, uploads, logs, database dumps, or local environment files are staged
- avoid unrelated formatting churn

### Backend deployment first when contracts change

1. Back up the production database according to `DEPLOYMENT.md`.
2. Pull the reviewed backend commit.
3. Install locked production dependencies.
4. Run additive migrations with `--force`.
5. clear/rebuild Laravel caches as documented
6. smoke old-client-compatible endpoints
7. enable backend flags only for the intended cohort

### Frontend release

1. Run lint and focused/full tests proportional to the train.
2. Build once in production mode with the production API URL.
3. Confirm `build/.htaccess` exists.
4. Verify generated assets contain no localhost API URL.
5. Review and commit the source plus matching tracked build output.
6. Deploy the committed build according to `DEPLOYMENT.md`.
7. Smoke nested routes, authentication, capture/upload, retry, Review, and submission.

### Rollback safety

- Prefer disabling a new feature flag over reverting a schema migration.
- Do not drop old columns/tables or delete legacy queues in V1.
- Keep new backend endpoints/contracts tolerant of the immediately previous frontend.
- If frontend rollback occurs, confirm the old client can still use the upgraded backend.
- If a migration cannot be safely reversed without data loss, document forward-fix recovery rather than claiming a safe rollback.

## 14. Definition of Done

Inspection remediation V1 is complete only when:

- Photos are optional in frontend and backend for every inspection type.
- Incomplete drafts sync without submission-completeness errors.
- FE edits after an initial save are applied exactly once.
- Delayed replays cannot overwrite newer work.
- Reset is durable across failure, reload, and competing in-flight operations.
- Semantic conflicts preserve local work and display an actionable reason.
- Retry runs autonomously without duplicate cross-tab workers.
- Pending valid photos cannot be pruned, and all live media links are deletion-protected.
- Draft conflicts are detected by exact draft ID and version.
- FE session scope and submission ownership are explicitly approved and enforced.
- Review, Retry Sync, and Submit derive from one readiness model.
- Inline errors and sync states meet accessibility requirements.
- Focused and full inspection suites pass, with snapshots intentionally reviewed.
- Production build and backend release gates pass.
- Android and iOS camera/gallery smoke tests pass.
- Deployment follows the backend-first compatibility sequence in `DEPLOYMENT.md`.
- No known path silently loses an inspection edit, reset, photo reference, or queued operation.

## 15. Recommended First Implementation Batch

Start with Train A only:

1. Add contract regression tests for optional photos and partial drafts.
2. Correct backend FE and payload-service photo requirements.
3. Separate draft validation from final completeness while retaining safety limits.
4. Correct frontend validation and error mapping across every inspection type.
5. Review/update the 40 affected snapshots.
6. Run the focused frontend and backend inspection suites.

Do not begin queue migration or session-scope changes in the same batch. After Train A is green, implement the operation ledger backend before modifying the FE browser queue. This order fixes the immediate user-facing blockers while minimizing the chance of losing existing queued work.

## 16. Implementation Audit — 11 July 2026

Trains A through F are implemented. The approved V2 session policy is documented in `INSPECTION_SESSION_POLICY_V2.md` and enforced by the frontend and backend. Automated verification completed on 11 July 2026:

- frontend inspection suite: 63 files, 703 tests passed
- frontend lint: passed
- backend session/draft focused suite: 35 tests, 253 assertions passed
- broader backend suite, migration rehearsal, dependency audit, and route checks: passed during the release audit
- production frontend build: passed; `.htaccess` present and no localhost API URL found
- Playwright production-flow smokes passed for Fire Extinguisher, ER Aux, SCBA, and High Angle, including managed image upload, retained photo drawer, Review, Submit, record lookup, and non-empty PDF download

The following release gates remain intentionally open:

- physical iOS Safari camera and gallery matrix
- physical Android Chrome camera and gallery matrix, including a representative low-memory device
- production deployment after device sign-off, following the backend-first sequence in `DEPLOYMENT.md`

V1 must not be marked fully done until those device checks pass. Browser automation validates the web workflow and upload fallback, but it cannot establish native camera reliability or operating-system memory behavior.
