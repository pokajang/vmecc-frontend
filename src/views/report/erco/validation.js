import { formatErcoLocation } from './utils'

export const validateErcoDetails = (form) => {
  const next = {}
  if (!form.incidentDate) next.incidentDate = 'Date is required.'
  if (!form.incidentTime) next.incidentTime = 'Time is required.'
  if (!formatErcoLocation(form.location)) next.location = 'Location is required.'
  if (!form.details.trim()) next.details = 'Details are required.'
  if (!form.summary.trim()) next.summary = 'Summary is required.'
  const respondingRows = Array.isArray(form.respondingAttendance) ? form.respondingAttendance : []
  if (!respondingRows.some((row) => row?.present)) {
    next.respondingAttendance = 'Tick at least one responding member.'
  }

  const rows = form.chronology.filter((row) => row.time || row.action)
  if (rows.length === 0 || rows.some((row) => !row.time || !row.action.trim())) {
    next.chronology = 'Chronology rows require both time and action.'
  }

  return {
    isValid: Object.keys(next).length === 0,
    errors: next,
  }
}

export const validateErcoAnalysis = (form) => {
  const next = {}
  const analysis = form?.postIncidentAnalysis || {}
  const strengths = (Array.isArray(analysis?.strengths) ? analysis.strengths : [])
    .map((row) => String(row || '').trim())
    .filter(Boolean)
  if (strengths.length === 0) {
    next.postIncidentStrengths = 'At least one strength entry is required.'
  }

  return {
    isValid: Object.keys(next).length === 0,
    errors: next,
  }
}

export const validateErcoForm = (form) => {
  const detailsResult = validateErcoDetails(form)
  const analysisResult = validateErcoAnalysis(form)
  const mergedErrors = {
    ...detailsResult.errors,
    ...analysisResult.errors,
  }

  return {
    isValid: Object.keys(mergedErrors).length === 0,
    errors: mergedErrors,
  }
}

export const validateErcoSetup = (form) => {
  const next = {}
  if (!form.incidentType) next.incidentType = 'Incident type is required.'
  if (!form.weather) next.weather = 'Weather is required.'
  if (!formatErcoLocation(form.location)) next.location = 'Location is required.'
  if (!form.incidentDate) next.incidentDate = 'Incident date is required.'
  if (!form.incidentTime) next.incidentTime = 'Start time is required.'

  return {
    isValid: Object.keys(next).length === 0,
    errors: next,
  }
}
