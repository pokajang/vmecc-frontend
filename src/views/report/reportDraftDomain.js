import { uid } from './utils'

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
    description: payload.description || payload.details || '',
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

const buildChangeSummary = (original, next) => {
  if (!original || !next) return []
  const pairs = [
    ['Incident Type', toText(original.incidentType), toText(next.incidentType)],
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
    [
      'Photos',
      String((Array.isArray(original.photos) ? original.photos : []).length),
      String((Array.isArray(next.photos) ? next.photos : []).length),
    ],
    [
      'Findings',
      String((Array.isArray(original.findings) ? original.findings : []).length),
      String((Array.isArray(next.findings) ? next.findings : []).length),
    ],
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
