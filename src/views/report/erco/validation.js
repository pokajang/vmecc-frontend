import { formatErcoLocation } from './utils'

export const ERCO_FIELD_ORDER = [
  'incidentType',
  'weather',
  'location',
  'incidentDate',
  'incidentTime',
  'respondingAttendance',
  'details',
  'chronology',
  'summary',
  'postIncidentStrengths',
  'postIncidentPhotos',
]

export const ERCO_FIELD_STAGE = {
  incidentType: 'setup',
  weather: 'setup',
  location: 'setup',
  incidentDate: 'setup',
  incidentTime: 'setup',
  respondingAttendance: 'team',
  details: 'form',
  chronology: 'form',
  summary: 'form',
  postIncidentStrengths: 'analysis',
  postIncidentPhotos: 'analysis',
}

const text = (value) => String(value ?? '').trim()
const rows = (value) => (Array.isArray(value) ? value : [])

const localDateValue = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const localTimeValue = (date = new Date()) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

export const validateErcoSetup = (form = {}, now = new Date()) => {
  const next = {}
  const incidentDate = text(form.incidentDate)
  const incidentTime = text(form.incidentTime)
  const today = localDateValue(now)

  if (!text(form.incidentType)) next.incidentType = 'Incident type is required.'
  if (!text(form.weather)) next.weather = 'Weather is required.'
  if (!formatErcoLocation(form.location)) next.location = 'Location is required.'
  if (!incidentDate) next.incidentDate = 'Incident date is required.'
  else if (incidentDate > today) next.incidentDate = 'Incident date cannot be in the future.'
  if (!incidentTime) next.incidentTime = 'Start time is required.'
  else if (incidentDate === today && incidentTime > localTimeValue(now)) {
    next.incidentTime = 'Incident time cannot be in the future.'
  }

  return { isValid: Object.keys(next).length === 0, errors: next }
}

export const validateErcoRespondingTeam = (form = {}) => {
  const next = {}
  if (!rows(form.respondingAttendance).some((row) => row?.present)) {
    next.respondingAttendance = 'Tick at least one responding member.'
  }
  return { isValid: Object.keys(next).length === 0, errors: next }
}

export const validateErcoDetails = (form = {}) => {
  const next = {}
  if (!text(form.details)) next.details = 'Incident title is required.'
  if (!text(form.summary)) next.summary = 'Incident summary is required.'

  const chronologyRows = rows(form.chronology).filter((row) => text(row?.time) || text(row?.action))
  if (
    chronologyRows.length === 0 ||
    chronologyRows.some((row) => !text(row?.time) || !text(row?.action))
  ) {
    next.chronology = 'Each chronology row requires both a time and an action.'
  }

  return { isValid: Object.keys(next).length === 0, errors: next }
}

export const validateErcoAnalysis = (form = {}) => {
  const next = {}
  const analysis = form?.postIncidentAnalysis || {}
  const strengths = rows(analysis.strengths).map(text).filter(Boolean)
  const photos = rows(analysis.photos).filter((photo) => text(photo?.url))

  if (strengths.length === 0) {
    next.postIncidentStrengths = 'Select or add at least one strength.'
  }
  if (photos.length === 0) {
    next.postIncidentPhotos = 'Upload at least one incident photograph.'
  }

  return { isValid: Object.keys(next).length === 0, errors: next }
}

export const validateErcoForm = (form = {}, now = new Date()) => {
  const results = [
    validateErcoSetup(form, now),
    validateErcoRespondingTeam(form),
    validateErcoDetails(form),
    validateErcoAnalysis(form),
  ]
  const errors = Object.assign({}, ...results.map((result) => result.errors))
  return { isValid: Object.keys(errors).length === 0, errors }
}

export const orderedErcoErrorFields = (errors = {}) =>
  ERCO_FIELD_ORDER.filter((field) => Boolean(errors?.[field]))

export const firstErcoError = (errors = {}) => {
  const field = orderedErcoErrorFields(errors)[0] || ''
  return { field, stage: ERCO_FIELD_STAGE[field] || 'setup' }
}

export const errorsForErcoStage = (errors = {}, stage = '') =>
  Object.fromEntries(
    orderedErcoErrorFields(errors)
      .filter((field) => ERCO_FIELD_STAGE[field] === stage)
      .map((field) => [field, errors[field]]),
  )
