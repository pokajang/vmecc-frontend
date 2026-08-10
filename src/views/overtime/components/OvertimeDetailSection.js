import React from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'
import PageState from 'src/components/PageState'
import ResponsiveKeyValueList from 'src/components/workflow/ResponsiveKeyValueList'
import WorkflowDetailActions from 'src/components/workflow/WorkflowDetailActions'
import WorkflowDetailHeader from 'src/components/workflow/WorkflowDetailHeader'
import { downloadWorkflowAttachment } from 'src/services/apiClient'
import { formatDuration, getOvertimeTypeLabel, resolveOvertimeGates } from '../utils'

const OvertimeDetailSection = ({
  selectedRecord,
  selectedRecordPendingActionHint,
  selectedRecordHistoryEntries = [],
  onBack,
  getDisplayOvertimeId,
  getScheduleLabel,
  formatDate,
  formatDateTime,
  showGuidanceMetadata = false,
  canEdit = false,
  canCancel = false,
  canDelete = false,
  onEdit,
  onCancel,
  onDelete,
  showPageHeader = false,
  reviewerActions = null,
}) => (
  <>
    {showPageHeader ? (
      <WorkflowDetailHeader
        title={
          selectedRecord ? `Overtime ${getDisplayOvertimeId(selectedRecord)}` : 'Overtime Details'
        }
        subtitle={selectedRecordPendingActionHint || ''}
        status={selectedRecord?.status || ''}
        onBack={onBack}
        backLabel="Back to overtime"
      />
    ) : (
      <div className="mb-3">
        <BackButton onClick={onBack} label="Back" />
      </div>
    )}
    {!selectedRecord ? (
      <PageState variant="error" message="Overtime record not found." />
    ) : (
      <CRow className="g-4">
        <CCol xs={12} md={6}>
          <CCard className="h-100">
            <CCardHeader>Overtime Details</CCardHeader>
            <CCardBody>
              <ResponsiveKeyValueList
                items={[
                  { label: 'Overtime ID', value: getDisplayOvertimeId(selectedRecord) },
                  {
                    label: 'Overtime Type',
                    value: getOvertimeTypeLabel(selectedRecord.overtimeType),
                  },
                  { label: 'Claim Date', value: formatDate(selectedRecord.claimDate) },
                  { label: 'Time Window', value: getScheduleLabel(selectedRecord) },
                  { label: 'Duration', value: formatDuration(selectedRecord.durationMinutes) },
                  { label: 'Current Status', value: selectedRecord.status || '-' },
                  { label: 'Current Action Owner', value: selectedRecord.nextActionRole || '-' },
                  {
                    label: 'Workflow Scope',
                    value: selectedRecord.workflowTeamName || 'Organization-wide',
                  },
                  {
                    label: 'Applicant Role',
                    value: selectedRecord.workflowApplicantRole || '-',
                  },
                  { label: 'Next Action', value: selectedRecordPendingActionHint || '-' },
                  { label: 'Applied On', value: formatDate(selectedRecord.appliedAt) },
                  { label: 'Reason', value: selectedRecord.reason || '-' },
                  {
                    label: 'Evidence',
                    value: selectedRecord.attachment?.originalName ? (
                      <CButton
                        color="light"
                        size="sm"
                        className="workflow-attachment-action text-end"
                        aria-label={`Download evidence ${selectedRecord.attachment.originalName}`}
                        onClick={() => downloadWorkflowAttachment(selectedRecord.attachment.id)}
                      >
                        {selectedRecord.attachment.originalName}
                      </CButton>
                    ) : (
                      '-'
                    ),
                  },
                ]}
              />
              <div className="d-flex justify-content-between align-items-start gap-3 py-2">
                <div className="text-body-secondary">Status</div>
                <div className="text-end">
                  <ApprovalGates
                    gates={resolveOvertimeGates(selectedRecord)}
                    approvalHistory={selectedRecord.approvalHistory}
                    isCancelled={selectedRecord.status === 'Cancelled'}
                    direction="horizontal"
                  />
                </div>
              </div>
              {showGuidanceMetadata && selectedRecord?.guidance_meta ? (
                <div className="border rounded-3 p-2 mt-2 bg-light">
                  <div className="small text-body-secondary mb-1">Holiday Guidance</div>
                  <div className="small">
                    Recommended type:{' '}
                    <span className="fw-semibold">
                      {getOvertimeTypeLabel(selectedRecord?.guidance_meta?.derived_overtime_type)}
                    </span>
                  </div>
                  <div className="small">
                    Effective state:{' '}
                    <span className="fw-semibold">
                      {selectedRecord?.guidance_meta?.effective_state || 'National only'}
                    </span>
                  </div>
                  {selectedRecord?.guidance_meta?.overtime_type_adjusted_message ? (
                    <div className="small text-info-emphasis mt-1">
                      {selectedRecord.guidance_meta.overtime_type_adjusted_message}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} md={6}>
          <AuditHistoryPanel
            title="Workflow Progress"
            entries={selectedRecordHistoryEntries}
            emptyMessage="No workflow activity yet."
            formatDateTime={formatDateTime}
          />
          {reviewerActions &&
          (!reviewerActions.primaryDisabled ||
            !reviewerActions.rejectDisabled ||
            !reviewerActions.correctionDisabled) ? (
            <WorkflowDetailActions
              className="mt-3"
              statusMessage={reviewerActions.statusMessage}
              ariaLabel="Overtime review actions"
            >
              {!reviewerActions.correctionDisabled ? (
                <CButton
                  color="secondary"
                  variant="outline"
                  onClick={() => reviewerActions.onCorrection?.(selectedRecord)}
                >
                  Request correction
                </CButton>
              ) : null}
              {!reviewerActions.rejectDisabled ? (
                <CButton
                  color="danger"
                  variant="outline"
                  onClick={() => reviewerActions.onReject?.(selectedRecord)}
                >
                  Reject
                </CButton>
              ) : null}
              {!reviewerActions.primaryDisabled ? (
                <CButton
                  color="primary"
                  onClick={() => reviewerActions.onPrimary?.(selectedRecord)}
                >
                  {reviewerActions.primaryLabel || 'Approve'}
                </CButton>
              ) : null}
            </WorkflowDetailActions>
          ) : canEdit || canCancel || canDelete ? (
            <WorkflowDetailActions
              className="mt-3"
              statusMessage={selectedRecordPendingActionHint}
              ariaLabel="Overtime applicant actions"
            >
              {canEdit ? (
                <CButton
                  color="primary"
                  variant="outline"
                  data-testid="overtime-edit-action"
                  onClick={() => onEdit?.(selectedRecord)}
                >
                  Edit
                </CButton>
              ) : null}
              {canCancel ? (
                <CButton
                  color="warning"
                  variant="outline"
                  data-testid="overtime-cancel-action"
                  onClick={() => onCancel?.(selectedRecord)}
                >
                  Cancel
                </CButton>
              ) : null}
              {canDelete ? (
                <CButton
                  color="danger"
                  variant="outline"
                  data-testid="overtime-delete-action"
                  onClick={() => onDelete?.(selectedRecord)}
                >
                  Delete
                </CButton>
              ) : null}
            </WorkflowDetailActions>
          ) : null}
        </CCol>
      </CRow>
    )}
  </>
)

export default OvertimeDetailSection
