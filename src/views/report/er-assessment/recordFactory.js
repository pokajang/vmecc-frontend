import { createReportIdentity, createReportSubmissionKey } from '../utils'
import { getErAssessmentType } from './constants'
import { toSerializableErAssessmentForm } from './erAssessmentFormDomain'

export const buildErAssessmentRecord = ({
  form,
  user,
  idPrefix = 'ERA',
  sequence = 1,
  editingRecord = null,
  assessmentTypes,
}) => {
  const value = toSerializableErAssessmentForm(form, assessmentTypes)
  const type = getErAssessmentType(value.assessmentType, assessmentTypes)
  const now = new Date().toISOString()
  const identity = editingRecord || createReportIdentity(idPrefix, now, sequence)
  const actor = user?.name || user?.email || 'Requester'
  return {
    ...editingRecord,
    ...identity,
    ...value,
    reportType: 'er-assessment',
    incidentType: type?.label || '',
    assessmentTypeLabel: type?.label || '',
    worstCaseScenario: type?.worstCase || '',
    reportDate: value.assessmentDate,
    incidentDate: value.assessmentDate,
    details: value.scopeOfWork,
    description: value.scopeOfWork,
    summary: value.rescuePlan,
    status: 'Submitted',
    submissionKey: editingRecord?.submissionKey || createReportSubmissionKey('er-assessment'),
    createdAt: editingRecord?.createdAt || now,
    createdBy: editingRecord?.createdBy || actor,
    reportedBy: editingRecord?.reportedBy || actor,
    ownerUserId: editingRecord?.ownerUserId || user?.id || '',
  }
}
