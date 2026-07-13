import { createReportIdentity, uid } from '../utils'
import { DRILL_FORM_SCHEMA_VERSION, normalizeDrillForm } from './drillFormDomain'

const compactRows = (rows) =>
  (Array.isArray(rows) ? rows : []).map((row) => String(row ?? '').trim()).filter(Boolean)

export const buildDrillRecord = ({
  form,
  reportTypeSlug,
  reportTypeIdPrefix,
  user,
  nowIso = new Date().toISOString(),
  sequence,
}) => {
  const { id, displayId } = createReportIdentity(reportTypeIdPrefix, nowIso, sequence)
  const value = normalizeDrillForm(form)
  const analysis = value.postIncidentAnalysis

  return {
    id,
    displayId,
    reportType: reportTypeSlug || 'drill',
    submissionKey: value.submissionKey,
    status: 'Submitted',
    ownerUserId: String(user?.id || '').trim(),
    submittedAt: nowIso,
    submittedBy: user?.name || user?.email || 'Requester',
    actionOwner: 'Safety Officer',
    nextAction: 'Review',
    schemaVersion: DRILL_FORM_SCHEMA_VERSION,
    reportDate: value.reportDate,
    reportTime: value.reportTime,
    reportIssuanceDate: value.reportIssuanceDate,
    weather: value.weather,
    incidentType: value.incidentType.trim(),
    exerciseCategories: value.exerciseCategories,
    location: value.location.trim(),
    exerciseTitle: value.exerciseTitle.trim(),
    details: value.details.trim(),
    exerciseObjectives: value.exerciseObjectives
      .map((row) => ({ text: String(row?.text ?? '').trim() }))
      .filter((row) => row.text),
    erpReferences: value.erpReferences
      .map((row) => ({
        annexNumber: String(row?.annexNumber ?? '').trim(),
        title: String(row?.title ?? '').trim(),
      }))
      .filter((row) => row.annexNumber || row.title),
    summary: value.summary.trim(),
    respondingTeam: {
      name: value.respondingTeamName.trim(),
      shift: value.respondingTeamShift.trim(),
      attendance: value.respondingAttendance
        .filter((row) => row?.present !== false)
        .map((row) => ({
          memberId: String(row?.memberId ?? '').trim(),
          name: String(row?.name ?? '').trim(),
          role: String(row?.role ?? '').trim(),
          exerciseRole: String(row?.exerciseRole ?? '').trim(),
          teamName: String(row?.teamName ?? '').trim(),
          source: String(row?.source ?? '').trim(),
        }))
        .filter((row) => row.name || row.memberId),
    },
    chronology: value.chronology
      .filter((row) => row.time || row.action)
      .map((row) => ({ time: row.time, action: row.action.trim() })),
    postIncidentAnalysis: {
      strengths: compactRows(analysis.strengths),
      resourcesMobilised: compactRows(analysis.resourcesMobilised),
      improvementOpportunities: compactRows(analysis.improvementOpportunities),
      photos: analysis.photos.map((photo) => ({
        ...photo,
        id: String(photo?.id ?? '').trim(),
        mediaId: String(photo?.mediaId ?? photo?.media_id ?? '').trim(),
        fileName: String(photo?.fileName ?? photo?.file_name ?? '').trim(),
        url: String(photo?.url ?? '').trim(),
        thumbnailUrl: String(photo?.thumbnailUrl ?? photo?.thumbnail_url ?? '').trim(),
        mimeType: String(photo?.mimeType ?? photo?.mime_type ?? '').trim(),
        sizeBytes: Number(photo?.sizeBytes ?? photo?.size_bytes ?? 0) || 0,
        width: Number(photo?.width ?? 0) || 0,
        height: Number(photo?.height ?? 0) || 0,
        description: String(photo?.description ?? '').trim(),
      })),
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
