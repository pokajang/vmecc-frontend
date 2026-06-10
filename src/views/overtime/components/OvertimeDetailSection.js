import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'
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
}) => (
  <>
    <div className="mb-3">
      <BackButton onClick={onBack} label="Back" />
    </div>
    {!selectedRecord ? (
      <div className="text-danger">Overtime record not found.</div>
    ) : (
      <CRow className="g-4">
        <CCol xs={12} md={6}>
          <CCard className="h-100">
            <CCardHeader>Overtime Details</CCardHeader>
            <CCardBody>
              {[
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
                { label: 'Next Action', value: selectedRecordPendingActionHint || '-' },
                { label: 'Applied On', value: formatDate(selectedRecord.appliedAt) },
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
        </CCol>
      </CRow>
    )}
  </>
)

export default OvertimeDetailSection
