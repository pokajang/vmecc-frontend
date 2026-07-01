export const AUDIT_TOUR_MODULE_SELECTOR = '[data-tour-id="audit-module"]'

export const AUDIT_TOUR_ANCHOR_SELECTORS = [
  AUDIT_TOUR_MODULE_SELECTOR,
  '[data-tour-id="audit-records-card"]',
  '[data-tour-id="audit-filters"]',
  '[data-tour-id="audit-records"]',
  '[data-tour-id="audit-results-footer"]',
]

export const AUDIT_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Audit workspace',
    targetSelector: '[data-tour-id="audit-records-card"]',
    fallbackSelector: AUDIT_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review administrative activity, security events, and operational changes from one read-only screen.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'filters',
    title: 'Search and filters',
    targetSelector: '[data-tour-id="audit-filters"]',
    fallbackSelector: '[data-tour-id="audit-records-card"]',
    content:
      'Use search, action filtering, and period controls to narrow the audit activity before scanning the visible results.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'records',
    title: 'Activity records',
    targetSelector: '[data-tour-id="audit-records"]',
    fallbackSelector: '[data-tour-id="audit-records-card"]',
    content:
      'Review the visible audit records here to confirm who acted, which target changed, and the supporting event details.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'results-footer',
    title: 'Results footer',
    targetSelector: '[data-tour-id="audit-results-footer"]',
    fallbackSelector: '[data-tour-id="audit-records"]',
    content:
      'Use this footer to confirm how many audit entries are visible and expand the result count when you need a wider review pass.',
    placement: 'top',
    mobilePlacement: 'top',
  },
]
