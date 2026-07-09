# Inspection Report Evidence Merge Notes

## Scope

- Standardizes report-level inspection evidence copy around `Additional report evidence`.
- Keeps finding, item, issue, and defect evidence labels scoped to their own evidence.
- Uses `reportRemarks` for optional whole-report remarks; `description` remains the inspection summary.
- Keeps root `photos` as optional report-level photos.

## Frontend Review Notes

- Shared copy lives in `src/views/inspection/inspectionReportEvidenceCopy.js`.
- The compact mobile opener is `Add report evidence` because the drawer contains photos and remarks.
- Photo actions remain photo-specific (`Add report photos`, `Take photo`, `Upload photo`).
- Finding controls remain finding-specific (`Add finding photos`).
- `build/` is tracked in this repo, so production assets were regenerated after source changes.

## Verification

Run the focused checks before merge:

```powershell
npx vitest run src/views/inspection/__tests__/InspectionGeneralEvidenceCard.test.jsx src/views/inspection/__tests__/inspectionFormHelpers.test.js src/views/inspection/__tests__/InspectionFormBodySections.mobile.test.jsx src/views/inspection/__tests__/InspectionReviewSection.test.jsx src/views/inspection/__tests__/InspectionDetailSection.test.jsx src/views/inspection/__tests__/InspectionForm.workflow.test.jsx --environment jsdom
$env:VMECC_E2E_BASE_URL='http://127.0.0.1:3000'; npx playwright test tests/e2e/inspection-report-evidence-visual.spec.js --config=playwright.config.mjs --workers=1
npm run build
```
