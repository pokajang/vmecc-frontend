import { SAFE_MODAL_STEP_PLACEMENT } from 'src/onboarding/stepPlacements'

export const TEAM_DIRECTORY_TOUR_MODULE_SELECTOR = '[data-tour-id="team-directory-module"]'

const TEAM_DIRECTORY_LIST_ROUTE_PATTERN = /^\/team\/details\/?$/i
const TEAM_DIRECTORY_DETAIL_ROUTE_PATTERN = /^\/team\/details\/[^/]+\/?$/i

export const TEAM_DIRECTORY_TOUR_ANCHOR_SELECTORS = [
  TEAM_DIRECTORY_TOUR_MODULE_SELECTOR,
  '[data-tour-id="team-directory-teams"]',
  '[data-tour-id="team-directory-grid"]',
  '[data-tour-id="team-directory-create-action"]',
  '[data-tour-id="team-directory-create-modal"]',
  '[data-tour-id="team-directory-create-defaults"]',
  '[data-tour-id="team-directory-create-custom"]',
  '[data-tour-id="team-directory-detail"]',
  '[data-tour-id="team-directory-detail-edit-action"]',
  '[data-tour-id="team-directory-edit-modal"]',
  '[data-tour-id="team-directory-members-editor"]',
  '[data-tour-id="team-directory-image-picker"]',
  '[data-tour-id="team-directory-delete-action"]',
  '[data-tour-id="team-directory-delete-modal"]',
]

export const TEAM_DIRECTORY_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Team directory workspace',
    targetSelector: TEAM_DIRECTORY_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review operational teams, compare roster coverage, and open a team record for member context.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'teams',
    title: 'Team records',
    targetSelector: '[data-tour-id="team-directory-teams"]',
    routePattern: TEAM_DIRECTORY_LIST_ROUTE_PATTERN,
    content:
      'The team directory records are grouped here so you can review current coverage, roster status, and the active teams available for operational planning.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'grid',
    title: 'Team cards',
    targetSelector: '[data-tour-id="team-directory-grid"]',
    fallbackSelector: '[data-tour-id="team-directory-teams"]',
    routePattern: TEAM_DIRECTORY_LIST_ROUTE_PATTERN,
    content:
      'Use these team cards to compare roster health and open the shared team view when you need more member detail.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'createAction',
    title: 'Add team',
    targetSelector: '[data-tour-id="team-directory-create-action"]',
    fallbackSelector: '[data-tour-id="team-directory-teams"]',
    routePattern: TEAM_DIRECTORY_LIST_ROUTE_PATTERN,
    content:
      'Start a new team here when you are ready to add an operational unit to the directory.',
    placement: 'bottom',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open create team modal',
    primaryActionTargetSelector: '[data-tour-id="team-directory-create-action"]',
    primaryActionWaitForSelector: '[data-tour-id="team-directory-create-modal"]',
    primaryActionStartAtStepKey: 'createModal',
  },
  {
    key: 'createModal',
    title: 'Create team modal',
    targetSelector: '[data-tour-id="team-directory-create-modal"]',
    routePattern: TEAM_DIRECTORY_LIST_ROUTE_PATTERN,
    content:
      'Use this modal shell to prepare new operational teams without leaving the directory workspace.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'createDefaults',
    title: 'Default team picks',
    targetSelector: '[data-tour-id="team-directory-create-defaults"]',
    fallbackSelector: '[data-tour-id="team-directory-create-modal"]',
    routePattern: TEAM_DIRECTORY_LIST_ROUTE_PATTERN,
    content:
      'These default team choices let you add the common operational team names quickly when they are not already in use.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'createCustom',
    title: 'Custom team names',
    targetSelector: '[data-tour-id="team-directory-create-custom"]',
    fallbackSelector: '[data-tour-id="team-directory-create-modal"]',
    routePattern: TEAM_DIRECTORY_LIST_ROUTE_PATTERN,
    content:
      'Use the custom team section when the new operational unit does not match the default team set.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'detail',
    title: 'Team detail',
    targetSelector: '[data-tour-id="team-directory-detail"]',
    routePattern: TEAM_DIRECTORY_DETAIL_ROUTE_PATTERN,
    content:
      'This team detail view is where you review the team identity, current members, past members, and overall roster status for that unit.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'detailEditAction',
    title: 'Edit team',
    targetSelector: '[data-tour-id="team-directory-detail-edit-action"]',
    fallbackSelector: '[data-tour-id="team-directory-detail"]',
    routePattern: TEAM_DIRECTORY_DETAIL_ROUTE_PATTERN,
    content:
      'Open the team edit flow here when you need to update members, grouping, or the team image.',
    placement: 'top',
    mobilePlacement: 'top',
    primaryActionLabel: 'Open edit team modal',
    primaryActionTargetSelector: '[data-tour-id="team-directory-detail-edit-action"]',
    primaryActionWaitForSelector: '[data-tour-id="team-directory-edit-modal"]',
    primaryActionStartAtStepKey: 'editModal',
  },
  {
    key: 'editModal',
    title: 'Edit team modal',
    targetSelector: '[data-tour-id="team-directory-edit-modal"]',
    routePattern: TEAM_DIRECTORY_DETAIL_ROUTE_PATTERN,
    content:
      'Use this modal shell to update team groupings, member composition, and visual identity without leaving the team detail view.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'membersEditor',
    title: 'Members editor',
    targetSelector: '[data-tour-id="team-directory-members-editor"]',
    fallbackSelector: '[data-tour-id="team-directory-edit-modal"]',
    routePattern: TEAM_DIRECTORY_DETAIL_ROUTE_PATTERN,
    content:
      'This members editor is where you add, remove, and review the staff assignments that make up the selected team.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'imagePicker',
    title: 'Team image',
    targetSelector: '[data-tour-id="team-directory-image-picker"]',
    fallbackSelector: '[data-tour-id="team-directory-edit-modal"]',
    routePattern: TEAM_DIRECTORY_DETAIL_ROUTE_PATTERN,
    content:
      'Use this image picker to upload, replace, clear, or select a preset team photo for the current team record.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
  {
    key: 'deleteAction',
    title: 'Delete team shell',
    targetSelector: '[data-tour-id="team-directory-delete-action"]',
    fallbackSelector: '[data-tour-id="team-directory-edit-modal"]',
    routePattern: TEAM_DIRECTORY_DETAIL_ROUTE_PATTERN,
    content:
      'Start team deletion from this stable action shell. The final irreversible confirm action remains deferred.',
    ...SAFE_MODAL_STEP_PLACEMENT,
    primaryActionLabel: 'Open delete team modal',
    primaryActionTargetSelector: '[data-tour-id="team-directory-delete-action"]',
    primaryActionWaitForSelector: '[data-tour-id="team-directory-delete-modal"]',
    primaryActionStartAtStepKey: 'deleteModal',
  },
  {
    key: 'deleteModal',
    title: 'Delete team modal',
    targetSelector: '[data-tour-id="team-directory-delete-modal"]',
    routePattern: TEAM_DIRECTORY_DETAIL_ROUTE_PATTERN,
    content:
      'When deletion is opened, review the modal shell here and stop before the irreversible confirm action.',
    ...SAFE_MODAL_STEP_PLACEMENT,
  },
]
