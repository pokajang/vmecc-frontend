# Frontend Live UAT Day 4 Deep-Record Execution

**Date:** 2026-08-11  
**Status:** Completed with a HOLD verdict  
**Environment:** `https://vmecc.amiosh.com`  
**Verified build:** `54acd0e2d079-20260810102950`  
**Boundary:** Production-safe read-only UAT, source reconciliation, test harness, and documentation; no application-source or production-data change

## 1. Outcome

The Day 4 harness passed its final browser batches and found no overflow, runtime error, failed request, rate limit, server error, credential exposure, or mutation attempt. HSE Inspection and Fitness Test rendered successfully at all four required viewports.

The audit did not satisfy the complete deep-record coverage target because production contains no suitable authorized record for seven Inspection types, ERCO, or Drill, and the seeded TRT account owns no submitted target record. Those states remain `data-blocked`; they were not inferred as passes or manufactured through production seeding.

Three reported presentation concerns are supported by live measurement and/or matching deployed source. A further high-impact route recovery issue was verified for Incident Commander Inspection records opened from the `All` scope.

**Verdict: HOLD.** Complete a bounded pre-Day 5 corrective checkpoint for the Inspection deep-link/refresh defect before continuing the audit programme. The repository-wide media inventory can be prepared, but its execution should not be called Day 5 complete until this functional issue is corrected and rerun.

## 2. Safety and entry evidence

- Public `version.json` returned the expected build ID.
- Credential preflight passed for all six seeded personas; Day 4 used TRT and Incident Commander only.
- Live-UAT safety contracts passed 5/5.
- Day 3 route/schedule contracts passed 4/4.
- Day 4 scope/safety contracts passed 3/3.
- The request guard permitted only `GET`, `HEAD`, `OPTIONS`, and login `POST`.
- Production API pacing remained at a minimum of 750 ms between requests.
- No create, edit, upload, submit, review, approve, reject, delete, acknowledgement, or read-state action was attempted.
- Trace and video recording remained disabled.
- Raw evidence remained under the ignored `.qa` root.

## 3. Accepted run evidence

### Full role/project reconciliation

Run `VMECC-QA-20260811-092303-cprqin` established:

- TRT mobile and desktop batches passed authentication, discovery, session, safety, and diagnostic gates;
- Incident Commander mobile and desktop batches passed the then-current harness;
- 4/4 Playwright role/project tests passed; and
- the test correctly recorded unavailable detail states as blocked rather than passed.

### Corrected real-user Inspection navigation

Run `VMECC-QA-20260811-093003-mzrgsh` replaced cold Incident Commander Inspection deep links with the actual authorized journey:

1. open Inspection;
2. change Record scope from `Mine` to `All`;
3. open the full records view on mobile;
4. filter to the target record; and
5. open its accessible row action.

Both mobile and desktop projects passed. Run `VMECC-QA-20260811-093310-gawtkq` repeated the same two batches after preferring evidence-bearing fixtures; both passed again.

Final accepted Incident Commander matrix:

| Surface                      |      360x800 |      390x844 |     768x1024 |     1440x900 |
| ---------------------------- | -----------: | -----------: | -----------: | -----------: |
| HSE Inspection detail        |       Passed |       Passed |       Passed |       Passed |
| Fitness Test detail          |       Passed |       Passed |       Passed |       Passed |
| General Inspection           | Data-blocked | Data-blocked | Data-blocked | Data-blocked |
| Fire Extinguisher Inspection | Data-blocked | Data-blocked | Data-blocked | Data-blocked |
| Hydraulic Rescue Equipment   | Data-blocked | Data-blocked | Data-blocked | Data-blocked |
| High Angle Rescue Equipment  | Data-blocked | Data-blocked | Data-blocked | Data-blocked |
| ER Auxiliary Equipment       | Data-blocked | Data-blocked | Data-blocked | Data-blocked |
| SCBA Inspection              | Data-blocked | Data-blocked | Data-blocked | Data-blocked |
| Fire Truck Daily Readiness   | Data-blocked | Data-blocked | Data-blocked | Data-blocked |
| ERCO                         | Data-blocked | Data-blocked | Data-blocked | Data-blocked |
| Drill                        | Data-blocked | Data-blocked | Data-blocked | Data-blocked |

The TRT account authenticated and remained stable but owned no submitted Inspection, ERCO, Fitness Test, or Drill record. Its 16 planned detail entries were therefore data-blocked.

## 4. Reconciled measurements

Across the eight rendered HSE/Fitness surface entries:

| Measure                                 |                      Result |
| --------------------------------------- | --------------------------: |
| Horizontal overflow                     |                0 px maximum |
| Console errors                          |                           0 |
| Unexpected client errors                |                           0 |
| Page errors                             |                           0 |
| Failed requests                         |                           0 |
| Rate-limit responses                    |                           0 |
| Server errors                           |                           0 |
| Mutation violations                     |                           0 |
| Full-width surfaces with a left border  | 6/6 at 360, 390, and 768 px |
| Desktop side panels with a left divider |              2/2 at 1440 px |
| Rendered live evidence images           |                           0 |

At 360, 390, and 768 px, the `.inspection-detail-drawer` occupied the full viewport from `left: 0` but retained a `1px` left border. At 1440 px, the drawer began at `left: 512` with width `928px`; the same border acts as an intentional desktop side-panel divider there.

## 5. Findings

### High — Incident Commander Inspection deep links and refresh lose the `All` scope

**Affected user and step:** Incident Commander returning to, refreshing, or directly opening an Inspection record available through `All` records.

**Verified evidence:** The record loads when opened through Inspection → `All` → target row. A cold navigation to the resulting `/inspection/:reportId` route loads the default `Mine` scope and presents `Report not found.` The route does not preserve or reconstruct the authorized list scope.

**User impact:** A reviewer can successfully open a record and then be told it does not exist after refresh, bookmark use, or a shared link. That interrupts the primary review journey and creates persistent uncertainty about whether the report was removed or access was revoked.

**Likely owner:** `useInspectionRecords` initializes `recordScope` to `mine`; `selectedRecord` can only resolve against the currently loaded rows. Inspection row navigation does not carry a durable scope hint, and detail entry does not fetch an authorized record by ID.

**Smallest remediation:** Preserve an explicit non-sensitive scope in the detail URL/navigation state and restore it on route entry, or add an authorized read-by-ID detail fetch. Do not default all Inspection browsing to `All`, weaken permissions, or preload an unrestricted corpus.

**Required regression checks:** Incident Commander list-open, direct navigation, browser refresh, back navigation, TRT-owned record detail, unauthorized ID, mobile/desktop, and zero extra mutation traffic.

### Medium — Full-width detail drawers retain a stray left border

**Affected user and step:** Mobile and tablet users reading HSE Inspection or Fitness Test details.

**Verified evidence:** Both live surfaces measured `border-left-width: 1px` while spanning the full viewport at 360, 390, and 768 px. The supplied Inspection screenshot visually matches this measurement.

**User impact:** The line makes a full-screen detail workspace look like a misaligned nested panel and weakens the visual edge of the sheet.

**Owner:** Shared `.inspection-detail-drawer.offcanvas` presentation used by Inspection and work-first Reports.

**Smallest remediation:** Remove the divider while the drawer width equals the viewport, and retain it only when the 58 rem drawer is a true desktop side panel. Validate the boundary around 928 px rather than applying an unrelated global offcanvas override.

### Medium — Read-only evidence uses card-on-card image presentation

**Evidence classification:** User-supplied rendered screenshot plus source confirmation at the matching deployed frontend code; the automated live fixture contained no rendered image and therefore could not independently remeasure it.

**Verified source path:** `DetailEvidenceBlock` adds a bordered, tinted, padded `.inspection-readonly-evidence` surface. Its `PhotoGallery` consumer adds another bordered, padded rounded wrapper around each `PhotoPreview`. `PhotosGrid`, `ReportPhotoGallery`, and the Inspection review dashboard contain additional card-style image implementations.

**User impact:** Individual evidence images look over-contained inside already card-heavy detail modules, increasing visual noise and reducing the photograph's prominence.

**Smallest remediation:** Keep semantic/group layout wrappers but make the individual read-only photo figure visually neutral. Preserve editor boundaries where controls genuinely need grouping.

### Medium — Device filenames remain visible and enter accessible image names

**Evidence classification:** User-supplied rendered screenshot plus source confirmation; automated live media was data-blocked.

**Verified source paths:** Inspection `PhotoGallery`, `PhotoEditorGallery`, `PhotosGrid`, `ReportPhotoGallery`, `PhotoPreview`, and Inspection review photo cards render or derive alternative text from `fileName`.

**User impact:** Camera-generated names add meaningless noise for sighted and screen-reader users and can expose device naming conventions. They compete with the user-authored description, which is the meaningful evidence context.

**Smallest remediation:** Keep filenames in internal models, upload validation, API payloads, diagnostics, and document download naming. Remove them only from visible image labels, tooltips, and alternative text; use `Photo N`, contextual evidence copy, or the user-authored description.

## 6. Shared-component reconciliation

| Pattern                                                              | Evidence                                                                                                                    | Disposition                                                                                      | Reason                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Inspection and work-first Report detail offcanvas                    | Same job, shell, responsive width, header/body classes, close behavior, and live border defect                              | Extract a small shared `RecordDetailDrawer` later, or first centralize the shared style contract | Two consumers have the same semantic interaction; title and body are clean slots                     |
| Detail metadata                                                      | Inspection already imports shared `DetailField`; Reports use the same primitive                                             | Reuse existing component                                                                         | No new abstraction is needed                                                                         |
| Read-only photo image/figure                                         | Inspection and Reports already share `ReportPhotoImage`/`PhotoPreview`, but repeat filename and framing policy above it     | Add or extend one low-level neutral read-only photo figure                                       | Centralizes caption, alt, fallback, aspect ratio, and filename suppression without merging workflows |
| Inspection `PhotoGallery` and `ReportPhotoGallery`                   | Similar content, but Report gallery owns modal navigation while Inspection viewers are opened through domain detail actions | Keep module-level galleries; share only the image/figure policy                                  | A single gallery API would mix different viewer and action contracts                                 |
| Review/status/check rows                                             | Domain labels, transitions, and structures differ                                                                           | Keep module-local; align tokens only                                                             | Similar appearance does not establish the same user job or state machine                             |
| ERCO chronology, Fitness participant results, Drill exercise content | Specialist domain information                                                                                               | Keep module-local                                                                                | False abstraction would hide important semantics                                                     |

## 7. Harness corrections and rejected evidence

No rejected run represents an application regression:

- `VMECC-QA-20260811-091524-afhbkt` — the local PowerShell loader retained Markdown backticks around credential values; authentication correctly failed. The loader was corrected without changing the credential file or application.
- `VMECC-QA-20260811-092035-smonkv` — the first fixture resolver used a list identity without accounting for Inspection scope and asserted a heading on a genuine `Report not found` state.
- `VMECC-QA-20260811-092613-hbsziq` — preferring the payload identity alone did not solve the state contract because the cold route still loaded `Mine` records.

Corrective harness actions:

- strip Markdown delimiters only in the local execution shell;
- detect and classify `Report not found` instead of allowing it to pass;
- follow the authorized UI scope/list journey for Incident Commander Inspection records;
- prefer evidence-bearing records where the authorized corpus provides them; and
- rerun only affected Incident Commander projects after each attribution.

## 8. Application-change boundary

No file under `src/`, no stylesheet, no backend source, no production record, and no generated build was changed. Day 4 added only:

- the deep-record live harness;
- its schedule matrix and contracts;
- npm command aliases;
- this plan/execution documentation; and
- the upgrade index entry.

## 9. Decision and next action

**Decision: HOLD before Day 5 completion.**

Create and execute a narrow pre-Day 5 corrective plan in this order:

1. preserve or reconstruct authorized Inspection detail scope across list-open, direct navigation, and refresh;
2. remove the shared detail-drawer border only while it spans the viewport;
3. add focused route, permission, responsive, and browser regression coverage;
4. deploy and run the bounded Incident Commander/HSE post-correction gate; and
5. if the gate passes, proceed to Day 5's repository-wide image render-site and filename inventory.

The card-on-card and filename findings should be implemented with the Day 5 inventory and Day 6 component slice, because automated production media coverage was unavailable and the correct reusable boundary still needs the complete render-site map.
