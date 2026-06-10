import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import ApprovalGates from 'src/components/ApprovalGates'

const resolveLeaveGates = (record) => {
  const requireRecommendation = record?.workflowSnapshot?.requireRecommendation !== false
  return [
    { action: 'Reviewed', label: 'Reviewed' },
    ...(requireRecommendation ? [{ action: 'Recommended', label: 'Recommended' }] : []),
    { action: 'Approved', label: 'Approved' },
  ]
}
import { formatDate, getDateRangeLabel } from '../utils'

const RecordDetailCard = ({
  selectedRecord,
  statusColorMap,
  onBackToRecords,
  onCopyLeaveId,
  onDownloadAttachment,
  onApproveLeave,
  onRejectLeave,
  getReviewActionConfig,
}) => {
  const reviewActionConfig =
    selectedRecord && typeof getReviewActionConfig === 'function'
      ? getReviewActionConfig(selectedRecord)
      : {
          approveLabel: 'Approve',
          approveDisabled: selectedRecord?.status !== 'Pending',
          rejectDisabled: selectedRecord?.status !== 'Pending',
        }

  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center gap-2">
        <div>
          <div className="fw-semibold">{selectedRecord?.id || 'Leave Record'}</div>
          <div className="text-body-secondary small">
            Leave request detail and approval controls
          </div>
        </div>
        <CButton color="light" onClick={onBackToRecords}>
          Back to records
        </CButton>
      </CCardHeader>
      <CCardBody>
        {!selectedRecord ? (
          <div className="text-danger">Leave record not found.</div>
        ) : (
          <CRow className="g-4">
            <CCol md={7}>
              <div className="rounded-3 shadow-sm overflow-hidden bg-white h-100">
                <CTable align="middle" className="mb-0">
                  <CTableBody>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Leave ID</CTableHeaderCell>
                      <CTableDataCell>{selectedRecord.id}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Employee</CTableHeaderCell>
                      <CTableDataCell>{selectedRecord.employee || '-'}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Team</CTableHeaderCell>
                      <CTableDataCell>{selectedRecord.team || '-'}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Leave Type</CTableHeaderCell>
                      <CTableDataCell>{selectedRecord.leaveType}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Period</CTableHeaderCell>
                      <CTableDataCell>{getDateRangeLabel(selectedRecord)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Days</CTableHeaderCell>
                      <CTableDataCell>{selectedRecord.days}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Status</CTableHeaderCell>
                      <CTableDataCell>
                        <ApprovalGates
                          gates={resolveLeaveGates(selectedRecord)}
                          approvalHistory={selectedRecord.approvalHistory}
                          isCancelled={selectedRecord.status === 'Cancelled'}
                          direction="horizontal"
                        />
                      </CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Applied On</CTableHeaderCell>
                      <CTableDataCell>{formatDate(selectedRecord.appliedAt)}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Coverage By</CTableHeaderCell>
                      <CTableDataCell>{selectedRecord.coverBy || '-'}</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Reason</CTableHeaderCell>
                      <CTableDataCell>{selectedRecord.reason || '-'}</CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </div>
            </CCol>
            <CCol md={5}>
              <CCard className="h-100">
                <CCardHeader>Actions</CCardHeader>
                <CCardBody className="d-grid gap-2">
                  <CButton color="light" onClick={() => onCopyLeaveId(selectedRecord)}>
                    Copy leave ID
                  </CButton>
                  <CButton
                    color="light"
                    onClick={() => onDownloadAttachment(selectedRecord)}
                    disabled={!selectedRecord.attachmentAvailable}
                  >
                    {selectedRecord.attachmentAvailable ? 'Download attachment' : 'No attachment'}
                  </CButton>
                  {selectedRecord.status === 'Pending' && (
                    <>
                      <CButton
                        color="success"
                        onClick={() => onApproveLeave(selectedRecord)}
                        disabled={reviewActionConfig?.approveDisabled}
                      >
                        {reviewActionConfig?.approveLabel || 'Approve'}
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        onClick={() => onRejectLeave(selectedRecord)}
                        disabled={reviewActionConfig?.rejectDisabled}
                      >
                        Reject request
                      </CButton>
                    </>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        )}
      </CCardBody>
    </CCard>
  )
}

export default RecordDetailCard
