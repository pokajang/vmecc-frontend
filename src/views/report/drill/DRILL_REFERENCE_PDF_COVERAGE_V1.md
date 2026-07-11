# Drill Reference DOCX to PDF V2 Coverage

Date: 11 July 2026

## Scope and method

This audit compares Drill PDF V2 with the three source reports in `report-reference/drills`:

1. `Drill Report 240125 1X BV Lab Staf fainted at Sampling Area Level 3 CT 10.docx`
2. `Drill Report April 25 - BUs accident near CCR2 with 2 casualties - 22 April 25.docx`
3. `Drill Report Aug 25 - Major Fire At CT09 - 27 July 25.docx`

The source DOCX packages were inspected directly from their WordprocessingML and embedded-media
collections. The comparison does not depend on filenames alone. Each scenario was then represented
as a schema V2 payload, persisted through the real report and managed-media endpoints, linked to its
final report, downloaded through the real Drill PDF endpoint, and checked against the expected
section and scenario tokens.

The automated fixtures live in `vmecc-backend/tests/Fixtures/DrillReferenceScenarios.php`. The
round-trip coverage is enforced by `DrillReportPdfTest`.

## Section coverage matrix

| Reference content | January body injury | April bus accident | August major fire | Drill PDF V2 mapping |
| --- | --- | --- | --- | --- |
| Exercise date | Present | Present | Present | Exercise Overview / Exercise Date |
| Report issuance date | Present | Present | Present | Exercise Overview / Report Issuance Date |
| Exercise start time | Present | Present | Present | Exercise Overview / Start Time |
| Weather/condition | Cloudy | Clear | Clear | Exercise Overview / Condition |
| Location/area | CT09 Level 3 | CCR2 | CT09 Zone 4 | Exercise Overview / Location / Area |
| Emergency/drill categories | Implicit rescue/body injury | Rescue and spill | Fire and rescue | Separate Primary Drill Type and category badges |
| Exercise title/scenario | Present | Present | Present | Exercise Details / Exercise Title and Scenario / Details |
| Objectives | Not explicit | Not explicit | Not explicit | Optional V2 Exercise Objectives; omitted when empty |
| ERP/Annex references | Annex 10 | Annexes 17, 10, 23 | Annexes 8, 10, 13 | Repeatable ERP / Annex table |
| Personnel and exercise roles | Partial sign-off identity | SC, ASC, TRT roles | SC, ASC, TRT roles | Exercise Personnel table with organisation and exercise roles |
| Exercise summary | Present | Present | Present | Summary of Exercise |
| Chronology | Present | Present | Present | Entered-order chronology with repeating table header |
| Strengths | Present | Present | Present | Post-Exercise Analysis / Strengths |
| Mobilised resources | Present | Present | Present | Post-Exercise Analysis / Resources, Equipment and Consumables |
| Improvement opportunities | Present | Present | Present | Post-Exercise Analysis / Improvement Opportunities |
| Exercise photographs | Present | Present | Present | Managed, report-linked photographs with descriptions |
| Prepared by | Present | Present | Present | Current-revision Submitted/Resubmitted actor |
| Station Commander review | Present | Present | Present | Current-revision Reviewed actor |
| VMM review | Empty/not supplied | Empty | Empty | Current-revision Approved actor or `Pending` |

## Scenario-specific evidence

### January body injury rescue

- Preserved the 24 January 2025 exercise date, 20:24 start, cloudy condition, and CT09 Level 3
  Sampling Area.
- Preserved Annex 10 Body Injury, casualty assessment/evacuation chronology, Full SkedCo and
  splinting resources, strengths, and communication improvements.
- The DOCX contains one large exercise photograph plus small branding/sign-off assets.

### April bus accident rescue

- Preserved the 22 April 2025 exercise date, 21:15 start, clear condition, and CCR2 location.
- Preserved Rescue and Hazmat/Oil Spill categories, Annexes 17/10/23, SC/ASC/TRT personnel,
  casualty extraction, spill control, strengths, resources, and improvements.
- The DOCX package contains eleven large exercise-photo media entries plus non-exercise assets.
  This exceeds the approved V2 limit of ten managed photos. See the explicit exception below.

### August major fire

- Preserved the 27 August 2025 exercise date, 14:59 start, clear condition, and CT09 Zone 4.
- Preserved Fire and Rescue categories, Annexes 8/10/13, SC/ASC/TRT personnel, search/rescue,
  firefighting, cooling, overhaul, resources, strengths, and improvements.
- The DOCX contains two large exercise photographs plus branding/sign-off assets.

## Explicit photograph-limit exception

The approved backend/frontend contract permits at most ten managed photographs and 12 MB of unique
stored media per Drill report. The April reference contains eleven exercise photographs. Raising
the limit silently would contradict the approved resource, mobile-memory, payload, and PDF stress
boundaries.

The implemented behavior is therefore deliberate:

- The UI prevents adding more than ten managed photographs.
- The backend rejects an eleventh photo with a stable validation response.
- PDF V2 renders all linked photographs for an accepted V2 payload, up to ten.
- The automated stress render proves ten photographs and 250 chronology rows.
- Recreating the April narrative and every report section is supported, but an operator must
  select the ten report photographs to retain. The source DOCX is never modified.

Changing this decision requires an explicit coordinated frontend/backend limit revision followed by
mobile memory tests and a new ten-plus-photo PDF stress threshold. It must not be changed only in
the template or only in validation.

## Automated evidence

`DrillReportPdfTest` now proves, for all three reference scenarios:

- A real schema V2 final report is persisted through the report API.
- A real managed Drill upload is durably linked to the final report.
- The real owner-scoped Drill PDF endpoint returns a valid PDF.
- Every reference section heading and scenario-specific token is present in rendered HTML.
- The photograph is hydrated from private linked storage rather than a client/remote URL.

Separate tests prove current-revision sign-offs, owner scope, Drill permission, linked-media scope,
remote URL stripping, legacy compatibility, and the ten-photo/250-row stress render.

## Verdict

Drill PDF V2 is on par with the three supplied references at the approved schema and section level.
The only intentional content-cap difference is the April document's eleventh photograph, which is
blocked by the explicit ten-photo contract rather than silently dropped during PDF generation.
