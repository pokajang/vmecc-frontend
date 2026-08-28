# Report workflow design contract

Shared workflow components support Inspection, ERCO, Drill, Fitness, Overtime, Leave, and Payroll
claims while keeping validation, persistence, permissions, and domain terminology inside each
feature.

## Product character

Workflow screens are calm, operational, precise, compact, and high-trust.

## Interaction rules

- Keep one visually dominant primary action in each stage.
- Present Back as a quiet action. Persist drafts automatically at validated Continue, Back, media,
  and Review boundaries instead of showing a permanent Save Draft action.
- Hide workflow-level actions while an individual setup selector is active. Once the required
  setup is complete and summarized, expose only Continue.
- Do not disable Continue or Review for ordinary incomplete input. Validate after the user acts,
  focus the first invalid field, and keep specific feedback beside its control.
- Reserve disabled primary actions for operational blockers such as an upload, save, conflict,
  permission restriction, or non-idempotent submission in progress.
- Keep operational failures inline with a Retry save action. Do not show routine persistence or
  synchronization notices that give the user nothing to act on. Use toasts only for transient success.
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

## Application workflow composition

- `WorkflowChoiceStage` owns responsive type/setup selection. Staged choices expose one Continue
  action; opt-in action choices advance directly from the selected row. Page headers remain the sole
  Back-navigation owner.
- `WorkflowSetupField` owns selected setup summaries and their Edit/Change affordance.
- `WorkflowStageActions` owns primary-first mobile action ordering, busy semantics, and inline
  recoverable persistence failures. Application submit/reset groups stay in flow so they never
  cover fields or evidence; compact sticky docking is reserved for workflows that explicitly
  provide non-overlapping content clearance.
- `WorkflowAttachmentField` owns the product-styled add/replace trigger, hidden native file input,
  optional camera, status, error, and remove presentation. Feature modules continue to own upload
  APIs, file policy, attachment lifecycle, and preview data.
- `workflowFormFocus` owns the base scroll-and-focus behavior for invalid controls. A feature may
  extend target resolution for nested domain items.
- Ordinary application forms autosave drafts and do not expose a permanent Save Draft action.
  Contextual Save draft and leave actions may remain inside dirty-navigation confirmations.

## Responsive and editing contracts

- `ResponsiveReportDialog` owns the report-level desktop modal/mobile drawer shell, footer layout,
  scrolling, close locks, and the `767.98px` report breakpoint. Consumers continue to own fields,
  focus targets, validation, actions, and busy state.
- `WorkflowEditStateBanner` owns edit-mode presentation and optional original/draft source controls.
  Consumers continue to own source data, hydration, dirty state, confirmation resets, and
  persistence.
- `src/hooks/useReportIsMobile.js` is the authoritative report breakpoint implementation. The old
  `src/views/report/hooks/useReportIsMobile.js` path is a compatibility re-export only.
