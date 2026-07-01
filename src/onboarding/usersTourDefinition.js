export const USERS_TOUR_MODULE_SELECTOR = '[data-tour-id="users-module"]'

export const USERS_TOUR_ANCHOR_SELECTORS = [
  USERS_TOUR_MODULE_SELECTOR,
  '[data-tour-id="users-list"]',
  '[data-tour-id="users-filters"]',
  '[data-tour-id="users-create-action"]',
  '[data-tour-id="users-profile-entry"]',
]

export const USERS_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'User management workspace',
    targetSelector: USERS_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where user records are managed and where you can move between list and profile screens.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'sections',
    title: 'User management sections',
    targetSelector: '[data-tour-id="users-list"]',
    content:
      'Use the user list section to switch between searching users and opening a record for review.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'list',
    title: 'User list',
    targetSelector: '[data-tour-id="users-list"]',
    content:
      'Review the user list here to find records and confirm the current profile and account state.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'filters',
    title: 'Search and filters',
    targetSelector: '[data-tour-id="users-filters"]',
    fallbackSelector: '[data-tour-id="users-list"]',
    content:
      'Use search, sorting, status, and role filters to narrow the user list before opening a profile.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'create',
    title: 'Create a user',
    targetSelector: '[data-tour-id="users-create-action"]',
    content: 'Open the create-user action to add a new user account and account details shell.',
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    key: 'profile',
    title: 'User profile',
    targetSelector: '[data-tour-id="users-profile-entry"]',
    content:
      'Review the user profile shell to inspect key account fields, status, and record-level details.',
    placement: 'top',
    mobilePlacement: 'top',
  },
]
