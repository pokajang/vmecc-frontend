import React from 'react'
import { CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'
import { buildApiUrl } from 'src/services/apiClient'

const resolveLeaveGates = (record) => {
  const requireRecommendation = record?.workflowSnapshot?.requireRecommendation !== false
  return [
    { action: 'Reviewed', label: 'Reviewed' },
    ...(requireRecommendation ? [{ action: 'Recommended', label: 'Recommended' }] : []),
    { action: 'Approved', label: 'Approved' },
  ]
}

const formatRosterImpact = (record) => {
  const items = record?.rosterImpactSnapshot?.items
  if (!Array.isArray(items) || items.length === 0) return '-'
  return items
    .map((item) => `${item.shift_label || item.shift} shift, ${item.team_name}, ${item.date}`)
    .join('; ')
}

const LeaveDetailSection = ({
  selectedRecord,
  selectedRecordPendingActionHint,
  selectedRecordHistoryEntries = [],
  onBack,
  getDisplayLeaveId,
  getScheduleLabel,
  getStatusBadge,
  formatDate,
  formatDateTime,
  canEdit = false,
  canCancel = false,
  canDelete = false,
  onEdit,
  onCancel,
  onDelete,
}) => (
  <>
    <div className="mb-3">
      <BackButton onClick={onBack} label="Back" />
    </div>
    {!selectedRecord ? (
      <div className="text-danger">Leave record not found.</div>
    ) : (
      <CRow className="g-4">
        <CCol xs={12} md={6}>
          <CCard className="h-100">
            <CCardHeader>Leave Details</CCardHeader>
            <CCardBody>
              {[
                { label: 'Leave ID', value: getDisplayLeaveId(selectedRecord) },
                { label: 'Leave Type', value: selectedRecord.leaveType || '-' },
                { label: 'Schedule', value: getScheduleLabel(selectedRecord) },
                { label: 'Days', value: selectedRecord.days },
                {
                  label: 'Current Status',
                  value: getStatusBadge ? (
                    getStatusBadge(selectedRecord.status || '-', selectedRecord.status || '-')
                  ) : (
                    <CBadge color="secondary">{selectedRecord.status || '-'}</CBadge>
                  ),
                },
                {
                  label: 'Current Action Owner',
                  value: selectedRecord.nextActionRole || '-',
                },
                {
                  label: 'Workflow Scope',
                  value: selectedRecord.workflowTeamName || 'Organization-wide',
                },
                {
                  label: 'Applicant Role',
                  value: selectedRecord.workflowApplicantRole || '-',
                },
                {
                  label: 'Next Action',
                  value: selectedRecordPendingActionHint ? (
                    <span className="fw-semibold">{selectedRecordPendingActionHint}</span>
                  ) : (
                    '-'
                  ),
                },
                { label: 'Applied On', value: formatDate(selectedRecord.appliedAt) },
                { label: 'Coverage By', value: selectedRecord.coverBy || '-' },
                { label: 'Roster Impact', value: formatRosterImpact(selectedRecord) },
                {
                  label: 'Evidence',
                  value: selectedRecord.attachmentAvailable ? (
                    <a
                      href={buildApiUrl(`/leave/attachments/${selectedRecord.attachmentId}`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedRecord.attachmentName || 'View attachment'}
                    </a>
                  ) : (
                    '-'
                  ),
                },
                { label: 'Reason', value: selectedRecord.reason || '-' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="d-flex justify-content-between align-items-start gap-3 py-2"
                >
                  <div className="text-body-secondary">{item.label}</div>
                  <div className="text-end text-break">{item.value}</div>
                </div>
              ))}
              <div className="d-flex justify-content-between align-items-start gap-3 py-2">
                <div className="text-body-secondary">Status</div>
                <div className="text-end">
                  <ApprovalGates
                    gates={resolveLeaveGates(selectedRecord)}
                    approvalHistory={selectedRecord.approvalHistory}
                    isCancelled={selectedRecord.status === 'Cancelled'}
                    direction="horizontal"
                  />
                </div>
              </div>
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
          <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-3">
            <CButton
              color="primary"
              variant="outline"
              data-testid="leave-edit-action"
              disabled={!canEdit}
              onClick={() => onEdit?.(selectedRecord)}
            >
              Edit
            </CButton>
            <CButton
              color="warning"
              variant="outline"
              data-testid="leave-cancel-action"
              disabled={!canCancel}
              onClick={() => onCancel?.(selectedRecord)}
            >
              Cancel
            </CButton>
            <CButton
              color="danger"
              variant="outline"
              data-testid="leave-delete-action"
              disabled={!canDelete}
              onClick={() => onDelete?.(selectedRecord)}
            >
              Delete
            </CButton>
          </div>
        </CCol>
      </CRow>
    )}
  </>
)

export default LeaveDetailSection
