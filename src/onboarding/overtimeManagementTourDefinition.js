export const OVERTIME_MANAGEMENT_TOUR_MODULE_SELECTOR =
  '[data-tour-id="overtime-management-module"]'

export const OVERTIME_MANAGEMENT_TOUR_ANCHOR_SELECTORS = [
  OVERTIME_MANAGEMENT_TOUR_MODULE_SELECTOR,
  '[data-tour-id="overtime-management-nav"]',
  '[data-tour-id="overtime-management-records"]',
  '[data-tour-id="overtime-management-filters"]',
  '[data-tour-id="overtime-management-rules"]',
  '[data-tour-id="overtime-management-detail"]',
]

export const OVERTIME_MANAGEMENT_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Overtime management workspace',
    targetSelector: OVERTIME_MANAGEMENT_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you review overtime administration records, inspect rule setup, and open submitted overtime details.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'sections',
    title: 'Overtime management sections',
    targetSelector: '[data-tour-id="overtime-management-nav"]',
    content:
      'Use these sections to switch between overtime records and overtime rules while staying inside the management workspace.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'records',
    title: 'Overtime records',
    targetSelector: '[data-tour-id="overtime-management-records"]',
    content:
      'Review overtime submissions here to monitor employee records, workflow state, and the records that require administrative follow-up.',
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'filters',
    title: 'Filters and search',
    targetSelector: '[data-tour-id="overtime-management-filters"]',
    fallbackSelector: '[data-tour-id="overtime-management-records"]',
    content:
      'Use search, period, status, overtime type, team, and sort controls here to narrow the overtime records you want to review.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'rules',
    title: 'Overtime rules',
    targetSelector: '[data-tour-id="overtime-management-rules"]',
    content:
      'This section is where you review the overtime rules shell, including the visible type and workflow configuration areas.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'detail',
    title: 'Overtime record detail',
    targetSelector: '[data-tour-id="overtime-management-detail"]',
    content:
      'Open an overtime record detail to review the submitted schedule, current workflow state, and the record history.',
    placement: 'top',
    mobilePlacement: 'top',
  },
]
