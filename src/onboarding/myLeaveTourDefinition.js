import { SAFE_MODAL_STEP_PLACEMENT } from 'src/onboarding/stepPlacements'

export const MY_LEAVE_TOUR_MODULE_SELECTOR = '[data-tour-id="leave-module"]'
const LEAVE_LIST_ROUTE_PATTERN = /^\/leave\/?$/i
const LEAVE_FORM_ROUTE_PATTERN = /^\/leave\/new\/?$/i
const LEAVE_DETAIL_ROUTE_PATTERN = /^\/leave\/[^/]+\/?$/i

export const MY_LEAVE_TOUR_ANCHOR_SELECTORS = [
  MY_LEAVE_TOUR_MODULE_SELECTOR,
  '[data-tour-id="leave-type-selection"]',
  '[data-tour-id="leave-type-continue"]',
  '[data-tour-id="leave-records"]',
  '[data-tour-id="leave-filters"]',
  '[data-tour-id="leave-new-action"]',
  '[data-tour-id="leave-apply"]',
  '[data-tour-id="leave-balance"]',
  '[data-tour-id="leave-attachments"]',
  '[data-tour-id="leave-draft-panel"]',
  '[data-tour-id="leave-draft-action"]',
  '[data-tour-id="leave-submit-action"]',
  '[data-tour-id="leave-detail"]',
  '[data-tour-id="leave-edit-action"]',
  '[data-tour-id="leave-cancel-action"]',
  '[data-tour-id="leave-delete-action"]',
  '[data-tour-id="leave-cancel-modal"]',
  '[data-tour-id="leave-delete-modal"]',
]

export const MY_LEAVE_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Leave workspace',
    targetSelector: MY_LEAVE_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review leave records, start a new application, and follow each request status.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'records',
    title: 'Leave records',
    targetSelector: '[data-tour-id="leave-records"]',
    routePattern: LEAVE_LIST_ROUTE_PATTERN,
    content:
      'Your submitted and draft leave requests appear here. Open a record anytime to review its workflow progress.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'leaveType',
    title: 'Choose leave type',
    targetSelector: '[data-tour-id="leave-type-selection"]',
    routePattern: LEAVE_FORM_ROUTE_PATTERN,
    content:
      'Start the application by choosing the leave type that matches your request. The form and balance guidance adjust from this choice.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open application form',
    primaryActionTargetSelector: '[data-tour-id="leave-type-continue"]',
    primaryActionWaitForSelector: '[data-tour-id="leave-apply"]',
    primaryActionStartAtStepKey: 'form',
  },
  {
    key: 'filters',
    title: 'Filters and search',
    targetSelector: '[data-tour-id="leave-filters"]',
    fallbackSelector: '[data-tour-id="leave-records"]',
    routePattern: LEAVE_LIST_ROUTE_PATTERN,
    content: 'Use search, period, type, and status filters to narrow the records you need quickly.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'apply',
    title: 'Apply leave',
    targetSelector: '[data-tour-id="leave-new-action"]',
    fallbackSelector: '[data-tour-id="leave-records"]',
    routePattern: LEAVE_LIST_ROUTE_PATTERN,
    content:
      'Start a new leave application here when you are ready to submit dates, schedule details, and your reason.',
    placement: 'bottom',
    mobilePlacement: 'top',
    primaryActionLabel: 'Continue to application',
    primaryActionRoute: '/leave/new',
    primaryActionWaitForSelector: '[data-tour-id="leave-type-selection"]',
    primaryActionStartAtStepKey: 'leaveType',
  },
  {
    key: 'form',
    title: 'Application form',
    targetSelector: '[data-tour-id="leave-apply"]',
    routePattern: LEAVE_FORM_ROUTE_PATTERN,
    content:
      'This form is where you confirm the leave type, enter dates and reasons, and let the leave request summary update as you build the application.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'balance',
    title: 'Balance review',
    targetSelector: '[data-tour-id="leave-balance"]',
    fallbackSelector: '[data-tour-id="leave-apply"]',
    routePattern: LEAVE_FORM_ROUTE_PATTERN,
    content:
      'Review the current leave balance before you submit. This area shows entitlement and remaining balance for the selected leave type.',
    placement: 'left',
    mobilePlacement: 'top',
  },
  {
    key: 'attachments',
    title: 'Attachments area',
    targetSelector: '[data-tour-id="leave-attachments"]',
    fallbackSelector: '[data-tour-id="leave-apply"]',
    routePattern: LEAVE_FORM_ROUTE_PATTERN,
    content:
      'Use this attachment area when the selected leave type requires or benefits from supporting documents.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'draftPanel',
    title: 'Draft action panel',
    targetSelector: '[data-tour-id="leave-draft-panel"]',
    fallbackSelector: '[data-tour-id="leave-apply"]',
    routePattern: LEAVE_FORM_ROUTE_PATTERN,
    content:
      'This action panel groups the clear, draft, and submit controls for the current leave form.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'draft',
    title: 'Save draft',
    targetSelector: '[data-tour-id="leave-draft-action"]',
    fallbackSelector: '[data-tour-id="leave-apply"]',
    routePattern: LEAVE_FORM_ROUTE_PATTERN,
    content:
      'Save a draft if you need to come back later. Draft restore and draft save are part of the self-service leave flow.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'submit',
    title: 'Submit request',
    targetSelector: '[data-tour-id="leave-submit-action"]',
    fallbackSelector: '[data-tour-id="leave-apply"]',
    routePattern: LEAVE_FORM_ROUTE_PATTERN,
    content:
      'Submit the leave request here after you finish the schedule, supporting details, and reason for this application.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'detail',
    title: 'Request detail',
    targetSelector: '[data-tour-id="leave-detail"]',
    routePattern: LEAVE_DETAIL_ROUTE_PATTERN,
    content:
      'Open any leave record detail to review its status, approval history, and the information you submitted.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'editAction',
    title: 'Edit action shell',
    targetSelector: '[data-tour-id="leave-edit-action"]',
    fallbackSelector: '[data-tour-id="leave-detail"]',
    routePattern: LEAVE_DETAIL_ROUTE_PATTERN,
    content:
      'Use this action shell to reopen a draft or pending leave request when further changes are still allowed.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'cancelAction',
    title: 'Cancel action shell',
    targetSelector: '[data-tour-id="leave-cancel-action"]',
    fallbackSelector: '[data-tour-id="leave-detail"]',
    routePattern: LEAVE_DETAIL_ROUTE_PATTERN,
    content:
      'Start cancellation from this stable action shell. The tour stops before the irreversible confirm action.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'deleteAction',
    title: 'Delete action shell',
    targetSelector: '[data-tour-id="leave-delete-action"]',
    fallbackSelector: '[data-tour-id="leave-detail"]',
    routePattern: LEAVE_DETAIL_ROUTE_PATTERN,
    content:
      'Draft deletion starts here when the record is still removable. Final confirmation remains deferred.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'cancelModal',
    title: 'Cancel modal shell',
    targetSelector: '[data-tour-id="leave-cancel-modal"]',
    routePattern: LEAVE_DETAIL_ROUTE_PATTERN,
    content:
      'When cancellation is opened, review the modal shell here and stop before the final confirm button.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'deleteModal',
    title: 'Delete modal shell',
    targetSelector: '[data-tour-id="leave-delete-modal"]',
    routePattern: LEAVE_DETAIL_ROUTE_PATTERN,
    content:
      'When deletion is opened, confirm the target in this modal shell without walking the irreversible confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
]
