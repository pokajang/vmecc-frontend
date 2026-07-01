export const SETTINGS_TOUR_MODULE_SELECTOR = '[data-tour-id="settings-module"]'

export const SETTINGS_TOUR_ANCHOR_SELECTORS = [
  SETTINGS_TOUR_MODULE_SELECTOR,
  '[data-tour-id="settings-nav"]',
  '[data-tour-id="settings-general"]',
  '[data-tour-id="settings-role-permissions"]',
  '[data-tour-id="settings-dashboard-visibility"]',
  '[data-tour-id="settings-modules"]',
]

export const SETTINGS_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Settings workspace',
    targetSelector: SETTINGS_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where system-wide settings are grouped into focused tabs for administration and review.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'tabs',
    title: 'Settings tabs',
    targetSelector: '[data-tour-id="settings-nav"]',
    fallbackSelector: SETTINGS_TOUR_MODULE_SELECTOR,
    content:
      'Use these tabs to switch between general settings, role permissions, dashboard visibility, and module activation.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'general',
    title: 'General settings',
    targetSelector: '[data-tour-id="settings-general"]',
    content:
      'Use the general settings area to review maintenance-related controls and the system-level status surface.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'roles',
    title: 'Role permissions',
    targetSelector: '[data-tour-id="settings-role-permissions"]',
    content:
      'Use this section to review how permissions are grouped and where role-access configuration is managed.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'dashboard',
    title: 'Dashboard visibility',
    targetSelector: '[data-tour-id="settings-dashboard-visibility"]',
    content:
      'Use this section to review dashboard visibility rules and the role-based summary matrix.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'modules',
    title: 'Module activation',
    targetSelector: '[data-tour-id="settings-modules"]',
    content:
      'Use this section to review which modules are active and how parent or dependency states affect availability.',
    placement: 'top',
    mobilePlacement: 'top',
  },
]
