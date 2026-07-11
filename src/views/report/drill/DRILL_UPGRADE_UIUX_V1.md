# Drill Upgrade UI/UX V1 - Hardened Frontend Implementation Plan

## 1. Objective

Upgrade the Drill report frontend so users can capture the content present in the reference drill reports through a reliable mobile-first workflow, while preserving the current report shell, workflow review route, server-backed drafts, edit behavior, and legacy Drill records.

ERCO is the closest functional reference, but Drill must not import ERCO screens or inherit incident-specific wording and rules. Reuse should happen through small neutral components with characterization tests.

This stage includes all required frontend work. Backend and PDF changes are explicitly deferred, but frontend submission must not be enabled for new fields until the existing API has been verified to preserve them.

## 2. Audit Findings and Corrections

The original plan contained assumptions that could cause regressions. Execution must follow these corrections.

### 2.1 Keep the established report envelope

Do not rename `reportDate`, `reportTime`, `incidentType`, `details`, `summary`, `respondingTeam`, or `postIncidentAnalysis` across the application in this upgrade. These keys are already consumed by:

- `Reports.js`
- `reportDraftDomain.js`
- `ReportReviewSection.js`
- record list/detail utilities
- review-return and edit flows
- backend report APIs and PDF requests

Use Drill-specific labels in the UI while retaining the shared envelope internally. Add Drill-only fields alongside it. This limits migration risk and keeps generic report surfaces working during incremental delivery.

### 2.2 Separate drill type from emergency categories

The current `incidentType` represents the configured Drill Type, such as Fire Drill or Confined Space Drill. The reference document's Fire, Rescue, Hazmat/Oil Spill, and Special Assistance checkboxes are a different concept.

Therefore:

- Keep `incidentType` as the single primary Drill Type.
- Add `exerciseCategories` as a separate multi-select array.
- Do not convert the existing type manager to multi-select.

### 2.3 Review is not an internal form step

The shared report shell already owns `/new/review`. `DrillForm` should have five editable stages and then hand one normalized candidate record to `onRequestReview`. Do not add an internal `DrillReviewStep` or include `review` in Drill's form-stage array.

### 2.4 Drafts are server-backed, not offline local storage

`saveReportDraft`, `loadReportDraft`, and `clearReportDraft` call the report draft API. The frontend cannot promise offline draft persistence in this stage.

Required behavior:

- Temporary in-memory edits remain visible during a network failure.
- Failed draft saves remain marked as unsaved.
- Copy must say “server” or “draft,” not “browser storage.”
- Do not show “Draft saved” unless the API confirms success.
- True offline queued drafts are a separate future feature unless explicitly added with a tested IndexedDB design.

### 2.5 Camera launch must retain the user gesture

Do not `await` a network draft save before calling the hidden camera input because mobile browsers may reject a delayed picker click. On camera action:

1. Mark camera recovery state synchronously using module key `drill`.
2. Start a best-effort draft save without blocking the input click.
3. Click the input synchronously in the original user event.
4. If draft save fails, retain the form in memory and show the unsaved state after camera return.

### 2.6 Preserve complete managed-media metadata

Uploaded photo objects include lease, checksum, thumbnail, dimensions, size, and upload identifiers. Normalization and record construction must preserve these fields. Do not reduce a photo to URL and description only.

Use the existing property names from `reportMediaApi`:

- `mediaId`
- `url`
- `thumbnailUrl`
- `fileName`
- `mimeType`
- `sizeBytes`
- `width`, `height`
- thumbnail metadata
- `checksumSha256`
- `leaseId` and lease expiry fields
- `uploadId`
- `description`

### 2.7 Do not make a broad ERCO refactor a prerequisite

Extract only the photo unit first because it has the highest risk and clear shared value. Reuse or adapt existing generic chronology UI before extracting ERCO-specific chronology features. Personnel and analysis extraction should happen only when the neutral boundary is clear.

## 3. Scope

### 3.1 Included

- Drill V2 form schema and safe normalization.
- Five editable Drill stages.
- Drill-specific setup, personnel, details, chronology, and post-exercise analysis UI.
- Managed photo capture/upload, progress, recovery, description, and removal.
- Shared review route enhancements for Drill V2.
- Record detail, list/card, edit, review-return, and change-summary support.
- Responsive and accessible behavior.
- Targeted shared-component extraction.
- Unit, component, integration, and manual mobile checks.
- Correction of inaccurate Drill draft-save error copy encountered in the touched flow.

### 3.2 Deferred

- Backend code and migrations.
- Backend PDF template work.
- Offline queue/IndexedDB draft implementation.
- AI summary or AI review.
- Corrective-action owners, due dates, and closure workflow.
- Inspection module changes.
- Unrelated ERCO redesign.
- Multiple independent Drill drafts unless separately approved; current non-ERCO draft storage supports one active draft per report type.

## 4. Confirmed Architecture Boundaries

### 4.1 Report shell owns

- Top-level route and active section.
- `/new/review`.
- Final submit/update lock.
- Shared draft save from review.
- Record detail drawer/page.
- Workflow actions and permissions.

### 4.2 DrillForm owns

- The canonical editable form object.
- The current editable sub-route.
- Per-stage validation.
- Form-to-candidate-record construction.
- Dirty state.
- In-form draft save and reset.
- Drill-specific error summaries.

### 4.3 Shared media service owns

- Source-file validation.
- Upload, retry, progress, and cancellation.
- Server photo limits.
- Media metadata returned by the API.
- Failure-code mapping.

Do not duplicate media limits or error-code mappings inside Drill components.

## 5. Frontend Data Contract

Use this additive form shape. Existing envelope fields remain canonical for shared consumers.

```js
{
  schemaVersion: 2,

  // Existing shared report envelope
  reportDate: '',
  reportTime: '',
  weather: '',
  incidentType: '',
  location: '',
  details: '',
  summary: '',
  chronology: [{ id: '', time: '', action: '' }],

  // Drill V2 additions
  reportIssuanceDate: '',
  exerciseCategories: [],
  exerciseTitle: '',
  exerciseObjectives: [{ id: '', text: '' }],
  erpReferences: [{ id: '', annexNumber: '', title: '' }],

  // Draft form representation; recordFactory converts this to respondingTeam
  respondingTeamName: '',
  respondingTeamShift: '',
  respondingAttendance: [
    {
      memberKey: '',
      memberId: '',
      name: '',
      role: '',
      exerciseRole: '',
      teamName: '',
      present: true,
      source: 'roster'
    }
  ],

  // Keep the shared key; render it as Post-Exercise Analysis in Drill
  postIncidentAnalysis: {
    strengths: [''],
    resourcesMobilised: [''],
    improvementOpportunities: [''],
    photos: []
  }
}
```

### 5.1 Candidate record output

`buildDrillRecord()` must emit:

- All shared identity/workflow metadata currently emitted.
- The existing envelope keys.
- `schemaVersion: 2`.
- Drill V2 additions.
- `respondingTeam: { name, shift, attendance }`.
- Attendance rows containing both `role` and `exerciseRole`.
- A fully normalized `postIncidentAnalysis` including complete photo metadata.
- Chronology without blank draft rows or client-only IDs unless stable IDs are intentionally supported by the server.

For display compatibility, `incidentType` remains the primary Drill Type. Do not serialize `exerciseCategories` into a delimiter-separated type string.

### 5.2 Decisions that block affected UI only

V1 uses the following resolved frontend decisions:

1. Report issuance date is user-editable and optional.
2. Exercise categories are the fixed reference-report categories; custom Drill Type management remains separate.
3. SC, ASC, and TRT1-TRT4 are exclusive assignments; Observer and Participant may repeat.
4. Personnel are optional for V1 submission, but any entered assignment must be internally valid.
5. Objectives and ERP references are optional; a partially completed ERP reference is invalid.
6. V1 does not impose an invented ERP-reference count beyond practical browser/server limits.

Any later policy change must update frontend validation, backend validation, compatibility tests, and PDF rendering together.

## 6. Normalization and Backward Compatibility

Create `drill/drillFormDomain.js` with pure functions:

```text
createDefaultDrillForm()
normalizeDrillForm(input)
normalizeDrillRecordToForm(record)
normalizeDrillPhoto(photo)
hasMeaningfulDrillChanges(form)
```

### 6.1 Inbound normalization rules

- Missing `schemaVersion` means legacy V1.
- Preserve `reportDate`, `reportTime`, `weather`, `incidentType`, `location`, `details`, `summary`, and chronology.
- Default every new V2 field without making legacy records appear invalid until the user edits or resubmits.
- Convert legacy `sc` and `asc` only if they contain names and can be represented without duplication. Otherwise preserve them as legacy fields for display; do not fabricate roster member IDs.
- Accept `respondingTeam.attendance` and flat `respondingAttendance`.
- Preserve `present: false`; do not force every restored member to present.
- Accept `resourcesMobilized` and `improvements` aliases, then normalize to the established British keys.
- Preserve all managed-photo metadata and unknown photo fields.
- Add client row IDs only to form rows that need them.
- Normalize strings defensively; never call `.trim()` on unknown values without conversion.
- Return new objects and arrays; never mutate API or route-state objects.

### 6.2 Unknown-field preservation

When updating an existing record, merge the new candidate with the existing record at the orchestration boundary so workflow metadata and backend-owned fields survive. The editable form does not need to carry every unknown field.

Do not spread arbitrary unknown fields from untrusted drafts into DOM props or API-specific nested objects.

### 6.3 Required integration points

Use Drill normalization at every inbound boundary:

- `useReportDraft` through its existing `normalizeDraft` callback.
- `initialFormSeed`.
- `editingDraftSeed`.
- `reviewReturnRecord`.
- `recordToDraft` for `reportTypeSlug === 'drill'`.
- Review-save conversion.
- Tests and fixtures.

Avoid duplicating seed cleanup logic in multiple effects. Add a small Drill helper that strips transient draft metadata and returns the normalized form patch.

## 7. Route and Stage Model

Use five editable routes:

```text
/new/setup
/new/personnel
/new/details
/new/chronology
/new/analysis
```

The shared shell retains:

```text
/new/review
```

Define:

```js
const DRILL_NEW_SECTIONS = ['setup', 'personnel', 'details', 'chronology', 'analysis']
```

### 7.1 Route rules

- `newSection` from `Reports.js` is the source of truth.
- `/new` redirects with `replace` to the first valid Drill section.
- Unknown Drill sub-routes redirect to `/new/setup` without discarding query parameters such as `edit` or `draft`.
- Back and Continue navigate to adjacent editable sections.
- Review is reached only by `onRequestReview(candidateRecord)`.
- Returning from shared review uses route state to restore a requested edit section; default to `analysis` if no section is supplied.
- Do not store `activeStep` as a second competing source of truth.
- Browser refresh restores the route and loads the server draft; if no draft exists, show a clear recovery message rather than pretending form state survived.

### 7.2 Stage progress UI

- Desktop: compact five-stage stepper.
- Mobile: stage title, “Step X of 5,” and a short progress bar.
- The separate review page labels itself “Review and Submit.”
- Completed-stage navigation validates only prerequisites necessary to enter that stage.
- Never trap users on a stage; Back remains available.

## 8. Stage Specifications

### 8.1 Setup

Fields:

- Primary Drill Type (`incidentType`, existing single selector and manager).
- Exercise Categories (`exerciseCategories`, separate multi-select).
- Condition/weather.
- Location.
- Exercise date (`reportDate`).
- Start time (`reportTime`).
- Report issuance date, according to the confirmed rule.

Behavior:

- Preserve existing custom type and location managers.
- Do not merge exercise-category values into the custom type manager.
- Collapse confirmed groups to summary rows with Edit and Reset.
- A validation error reopens the affected picker/control.
- Continue validates setup, requests draft save, and navigates only after save succeeds or the user explicitly chooses to continue with an unsaved warning. The normal path should require successful save.
- Back is not applicable on the first stage; provide Reset and Save Draft.

### 8.2 Exercise Personnel

Fields:

- Roster team and shift.
- Present members.
- Existing organisation role (`role`).
- Drill assignment (`exerciseRole`).
- Manual participant name/role when roster data is unavailable or the person is external.

Behavior:

- Adapt roster lookup from ERCO behind a neutral personnel selector; do not import `ErcoRespondingTeamStep`.
- Treat automatic team/shift matching as a suggestion.
- Track whether the user modified attendance. A late roster response must not overwrite user edits.
- Cancel/ignore stale requests when date/time changes or the component unmounts.
- Provide loading, empty, permission, and network-failure states.
- Manual rows use a stable client key and `source: 'manual'`.
- Detect duplicate members by member ID first, then normalized name within the same report.
- Enforce exclusive drill roles only after the role policy is confirmed.
- Preserve `present: false` in drafts, but serialize only the intended attendance rows according to the confirmed record rule.

### 8.3 Exercise Details

Fields:

- Exercise title.
- Scenario/details (`details`).
- Repeatable objectives.
- Repeatable ERP/Annex number and title.
- Outcome summary (`summary`).

Behavior:

- Use visible labels and concise helper text.
- Keep IDs stable when editing repeatable rows.
- A completely blank optional row is ignored during record construction.
- A partially completed ERP pair receives a row-level error; do not silently discard it.
- Preserve at least one blank discoverability row in form state without serializing it.
- Use confirmed server limits before adding `maxLength`; do not invent truncation.
- Show a compact read-only context panel for setup and personnel.

### 8.4 Chronology

Start with a Drill-neutral wrapper around the existing generic `ReportChronologySection`. Extract richer ERCO behavior only if the generic component cannot meet an accepted requirement.

Required behavior:

- Add, edit, remove, and reorder entries.
- Mobile-friendly row editor.
- Keyboard Move Up and Move Down alternatives to drag.
- Stable client IDs.
- Explicit handling for the final remaining row.
- Partial rows show inline errors.
- Earlier-than-previous time produces a warning, not destructive sorting.
- Blank rows are omitted from the candidate record.

Do not include ERCO-only pre-mobilization, AI, demobilization, or RTB logic in Drill unless separately approved.

### 8.5 Post-Exercise Analysis and Photos

Sections:

- Strengths.
- Resources, equipment, and consumables mobilised.
- Improvement opportunities.
- Photographs.

Analysis behavior:

- Render Drill-specific wording while keeping `postIncidentAnalysis` internally.
- Prefer simple repeatable text rows for V1. Do not bring ERCO's configurable option manager into Drill unless requested.
- Preserve text while typing and trim only at serialization.
- Blank optional sections do not block review.

Photo behavior:

- Extract a neutral `ReportPhotoSection` from ERCO with `moduleKey`, labels, value, onChange, toast, and before-camera callbacks.
- ERCO passes `moduleKey="erco"`; Drill passes `moduleKey="drill"`.
- Use `ReportPhotoImage` for authenticated thumbnail/full-image fallback in form, review, and detail surfaces.
- Use shared constants from `reportMediaApi`: 10 photos, 1.5 MB managed image, and 12 MB total at the time of this plan. Do not duplicate the numbers in component code.
- Process selected files sequentially and accept partial success.
- Preserve successful uploads when another file fails.
- Show batch index, percent, retry, cancellation, and filename-specific failure copy.
- Keep Capture Photo primary and Upload Photo secondary.
- If the browser is likely embedded, make Upload Photo the safer recommended action while leaving capture available only if current shared policy supports it.
- Mark and subscribe to camera recovery with the exact module key `drill`.
- Start best-effort draft save without delaying the synchronous camera-input click.
- Clear recovery state only after a file selection starts successfully, the user explicitly cancels/retries, or the operation is otherwise resolved.
- Reset the input value after handling so selecting the same file again triggers `change`.
- Abort active uploads on unmount.
- Prevent stale operations from updating a newer photo state.
- Revoke any created object URLs.
- Do not promise offline photo upload. When offline, show inline copy and keep existing form data intact.
- Photo descriptions are optional unless policy changes.
- Removing an uploaded managed photo requires confirmation (or an equivalent reliable undo interaction). After confirmation, update the form immediately and call server deletion best-effort for unlinked temporary media. A deletion-network failure must not resurrect the UI row.
- Resetting the form must not synchronously delete a large media batch; rely on established lease/pruning behavior unless the backend contract specifies cleanup.

## 9. Draft and Dirty-State Semantics

### 9.1 Draft payload

Store:

- Normalized form fields.
- `schemaVersion`.
- Existing edit metadata (`__draftMode`, `__editReportId`).
- `savedAt` supplied only after or as part of the request payload, while the displayed success state depends on API confirmation.

Do not store:

- Raw `File` objects.
- Abort controllers.
- Upload progress.
- Modal visibility.
- Object URLs.
- Error objects.
- Route-derived active stage unless product explicitly needs resume-to-last-stage behavior.

### 9.2 Save state machine

Use explicit states rather than parsing status strings:

```text
idle
dirty
saving
saved
failed
```

Track the last successfully saved normalized signature. A failed save must leave the form dirty. Disable duplicate save requests while one is in flight, but allow editing to continue.

If form changes during an active save, the completion applies only to the signature that was sent; newer changes remain dirty.

### 9.3 Reset

- Reset is always available.
- Confirmation names the server draft that will be cleared.
- If server clear fails, do not claim the draft was deleted. Keep the form unless the user explicitly chooses a local-only reset after being warned that the server draft may return.
- Successful reset clears form fields, errors, save state, and camera recovery state.
- Preserve existing uploaded-media cleanup policy as described in Section 8.5.

## 10. Validation and Blocking Feedback

Create pure validators:

```text
validateDrillSetup
validateDrillPersonnel
validateDrillDetails
validateDrillChronology
validateDrillAnalysis
validateDrillForm
```

Rules:

- Validators accept normalized unknown input safely.
- Field errors use stable keys; repeatable rows use row IDs.
- Continue validates the current stage.
- Request Review validates the complete candidate.
- Empty optional rows are ignored.
- Partially completed rows are invalid.
- Validation never mutates or trims the live form.
- Errors clear only when the relevant value becomes valid.
- On a blocked action, show a persistent inline summary beside the action and focus/scroll the first invalid field.
- Disabled buttons alone are never the only explanation.
- Upload-in-progress blocks Request Review with “Wait for the current photo upload to finish or cancel it.”
- Draft-save failure does not masquerade as a validation failure.

Provisional required fields until policy confirmation:

- Required: primary Drill Type, condition, location, exercise date, start time, scenario/details, outcome summary, and at least one complete chronology entry.
- Additive V2 fields remain optional until confirmed: categories, title, objectives, ERP references, personnel, analysis, photos, and issuance date.

This preserves current submission requirements and avoids blocking legacy records with newly invented rules.

## 11. Shared Review Route

Extend the existing `ReportReviewSection`; do not create a duplicate Drill review component unless configuration becomes unmaintainable.

### 11.1 Required API additions

Prefer props such as:

```js
reportKind="drill"
sectionLabels={{ analysis: 'Post-Exercise Analysis', personnel: 'Exercise Personnel' }}
onEditSection={(section) => ...}
```

Avoid a growing list of Drill booleans.

### 11.2 Drill review content

- Primary Drill Type.
- Exercise categories.
- Date/time, issuance date, condition, and location.
- Exercise title and scenario.
- Objectives.
- ERP/Annex references.
- Exercise personnel with organisation and exercise roles.
- Chronology.
- Strengths, resources, improvements.
- Managed photos with descriptions.
- Change summary when updating.
- A Drill-specific workflow summary: Prepared By, Station Commander Review, and VMM Review, derived from actual workflow actors/status where those events exist.

Do not add editable sign-off names or fabricated signatures to the Drill form. Before submission, show the current user as the prospective preparer only when that follows the existing workflow. For submitted records, derive names and dates from backend-owned record/timeline data. Existing generic transition names such as Reviewed and Approved may receive Drill-specific display labels, but their underlying permissions and actions must not be changed in this frontend stage.

### 11.3 Edit actions

Section Edit actions navigate back to the matching Drill sub-route while carrying `reviewRecord` in route state. The return must normalize once and must not create a second record ID.

Mapping:

```text
overview -> setup
personnel -> personnel
details/objectives/ERP -> details
chronology -> chronology
analysis/photos -> analysis
```

The existing global Edit action remains a fallback.

### 11.4 Submission behavior

- Reuse the parent submit lock.
- Show in-progress copy, not only disabled styling.
- Do not add another submit call inside DrillForm.
- If frontend validation state cannot be reconstructed on refresh of `/new/review`, route back to edit with a recovery message rather than submitting incomplete route state.

## 12. Record Conversion, Detail, Lists, and Changes

### 12.1 `reportDraftDomain.js`

Add Drill-specific branches for:

- Record-to-form conversion through `normalizeDrillRecordToForm`.
- Draft card title/date fields.
- Personnel and photo counts if displayed.
- Change summary for categories, title, objectives, ERP references, personnel assignments, analysis, and photos.

Do not change ERCO behavior while adding the Drill branch.

### 12.2 Review and detail media

Replace raw review `<img>` usage for managed report photos with `ReportPhotoImage`. Ensure thumbnail failure falls back to the full authenticated media URL.

### 12.3 Drill mobile home

Keep cards concise:

- Title: exercise title, otherwise primary Drill Type.
- Subtitle: location.
- Date: exercise date.
- Draft state: saving/saved/failed only when meaningful.
- Do not add multiple badges for every optional section.

### 12.4 Legacy records

- Render only available sections.
- Do not show large “Not provided” blocks for every V2 field.
- Do not require users merely viewing legacy records to upgrade them.
- When editing and resubmitting, apply current confirmed validation rules and clearly identify newly required information.

## 13. Accessibility and Responsive Requirements

- Persistent labels for every control.
- Error text connected to controls through CoreUI invalid feedback/ARIA.
- Specific accessible names for row, photo, edit, delete, and reorder actions.
- Modal focus trapping and focus restoration.
- Keyboard alternatives for drag/reorder.
- Status not communicated by color alone.
- Upload progress announced politely; blocking errors announced once.
- Photo alternative text from description, then filename, then neutral fallback.
- At least 44x44 CSS-pixel touch targets for primary mobile controls where practical.
- No horizontal form scrolling at 320 CSS pixels.
- Verify 200% zoom and reduced-motion behavior.
- Sticky mobile actions must not cover the final field or error summary.

## 14. Performance and Reliability Requirements

- Keep upload progress outside the serialized form.
- Do not recompute a full JSON signature for progress-only changes.
- Preserve immutable form updates to prevent stale closure loss.
- Guard all async results with request/operation identity.
- Abort upload and roster requests on unmount when supported.
- Do not render full-resolution images when thumbnails exist.
- Avoid copying large base64 URLs into drafts; new photos must be managed-media records.
- Bound list rendering reasonably without silently dropping rows.
- Do not silently sort chronology or personnel.
- Do not delete successful uploads when retrying failures.
- Do not claim server draft or record persistence succeeded until confirmed.

## 15. File-by-File Implementation Map

### Drill feature

- `drill/drillFormDomain.js` - defaults, normalization, compatibility, dirty checks.
- `drill/constants.js` - stage definitions, confirmed category/role options.
- `drill/useDrillForm.js` - canonical form/error state and repeatable-row actions.
- `drill/DrillForm.js` - route orchestration, save state machine, seeding, reset, review request.
- `drill/DrillSetupStep.js` - additive setup fields.
- `drill/DrillPersonnelStep.js` - roster/manual personnel and drill roles.
- `drill/DrillDetailsStep.js` - title, scenario, objectives, ERP, summary.
- `drill/DrillChronologyStep.js` - chronology wrapper and navigation.
- `drill/DrillPostAnalysisStep.js` - analysis and shared photos.
- `drill/recordFactory.js` - candidate record serialization.
- `drill/validation.js` - stage and complete validation.
- `drill/DrillMobileHome.js` - V2-safe summaries.

Remove or repurpose `DrillFormStep.js` only after its details and chronology behavior has moved and tests no longer import it. Do not delete it early.

### Shared report surfaces

- `reportDraftDomain.js` - Drill record/draft conversion and change counts.
- `components/ReportReviewSection.js` - configurable Drill sections and managed images.
- `components/ReportDetailSection.js` - verify/add Drill V2 rendering configuration.
- `Reports.js` - section edit routing and Drill labels only where shell ownership requires it.
- `hooks/useReportRouteActions.js` - preserve requested Drill edit section on review return.
- Shared workflow presentation - configure Drill display labels for Prepared By, Station Commander Review, and VMM Review without changing transition authorization.

### Shared emergency/media primitives

Preferred neutral location:

```text
src/views/report/shared/emergency-report/
  ReportPhotoSection.js
  ExercisePersonnelSelector.js   // only if extraction is genuinely neutral
  AnalysisTextList.js
```

Chronology should remain on the existing shared report workflow component until a demonstrated gap justifies extraction.

## 16. Execution Phases and Gates

### Phase 0 - Contract and characterization

Work:

1. Confirm the six decisions in Section 5.2.
2. Verify, read-only, whether the report API preserves unknown/additive Drill JSON fields and managed media fields.
3. Add fixtures for a legacy draft, legacy submitted record, edit draft, and managed photo.
4. Add characterization tests for current Drill draft/edit/review behavior and ERCO photo behavior before extraction.
5. Record the current Drill and ERCO focused test commands.

Gate:

- No UI that submits new fields proceeds until payload preservation is confirmed.
- If the API strips fields, stop at a frontend mock/feature branch and document the required backend contract; do not ship a lossy form.

### Phase 1 - Domain foundation

Work:

1. Add `drillFormDomain.js` and tests.
2. Keep established envelope keys.
3. Integrate normalization at every Drill inbound boundary.
4. Update record factory and record-to-draft conversion.
5. Replace string-parsed draft status with the state machine.
6. Correct touched draft error copy so it no longer says browser storage.

Gate:

- Legacy fixtures round-trip without losing existing fields.
- V2 fixture round-trips including all photo lease metadata.
- Edit preserves identity, version/revision, owner, and timeline.

### Phase 2 - Route skeleton

Work:

1. Add five Drill sub-routes driven by `newSection`.
2. Add stage progress UI.
3. Temporarily map current setup/details UI into the new route structure.
4. Verify refresh, Back, Continue, unknown routes, edit query, and review return.

Gate:

- Exactly one source of truth controls the active stage.
- Route changes do not reset form state within the same mounted session.
- Refresh behavior is honest about whether a server draft exists.

### Phase 3 - Low-risk content stages

Work:

1. Upgrade setup without changing primary Drill Type semantics.
2. Add exercise details, objectives, and ERP references.
3. Add stage validators and inline blockers.
4. Add/update component tests.

Gate:

- Setup/details save and restore through the real draft API in integration tests.
- Partially completed repeatable rows are never silently dropped.

### Phase 4 - Personnel and chronology

Work:

1. Add neutral roster/manual personnel selection.
2. Protect against stale roster responses and user-selection overwrite.
3. Add chronology stage using the generic component first.
4. Add accessible reordering only if accepted as a V1 requirement.

Gate:

- Roster success, empty, denied, failure, and late-response cases pass.
- Mobile and keyboard chronology operations preserve row identity and content.

### Phase 5 - Shared photo extraction and analysis

Work:

1. Characterize ERCO photo behavior.
2. Extract `ReportPhotoSection` without changing ERCO output.
3. Switch ERCO to the extracted component and run its focused tests.
4. Add Drill analysis lists and configure the shared photo component with module key `drill`.
5. Verify media metadata through draft, review candidate, review save, and edit return.

Gate:

- ERCO behavior remains stable.
- Drill partial success, retry, same-file reselection, cancellation, interruption recovery, and unmount tests pass.
- No media lease fields are lost.

### Phase 6 - Review and all report surfaces

Work:

1. Extend shared review configuration.
2. Add per-section edit routing.
3. Extend detail and mobile-home rendering.
4. Extend change summary.
5. Verify new and update submissions with the parent submit lock.

Gate:

- Create -> draft -> resume -> review -> edit section -> review -> submit works.
- Existing record -> edit -> review -> update preserves metadata.
- Legacy records remain readable.

### Phase 7 - Hardening and acceptance

Work:

1. Run focused automated tests for Drill, shared report surfaces, route actions, and ERCO components touched by extraction.
2. Run frontend lint/build because shared routing, persistence, and media are high blast-radius changes.
3. Perform the manual device/network matrix.
4. Recreate each reference drill report in the frontend.
5. Record backend/PDF follow-up fields without changing those layers in this stage.

Gate:

- No unresolved data-loss, false-save, duplicate-submit, inaccessible blocker, or mobile camera regression.
- All supplied document content can be entered and reviewed in the frontend.

## 17. Test Matrix

### 17.1 Unit

- Legacy and V2 normalization.
- Malformed/null inputs.
- Stable row IDs.
- `present: false` preservation.
- Photo metadata preservation, including leases.
- Drill workflow/sign-off label mapping without mutation of timeline data.
- Dirty signature before/during/after save.
- Per-stage/full validation.
- Record construction and blank-row omission.
- Existing-record metadata preservation.
- Change-summary detection.

### 17.2 Component

- Setup summaries, Edit, Reset, and reopened invalid controls.
- Repeatable objectives and ERP pairs.
- Personnel loading, manual fallback, duplicate prevention, and stale requests.
- Chronology mobile/desktop operations.
- Analysis text rows.
- Camera and upload triggers.
- Synchronous picker click despite best-effort draft save.
- Progress, retry, partial success, same-file reselection, remove, abort, and recovery.
- Stage blocker copy and focus behavior.
- Drill-specific review labels and managed photo rendering.
- Prepared/review/approval presentation for pending and completed workflow states.

### 17.3 Integration

- New report end-to-end.
- Server draft save/reload/resume.
- Draft failure followed by retry without false saved state.
- Form edit during in-flight draft save remains dirty.
- Legacy draft upgrade.
- Existing record edit/update.
- Review section edit and return.
- Refresh at every editable route.
- Refresh on review with and without route state.
- Camera background/return interruption.
- One invalid file among valid photos.
- Reset with successful and failed server clear.
- Double-submit prevention.

### 17.4 Manual devices and conditions

- Lower-memory Android Chrome.
- Current Android Chrome.
- iOS Safari.
- Desktop Chrome or Edge.
- 320, 360, 390, and 430 CSS-pixel widths.
- Landscape orientation and 200% zoom.
- Slow connection, request timeout, and offline transition.
- Embedded browser detection behavior where testable.
- Camera return after browser backgrounding.
- Ten managed photos and a long chronology.
- Long participant names, roles, titles, and locations.

## 18. Definition of Done

Frontend V1 is complete only when:

- Five Drill edit stages and the shared review route work as one coherent flow.
- Primary Drill Type remains compatible and exercise categories are separate.
- All V2 fields round-trip through server drafts and candidate records.
- Legacy drafts/records remain readable and editable without silent loss.
- Save states truthfully represent server results.
- Camera launch retains the user gesture and recovery uses module key `drill`.
- Managed photo metadata survives create, draft, review, edit, and update.
- Partial photo failure never discards successful uploads or form text.
- Review, detail, mobile home, and change summary understand Drill V2.
- Drill workflow presentation uses Prepared By, Station Commander Review, and VMM Review labels while preserving backend-owned actors and authorization.
- Blocking actions always show a clear inline reason.
- Accessibility and responsive requirements pass.
- Focused tests, lint, and production build pass.
- Manual lower-memory Android and iOS camera/upload checks are recorded.
- Each supplied drill report can be represented in the frontend.
- Backend/PDF follow-up work is documented separately.

## 19. Stop Conditions

Pause implementation and report the blocker instead of improvising when:

- The API strips additive Drill fields.
- The API strips managed-media lease metadata.
- Required-field or role rules remain ambiguous for the stage being implemented.
- Shared photo extraction changes ERCO behavior without a safe compatibility fix.
- Route changes cause form remount/data loss that cannot be resolved within the established shell.
- Mobile testing shows the chosen capture path repeatedly crashes or loses session state.

## 20. First Safe Coding Slice

Implement only this slice first:

1. Add legacy/V2 fixtures and characterization tests.
2. Add `drillFormDomain.js` while retaining established envelope keys.
3. Integrate normalization into draft, edit, and review-return boundaries.
4. Update `buildDrillRecord()` and Drill record-to-draft conversion.
5. Add the explicit draft save state machine and correct false browser-storage copy.
6. Add the five-route skeleton while temporarily retaining current controls.

Do not add personnel, new required rules, or photos until this slice passes its gates. This establishes compatibility, persistence, and navigation before the higher-risk UI and media work begins.
