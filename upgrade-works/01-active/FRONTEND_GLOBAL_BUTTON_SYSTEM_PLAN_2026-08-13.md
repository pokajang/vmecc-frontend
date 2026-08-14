# Frontend Global Button System Plan — 2026-08-13

## Objective

Converge labelled application actions on a reusable, intent-based visual system: pill-shaped, borderless, and softly filled where appropriate, while preserving clear hierarchy, accessibility, and the distinct behavior of navigation and structural controls.

## Scope

1. Inventory CoreUI and native button usage and identify the safest shared seams.
2. Define semantic treatments for primary, neutral, success, information, warning, and danger actions.
3. Add a shared `AppButton` and `ActionButtonGroup` contract for new work.
4. Provide a CoreUI compatibility layer so existing conventional `CButton` consumers inherit the system without hundreds of risky leaf edits.
5. Migrate high-leverage shared components: confirmation dialogs, record-detail actions, workflow stages, create/edit controls, and responsive dialog action groups.
6. Preserve explicit exceptions:
   - Back and text-link navigation remain chrome-free.
   - Icon-only controls retain compact circular/square hit areas.
   - Segments, toggles, disclosures, table mechanics, and whole-row controls retain their structural presentation.
   - Primary commitments remain stronger than secondary actions.
7. Verify light/dark rendering, intent distinction, keyboard focus, touch targets, mobile overflow, drawer actions, inspection workflow actions, and reporting-record routes.

## Acceptance criteria

- Conventional action buttons have no visible border and use a pill radius.
- Neutral and reversible actions use a subtle neutral surface.
- Supportive intent actions use corresponding soft semantic surfaces.
- Destructive actions remain unmistakably destructive.
- Submit/save/continue actions retain stronger emphasis.
- Back, link, icon, selection, and disclosure controls do not accidentally inherit inappropriate pill chrome.
- Full lint, unit/component suites, production build, dependency audit, and targeted Playwright suites pass.

## Risk controls

- Do not globally restyle the raw `button` element.
- Keep compatibility on CoreUI variant APIs while introducing the shared wrapper.
- Validate disabled/loading/focus behavior and long labels.
- Update snapshots only where semantic shared-component class names intentionally changed.

