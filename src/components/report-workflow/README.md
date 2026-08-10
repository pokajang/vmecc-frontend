# Report workflow design contract

Shared workflow components support Inspection, ERCO, Drill, and Fitness while keeping
validation, persistence, permissions, and domain terminology inside each feature.

## Product character

Workflow screens are calm, operational, precise, compact, and high-trust.

## Interaction rules

- Keep one visually dominant primary action in each stage.
- Present Back as a quiet action and Save Draft as a secondary action.
- Do not disable Continue or Review for ordinary incomplete input. Validate after the user acts,
  focus the first invalid field, and keep specific feedback beside its control.
- Reserve disabled primary actions for operational blockers such as an upload, save, conflict,
  permission restriction, or non-idempotent submission in progress.
- Keep operational failures inline with a recovery action. Use toasts only for transient success.
- Preserve user input after recoverable failures.
- Put protocols and infrequent reference material behind explicit disclosure.

## Visual rules

- Use VMECC and CoreUI semantic tokens. Shared components must not require feature-specific CSS.
- Use typography, spacing, and separators before adding another card.
- Render summary labels above their values and use semantic definition lists.
- Use border-first surfaces and reserve elevation for overlays and sticky mobile actions.
- Keep touch targets at least 44px for primary workflow controls.
- Use one responsive recomposition shared by all modules rather than shrinking desktop markup.

## Ownership

`src/components/report-workflow` owns presentation and interaction contracts. Feature modules own
item builders, validation, API calls, form state, and domain-specific policy. Shared components must
not import from `src/views`.

## Responsive and editing contracts

- `ResponsiveReportDialog` owns the report-level desktop modal/mobile drawer shell, footer layout,
  scrolling, close locks, and the `767.98px` report breakpoint. Consumers continue to own fields,
  focus targets, validation, actions, and busy state.
- `WorkflowEditStateBanner` owns edit-mode presentation and optional original/draft source controls.
  Consumers continue to own source data, hydration, dirty state, confirmation resets, and
  persistence.
- `src/hooks/useReportIsMobile.js` is the authoritative report breakpoint implementation. The old
  `src/views/report/hooks/useReportIsMobile.js` path is a compatibility re-export only.
