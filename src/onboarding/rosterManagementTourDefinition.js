import { SAFE_MODAL_STEP_PLACEMENT } from 'src/onboarding/stepPlacements'

export const ROSTER_MANAGEMENT_TOUR_MODULE_SELECTOR = '[data-tour-id="roster-management-module"]'

const ROSTER_MANAGEMENT_ROUTE_PATTERN = /^\/roster(?:\/(?:overview|schedule))?\/?$/i
const ROSTER_MANAGEMENT_OVERVIEW_ROUTE_PATTERN = /^\/roster(?:\/overview)?\/?$/i
const ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN = /^\/roster\/schedule\/?$/i

export const ROSTER_MANAGEMENT_TOUR_ANCHOR_SELECTORS = [
  ROSTER_MANAGEMENT_TOUR_MODULE_SELECTOR,
  '[data-tour-id="roster-management-nav"]',
  '[data-tour-id="roster-management-overview"]',
  '[data-tour-id="roster-management-schedule"]',
  '[data-tour-id="roster-management-filters"]',
  '[data-tour-id="roster-management-read-actions"]',
  '[data-tour-id="roster-management-edit-action"]',
  '[data-tour-id="roster-management-edit-actions"]',
  '[data-tour-id="roster-management-grid"]',
  '[data-tour-id="roster-management-mobile-editor"]',
  '[data-tour-id="roster-management-save-draft-action"]',
  '[data-tour-id="roster-management-publish-action"]',
  '[data-tour-id="roster-management-cancel-action"]',
  '[data-tour-id="roster-management-cancel-modal"]',
  '[data-tour-id="roster-management-cancel-modal-close-action"]',
  '[data-tour-id="roster-management-publish-modal"]',
]

export const ROSTER_MANAGEMENT_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Roster management workspace',
    targetSelector: ROSTER_MANAGEMENT_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review published coverage, switch between roster sections, and inspect the scheduling shell for operational planning.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'sections',
    title: 'Roster sections',
    targetSelector: '[data-tour-id="roster-management-nav"]',
    fallbackSelector: ROSTER_MANAGEMENT_TOUR_MODULE_SELECTOR,
    routePattern: ROSTER_MANAGEMENT_ROUTE_PATTERN,
    content:
      'Use these tabs to move between the roster overview and schedule views without leaving the module shell.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'overview',
    title: 'Coverage overview',
    targetSelector: '[data-tour-id="roster-management-overview"]',
    routePattern: ROSTER_MANAGEMENT_OVERVIEW_ROUTE_PATTERN,
    content:
      'The overview summarizes current roster coverage, team status, and historical shift health before you move into schedule review.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'schedule',
    title: 'Roster schedule',
    targetSelector: '[data-tour-id="roster-management-schedule"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    content:
      'This schedule shell is where you review roster rows, coverage periods, and the currently visible assignment grid for the selected scope.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'filters',
    title: 'Schedule filters',
    targetSelector: '[data-tour-id="roster-management-filters"]',
    fallbackSelector: '[data-tour-id="roster-management-schedule"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    content:
      'Use the period, team, month, and search filters here to narrow the roster schedule before you review specific assignments.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'readActions',
    title: 'Read-only actions',
    targetSelector: '[data-tour-id="roster-management-read-actions"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    allowOffscreenTarget: true,
    content:
      'Use these read-only actions to print, export, or move into the live roster editor for the current schedule scope.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'editAction',
    title: 'Edit roster',
    targetSelector: '[data-tour-id="roster-management-edit-action"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    allowOffscreenTarget: true,
    content:
      'Enter the live roster editor here when you need to change team assignments for the visible schedule period.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open roster editor',
    primaryActionTargetSelector: '[data-tour-id="roster-management-edit-action"]',
    primaryActionWaitForSelector: '[data-tour-id="roster-management-edit-actions"]',
    primaryActionStartAtStepKey: 'editActions',
  },
  {
    key: 'editActions',
    title: 'Editor actions',
    targetSelector: '[data-tour-id="roster-management-edit-actions"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    allowOffscreenTarget: true,
    content:
      'This action bar groups the live roster controls for saving a draft, publishing the schedule, or cancelling the current edit session.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'editableSurface',
    title: 'Editable assignment surface',
    targetSelector: '[data-tour-id="roster-management-grid"]',
    fallbackSelector:
      '[data-tour-id="roster-management-mobile-editor"], [data-tour-id="roster-management-edit-actions"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    content:
      'Use this editable surface to assign teams to each shift, whether you are working in the desktop grid or the mobile day editor.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'saveDraftAction',
    title: 'Save draft',
    targetSelector: '[data-tour-id="roster-management-save-draft-action"]',
    fallbackSelector: '[data-tour-id="roster-management-edit-actions"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    allowOffscreenTarget: true,
    content:
      'Save a roster draft here when you need to preserve the current assignments without publishing them to the assigned teams yet.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'cancelAction',
    title: 'Cancel edit shell',
    targetSelector: '[data-tour-id="roster-management-cancel-action"]',
    fallbackSelector: '[data-tour-id="roster-management-edit-actions"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    allowOffscreenTarget: true,
    content:
      'Use this action shell to open the discard dialog when you want to leave the current edit session without saving.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'publishAction',
    title: 'Publish shell',
    targetSelector: '[data-tour-id="roster-management-publish-action"]',
    fallbackSelector: '[data-tour-id="roster-management-edit-actions"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    allowOffscreenTarget: true,
    content:
      'Open the publish confirmation here after you finish the visible roster assignments and are ready to notify the assigned teams.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open publish dialog',
    primaryActionTargetSelector: '[data-tour-id="roster-management-publish-action"]',
    primaryActionWaitForSelector: '[data-tour-id="roster-management-publish-modal"]',
    primaryActionStartAtStepKey: 'publishModal',
  },
  {
    key: 'cancelModal',
    title: 'Discard changes modal',
    targetSelector: '[data-tour-id="roster-management-cancel-modal"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    content:
      'When cancellation is opened, review the discard shell here and stop before the discard confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'publishModal',
    title: 'Publish modal shell',
    targetSelector: '[data-tour-id="roster-management-publish-modal"]',
    routePattern: ROSTER_MANAGEMENT_SCHEDULE_ROUTE_PATTERN,
    content:
      'When publishing is opened, review the confirmation shell here and stop before the final publish confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
]
