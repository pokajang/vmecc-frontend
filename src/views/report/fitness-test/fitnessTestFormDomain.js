import { getLocalDateInputValue } from 'src/utils/localDate'
import { createReportIdentity, createReportSubmissionKey, uid } from '../utils'

const text = (value) => String(value ?? '').trim()
const parsePositiveInteger = (value) => {
  const next = Number(text(value))
  return Number.isInteger(next) && next > 0 ? next : null
}

const monthFromDate = (value) => {
  const raw = text(value)
  if (!raw) return ''
  const matched = /^(\d{4})-(\d{1,2})/.exec(raw)
  if (matched && matched[1] && matched[2]) {
    return `${matched[1]}-${matched[2].padStart(2, '0')}`
  }
  const parsed = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
}

export const FITNESS_TEST_FORM_SCHEMA_VERSION = 1

export const createDefaultFitnessTestForm = () => ({
  schemaVersion: FITNESS_TEST_FORM_SCHEMA_VERSION,
  submissionKey: createReportSubmissionKey('fitness-test'),
  reportDate: getLocalDateInputValue(),
  reportTime: '',
  weather: 'Routine',
  incidentType: 'Endurance Test',
  location: '',
  details: '',
  summary: '',
  sc: '',
  asc: '',
  photos: [],
  chronology: [{ id: `chronology-${uid()}`, time: '', action: '' }],
})

const normalizePhotos = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((photo, index) => {
      if (!photo) return null
      if (typeof photo === 'string') {
        const url = text(photo)
        return url
          ? {
              id: `photo-${index + 1}`,
              mediaId: '',
              fileName: `photo-${index + 1}`,
              url,
              description: '',
            }
          : null
      }

      const url = text(photo.url ?? photo.src ?? photo.dataUrl)
      if (!url) return null

      return {
        ...photo,
        id: text(photo.id) || `photo-${index + 1}`,
        mediaId: text(photo.mediaId ?? photo.media_id),
        fileName: text(photo.fileName ?? photo.file_name ?? photo.name) || `photo-${index + 1}`,
        url,
        thumbnailUrl: text(photo.thumbnailUrl ?? photo.thumbnail_url),
        mimeType: text(photo.mimeType ?? photo.mime_type),
        sizeBytes: Number(photo.sizeBytes ?? photo.size_bytes ?? 0) || 0,
        width: Number(photo.width ?? 0) || 0,
        height: Number(photo.height ?? 0) || 0,
        description: String(photo.description ?? photo.caption ?? ''),
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

const normalizeAssessor = (assessor) => {
  if (!assessor || typeof assessor !== 'object') return null
  const name = text(assessor.name || assessor.assessorName || assessor.fullName)
  const userId = text(assessor.userId ?? assessor.user_id ?? assessor.id)
  return {
    userId: /^[1-9]\d*$/.test(userId) ? Number(userId) : null,
    name: name || null,
  }
}

const normalizeShiftGroups = (rows) => {
  const groups = (Array.isArray(rows) ? rows : []).map((group, index) => {
    const source = group && typeof group === 'object' ? group : {}
    const teamId = parsePositiveInteger(source.teamId ?? source.team_id ?? '')
    return {
      id: text(source.id) || `shift-group-${index + 1}-${uid()}`,
      teamId,
      shiftName: text(source.shiftName ?? source.shift_name ?? source.shift ?? ''),
      assessor: normalizeAssessor(source.assessor),
      participants: Array.isArray(source.participants) ? source.participants : [],
    }
  })
  return groups.filter((group) => Object.keys(group).length > 0)
}

export const normalizeFitnessTestForm = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const defaults = createDefaultFitnessTestForm()
  const reportDate = text(source.reportDate ?? source.incidentDate ?? defaults.reportDate)
  const reportTime = text(source.reportTime ?? source.incidentTime ?? defaults.reportTime)
  const shiftGroups = normalizeShiftGroups(
    source.shiftGroups ?? source.shift_groups ?? source.groups,
  )

  return {
    schemaVersion: FITNESS_TEST_FORM_SCHEMA_VERSION,
    submissionKey: text(source.submissionKey) || defaults.submissionKey,
    reportDate,
    reportTime,
    weather: text(source.weather) || defaults.weather,
    incidentType: text(source.incidentType) || defaults.incidentType,
    location: text(source.location || (shiftGroups[0]?.shiftName ?? '')),
    details: text(source.details ?? source.description ?? ''),
    summary: text(source.summary ?? ''),
    sc: text(source.sc),
    asc: text(source.asc),
    photos: normalizePhotos(source.photos),
    chronology: normalizeChronology(source.chronology),
    reportingMonth: monthFromDate(source.reportingMonth ?? source.reporting_month ?? reportDate),
    documentReference: text(source.documentReference ?? source.document_reference ?? ''),
    protocolRevision: text(source.protocolRevision ?? source.protocol_revision ?? ''),
    shiftGroups,
  }
}

export const normalizeFitnessTestRecordToForm = (record = {}) => normalizeFitnessTestForm(record)

const buildCanonicalShiftGroups = (form, user) => {
  const groups = Array.isArray(form?.shiftGroups) ? form.shiftGroups : []
  if (groups.length > 0) {
    return groups.map((group, index) => ({
      id: text(group?.id) || `shift-group-${index + 1}-${uid()}`,
      teamId: parsePositiveInteger(group?.teamId),
      shiftName: text(group?.shiftName),
      assessor: normalizeAssessor(group?.assessor),
      participants: Array.isArray(group?.participants) ? group.participants : [],
    }))
  }

  const assessorName = text(user?.name || user?.email || '')
  const userId = text(user?.id)
  return [
    {
      id: `shift-group-default-${uid()}`,
      teamId: null,
      shiftName: text(form?.location),
      assessor: {
        userId: /^[1-9]\d*$/.test(userId) ? Number(userId) : null,
        name: assessorName || null,
      },
      participants: [],
    },
  ]
}

export const buildFitnessTestRecord = ({
  form,
  reportTypeSlug,
  reportTypeIdPrefix,
  user,
  nowIso = new Date().toISOString(),
  sequence,
}) => {
  const value = normalizeFitnessTestForm(form)
  const canonicalShiftGroups = buildCanonicalShiftGroups(value, user)
  const { id, displayId } = createReportIdentity(reportTypeIdPrefix, nowIso, sequence)

  return {
    id,
    displayId,
    reportType: reportTypeSlug || 'fitness-test',
    schemaVersion: FITNESS_TEST_FORM_SCHEMA_VERSION,
    submissionKey: value.submissionKey,
    status: 'Submitted',
    ownerUserId: String(user?.id || '').trim(),
    submittedAt: nowIso,
    submittedBy: user?.name || user?.email || 'Requester',
    actionOwner: 'Training Coordinator',
    nextAction: 'Review',
    reportDate: value.reportDate,
    reportTime: value.reportTime,
    weather: value.weather,
    incidentType: value.incidentType,
    location: value.location,
    details: value.details,
    summary: value.summary,
    reportingMonth: value.reportingMonth || monthFromDate(value.reportDate),
    documentReference: value.documentReference,
    protocolRevision: value.protocolRevision,
    shiftGroups: canonicalShiftGroups,
    photos: value.photos.map((photo) => ({
      ...photo,
      id: text(photo.id),
      mediaId: text(photo.mediaId ?? photo.media_id),
      fileName: text(photo.fileName ?? photo.file_name),
      url: text(photo.url),
      thumbnailUrl: text(photo.thumbnailUrl ?? photo.thumbnail_url),
      mimeType: text(photo.mimeType ?? photo.mime_type),
      sizeBytes: Number(photo.sizeBytes ?? photo.size_bytes ?? 0) || 0,
      width: Number(photo.width ?? 0) || 0,
      height: Number(photo.height ?? 0) || 0,
      description: text(photo.description),
    })),
    chronology: value.chronology
      .filter((row) => row.time || row.action)
      .map((row) => ({ time: row.time, action: row.action.trim() })),
    timeline: [
      {
        id: `t-${uid()}`,
        action: 'Submitted',
        by: user?.name || user?.email || 'Requester',
        at: nowIso,
        remarks: 'Report submitted.',
      },
    ],
  }
}
