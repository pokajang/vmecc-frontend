import { uid } from './utils'
import { normalizeDrillRecordToForm } from './drill/drillFormDomain'

const statusToneMap = {
  draft: 'warning',
  submitted: 'info',
  reviewed: 'primary',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'secondary',
}

const REPORT_WORKFLOW_DECLARATION_LABEL =
  'I confirm this report workflow action is accurate and aligned with submitted incident details.'

const splitLocation = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
}

const withChronologyIds = (rows) =>
  (Array.isArray(rows) && rows.length ? rows : [{ time: '', action: '' }]).map((row) => ({
    id: row?.id || uid(),
    time: String(row?.time || '').trim(),
    action: String(row?.action || '').trim(),
  }))

const toAnalysisRows = (rows) =>
  (Array.isArray(rows) ? rows : []).map((item) => String(item || '').trim()).filter(Boolean)

const toAnalysisPhotos = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((photo, index) => {
      if (!photo) return null
      if (typeof photo === 'string') {
        const url = String(photo || '').trim()
        if (!url) return null
        return {
          id: `photo-${index + 1}`,
          fileName: `photo-${index + 1}`,
          url,
          description: '',
        }
      }
      const url = String(photo?.url || photo?.src || photo?.dataUrl || '').trim()
      if (!url) return null
      return {
        id: String(photo?.id || `photo-${index + 1}`),
        fileName: String(photo?.fileName || photo?.name || `photo-${index + 1}`),
        url,
        description: String(photo?.description || photo?.caption || '').trim(),
      }
    })
    .filter(Boolean)

const buildErcoPostIncidentAnalysisDraft = (record) => {
  const raw = record?.postIncidentAnalysis
  const analysis = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const legacyFindings = (Array.isArray(record?.findings) ? record.findings : [])
    .map((row) =>
      typeof row === 'string'
        ? row
        : String(row?.text || row?.value || row?.title || row?.description || '').trim(),
    )
    .filter(Boolean)

  const strengths = toAnalysisRows(analysis.strengths)
  const resourcesMobilised = toAnalysisRows(
    analysis.resourcesMobilised || analysis.resourcesMobilized,
  )
  const improvementOpportunities = toAnalysisRows(
    analysis.improvementOpportunities || analysis.improvements,
  )
  const photos = toAnalysisPhotos(
    Array.isArray(analysis.photos) && analysis.photos.length > 0 ? analysis.photos : record?.photos,
  )

  return {
    strengths: strengths.length > 0 ? strengths : legacyFindings,
    resourcesMobilised,
    improvementOpportunities,
    photos,
  }
}

const recordToDraft = (record, reportTypeSlug) => {
  if (reportTypeSlug === 'drill') {
    return {
      ...record,
      ...normalizeDrillRecordToForm(record),
      setupConfirmed: true,
      savedAt: new Date().toISOString(),
    }
  }
  const location =
    reportTypeSlug === 'erco' ? splitLocation(record?.location) : String(record?.location || '')

  return {
    ...record,
    incidentDate: record?.incidentDate || record?.reportDate || '',
    incidentTime: record?.incidentTime || record?.reportTime || '',
    reportDate: record?.reportDate || record?.incidentDate || '',
    reportTime: record?.reportTime || record?.incidentTime || '',
    location,
    respondingTeamName: record?.respondingTeam?.name || record?.respondingTeamName || '',
    respondingTeamShift: record?.respondingTeam?.shift || record?.respondingTeamShift || '',
    respondingAttendance: (Array.isArray(record?.respondingTeam?.attendance)
      ? record.respondingTeam.attendance
      : Array.isArray(record?.respondingAttendance)
        ? record.respondingAttendance
        : []
    ).map((row, index) => ({
      ...row,
      memberKey: String(row?.memberKey || row?.memberId || row?.name || `member-${index + 1}`)
        .trim()
        .toLowerCase(),
      present: true,
    })),
    chronology: withChronologyIds(record?.chronology),
    setupConfirmed: true,
    respondingTeamConfirmed: true,
    detailsConfirmed: true,
    ...(reportTypeSlug === 'erco'
      ? { postIncidentAnalysis: buildErcoPostIncidentAnalysisDraft(record) }
      : {}),
    savedAt: new Date().toISOString(),
  }
}

const buildDraftRow = ({ draft, reportTypeSlug, reportTypeLabel, actorName }) => {
  if (!draft?.payload) return null
  const payload = draft.payload
  const savedAt = String(draft.savedAt || '').trim()
  const draftActor = String(actorName || '').trim() || 'Unknown user'
  const draftId = String(draft.draftId || draft.id || '').trim()
  const fallbackTitle = `${reportTypeLabel} Draft`
  const title = String(draft.title || '').trim() || fallbackTitle
  return {
    ...payload,
    id: `draft-${draftId || uid()}`,
    draftId,
    displayId: title,
    reportType: reportTypeSlug,
    recordKind: 'draft',
    status: 'Draft',
    incidentType: payload.incidentType || '',
    description: payload.exerciseTitle || payload.description || payload.details || '',
    incidentDate: payload.incidentDate || payload.reportDate || '',
    incidentTime: payload.incidentTime || payload.reportTime || '',
    reportDate: payload.reportDate || payload.incidentDate || '',
    reportTime: payload.reportTime || payload.incidentTime || '',
    location: splitLocation(payload.location).join(' | '),
    savedAt,
    sourceReportUid: String(draft.sourceReportUid || payload.__editReportId || '').trim(),
    originMode: draft.originMode || 'new',
    timeline: savedAt
      ? [
          {
            id: `draft-saved-${draftId || reportTypeSlug}`,
            action: 'Draft',
            at: savedAt,
            by: draftActor,
          },
        ]
      : [],
  }
}

const toText = (value) => String(value || '').trim()

const countPresentResponders = (record) => {
  const rows = Array.isArray(record?.respondingTeam?.attendance)
    ? record.respondingTeam.attendance
    : Array.isArray(record?.respondingAttendance)
      ? record.respondingAttendance
      : []
  return rows.filter((row) => row?.present !== false).length
}

const getPostIncidentAnalysis = (record) => {
  const raw = record?.postIncidentAnalysis
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
}

const countAnalysisRows = (record, key, alternateKey) => {
  const analysis = getPostIncidentAnalysis(record)
  const rows = analysis[key] || (alternateKey ? analysis[alternateKey] : null)
  return Array.isArray(rows) ? rows.length : 0
}

const countAnalysisPhotos = (record) => {
  const analysis = getPostIncidentAnalysis(record)
  if (Array.isArray(analysis.photos)) return analysis.photos.length
  return Array.isArray(record?.photos) ? record.photos.length : 0
}

const countLegacyFindings = (record) =>
  Array.isArray(record?.findings) ? record.findings.length : 0

const buildChangeSummary = (original, next) => {
  if (!original || !next) return []
  const originalStrengths =
    countAnalysisRows(original, 'strengths') || countLegacyFindings(original)
  const nextStrengths = countAnalysisRows(next, 'strengths') || countLegacyFindings(next)
  const isDrill =
    String(next?.reportType || original?.reportType || '')
      .trim()
      .toLowerCase() === 'drill'
  const countRows = (record, key) =>
    (Array.isArray(record?.[key]) ? record[key] : []).filter((row) => {
      if (typeof row === 'string') return toText(row)
      return Object.values(row || {}).some((value) => toText(value))
    }).length
  const categoryText = (record) =>
    (Array.isArray(record?.exerciseCategories) ? record.exerciseCategories : [])
      .map(toText)
      .filter(Boolean)
      .join(', ')
  const pairs = [
    [
      isDrill ? 'Drill Type' : 'Incident Type',
      toText(original.incidentType),
      toText(next.incidentType),
    ],
    ...(isDrill
      ? [
          ['Exercise Categories', categoryText(original), categoryText(next)],
          ['Exercise Title', toText(original.exerciseTitle), toText(next.exerciseTitle)],
          [
            'Report Issuance Date',
            toText(original.reportIssuanceDate),
            toText(next.reportIssuanceDate),
          ],
          [
            'Exercise Objectives',
            String(countRows(original, 'exerciseObjectives')),
            String(countRows(next, 'exerciseObjectives')),
          ],
          [
            'ERP References',
            String(countRows(original, 'erpReferences')),
            String(countRows(next, 'erpReferences')),
          ],
        ]
      : []),
    [
      'Date',
      toText(original.incidentDate || original.reportDate),
      toText(next.incidentDate || next.reportDate),
    ],
    [
      'Time',
      toText(original.incidentTime || original.reportTime),
      toText(next.incidentTime || next.reportTime),
    ],
    ['Location', toText(original.location), toText(next.location)],
    [
      'Title',
      toText(original.details || original.description),
      toText(next.details || next.description),
    ],
    ['Summary', toText(original.summary), toText(next.summary)],
    [
      'Chronology',
      String((Array.isArray(original.chronology) ? original.chronology : []).length),
      String((Array.isArray(next.chronology) ? next.chronology : []).length),
    ],
    ['Responders', String(countPresentResponders(original)), String(countPresentResponders(next))],
    ['Strengths', String(originalStrengths), String(nextStrengths)],
    [
      'Resources Mobilised',
      String(countAnalysisRows(original, 'resourcesMobilised', 'resourcesMobilized')),
      String(countAnalysisRows(next, 'resourcesMobilised', 'resourcesMobilized')),
    ],
    [
      'Improvement Opportunities',
      String(countAnalysisRows(original, 'improvementOpportunities', 'improvements')),
      String(countAnalysisRows(next, 'improvementOpportunities', 'improvements')),
    ],
    ['Photos', String(countAnalysisPhotos(original)), String(countAnalysisPhotos(next))],
  ]
  return pairs
    .filter((row) => row[1] !== row[2])
    .map(([label, before, after]) => ({ label, before: before || '--', after: after || '--' }))
}

export {
  REPORT_WORKFLOW_DECLARATION_LABEL,
  buildChangeSummary,
  buildDraftRow,
  recordToDraft,
  statusToneMap,
}
