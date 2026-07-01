export const DASHBOARD_TOUR_MODULE_SELECTOR = '[data-tour-id="dashboard-module"]'

export const DASHBOARD_TOUR_ANCHOR_SELECTORS = [
  DASHBOARD_TOUR_MODULE_SELECTOR,
  '[data-tour-id="dashboard-overview"]',
  '[data-tour-id="dashboard-period-control"]',
  '[data-tour-id="dashboard-my-stats"]',
  '[data-tour-id="dashboard-action-queue"]',
]

export const DASHBOARD_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Dashboard workspace',
    targetSelector: '[data-tour-id="dashboard-overview"]',
    fallbackSelector: DASHBOARD_TOUR_MODULE_SELECTOR,
    content:
      'This dashboard is your operational starting point for quick status checks before you jump into a specific module.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'period',
    title: 'Period control',
    targetSelector: '[data-tour-id="dashboard-period-control"]',
    fallbackSelector: '[data-tour-id="dashboard-overview"]',
    content:
      'Use this period selector to switch the visible dashboard totals and queue counts without leaving the page.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'my-stats',
    title: 'My stats panel',
    targetSelector: '[data-tour-id="dashboard-my-stats"]',
    fallbackSelector: DASHBOARD_TOUR_MODULE_SELECTOR,
    content:
      'This panel summarizes your own visible items so you can orient yourself before reviewing team or management workload.',
    placement: 'top',
    mobilePlacement: 'bottom',
  },
  {
    key: 'action-queue',
    title: 'Action queue',
    targetSelector: '[data-tour-id="dashboard-action-queue"]',
    fallbackSelector: DASHBOARD_TOUR_MODULE_SELECTOR,
    content:
      'Start here when something needs attention now. These links take you straight into the next module route that needs follow-up.',
    placement: 'top',
    mobilePlacement: 'top',
  },
]
