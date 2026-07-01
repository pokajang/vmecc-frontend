# Inspection Onboarding

Inspection is the reference onboarding module. Keep new work aligned to these boundaries:

- `trtInspectionTourDefinition.js`: step anchors and step copy only.
- `inspectionQuickTourConfig.js`: Inspection tour contract, prompt copy, route/event wiring.
- `tutorialRegistry.js`: hub visibility, readiness, and launch metadata.
- `useOnboardingTourRunner.js`: runtime flow, suppression/persistence adapter use, selector resolution.
- `components/onboarding/*`: shared presentation primitives only.

## Contracts

- Validate tour config, steps, hub items, and localized copy with `onboardingContracts.js`.
- Mark localized tutorials explicitly with `localized: true`; do not infer localization only from object shape.
- Keep launch source and event identifiers in `inspectionOnboardingContract.js`.

## Launch Flows

- Direct route prompt: `/inspection`
- Tutorial hub replay: `TRT_INSPECTION_TOUR_REPLAY_EVENT`
- Profile handoff request: `TRT_INSPECTION_TOUR_REQUEST_EVENT`
- Manual replay inside Inspection: dispatch the replay event with the centralized source constant

## Localization

- Store shared onboarding preferences in `onboardingPreferences.js`.
- Inspection copy stays bilingual at the config layer, but shared UI renders one selected locale.
- Default locale is English. If selected copy is missing, fall back to the other supported locale.

## Required Coverage

- Contract validation for config, steps, hub items, and preferences
- Prompt and tooltip rendering for plain strings and localized copy
- Launch coverage for route prompt, hub replay, profile handoff, and manual replay
- E2E coverage for English default, BM selection, admin replay, inaccessible users, and mobile overlay safety

## Non-Inspection Rollout Coverage Audit

Current inspection coverage is a good reference, but non-Inspection modules are not covered by the same hazard-level checks yet.

### Current status vs required hazards

- Redirect routes
  - Covered for Inspection via unit-level prompt-eligibility tests and request-event navigation.
  - Not covered at e2e level for non-Inspection modules.
- Hub replay and direct-prompt paths
  - Covered for Inspection in `TutorialHubModal`, `AppHeader`, and `TrtInspectionQuickTour`.
  - `source` propagation and persistence/event payloads need to be re-verified for each new module config.
- Dirty-form interruption
  - Not covered. `useOnboardingTourRunner` calls `navigate(...)` directly, so onboarding redirects can bypass navigation guard flows.
- Mobile anchor readiness
  - Partially covered by tour runtime unit tests and one mobile e2e sanity check.
  - Missing for module-specific anchors, including hidden/off-canvas states and duplicate visible selectors on real devices.
- `target_not_found`
  - Covered in unit test only through local mock `react-joyride` event and backend fallback update payload.
  - Missing e2e reproduction and telemetry assertions.
- Telemetry events
  - `onboardingTelemetry` currently only logs/returns local objects.
  - No tests assert emitted telemetry payloads for any onboarding event.

### Required additions before non-Inspection rollout

- Add `onboardingRouteRedirect.spec` coverage per module:
  - Unit: `startTour` auto-redirect from non-tour route to module route, including nested/regex route patterns.
  - Unit: `requestEvent` and `replayEvent` both redirect with userId filtering and source tagging.
  - E2E: dispatch request/replay from `/dashboard` and verify navigation and first step visibility on module path.
- Add navigation interruption coverage for dirty forms:
  - Unit/integration in `useOnboardingTourRunner` with `NavigationGuardProvider`: dirty guard registered, then route request/replay should trigger `pendingAction` dialog or equivalent block flow.
  - Include both direct prompt start and request-event start flows.
- Add mobile anchor readiness by module:
  - Unit: visibility rules for module-specific anchors and duplicate hidden duplicates.
  - E2E: mobile viewport on module route, assert tooltip position and no bottom-nav overlap for every critical step.
- Add `target_not_found` regressions:
  - Unit: mock Joyride `error:target_not_found` for missing module step and assert persisted metadata includes `targetNotFoundStepKeys`.
  - Add e2e fixture where at least one anchor is missing and ensure tour continues and recovery UI works.
- Add telemetry contract tests:
  - Unit tests for each event (`prompt_shown`, `tour_started`, `tour_completed`, `tour_dismissed`, `target_not_found`, `hub_language_changed`) with mocked `trackOnboardingTelemetry`.
  - Assert stable payload shape: `moduleId`, `tourKey`, `source`, `locale`, `stepKey`, `promptState`, and `detail`.
- Add a shared module onboarding test template (`src/onboarding/__tests__/nonInspectionTour.contract.test.*`) that new modules must copy before merge.

### Rollout-ready wording

Use this statement in module PRs:

> Onboarding module rollout is blocked unless module contract validation, route redirect/replay handling, dirty-form guard behavior, mobile anchor readiness, missing-anchor recovery, and telemetry emission are covered by automated unit/E2E checks and pass.

Use this final acceptance line before enabling `ready` state:

> "This module is rollout-ready only when all onboarding hazards are explicitly tested: redirect, hub/direct launch, dirty-form interruption, mobile anchor readiness, `target_not_found`, and telemetry event emission."
