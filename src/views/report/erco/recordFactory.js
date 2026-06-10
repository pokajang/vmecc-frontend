import { createReportIdentity, uid } from '../utils'
import { formatErcoLocation, resolveRespondingTeamLabel } from './utils'

const normalizeAnalysisRows = (rows) =>
  (Array.isArray(rows) ? rows : []).map((row) => String(row || '').trim()).filter(Boolean)

export const buildErcoRecord = ({
  form,
  reportTypeSlug,
  reportTypeIdPrefix,
  user,
  nowIso = new Date().toISOString(),
  sequence,
}) => {
  const { id, displayId } = createReportIdentity(reportTypeIdPrefix, nowIso, sequence)

  const respondingAttendance = (
    Array.isArray(form.respondingAttendance) ? form.respondingAttendance : []
  )
    .filter((row) => row?.present)
    .map((row) => ({
      memberId: String(row?.memberId || '').trim(),
      name: String(row?.name || '').trim(),
      role: String(row?.role || '').trim(),
    }))
  const analysis = form?.postIncidentAnalysis || {}

  return {
    id,
    displayId,
    reportType: reportTypeSlug || 'erco',
    status: 'Submitted',
    actionOwner: 'Operations Supervisor',
    nextAction: 'Review',
    incidentDate: form.incidentDate,
    incidentTime: form.incidentTime,
    // Backward-compatible aliases while consumers migrate to incidentDate/incidentTime.
    reportDate: form.incidentDate,
    reportTime: form.incidentTime,
    weather: form.weather,
    incidentType: form.incidentType,
    location: formatErcoLocation(form.location),
    details: form.details.trim(),
    detailsSource: String(form.detailsSource || 'manual').trim() || 'manual',
    summary: form.summary.trim(),
    respondingTeam: {
      name: resolveRespondingTeamLabel(form.respondingTeamName, form.respondingAttendance),
      shift: String(form.respondingTeamShift || '').trim(),
      attendance: respondingAttendance,
    },
    chronology: form.chronology
      .filter((row) => row.time || row.action)
      .map((row) => ({ time: row.time, action: row.action.trim() })),
    postIncidentAnalysis: {
      strengths: normalizeAnalysisRows(analysis?.strengths),
      resourcesMobilised: normalizeAnalysisRows(analysis?.resourcesMobilised),
      improvementOpportunities: normalizeAnalysisRows(analysis?.improvementOpportunities),
      photos: (Array.isArray(analysis?.photos) ? analysis.photos : [])
        .map((photo) => ({
          id: String(photo?.id || '').trim(),
          fileName: String(photo?.fileName || '').trim(),
          url: String(photo?.url || '').trim(),
          description: String(photo?.description || '').trim(),
        }))
        .filter((photo) => photo.url),
    },
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
