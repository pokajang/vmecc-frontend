import React from 'react'
import { CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { Calendar, Download, Pencil } from 'lucide-react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'
import { buildClaimHistoryEntries } from 'src/components/auditHistory'
import SalaryClaimReadonlyView from './SalaryClaimReadonlyView'

const CLAIM_GATES = [
  { action: 'Checked', label: 'Checked' },
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Approved', label: 'Approved' },
]

const ClaimDetailSection = ({
  selectedClaim,
  selectedClaimTypeMeta,
  submittedClaimItems,
  submittedTotalLabel,
  submittedClaimTotalValue,
  formatCurrency,
  formatDate,
  canEditSubmittedClaim,
  lastUpdatedByLabel,
  approvedDateLabel,
  onDownloadClaim,
  onEditClaim,
}) => {
  const isSalaryClaim = selectedClaim?.type === 'salary'
  const claimHistoryEntries = selectedClaim
    ? [
        ...buildClaimHistoryEntries(selectedClaim),
        ...(selectedClaim?.updatedAt
          ? [
              {
                id: `${selectedClaim.id || 'claim'}-updated`,
                action: 'Updated',
                occurredAt: selectedClaim.updatedAt,
                actorName: lastUpdatedByLabel,
                targetLabel: selectedClaim.id,
              },
            ]
          : []),
        ...(approvedDateLabel && approvedDateLabel !== '-'
          ? [
              {
                id: `${selectedClaim.id || 'claim'}-approved`,
                action: 'Approved',
                occurredAt: approvedDateLabel,
                targetLabel: selectedClaim.id,
              },
            ]
          : []),
      ]
    : []
  return (
    <div className="d-grid gap-3">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <BackButton to="/payroll" label="Back to claims" />
        {selectedClaim?.status && (
          <ApprovalGates
            gates={CLAIM_GATES}
            approvalHistory={selectedClaim.approvalHistory}
            isCancelled={selectedClaim.status === 'Cancelled'}
            direction="horizontal"
          />
        )}
        {selectedClaim?.id && (
          <span className="text-body-secondary small">Claim ID: {selectedClaim.id}</span>
        )}
      </div>

      {!selectedClaim ? (
        <div className="text-danger">Claim record not found.</div>
      ) : (
        <>
          <CRow className="g-3">
            <CCol xs={6} md={4} lg={3}>
              <div className="h-100 rounded-3 border d-flex align-items-center gap-2 px-3 py-3 bg-white">
                {(() => {
                  const Icon = selectedClaimTypeMeta.icon
                  return (
                    <>
                      <div
                        className="rounded-circle d-inline-flex align-items-center justify-content-center bg-light text-primary"
                        style={{ width: 28, height: 28, flex: '0 0 28px' }}
                      >
                        <Icon size={14} />
                      </div>
                      <span className="fw-medium">{selectedClaimTypeMeta.label}</span>
                    </>
                  )
                })()}
              </div>
            </CCol>
            <CCol xs={6} md={4} lg={3}>
              <div className="h-100 rounded-3 border d-flex align-items-center gap-2 px-3 py-3 bg-white">
                <div
                  className="rounded-circle d-inline-flex align-items-center justify-content-center bg-light text-primary"
                  style={{ width: 28, height: 28, flex: '0 0 28px' }}
                >
                  <Calendar size={14} />
                </div>
                <span className="fw-medium">{selectedClaim.period || '-'}</span>
              </div>
            </CCol>
          </CRow>

          {isSalaryClaim ? (
            <SalaryClaimReadonlyView
              claim={selectedClaim}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ) : (
            <CCard>
              <CCardHeader>Saved Claim Items</CCardHeader>
              <CCardBody className="d-grid gap-3">
                <div className="d-grid gap-2">
                  {submittedClaimItems.map((item) => (
                    <div
                      key={item.id}
                      className="d-flex align-items-start gap-3 border-bottom pb-3"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center flex-wrap gap-2">
                          <span className="fw-semibold">{item.title}</span>
                          {item.date && (
                            <span className="small text-body-secondary">
                              {formatDate(item.date)}
                            </span>
                          )}
                          {item.attachmentName && (
                            <CBadge color="light" className="text-body-secondary">
                              {item.attachmentName.length > 18
                                ? `${item.attachmentName.slice(0, 12)}...${item.attachmentName.slice(-4)}`
                                : item.attachmentName}
                            </CBadge>
                          )}
                        </div>
                        <div className="small text-body-secondary mt-1">
                          {item.note || 'No additional notes for this item.'}
                        </div>
                      </div>
                      <div className="fw-semibold text-nowrap">{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-1 d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">{submittedTotalLabel}</span>
                  <span className="h5 mb-0">{formatCurrency(submittedClaimTotalValue)}</span>
                </div>
              </CCardBody>
            </CCard>
          )}

          <AuditHistoryPanel
            title="Claim History"
            entries={claimHistoryEntries}
            emptyMessage="No workflow activity yet."
            formatDateTime={formatDate}
          />

          <div className="d-flex flex-column flex-md-row justify-content-end gap-2">
            <CButton color="light" onClick={() => onDownloadClaim(selectedClaim)}>
              <Download size={14} className="me-1 align-text-bottom" />
              Download claim
            </CButton>
            <CButton
              color="primary"
              onClick={() => onEditClaim(selectedClaim)}
              disabled={!canEditSubmittedClaim}
            >
              <Pencil size={14} className="me-1 align-text-bottom" />
              Edit
            </CButton>
          </div>
        </>
      )}
    </div>
  )
}

export default ClaimDetailSection
