import { SAFE_MODAL_STEP_PLACEMENT } from 'src/onboarding/stepPlacements'

export const STAFF_DIRECTORY_TOUR_MODULE_SELECTOR = '[data-tour-id="staff-directory-module"]'
const STAFF_DIRECTORY_LIST_ROUTE_PATTERN = /^\/staff\/details\/?$/i
const STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN = /^\/staff\/profile\/[^/]+\/?$/i

export const STAFF_DIRECTORY_TOUR_ANCHOR_SELECTORS = [
  STAFF_DIRECTORY_TOUR_MODULE_SELECTOR,
  '[data-tour-id="staff-directory-records"]',
  '[data-tour-id="staff-directory-filters"]',
  '[data-tour-id="staff-directory-list"]',
  '[data-tour-id="staff-directory-profile"]',
  '[data-tour-id="staff-directory-profile-primary-action"]',
  '[data-tour-id="staff-directory-more-actions"]',
  '[data-tour-id="staff-directory-send-message-action"]',
  '[data-tour-id="staff-directory-terminate-action"]',
  '[data-tour-id="staff-directory-rehire-action"]',
  '[data-tour-id="staff-directory-message-modal"]',
  '[data-tour-id="staff-directory-message-composer"]',
  '[data-tour-id="staff-directory-terminate-modal"]',
  '[data-tour-id="staff-directory-rehire-modal"]',
]

export const STAFF_DIRECTORY_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Staff directory workspace',
    targetSelector: STAFF_DIRECTORY_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review staff records, narrow the visible directory, and open a staff profile when you need more context.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'records',
    title: 'Staff records',
    targetSelector: '[data-tour-id="staff-directory-records"]',
    routePattern: STAFF_DIRECTORY_LIST_ROUTE_PATTERN,
    content:
      'The directory records are grouped here so you can review employment status, role coverage, team placement, and contact information at a glance.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'filters',
    title: 'Filters and search',
    targetSelector: '[data-tour-id="staff-directory-filters"]',
    fallbackSelector: '[data-tour-id="staff-directory-records"]',
    routePattern: STAFF_DIRECTORY_LIST_ROUTE_PATTERN,
    content:
      'Use search, status, role, and recent-login filters here to narrow the list before you open the staff record you need.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'directory',
    title: 'Directory list',
    targetSelector: '[data-tour-id="staff-directory-list"]',
    fallbackSelector: '[data-tour-id="staff-directory-records"]',
    routePattern: STAFF_DIRECTORY_LIST_ROUTE_PATTERN,
    content:
      'This list is the shared directory view for staff profiles. Open a record from here to review the person details without using the privileged row actions.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'profile',
    title: 'Staff profile',
    targetSelector: '[data-tour-id="staff-directory-profile"]',
    routePattern: STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN,
    content:
      'This profile view is where you review personal, system, emergency, banking, and medical details for the selected staff record.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'moreActions',
    title: 'More profile actions',
    targetSelector: '[data-tour-id="staff-directory-more-actions"]',
    routePattern: STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN,
    content:
      'Use this secondary action shell to reach additional staff actions that depend on your access, such as messaging or role-related maintenance.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'messageAction',
    title: 'Send message',
    targetSelector: '[data-tour-id="staff-directory-send-message-action"]',
    routePattern: STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN,
    content:
      'Use this primary action to open the direct staff message modal without leaving the profile context.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open message modal',
    primaryActionTargetSelector: '[data-tour-id="staff-directory-send-message-action"]',
    primaryActionWaitForSelector: '[data-tour-id="staff-directory-message-modal"]',
    primaryActionStartAtStepKey: 'messageModal',
  },
  {
    key: 'terminateAction',
    title: 'Terminate staff shell',
    targetSelector: '[data-tour-id="staff-directory-terminate-action"]',
    routePattern: STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN,
    content:
      'Start the staff termination flow from this stable profile action shell. The final irreversible confirm remains deferred.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open terminate modal',
    primaryActionTargetSelector: '[data-tour-id="staff-directory-terminate-action"]',
    primaryActionWaitForSelector: '[data-tour-id="staff-directory-terminate-modal"]',
    primaryActionStartAtStepKey: 'terminateModal',
  },
  {
    key: 'rehireAction',
    title: 'Rehire staff shell',
    targetSelector: '[data-tour-id="staff-directory-rehire-action"]',
    routePattern: STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN,
    content:
      'Use this action shell to reopen access for a terminated staff member without leaving the profile view.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open rehire modal',
    primaryActionTargetSelector: '[data-tour-id="staff-directory-rehire-action"]',
    primaryActionWaitForSelector: '[data-tour-id="staff-directory-rehire-modal"]',
    primaryActionStartAtStepKey: 'rehireModal',
  },
  {
    key: 'messageModal',
    title: 'Message modal shell',
    targetSelector: '[data-tour-id="staff-directory-message-modal"]',
    routePattern: STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN,
    content:
      'When messaging is opened, review the modal shell here before sending a direct note to the selected staff member.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'messageComposer',
    title: 'Message composer',
    targetSelector: '[data-tour-id="staff-directory-message-composer"]',
    fallbackSelector: '[data-tour-id="staff-directory-message-modal"]',
    routePattern: STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN,
    content:
      'Use this composer area to draft the message body and confirm the note is ready before sending.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'terminateModal',
    title: 'Terminate modal shell',
    targetSelector: '[data-tour-id="staff-directory-terminate-modal"]',
    routePattern: STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN,
    content:
      'This confirmation modal is the destructive shell boundary for staff termination. Stop here before the irreversible confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'rehireModal',
    title: 'Rehire modal shell',
    targetSelector: '[data-tour-id="staff-directory-rehire-modal"]',
    routePattern: STAFF_DIRECTORY_PROFILE_ROUTE_PATTERN,
    content:
      'Use this confirmation shell to review the rehire action before restoring staff access.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
]
