import { getLocalDateInputValue } from 'src/utils/localDate'
import { uid } from '../utils'

export const DRILL_FORM_SCHEMA_VERSION = 2

const text = (value) => String(value ?? '').trim()

const withId = (row = {}, prefix = 'row') => ({
  ...row,
  id: text(row?.id) || `${prefix}-${uid()}`,
})

const normalizeTextRows = (rows, prefix) => {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => {
    if (typeof row === 'string') return withId({ text: row }, prefix)
    return withId({ ...row, text: String(row?.text ?? row?.value ?? '') }, prefix)
  })
  return normalized.length ? normalized : [withId({ text: '' }, prefix)]
}

const normalizeErpReferences = (rows) => {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) =>
    withId(
      {
        ...row,
        annexNumber: String(row?.annexNumber ?? row?.annex_number ?? ''),
        title: String(row?.title ?? ''),
      },
      'erp',
    ),
  )
  return normalized.length ? normalized : [withId({ annexNumber: '', title: '' }, 'erp')]
}

export const normalizeDrillPhoto = (photo, index = 0) => {
  if (!photo) return null
  if (typeof photo === 'string') {
    const url = text(photo)
    return url
      ? { id: `photo-${index + 1}`, fileName: `photo-${index + 1}`, url, description: '' }
      : null
  }
  const url = text(photo?.url ?? photo?.src ?? photo?.dataUrl)
  if (!url) return null
  return {
    ...photo,
    id: text(photo?.id) || `photo-${index + 1}`,
    mediaId: text(photo?.mediaId ?? photo?.media_id),
    fileName: text(photo?.fileName ?? photo?.file_name ?? photo?.name) || `photo-${index + 1}`,
    url,
    thumbnailUrl: text(photo?.thumbnailUrl ?? photo?.thumbnail_url),
    mimeType: text(photo?.mimeType ?? photo?.mime_type),
    sizeBytes: Number(photo?.sizeBytes ?? photo?.size_bytes ?? 0) || 0,
    width: Number(photo?.width ?? 0) || 0,
    height: Number(photo?.height ?? 0) || 0,
    description: String(photo?.description ?? photo?.caption ?? ''),
  }
}

const normalizeAnalysis = (value, fallbackPhotos = []) => {
  const analysis = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const normalizeList = (rows) =>
    (Array.isArray(rows) ? rows : [])
      .map((row) => String(row ?? ''))
      .filter((row, index, all) => row || all.length === 1 || index < all.length - 1)
  const photos = (
    Array.isArray(analysis.photos) && analysis.photos.length ? analysis.photos : fallbackPhotos
  )
    .map(normalizeDrillPhoto)
    .filter(Boolean)
  return {
    ...analysis,
    strengths: normalizeList(analysis.strengths).length ? normalizeList(analysis.strengths) : [''],
    resourcesMobilised: normalizeList(analysis.resourcesMobilised ?? analysis.resourcesMobilized)
      .length
      ? normalizeList(analysis.resourcesMobilised ?? analysis.resourcesMobilized)
      : [''],
    improvementOpportunities: normalizeList(
      analysis.improvementOpportunities ?? analysis.improvements,
    ).length
      ? normalizeList(analysis.improvementOpportunities ?? analysis.improvements)
      : [''],
    photos,
  }
}

const normalizeAttendance = (input) =>
  (Array.isArray(input) ? input : [])
    .map((row, index) => {
      const name = text(row?.name ?? row?.email)
      const memberId = text(row?.memberId ?? row?.member_id ?? row?.user_id ?? row?.id)
      if (!name && !memberId) return null
      return {
        ...row,
        memberKey:
          text(row?.memberKey) || text(memberId || name || `member-${index + 1}`).toLowerCase(),
        memberId,
        name,
        role: text(row?.role),
        exerciseRole: text(row?.exerciseRole ?? row?.exercise_role),
        teamName: text(row?.teamName ?? row?.team_name),
        present: row?.present !== false,
        source: text(row?.source) || (memberId ? 'roster' : 'manual'),
      }
    })
    .filter(Boolean)

const normalizeChronology = (rows) => {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    id: text(row?.id) || `chronology-${uid()}`,
    time: String(row?.time ?? ''),
    action: String(row?.action ?? ''),
  }))
  return normalized.length ? normalized : [{ id: `chronology-${uid()}`, time: '', action: '' }]
}

export const createDefaultDrillForm = () => ({
  schemaVersion: DRILL_FORM_SCHEMA_VERSION,
  reportDate: getLocalDateInputValue(),
  reportTime: '',
  reportIssuanceDate: '',
  weather: 'Clear',
  incidentType: '',
  exerciseCategories: [],
  location: '',
  exerciseTitle: '',
  details: '',
  exerciseObjectives: [withId({ text: '' }, 'objective')],
  erpReferences: [withId({ annexNumber: '', title: '' }, 'erp')],
  summary: '',
  respondingTeamName: '',
  respondingTeamShift: '',
  respondingAttendance: [],
  chronology: [{ id: `chronology-${uid()}`, time: '', action: '' }],
  postIncidentAnalysis: {
    strengths: [''],
    resourcesMobilised: [''],
    improvementOpportunities: [''],
    photos: [],
  },
})

export const normalizeDrillForm = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const defaults = createDefaultDrillForm()
  const respondingTeam =
    source.respondingTeam && typeof source.respondingTeam === 'object' ? source.respondingTeam : {}
  const legacyAttendance = []
  const sc = text(source.sc)
  const asc = text(source.asc)
  if (sc) legacyAttendance.push({ name: sc, exerciseRole: 'SC', source: 'legacy' })
  if (asc && asc.toLowerCase() !== sc.toLowerCase()) {
    legacyAttendance.push({ name: asc, exerciseRole: 'ASC', source: 'legacy' })
  }
  const sourceAttendance = Array.isArray(source.respondingAttendance)
    ? source.respondingAttendance
    : Array.isArray(respondingTeam.attendance)
      ? respondingTeam.attendance
      : legacyAttendance
  const categories = Array.isArray(source.exerciseCategories)
    ? source.exerciseCategories
    : Array.isArray(source.exercise_categories)
      ? source.exercise_categories
      : []

  return {
    schemaVersion: DRILL_FORM_SCHEMA_VERSION,
    reportDate: String(source.reportDate ?? source.incidentDate ?? defaults.reportDate),
    reportTime: String(source.reportTime ?? source.incidentTime ?? ''),
    reportIssuanceDate: String(source.reportIssuanceDate ?? source.report_issuance_date ?? ''),
    weather: String(source.weather ?? defaults.weather),
    incidentType: String(source.incidentType ?? ''),
    exerciseCategories: categories.map(text).filter(Boolean),
    location: String(source.location ?? ''),
    exerciseTitle: String(source.exerciseTitle ?? source.exercise_title ?? ''),
    details: String(source.details ?? source.description ?? ''),
    exerciseObjectives: normalizeTextRows(
      source.exerciseObjectives ?? source.exercise_objectives,
      'objective',
    ),
    erpReferences: normalizeErpReferences(source.erpReferences ?? source.erp_references),
    summary: String(source.summary ?? ''),
    respondingTeamName: String(source.respondingTeamName ?? respondingTeam.name ?? ''),
    respondingTeamShift: String(source.respondingTeamShift ?? respondingTeam.shift ?? ''),
    respondingAttendance: normalizeAttendance(sourceAttendance),
    chronology: normalizeChronology(source.chronology),
    postIncidentAnalysis: normalizeAnalysis(source.postIncidentAnalysis, source.photos),
  }
}

export const normalizeDrillRecordToForm = (record = {}) => normalizeDrillForm(record)

export const hasMeaningfulDrillChanges = (form) => {
  const value = normalizeDrillForm(form)
  const defaults = createDefaultDrillForm()
  if (
    value.reportDate !== defaults.reportDate ||
    value.reportTime ||
    value.reportIssuanceDate ||
    value.weather !== defaults.weather ||
    text(value.incidentType) ||
    value.exerciseCategories.length ||
    text(value.location) ||
    text(value.exerciseTitle) ||
    text(value.details) ||
    text(value.summary) ||
    value.respondingAttendance.length
  ) {
    return true
  }
  if (value.exerciseObjectives.some((row) => text(row?.text))) return true
  if (value.erpReferences.some((row) => text(row?.annexNumber) || text(row?.title))) return true
  if (value.chronology.some((row) => text(row?.time) || text(row?.action))) return true
  const analysis = value.postIncidentAnalysis
  return (
    analysis.strengths.some(text) ||
    analysis.resourcesMobilised.some(text) ||
    analysis.improvementOpportunities.some(text) ||
    analysis.photos.length > 0
  )
}

export const toSerializableDrillForm = (form) => normalizeDrillForm(form)
