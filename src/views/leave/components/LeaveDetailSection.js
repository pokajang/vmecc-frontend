import React from 'react'
import { CBadge, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'

const resolveLeaveGates = (record) => {
  const requireRecommendation = record?.workflowSnapshot?.requireRecommendation !== false
  return [
    { action: 'Reviewed', label: 'Reviewed' },
    ...(requireRecommendation ? [{ action: 'Recommended', label: 'Recommended' }] : []),
    { action: 'Approved', label: 'Approved' },
  ]
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
                  label: 'Next Action',
                  value: selectedRecordPendingActionHint ? (
                    <span className="fw-semibold">{selectedRecordPendingActionHint}</span>
                  ) : (
                    '-'
                  ),
                },
                { label: 'Applied On', value: formatDate(selectedRecord.appliedAt) },
                { label: 'Coverage By', value: selectedRecord.coverBy || '-' },
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
        </CCol>
      </CRow>
    )}
  </>
)

export default LeaveDetailSection
