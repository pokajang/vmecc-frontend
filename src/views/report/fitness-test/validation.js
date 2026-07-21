export const FITNESS_TEST_FIELD_ORDER = [
  'incidentType',
  'weather',
  'location',
  'reportDate',
  'reportTime',
  'details',
  'summary',
  'chronology',
]

const FITNESS_TEST_FIELD_STAGE = {
  incidentType: 'setup',
  weather: 'setup',
  location: 'setup',
  reportDate: 'setup',
  reportTime: 'setup',
  details: 'test',
  summary: 'test',
  chronology: 'test',
}

const visibleFitnessTestErrorField = (key) => {
  if (!key) return ''
  if (key === 'reportTime') return 'reportDate'
  return key
}

export const validateFitnessTestForm = (form) => {
  const next = {}
  if (!form.reportDate) next.reportDate = 'Date is required.'
  if (!form.reportTime) next.reportTime = 'Time is required.'
  if (!form.location.trim()) next.location = 'Location is required.'
  if (!form.details.trim()) next.details = 'Details are required.'
  if (!form.summary.trim()) next.summary = 'Summary is required.'

  const rows = form.chronology.filter((row) => row.time || row.action)
  if (rows.length === 0 || rows.some((row) => !row.time || !row.action.trim())) {
    next.chronology = 'Chronology rows require both time and action.'
  }

  return {
    isValid: Object.keys(next).length === 0,
    errors: next,
  }
}

export const orderedFitnessTestErrorFields = (errors = {}) =>
  FITNESS_TEST_FIELD_ORDER.filter((field) => Object.keys(errors).includes(field))

export const firstFitnessTestError = (errors = {}) => {
  const [field] = orderedFitnessTestErrorFields(errors)
  return {
    field: visibleFitnessTestErrorField(field),
    stage: FITNESS_TEST_FIELD_STAGE[visibleFitnessTestErrorField(field)] || 'setup',
  }
}

export const validateFitnessTestSetup = (form) => {
  const next = {}
  if (!form.incidentType) next.incidentType = 'Test type is required.'
  if (!form.weather) next.weather = 'Condition is required.'
  if (!form.location.trim()) next.location = 'Location is required.'
  if (!form.reportDate) next.reportDate = 'Test date is required.'
  if (!form.reportTime) next.reportTime = 'Start time is required.'

  return {
    isValid: Object.keys(next).length === 0,
    errors: next,
  }
}
