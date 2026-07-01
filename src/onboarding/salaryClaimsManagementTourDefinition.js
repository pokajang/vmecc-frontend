import { SAFE_MODAL_STEP_PLACEMENT } from 'src/onboarding/stepPlacements'

export const SALARY_CLAIMS_MANAGEMENT_TOUR_MODULE_SELECTOR =
  '[data-tour-id="salary-claims-management-module"]'
const SALARY_CLAIMS_CLAIMS_ROUTE_PATTERN = /^\/staff\/salary-claims\/claims\/?$/i
const SALARY_CLAIMS_SALARY_ROUTE_PATTERN = /^\/staff\/salary-claims\/salary\/?$/i
const SALARY_CLAIMS_DETAIL_ROUTE_PATTERN = /^\/staff\/salary-claims\/claim\/[^/]+\/?$/i
const SALARY_ASSIGNMENT_LIST_ROUTE_PATTERN = /^\/staff\/salary-claims\/set-salary\/?$/i
const SALARY_ASSIGNMENT_VIEW_ROUTE_PATTERN =
  /^\/staff\/(?:salary-claims|set-salary)\/assignment\/[^/]+\/view\/?$/i
const SALARY_ASSIGNMENT_FORM_ROUTE_PATTERN =
  /^\/staff\/(?:salary-claims|set-salary)\/assignment\/(?:new|[^/]+\/(?:edit|view))\/?$/i
const SALARY_ASSIGNMENT_HISTORY_ROUTE_PATTERN =
  /^\/staff\/(?:salary-claims\/set-salary|(?:salary-claims|set-salary)\/assignment\/[^/]+\/view)\/?$/i

export const SALARY_CLAIMS_MANAGEMENT_TOUR_ANCHOR_SELECTORS = [
  SALARY_CLAIMS_MANAGEMENT_TOUR_MODULE_SELECTOR,
  '[data-tour-id="salary-claims-management-nav"]',
  '[data-tour-id="salary-claims-management-claims"]',
  '[data-tour-id="salary-claims-management-claims-filters"]',
  '[data-tour-id="salary-claims-management-salary"]',
  '[data-tour-id="salary-claims-management-salary-filters"]',
  '[data-tour-id="salary-claims-management-detail"]',
  '[data-tour-id="salary-claims-management-assignment-list"]',
  '[data-tour-id="salary-claims-management-assignment-create-action"]',
  '[data-tour-id="salary-claims-management-assignment-draft-resume-action"]',
  '[data-tour-id="salary-claims-management-assignment-delete-action"]',
  '[data-tour-id="salary-claims-management-assignment-history"]',
  '[data-tour-id="salary-claims-management-assignment-form"]',
  '[data-tour-id="salary-claims-management-assignment-edit-action"]',
  '[data-tour-id="salary-claims-management-assignment-delete-modal"]',
]

export const SALARY_CLAIMS_MANAGEMENT_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Salary claims management workspace',
    targetSelector: SALARY_CLAIMS_MANAGEMENT_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review payroll claims administration, inspect salary records, and open submitted claim detail.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'sections',
    title: 'Salary claims sections',
    targetSelector: '[data-tour-id="salary-claims-management-nav"]',
    routePattern: /^\/staff\/salary-claims\/(?:claims|salary|set-salary)\/?$/i,
    content:
      'Use these sections to switch between claim records and salary records while staying inside salary claims management.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'claims',
    title: 'Claim records',
    targetSelector: '[data-tour-id="salary-claims-management-claims"]',
    routePattern: SALARY_CLAIMS_CLAIMS_ROUTE_PATTERN,
    content:
      'Review payroll claim submissions here to inspect employee claim records, their workflow state, and the records currently in review.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'claimFilters',
    title: 'Claim filters',
    targetSelector: '[data-tour-id="salary-claims-management-claims-filters"]',
    fallbackSelector: '[data-tour-id="salary-claims-management-claims"]',
    routePattern: SALARY_CLAIMS_CLAIMS_ROUTE_PATTERN,
    content:
      'Use search, period, type, status, and sort controls here to narrow the claim records you want to review.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'salary',
    title: 'Salary records',
    targetSelector: '[data-tour-id="salary-claims-management-salary"]',
    routePattern: SALARY_CLAIMS_SALARY_ROUTE_PATTERN,
    content:
      'This section is where you review salary-linked payroll records and compare the submitted payroll month summaries that are ready for review.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'salaryFilters',
    title: 'Salary filters',
    targetSelector: '[data-tour-id="salary-claims-management-salary-filters"]',
    fallbackSelector: '[data-tour-id="salary-claims-management-salary"]',
    routePattern: SALARY_CLAIMS_SALARY_ROUTE_PATTERN,
    content:
      'Use search, payroll month, status, and sort controls here to narrow the salary records you need to inspect.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'detail',
    title: 'Claim detail',
    targetSelector: '[data-tour-id="salary-claims-management-detail"]',
    routePattern: SALARY_CLAIMS_DETAIL_ROUTE_PATTERN,
    content:
      'Open a claim detail to review the submitted claim information, current workflow state, and the claim history for that record.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'assignmentList',
    title: 'Salary assignment list',
    targetSelector: '[data-tour-id="salary-claims-management-assignment-list"]',
    routePattern: SALARY_ASSIGNMENT_LIST_ROUTE_PATTERN,
    content:
      'This list is where you review salary assignments and saved drafts before opening the relevant assignment record.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'assignmentCreate',
    title: 'Assign salary',
    targetSelector: '[data-tour-id="salary-claims-management-assignment-create-action"]',
    fallbackSelector: '[data-tour-id="salary-claims-management-assignment-list"]',
    routePattern: SALARY_ASSIGNMENT_LIST_ROUTE_PATTERN,
    content:
      'Start a new salary assignment here when you are ready to move into the assignment form flow.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    key: 'assignmentDraftResume',
    title: 'Resume assignment draft',
    targetSelector: '[data-tour-id="salary-claims-management-assignment-draft-resume-action"]',
    fallbackSelector: '[data-tour-id="salary-claims-management-assignment-list"]',
    routePattern: SALARY_ASSIGNMENT_LIST_ROUTE_PATTERN,
    content:
      'Use this draft action shell to reopen a saved salary assignment draft from the assignments list.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    key: 'assignmentDeleteAction',
    title: 'Assignment delete shell',
    targetSelector: '[data-tour-id="salary-claims-management-assignment-delete-action"]',
    fallbackSelector: '[data-tour-id="salary-claims-management-assignment-list"]',
    routePattern: SALARY_ASSIGNMENT_LIST_ROUTE_PATTERN,
    content:
      'This action shell starts assignment deletion from the list without walking the final confirm button.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    key: 'assignmentHistory',
    title: 'Assignment history',
    targetSelector: '[data-tour-id="salary-claims-management-assignment-history"]',
    fallbackSelector: '[data-tour-id="salary-claims-management-assignment-list"]',
    routePattern: SALARY_ASSIGNMENT_HISTORY_ROUTE_PATTERN,
    content:
      'Review assignment history here to understand prior salary changes and remarks before editing again.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'assignmentForm',
    title: 'Assignment form',
    targetSelector: '[data-tour-id="salary-claims-management-assignment-form"]',
    routePattern: SALARY_ASSIGNMENT_FORM_ROUTE_PATTERN,
    content:
      'Use this form shell to create, update, or review the salary assignment details for the selected employee.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'assignmentEditAction',
    title: 'Assignment edit shell',
    targetSelector: '[data-tour-id="salary-claims-management-assignment-edit-action"]',
    fallbackSelector: '[data-tour-id="salary-claims-management-assignment-form"]',
    routePattern: SALARY_ASSIGNMENT_VIEW_ROUTE_PATTERN,
    content:
      'Use this action shell to reopen the viewed salary assignment in edit mode when further changes are needed.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'assignmentDeleteModal',
    title: 'Assignment delete modal',
    targetSelector: '[data-tour-id="salary-claims-management-assignment-delete-modal"]',
    routePattern: SALARY_ASSIGNMENT_LIST_ROUTE_PATTERN,
    content:
      'When assignment deletion is opened, review the modal shell here and stop before the irreversible confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
]
