# Frontend Global Button System Execution — 2026-08-13

## Implemented

- Added `AppButton` as the shared semantic action primitive.
- Added `ActionButtonGroup` as the shared inline/stacked action layout primitive.
- Added centralized neutral and semantic soft-action tokens and CoreUI compatibility rules in the foundation layer.
- Migrated shared confirmation dialogs, record-detail actions, workflow-stage actions, create actions, edit controls, and responsive report/workflow dialog footers.
- Preserved Back/link navigation, icon controls, segmented choices, disclosure controls, and structural raw buttons as explicit exceptions.
- Preserved success and warning confirmation intent used by user bulk actions and extinguisher lifecycle actions.
- Updated the inspection visual contract from bordered-outline assertions to borderless soft-surface, contrast, radius, and intent assertions.
- Added a dedicated light/dark and mobile/desktop Playwright button-system contract.
- Updated only the affected inspection form snapshots to include the new shared semantic class contract.
- Corrected the Messages hook test environment declaration discovered by the full regression gate; application behavior was unchanged.

## Verification

- ESLint: passed.
- Focused shared/button/dialog/component tests: passed.
- Full Vitest shard 1: 171 files, 1,035 tests passed.
- Full Vitest shard 2: 171 files, 861 tests passed.
- Targeted Playwright button, drawer, inspection visual, and reporting-record coverage: 9 tests passed after the final build.
- Production build: passed (6,504 modules transformed).
- Production dependency audit: 0 vulnerabilities.

## Design verdict

The system now provides one future-facing semantic button API and a compatibility bridge for existing CoreUI actions. The implementation intentionally does not make every clickable element look like a pill: action intent and interaction role determine presentation, preventing navigation, toggles, disclosures, and icon utilities from becoming visually ambiguous.
