export const RKEY = 'report_records_v1_user_'
export const DKEY = 'report_draft_v1_user_'

export const REPORT_TYPE_CONFIG = {
  erco: { label: 'ERCO', idPrefix: 'ERCO' },
  drill: { label: 'Drill', idPrefix: 'DRL' },
  'fitness-test': { label: 'Fitness Test', idPrefix: 'FIT' },
}

export const SORT_OPTIONS = [
  { value: 'reportedAt:desc', label: 'Latest reported' },
  { value: 'reportedAt:asc', label: 'Earliest reported' },
  { value: 'incidentType:asc', label: 'Incident type A-Z' },
  { value: 'incidentType:desc', label: 'Incident type Z-A' },
]
