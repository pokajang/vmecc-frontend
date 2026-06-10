import { createReportIdentity, uid } from '../utils'

export const buildFitnessTestRecord = ({
  form,
  reportTypeSlug,
  reportTypeIdPrefix,
  user,
  nowIso = new Date().toISOString(),
  sequence,
}) => {
  const { id, displayId } = createReportIdentity(reportTypeIdPrefix, nowIso, sequence)

  return {
    id,
    displayId,
    reportType: reportTypeSlug || 'fitness-test',
    status: 'Submitted',
    actionOwner: 'Training Coordinator',
    nextAction: 'Review',
    reportDate: form.reportDate,
    reportTime: form.reportTime,
    weather: form.weather,
    incidentType: form.incidentType,
    location: form.location.trim(),
    details: form.details.trim(),
    summary: form.summary.trim(),
    chronology: form.chronology
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
