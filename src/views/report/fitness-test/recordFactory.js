import { createReportIdentity, uid } from '../utils'
import {
  flattenFitnessParticipants,
  getFitnessCompletionSummary,
  normalizeFitnessTestForm,
} from './fitnessFormDomain'

export const buildFitnessTestRecord = ({
  form,
  reportTypeSlug,
  reportTypeIdPrefix,
  user,
  nowIso = new Date().toISOString(),
  sequence,
}) => {
  const normalized = normalizeFitnessTestForm(form)
  const { id, displayId } = createReportIdentity(reportTypeIdPrefix, nowIso, sequence)
  const completion = getFitnessCompletionSummary(normalized)

  return {
    id,
    displayId,
    reportType: reportTypeSlug || 'fitness-test',
    schemaVersion: 1,
    fitnessSchemaVersion: normalized.fitnessSchemaVersion,
    submissionKey: normalized.submissionKey,
    status: 'Submitted',
    ownerUserId: String(user?.id || '').trim(),
    submittedAt: nowIso,
    submittedBy: user?.name || user?.email || 'Requester',
    actionOwner: 'Training Coordinator',
    nextAction: 'Review',
    reportingMonth: normalized.reportingMonth,
    documentReference: normalized.documentReference,
    protocolRevision: normalized.protocolRevision,
    shiftGroups: normalized.shiftGroups,
    notes: normalized.notes,
    photos: normalized.photos,
    completion,
    // Compatibility fields keep the v1 API usable while persistence/export adopts v2.
    reportDate: `${normalized.reportingMonth}-01`,
    reportTime: '00:00',
    weather: 'Routine',
    incidentType: 'Physical Test Report',
    location: 'VMECC',
    details: `${completion.participants} personnel assessed across ${normalized.shiftGroups.length} shift group(s).`,
    summary: `${completion.passedAssessments} passed, ${completion.failedAssessments} failed, ${completion.incompleteAssessments} incomplete assessments.`,
    chronology: [
      {
        time: '00:00',
        action: `Monthly physical and proficiency results recorded for ${normalized.reportingMonth}.`,
      },
    ],
    participants: flattenFitnessParticipants(normalized),
    timeline: [
      {
        id: `t-${uid()}`,
        action: 'Submitted',
        by: user?.name || user?.email || 'Requester',
        at: nowIso,
        remarks: 'Physical test report submitted.',
      },
    ],
  }
}
