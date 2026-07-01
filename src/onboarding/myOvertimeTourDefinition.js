export const MY_OVERTIME_TOUR_MODULE_SELECTOR = '[data-tour-id="overtime-module"]'
import { SAFE_MODAL_STEP_PLACEMENT } from 'src/onboarding/stepPlacements'

const OVERTIME_LIST_ROUTE_PATTERN = /^\/overtime\/?$/i
const OVERTIME_FORM_ROUTE_PATTERN = /^\/overtime\/new\/?$/i
const OVERTIME_DETAIL_ROUTE_PATTERN = /^\/overtime\/[^/]+\/?$/i

export const MY_OVERTIME_TOUR_ANCHOR_SELECTORS = [
  MY_OVERTIME_TOUR_MODULE_SELECTOR,
  '[data-tour-id="overtime-type-selection"]',
  '[data-tour-id="overtime-type-continue"]',
  '[data-tour-id="overtime-records"]',
  '[data-tour-id="overtime-filters"]',
  '[data-tour-id="overtime-new-action"]',
  '[data-tour-id="overtime-apply"]',
  '[data-tour-id="overtime-utility-panel"]',
  '[data-tour-id="overtime-draft-panel"]',
  '[data-tour-id="overtime-draft-action"]',
  '[data-tour-id="overtime-submit-action"]',
  '[data-tour-id="overtime-detail"]',
  '[data-tour-id="overtime-edit-action"]',
  '[data-tour-id="overtime-cancel-action"]',
  '[data-tour-id="overtime-delete-action"]',
  '[data-tour-id="overtime-cancel-modal"]',
  '[data-tour-id="overtime-delete-modal"]',
]

export const MY_OVERTIME_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Overtime workspace',
    targetSelector: MY_OVERTIME_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review overtime records, resume saved drafts, and submit new overtime requests.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'records',
    title: 'Overtime records',
    targetSelector: '[data-tour-id="overtime-records"]',
    routePattern: OVERTIME_LIST_ROUTE_PATTERN,
    content:
      'Submitted claims and saved drafts appear here. Open a record anytime to review its workflow progress or continue a draft.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'overtimeType',
    title: 'Choose overtime type',
    targetSelector: '[data-tour-id="overtime-type-selection"]',
    routePattern: OVERTIME_FORM_ROUTE_PATTERN,
    content:
      'Start the application by choosing the overtime type that matches the work done. The available types come from the current overtime policy.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open application form',
    primaryActionTargetSelector: '[data-tour-id="overtime-type-continue"]',
    primaryActionWaitForSelector: '[data-tour-id="overtime-apply"]',
    primaryActionStartAtStepKey: 'form',
  },
  {
    key: 'filters',
    title: 'Filters and search',
    targetSelector: '[data-tour-id="overtime-filters"]',
    fallbackSelector: '[data-tour-id="overtime-records"]',
    routePattern: OVERTIME_LIST_ROUTE_PATTERN,
    content:
      'Use search, period, and status filters to narrow the overtime records you need quickly.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'apply',
    title: 'Apply overtime',
    targetSelector: '[data-tour-id="overtime-new-action"]',
    fallbackSelector: '[data-tour-id="overtime-records"]',
    routePattern: OVERTIME_LIST_ROUTE_PATTERN,
    content:
      'Start a new overtime claim here when you are ready to submit a date, time window, and work justification.',
    placement: 'bottom',
    mobilePlacement: 'top',
    primaryActionLabel: 'Continue to application',
    primaryActionRoute: '/overtime/new',
    primaryActionWaitForSelector: '[data-tour-id="overtime-type-selection"]',
    primaryActionStartAtStepKey: 'overtimeType',
  },
  {
    key: 'form',
    title: 'Application form',
    targetSelector: '[data-tour-id="overtime-apply"]',
    routePattern: OVERTIME_FORM_ROUTE_PATTERN,
    content:
      'This form is where you confirm the overtime type, enter the claim date and time window, and let the system classify the date guidance when applicable.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'utilityPanel',
    title: 'Form utility panel',
    targetSelector: '[data-tour-id="overtime-utility-panel"]',
    fallbackSelector: '[data-tour-id="overtime-apply"]',
    routePattern: OVERTIME_FORM_ROUTE_PATTERN,
    content:
      'Use this utility area to confirm the calculated duration and any date or window validation before saving or submitting.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'draftPanel',
    title: 'Draft action panel',
    targetSelector: '[data-tour-id="overtime-draft-panel"]',
    fallbackSelector: '[data-tour-id="overtime-apply"]',
    routePattern: OVERTIME_FORM_ROUTE_PATTERN,
    content:
      'This action panel groups the clear, draft, and submit controls for the current overtime form.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'draft',
    title: 'Save draft',
    targetSelector: '[data-tour-id="overtime-draft-action"]',
    fallbackSelector: '[data-tour-id="overtime-apply"]',
    routePattern: OVERTIME_FORM_ROUTE_PATTERN,
    content:
      'Save a draft if you need to come back later. Draft restore and draft save are part of the self-service overtime flow.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'submit',
    title: 'Submit request',
    targetSelector: '[data-tour-id="overtime-submit-action"]',
    fallbackSelector: '[data-tour-id="overtime-apply"]',
    routePattern: OVERTIME_FORM_ROUTE_PATTERN,
    content:
      'Submit the overtime request here after you confirm the date, time window, and work justification.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'detail',
    title: 'Request detail',
    targetSelector: '[data-tour-id="overtime-detail"]',
    routePattern: OVERTIME_DETAIL_ROUTE_PATTERN,
    content:
      'Open any overtime record detail to review its status, approval history, and the information you submitted.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'editAction',
    title: 'Edit action shell',
    targetSelector: '[data-tour-id="overtime-edit-action"]',
    fallbackSelector: '[data-tour-id="overtime-detail"]',
    routePattern: OVERTIME_DETAIL_ROUTE_PATTERN,
    content:
      'Use this action shell to reopen an editable overtime draft or pending claim from the detail view.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'cancelAction',
    title: 'Cancel action shell',
    targetSelector: '[data-tour-id="overtime-cancel-action"]',
    fallbackSelector: '[data-tour-id="overtime-detail"]',
    routePattern: OVERTIME_DETAIL_ROUTE_PATTERN,
    content:
      'Start overtime cancellation from this stable action shell without walking the final confirm action.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'deleteAction',
    title: 'Delete action shell',
    targetSelector: '[data-tour-id="overtime-delete-action"]',
    fallbackSelector: '[data-tour-id="overtime-detail"]',
    routePattern: OVERTIME_DETAIL_ROUTE_PATTERN,
    content:
      'This action shell starts draft or cancelled-claim deletion when the record is eligible.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'cancelModal',
    title: 'Cancel modal shell',
    targetSelector: '[data-tour-id="overtime-cancel-modal"]',
    routePattern: OVERTIME_DETAIL_ROUTE_PATTERN,
    content:
      'When cancellation is opened, review the modal shell here and stop before the irreversible confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'deleteModal',
    title: 'Delete modal shell',
    targetSelector: '[data-tour-id="overtime-delete-modal"]',
    routePattern: OVERTIME_DETAIL_ROUTE_PATTERN,
    content:
      'When deletion is opened, confirm the target in this modal shell without walking the irreversible confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
]
