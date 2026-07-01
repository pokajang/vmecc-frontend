import { SAFE_MODAL_STEP_PLACEMENT } from 'src/onboarding/stepPlacements'

export const LEAVE_MANAGEMENT_TOUR_MODULE_SELECTOR = '[data-tour-id="leave-management-module"]'

const LEAVE_MANAGEMENT_SHELL_ROUTE_PATTERN =
  /^\/staff\/leave-management\/(?:leaves|set-leaves|set-holidays|rules)\/?$/i
const LEAVE_MANAGEMENT_RECORDS_ROUTE_PATTERN = /^\/staff\/leave-management\/leaves\/?$/i
const LEAVE_MANAGEMENT_ASSIGNMENTS_ROUTE_PATTERN = /^\/staff\/leave-management\/set-leaves\/?$/i
const LEAVE_MANAGEMENT_HOLIDAYS_ROUTE_PATTERN = /^\/staff\/leave-management\/set-holidays\/?$/i
const LEAVE_MANAGEMENT_RULES_ROUTE_PATTERN = /^\/staff\/leave-management\/rules\/?$/i
const LEAVE_MANAGEMENT_DETAIL_ROUTE_PATTERN = /^\/staff\/leave-management\/record\/[^/]+\/?$/i

export const LEAVE_MANAGEMENT_TOUR_ANCHOR_SELECTORS = [
  LEAVE_MANAGEMENT_TOUR_MODULE_SELECTOR,
  '[data-tour-id="leave-management-nav"]',
  '[data-tour-id="leave-management-records"]',
  '[data-tour-id="leave-management-records-filters"]',
  '[data-tour-id="leave-management-assignments"]',
  '[data-tour-id="leave-management-assignment-create-action"]',
  '[data-tour-id="leave-management-assignment-form"]',
  '[data-tour-id="leave-management-assignment-form-close-action"]',
  '[data-tour-id="leave-management-assignment-activity"]',
  '[data-tour-id="leave-management-assignment-row-actions"]',
  '[data-tour-id="leave-management-assignment-detail-entry"]',
  '[data-tour-id="leave-management-assignment-detail"]',
  '[data-tour-id="leave-management-holidays"]',
  '[data-tour-id="leave-management-rules"]',
  '[data-tour-id="leave-management-detail"]',
]

export const LEAVE_MANAGEMENT_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Leave management workspace',
    targetSelector: LEAVE_MANAGEMENT_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review leave administration records, move between setup tabs, and inspect submitted leave requests.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'sections',
    title: 'Leave management sections',
    targetSelector: '[data-tour-id="leave-management-nav"]',
    routePattern: LEAVE_MANAGEMENT_SHELL_ROUTE_PATTERN,
    content:
      'Use these sections to move between leave records, entitlement setup, holiday setup, and workflow rules without leaving leave management.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'records',
    title: 'Leave records',
    targetSelector: '[data-tour-id="leave-management-records"]',
    routePattern: LEAVE_MANAGEMENT_RECORDS_ROUTE_PATTERN,
    content:
      'Review submitted leave records here to monitor employee requests, current status, and the queue that still needs administrative attention.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'filters',
    title: 'Filters and search',
    targetSelector: '[data-tour-id="leave-management-records-filters"]',
    fallbackSelector: '[data-tour-id="leave-management-records"]',
    routePattern: LEAVE_MANAGEMENT_RECORDS_ROUTE_PATTERN,
    content:
      'Use search, period, type, status, and sort controls here to narrow the leave records you need to review.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'assignments',
    title: 'Leave entitlements',
    targetSelector: '[data-tour-id="leave-management-assignments"]',
    routePattern: LEAVE_MANAGEMENT_ASSIGNMENTS_ROUTE_PATTERN,
    content:
      'This section is where you review entitlement assignments, current balances, and the staff leave setup that supports eligibility.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'assignmentRowActions',
    title: 'Existing assignments',
    targetSelector: '[data-tour-id="leave-management-assignment-row-actions"]',
    fallbackSelector: '[data-tour-id="leave-management-assignments"]',
    routePattern: LEAVE_MANAGEMENT_ASSIGNMENTS_ROUTE_PATTERN,
    content:
      'Use the existing assignment rows here to inspect current balances and identify the staff record you want to review in more detail.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'assignmentCreate',
    title: 'Assign entitlement',
    targetSelector: '[data-tour-id="leave-management-assignment-create-action"]',
    fallbackSelector: '[data-tour-id="leave-management-assignments"]',
    routePattern: LEAVE_MANAGEMENT_ASSIGNMENTS_ROUTE_PATTERN,
    content:
      'Start a new entitlement assignment here when you are ready to set yearly leave balances for a staff record.',
    placement: 'bottom',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open assignment form',
    primaryActionTargetSelector: '[data-tour-id="leave-management-assignment-create-action"]',
    primaryActionWaitForSelector: '[data-tour-id="leave-management-assignment-form"]',
    primaryActionStartAtStepKey: 'assignmentForm',
  },
  {
    key: 'assignmentForm',
    title: 'Assignment form',
    targetSelector: '[data-tour-id="leave-management-assignment-form"]',
    routePattern: LEAVE_MANAGEMENT_ASSIGNMENTS_ROUTE_PATTERN,
    content:
      'Use this modal form to choose the staff member, confirm the year, and prepare the entitlement values for each leave type.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'assignmentActivity',
    title: 'Assignment activity',
    targetSelector: '[data-tour-id="leave-management-assignment-activity"]',
    fallbackSelector: '[data-tour-id="leave-management-assignment-form"]',
    routePattern: LEAVE_MANAGEMENT_ASSIGNMENTS_ROUTE_PATTERN,
    content:
      'Review the recent assignment activity here before you save updated entitlements for the selected staff member.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'assignmentFormClose',
    title: 'Return to assignments',
    targetSelector: '[data-tour-id="leave-management-assignment-form-close-action"]',
    fallbackSelector: '[data-tour-id="leave-management-assignment-form"]',
    routePattern: LEAVE_MANAGEMENT_ASSIGNMENTS_ROUTE_PATTERN,
    content:
      'Close the assignment form here so you can return to the entitlement list before opening an existing assignment detail.',
    ...SAFE_MODAL_STEP_PLACEMENT,
    primaryActionLabel: 'Close assignment form',
    primaryActionTargetSelector: '[data-tour-id="leave-management-assignment-form-close-action"]',
    primaryActionWaitForSelector: '[data-tour-id="leave-management-assignment-detail-entry"]',
    primaryActionStartAtStepKey: 'assignmentDetailEntry',
  },
  {
    key: 'assignmentDetailEntry',
    title: 'Open assignment detail',
    targetSelector: '[data-tour-id="leave-management-assignment-detail-entry"]',
    routePattern: LEAVE_MANAGEMENT_ASSIGNMENTS_ROUTE_PATTERN,
    content:
      'Use an existing assignment row here to open the detail shell for the selected staff entitlement.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open assignment detail',
    primaryActionTargetSelector: '[data-tour-id="leave-management-assignment-detail-entry"]',
    primaryActionWaitForSelector: '[data-tour-id="leave-management-assignment-detail"]',
    primaryActionStartAtStepKey: 'assignmentDetail',
  },
  {
    key: 'assignmentDetail',
    title: 'Assignment detail shell',
    targetSelector: '[data-tour-id="leave-management-assignment-detail"]',
    routePattern: LEAVE_MANAGEMENT_ASSIGNMENTS_ROUTE_PATTERN,
    content:
      'This detail shell is where you review the selected assignment balances, usage, pending days, and available leave totals.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'holidays',
    title: 'Holiday calendar',
    targetSelector: '[data-tour-id="leave-management-holidays"]',
    routePattern: LEAVE_MANAGEMENT_HOLIDAYS_ROUTE_PATTERN,
    content:
      'Use this section to review the holiday calendar shell that affects leave scheduling, working-day calculation, and visible holiday coverage.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'rules',
    title: 'Leave workflow rules',
    targetSelector: '[data-tour-id="leave-management-rules"]',
    routePattern: LEAVE_MANAGEMENT_RULES_ROUTE_PATTERN,
    content:
      'This workflow rules area is where you review how leave submissions are routed across the configured approval stages.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'detail',
    title: 'Leave record detail',
    targetSelector: '[data-tour-id="leave-management-detail"]',
    fallbackSelector: LEAVE_MANAGEMENT_TOUR_MODULE_SELECTOR,
    routePattern: LEAVE_MANAGEMENT_DETAIL_ROUTE_PATTERN,
    content:
      'Open a leave record detail to review the submitted request information, current workflow state, and its approval history.',
    placement: 'top',
    mobilePlacement: 'top',
  },
]
