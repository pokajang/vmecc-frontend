import { SAFE_MODAL_STEP_PLACEMENT } from 'src/onboarding/stepPlacements'

export const PAYROLL_CLAIMS_TOUR_MODULE_SELECTOR = '[data-tour-id="payroll-module"]'
const PAYROLL_LIST_ROUTE_PATTERN = /^\/payroll(?:\/claims)?\/?$/i
const PAYROLL_TYPE_SELECTION_ROUTE_PATTERN = /^\/payroll\/claims\/new\/?$/i
const PAYROLL_FORM_ROUTE_PATTERN = /^\/payroll\/claims\/new\/(?:expense|salary)\/?$/i
const PAYROLL_DETAIL_ROUTE_PATTERN = /^\/payroll\/claims\/[^/]+\/?$/i
const PAYROLL_PAYSLIPS_ROUTE_PATTERN = /^\/payroll\/payslips\/?$/i

export const PAYROLL_CLAIMS_TOUR_ANCHOR_SELECTORS = [
  PAYROLL_CLAIMS_TOUR_MODULE_SELECTOR,
  '[data-tour-id="payroll-nav"]',
  '[data-tour-id="payroll-claims"]',
  '[data-tour-id="payroll-claims-filters"]',
  '[data-tour-id="payroll-new-claim-action"]',
  '[data-tour-id="payroll-claim-draft-resume-action"]',
  '[data-tour-id="payroll-claim-type-selection"]',
  '[data-tour-id="payroll-claim-type-continue"]',
  '[data-tour-id="payroll-claim-form"]',
  '[data-tour-id="payroll-claim-draft-panel"]',
  '[data-tour-id="payroll-claim-attachments"]',
  '[data-tour-id="payroll-claim-submit-action"]',
  '[data-tour-id="payroll-claim-detail"]',
  '[data-tour-id="payroll-claim-edit-action"]',
  '[data-tour-id="payroll-claim-cancel-action"]',
  '[data-tour-id="payroll-claim-delete-action"]',
  '[data-tour-id="payroll-claim-cancel-modal"]',
  '[data-tour-id="payroll-claim-delete-modal"]',
  '[data-tour-id="payroll-payslips"]',
  '[data-tour-id="payroll-payslip-download-action"]',
]

export const PAYROLL_CLAIMS_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Payroll workspace',
    targetSelector: PAYROLL_CLAIMS_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review claim records, open payslips, and move into the self-service claim flows.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'sections',
    title: 'Payroll sections',
    targetSelector: '[data-tour-id="payroll-nav"]',
    routePattern: /^\/payroll(?:\/claims|\/payslips)?\/?$/i,
    content:
      'Use these tabs to switch between claim records, payslips, and the claim entry path without leaving payroll self-service.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'claims',
    title: 'Claim records',
    targetSelector: '[data-tour-id="payroll-claims"]',
    routePattern: PAYROLL_LIST_ROUTE_PATTERN,
    content:
      'Your submitted claims and saved draft entries appear here so you can track progress and reopen the records you need.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'filters',
    title: 'Filters and search',
    targetSelector: '[data-tour-id="payroll-claims-filters"]',
    fallbackSelector: '[data-tour-id="payroll-claims"]',
    routePattern: PAYROLL_LIST_ROUTE_PATTERN,
    content:
      'Use search, month, sort, category, and status filters to narrow the claim records you want to review.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'newClaim',
    title: 'Apply claim',
    targetSelector: '[data-tour-id="payroll-new-claim-action"]',
    fallbackSelector: '[data-tour-id="payroll-claims"]',
    routePattern: PAYROLL_LIST_ROUTE_PATTERN,
    content:
      'Start a new payroll claim here when you are ready to move into the salary, expense, or exceptional claim entry flow.',
    placement: 'bottom',
    mobilePlacement: 'top',
    primaryActionLabel: 'Continue to claim entry',
    primaryActionRoute: '/payroll/claims/new',
    primaryActionWaitForSelector: '[data-tour-id="payroll-claim-type-selection"]',
    primaryActionStartAtStepKey: 'typeSelection',
  },
  {
    key: 'draftResume',
    title: 'Resume saved draft',
    targetSelector: '[data-tour-id="payroll-claim-draft-resume-action"]',
    fallbackSelector: '[data-tour-id="payroll-claims"]',
    routePattern: PAYROLL_LIST_ROUTE_PATTERN,
    content:
      'Use this draft action shell to reopen a saved payroll claim draft from the claims list.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    key: 'typeSelection',
    title: 'Choose claim type',
    targetSelector: '[data-tour-id="payroll-claim-type-selection"]',
    routePattern: PAYROLL_TYPE_SELECTION_ROUTE_PATTERN,
    content:
      'Pick the claim type and payroll month first so the correct self-service form opens with the matching rules and period context.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open claim form',
    primaryActionTargetSelector: '[data-tour-id="payroll-claim-type-continue"]',
    primaryActionWaitForSelector: '[data-tour-id="payroll-claim-form"]',
    primaryActionStartAtStepKey: 'claimForm',
  },
  {
    key: 'claimForm',
    title: 'Claim form',
    targetSelector: '[data-tour-id="payroll-claim-form"]',
    routePattern: PAYROLL_FORM_ROUTE_PATTERN,
    content:
      'This form is where you prepare the claim details for the selected month and type before you submit the record for workflow review.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'draftPanel',
    title: 'Draft panel',
    targetSelector: '[data-tour-id="payroll-claim-draft-panel"]',
    fallbackSelector: '[data-tour-id="payroll-claim-form"]',
    routePattern: PAYROLL_FORM_ROUTE_PATTERN,
    content:
      'When you are working from a saved draft, this panel confirms the draft context before you continue editing.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'attachments',
    title: 'Supporting items and attachments',
    targetSelector: '[data-tour-id="payroll-claim-attachments"]',
    fallbackSelector: '[data-tour-id="payroll-claim-form"]',
    routePattern: PAYROLL_FORM_ROUTE_PATTERN,
    content:
      'Use this attachment area to supply the supporting documents needed for salary, expense, or exceptional claim items.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'submit',
    title: 'Submit request',
    targetSelector: '[data-tour-id="payroll-claim-submit-action"]',
    fallbackSelector: '[data-tour-id="payroll-claim-form"]',
    routePattern: PAYROLL_FORM_ROUTE_PATTERN,
    content:
      'Submit the payroll claim here after you finish the month selection, claim details, and any required supporting information.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'detail',
    title: 'Claim detail',
    targetSelector: '[data-tour-id="payroll-claim-detail"]',
    routePattern: PAYROLL_DETAIL_ROUTE_PATTERN,
    content:
      'Open any claim detail to review the submitted information, workflow status, and the variant-specific sections for that claim type.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'editAction',
    title: 'Edit action shell',
    targetSelector: '[data-tour-id="payroll-claim-edit-action"]',
    fallbackSelector: '[data-tour-id="payroll-claim-detail"]',
    routePattern: PAYROLL_DETAIL_ROUTE_PATTERN,
    content:
      'Use this action shell to reopen an editable claim from detail when updates are still allowed.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'cancelAction',
    title: 'Cancel action shell',
    targetSelector: '[data-tour-id="payroll-claim-cancel-action"]',
    fallbackSelector: '[data-tour-id="payroll-claim-detail"]',
    routePattern: PAYROLL_DETAIL_ROUTE_PATTERN,
    content:
      'Start claim cancellation from this stable action shell. The final confirm action remains deferred.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'deleteAction',
    title: 'Delete action shell',
    targetSelector: '[data-tour-id="payroll-claim-delete-action"]',
    fallbackSelector: '[data-tour-id="payroll-claim-detail"]',
    routePattern: PAYROLL_DETAIL_ROUTE_PATTERN,
    content:
      'This action shell starts draft or cancelled-claim deletion without walking the final irreversible confirm button.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'cancelModal',
    title: 'Cancel modal shell',
    targetSelector: '[data-tour-id="payroll-claim-cancel-modal"]',
    routePattern: PAYROLL_DETAIL_ROUTE_PATTERN,
    content:
      'When cancellation is opened, review the modal shell here and stop before the final confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'deleteModal',
    title: 'Delete modal shell',
    targetSelector: '[data-tour-id="payroll-claim-delete-modal"]',
    routePattern: PAYROLL_DETAIL_ROUTE_PATTERN,
    content:
      'When deletion is opened, confirm the target in this modal shell without walking the irreversible confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'payslips',
    title: 'Payslips',
    targetSelector: '[data-tour-id="payroll-payslips"]',
    routePattern: PAYROLL_PAYSLIPS_ROUTE_PATTERN,
    content:
      'Use this section to review the payslip summaries generated from approved salary claims and their payroll breakdowns.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'payslipDownload',
    title: 'Payslip download shell',
    targetSelector: '[data-tour-id="payroll-payslip-download-action"]',
    fallbackSelector: '[data-tour-id="payroll-payslips"]',
    routePattern: PAYROLL_PAYSLIPS_ROUTE_PATTERN,
    content:
      'Use this action shell to download a generated payslip without changing payroll or claim workflow state.',
    placement: 'top',
    mobilePlacement: 'top',
  },
]
