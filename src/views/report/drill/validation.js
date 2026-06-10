export const validateDrillForm = (form) => {
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

export const validateDrillSetup = (form) => {
  const next = {}
  if (!form.incidentType) next.incidentType = 'Drill type is required.'
  if (!form.weather) next.weather = 'Condition is required.'
  if (!form.location.trim()) next.location = 'Location is required.'
  if (!form.reportDate) next.reportDate = 'Drill date is required.'
  if (!form.reportTime) next.reportTime = 'Start time is required.'

  return {
    isValid: Object.keys(next).length === 0,
    errors: next,
  }
}
