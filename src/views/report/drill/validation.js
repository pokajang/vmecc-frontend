import { normalizeDrillForm } from './drillFormDomain'
import { DRILL_FIELD_LIMITS } from './constants'

const text = (value) => String(value ?? '').trim()

export const DRILL_FIELD_ORDER = [
  'incidentType',
  'weather',
  'location',
  'reportDate',
  'reportTime',
  'respondingAttendance',
  'details',
  'erpReferences',
  'summary',
  'exerciseObjectives',
  'chronology',
  'postIncidentAnalysis',
]

const DRILL_FIELD_STAGE = {
  incidentType: 'setup',
  weather: 'setup',
  location: 'setup',
  reportDate: 'setup',
  reportTime: 'setup',
  respondingAttendance: 'personnel',
  details: 'details',
  summary: 'details',
  exerciseObjectives: 'details',
  chronology: 'chronology',
  postIncidentAnalysis: 'analysis',
  erpReferences: 'details',
}

const visibleDrillErrorField = (key) => {
  if (!key) return ''
  if (key === 'reportTime') return 'reportDate'
  if (key === 'erpReferences' || key.startsWith('erpReferences.')) return 'erpReferences'
  return key
}

export const validateDrillChronology = (form) => {
  const next = {}
  const value = normalizeDrillForm(form)
  const rows = value.chronology.filter((row) => text(row?.time) || text(row?.action))
  if (rows.length === 0) {
    next.chronology = 'Add at least one drill event with a time and action.'
  } else if (rows.length > DRILL_FIELD_LIMITS.chronology) {
    next.chronology = `Use no more than ${DRILL_FIELD_LIMITS.chronology} chronology rows.`
  } else if (rows.some((row) => !text(row?.time) || !text(row?.action))) {
    next.chronology = 'Chronology rows require both time and action.'
  } else if (
    rows.some((row) => String(row?.action || '').length > DRILL_FIELD_LIMITS.chronologyAction)
  ) {
    next.chronology = `Each chronology action must be ${DRILL_FIELD_LIMITS.chronologyAction} characters or fewer.`
  }
  return { isValid: Object.keys(next).length === 0, errors: next }
}

export const validateDrillSetup = (form) => {
  const next = {}
  const value = normalizeDrillForm(form)
  if (!text(value.incidentType)) next.incidentType = 'Drill type is required.'
  if (!text(value.weather)) next.weather = 'Condition is required.'
  if (!text(value.location)) next.location = 'Location is required.'
  if (!text(value.reportDate)) next.reportDate = 'Drill date is required.'
  if (!text(value.reportTime)) next.reportTime = 'Start time is required.'
  if (String(value.incidentType || '').length > DRILL_FIELD_LIMITS.shortText)
    next.incidentType = `Drill type must be ${DRILL_FIELD_LIMITS.shortText} characters or fewer.`
  if (String(value.weather || '').length > DRILL_FIELD_LIMITS.shortText)
    next.weather = `Condition must be ${DRILL_FIELD_LIMITS.shortText} characters or fewer.`
  if (String(value.location || '').length > DRILL_FIELD_LIMITS.shortText)
    next.location = `Location must be ${DRILL_FIELD_LIMITS.shortText} characters or fewer.`

  return { isValid: Object.keys(next).length === 0, errors: next }
}

export const validateDrillPersonnel = (form) => {
  const value = normalizeDrillForm(form)
  const next = {}
  if (value.respondingAttendance.length > DRILL_FIELD_LIMITS.personnel) {
    next.respondingAttendance = `Use no more than ${DRILL_FIELD_LIMITS.personnel} personnel rows.`
  }
  const exclusiveRoles = new Set(['SC', 'ASC', 'TRT1', 'TRT2', 'TRT3', 'TRT4'])
  const assigned = new Map()
  value.respondingAttendance
    .filter((row) => row?.present !== false && exclusiveRoles.has(text(row?.exerciseRole)))
    .forEach((row) => {
      const role = text(row.exerciseRole)
      assigned.set(role, (assigned.get(role) || 0) + 1)
    })
  const duplicates = [...assigned.entries()].filter(([, count]) => count > 1).map(([role]) => role)
  if (duplicates.length) {
    next.respondingAttendance = `Assign each command/TRT role once. Duplicated: ${duplicates.join(', ')}.`
  }
  return { isValid: Object.keys(next).length === 0, errors: next }
}

export const validateDrillDetails = (form) => {
  const next = {}
  const value = normalizeDrillForm(form)
  if (!text(value.details)) next.details = 'Drill scenario is required.'
  if (!text(value.summary)) next.summary = 'Outcome summary is required.'
  if (String(value.exerciseTitle || '').length > DRILL_FIELD_LIMITS.shortText)
    next.exerciseTitle = `Exercise title must be ${DRILL_FIELD_LIMITS.shortText} characters or fewer.`
  if (String(value.details || '').length > DRILL_FIELD_LIMITS.narrative)
    next.details = `Drill scenario must be ${DRILL_FIELD_LIMITS.narrative} characters or fewer.`
  if (String(value.summary || '').length > DRILL_FIELD_LIMITS.narrative)
    next.summary = `Outcome summary must be ${DRILL_FIELD_LIMITS.narrative} characters or fewer.`
  if (value.exerciseObjectives.length > DRILL_FIELD_LIMITS.objectives) {
    next.exerciseObjectives = `Use no more than ${DRILL_FIELD_LIMITS.objectives} objectives.`
  } else if (
    value.exerciseObjectives.some(
      (row) => String(row?.text || '').length > DRILL_FIELD_LIMITS.listItem,
    )
  ) {
    next.exerciseObjectives = `Each objective must be ${DRILL_FIELD_LIMITS.listItem} characters or fewer.`
  }
  if (value.erpReferences.length > DRILL_FIELD_LIMITS.erpReferences) {
    next.erpReferences = `Use no more than ${DRILL_FIELD_LIMITS.erpReferences} ERP references.`
  }
  value.erpReferences.forEach((row) => {
    const annexNumber = text(row?.annexNumber)
    const title = text(row?.title)
    if ((annexNumber && !title) || (!annexNumber && title)) {
      next[`erpReferences.${row.id}`] = 'Enter both the ERP/Annex number and title.'
    }
  })

  return { isValid: Object.keys(next).length === 0, errors: next }
}

export const validateDrillAnalysis = (form) => {
  const value = normalizeDrillForm(form)
  const analysis = value.postIncidentAnalysis
  const next = {}
  const lists = [analysis.strengths, analysis.resourcesMobilised, analysis.improvementOpportunities]
  if (lists.some((rows) => rows.length > DRILL_FIELD_LIMITS.analysisRows)) {
    next.postIncidentAnalysis = `Use no more than ${DRILL_FIELD_LIMITS.analysisRows} rows in each analysis section.`
  } else if (
    lists.some((rows) => rows.some((row) => String(row || '').length > DRILL_FIELD_LIMITS.listItem))
  ) {
    next.postIncidentAnalysis = `Each analysis entry must be ${DRILL_FIELD_LIMITS.listItem} characters or fewer.`
  } else if (analysis.photos.length > DRILL_FIELD_LIMITS.photos) {
    next.postIncidentAnalysis = `Use no more than ${DRILL_FIELD_LIMITS.photos} photographs.`
  } else if (
    analysis.photos.some(
      (photo) => String(photo?.description || '').length > DRILL_FIELD_LIMITS.listItem,
    )
  ) {
    next.postIncidentAnalysis = `Each photo description must be ${DRILL_FIELD_LIMITS.listItem} characters or fewer.`
  }
  return { isValid: Object.keys(next).length === 0, errors: next }
}

export const validateDrillForm = (form) => {
  const results = [
    validateDrillSetup(form),
    validateDrillPersonnel(form),
    validateDrillDetails(form),
    validateDrillChronology(form),
    validateDrillAnalysis(form),
  ]
  const errors = Object.assign({}, ...results.map((result) => result.errors))

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export const orderedDrillErrorFields = (errors = {}) =>
  DRILL_FIELD_ORDER.filter((field) => {
    if (field === 'location') {
      return (
        Boolean(errors.location) ||
        Object.keys(errors).some(
          (key) => key.startsWith('location') || key.startsWith('locations') || field === key,
        )
      )
    }
    return Object.keys(errors).some((key) => {
      if (key === 'location') return field === 'location'
      const visibleField = visibleDrillErrorField(key)
      if (!visibleField) return false
      return visibleField === field
    })
  })

export const firstDrillError = (errors = {}) => {
  const [field] = orderedDrillErrorFields(errors)
  return {
    field: visibleDrillErrorField(field),
    stage: DRILL_FIELD_STAGE[visibleDrillErrorField(field)] || 'setup',
  }
}
