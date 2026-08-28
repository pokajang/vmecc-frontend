export const RKEY = 'report_records_v1_user_'
export const DKEY = 'report_draft_v1_user_'

export const REPORT_TYPE_CONFIG = {
  erco: {
    label: 'ERCO',
    idPrefix: 'ERCO',
    workFirst: true,
    typeLabel: 'Incident Type',
    conditionLabel: 'Weather',
    detailsLabel: 'Incident Title',
    summaryLabel: 'Summary',
    mobileBackMap: { analysis: 'form', form: 'team', team: 'setup' },
  },
  drill: {
    label: 'Drill',
    idPrefix: 'DRL',
    workFirst: true,
    typeLabel: 'Drill Type',
    conditionLabel: 'Condition',
    detailsLabel: 'Drill Scenario',
    summaryLabel: 'Outcome Summary',
    mobileBackMap: {
      analysis: 'chronology',
      chronology: 'details',
      details: 'personnel',
      personnel: 'setup',
    },
  },
  'fitness-test': {
    label: 'Fitness Test',
    idPrefix: 'FIT',
    workFirst: true,
    typeLabel: 'Fitness Test Type',
    conditionLabel: 'Condition',
    detailsLabel: 'Test Details',
    summaryLabel: 'Test Summary',
    mobileBackMap: { signoff: 'results', results: 'personnel', personnel: 'period' },
  },
  'er-assessment': {
    label: 'ER Assessment',
    idPrefix: 'ERA',
    workFirst: true,
    typeLabel: 'Assessment Type',
    conditionLabel: '',
    detailsLabel: 'Work activity being assessed',
    summaryLabel: 'Rescue Plan',
    mobileBackMap: {
      signoff: 'equipment',
      equipment: 'rescue',
      rescue: 'requirements',
      requirements: 'setup',
    },
  },
}

export const REPORT_VIEW_PERMISSIONS = {
  erco: 'reports.erco.view',
  drill: 'reports.drill.view',
  'fitness-test': 'reports.fitness.view',
  'er-assessment': 'reports.er_assessment.view',
}

export const SORT_OPTIONS = [
  { value: 'reportedAt:desc', label: 'Latest reported' },
  { value: 'reportedAt:asc', label: 'Earliest reported' },
  { value: 'incidentType:asc', label: 'Incident type A-Z' },
  { value: 'incidentType:desc', label: 'Incident type Z-A' },
]
