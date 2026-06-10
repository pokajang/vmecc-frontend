import React from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { Calendar, Download, X } from 'lucide-react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'
import CreateActionButton from 'src/components/CreateActionButton'
import SalaryClaimReadonlyView from '../../../payroll/components/SalaryClaimReadonlyView'

const CLAIM_GATES = [
  { action: 'Checked', label: 'Checked' },
  { action: 'Reviewed', label: 'Reviewed' },
  { action: 'Approved', label: 'Approved' },
]

const ClaimDetailView = ({ vm, handlers }) => {
  const {
    selectedClaim,
    selectedClaimTypeMeta,
    statusColorMap,
    submittedClaimItems,
    selectedClaimItem,
    isItemDetailsVisible,
    selectedClaimItemDetails,
    submittedTotalLabel,
    submittedDisplayTotal,
    claimHistoryEntries,
    claimWorkflowState,
    selectedClaimActions,
    truncateAttachmentLabel,
    formatDate,
    formatDateTime,
    formatCurrency,
  } = vm
  const {
    onBack,
    onSelectClaimItem,
    onCloseItemDetails,
    onOpenAttachmentPreview,
    onTriggerClaimAction,
    renderItemDetailsField,
  } = handlers
  const isSalaryClaim = selectedClaim?.type === 'salary'

  return (
    <div className="d-grid gap-3">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <BackButton onClick={onBack} label="Back to claims" />
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

          {isSalaryClaim && selectedClaim?.salaryContractIncomplete === true && (
            <CAlert color="warning" className="mb-0">
              Salary financial breakdown is unavailable because backend returned incomplete salary
              contract data
              {Array.isArray(selectedClaim?.salaryContractMissingFields) &&
              selectedClaim.salaryContractMissingFields.length > 0
                ? ` (missing: ${selectedClaim.salaryContractMissingFields.join(', ')}).`
                : '.'}{' '}
              Workflow actions remain available when the current stage allows them.
            </CAlert>
          )}

          {isSalaryClaim && selectedClaim?.salaryContractIncomplete !== true ? (
            <SalaryClaimReadonlyView
              claim={selectedClaim}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ) : !isSalaryClaim ? (
            <CRow className="g-3">
              <CCol xs={12} md={isItemDetailsVisible ? 6 : 12}>
                <CCard>
                  <CCardHeader>Saved Claim Items</CCardHeader>
                  <CCardBody className="d-grid gap-3">
                    <div className="d-grid gap-2">
                      {submittedClaimItems.map((item) => (
                        <div
                          key={item.id}
                          className={`d-flex align-items-start gap-3 border-bottom pb-3 ${
                            selectedClaimItem?.id === item.id ? 'bg-light rounded px-2 pt-2' : ''
                          }`}
                          role="button"
                          style={{ cursor: 'pointer' }}
                          onClick={() => onSelectClaimItem(item.id)}
                        >
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center flex-wrap gap-2">
                              <span className="fw-semibold">{item.title}</span>
                              {item.date && (
                                <span className="small text-body-secondary">
                                  {formatDate(item.date)}
                                </span>
                              )}
                            </div>
                            <div className="small text-body-secondary mt-1 d-flex align-items-center flex-wrap gap-2">
                              <span>{item.note || 'No additional notes for this item.'}</span>
                              {item.attachmentName && (
                                <CBadge
                                  color="light"
                                  className="text-body-secondary"
                                  style={{ cursor: 'pointer' }}
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    onOpenAttachmentPreview(item.attachmentName, item, 'item-list')
                                  }}
                                >
                                  {truncateAttachmentLabel(item.attachmentName)}
                                </CBadge>
                              )}
                            </div>
                          </div>
                          <div className="fw-semibold text-nowrap">
                            {formatCurrency(item.amount)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1 d-flex justify-content-between align-items-center">
                      <span className="fw-semibold">{submittedTotalLabel}</span>
                      <span className="h5 mb-0">{submittedDisplayTotal}</span>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
              {isItemDetailsVisible && (
                <CCol xs={12} md={6}>
                  <CCard className="h-100">
                    <CCardHeader className="d-flex justify-content-between align-items-center">
                      <span>Item Details</span>
                      <CreateActionButton
                        label="Close"
                        onClick={onCloseItemDetails}
                        icon={<X size={13} className="me-1 align-text-bottom" />}
                      />
                    </CCardHeader>
                    <CCardBody>
                      {!selectedClaimItem ? (
                        <div className="text-body-secondary">Select an item to view details.</div>
                      ) : (
                        <div className="d-grid">
                          {selectedClaimItemDetails.map((entry, index) => {
                            const key = `${entry.label}-${index}`
                            if (entry.label === 'Attachment' && selectedClaimItem.attachmentName) {
                              return renderItemDetailsField(
                                key,
                                'Attachment',
                                <CBadge
                                  color="light"
                                  className="text-body-secondary"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() =>
                                    onOpenAttachmentPreview(
                                      selectedClaimItem.attachmentName,
                                      selectedClaimItem,
                                      'item-details',
                                    )
                                  }
                                >
                                  {truncateAttachmentLabel(selectedClaimItem.attachmentName)}
                                </CBadge>,
                              )
                            }
                            return renderItemDetailsField(key, entry.label, entry.value)
                          })}
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>
              )}
            </CRow>
          ) : null}

          <CCard>
            <CCardHeader>Workflow State</CCardHeader>
            <CCardBody>
              <div className="d-grid gap-1">
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <span className="text-body-secondary">Current Status</span>
                  <span className="text-end">{selectedClaim.status || '-'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <span className="text-body-secondary">Current Action Owner</span>
                  <span className="text-end">{claimWorkflowState.nextRole || '-'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <span className="text-body-secondary">Next Action</span>
                  <span className="text-end">{claimWorkflowState.stageLabel || '-'}</span>
                </div>
              </div>
            </CCardBody>
          </CCard>

          <AuditHistoryPanel
            title="Claim History"
            entries={claimHistoryEntries}
            emptyMessage="No workflow activity yet."
            formatDateTime={formatDateTime}
          />

          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
            <div className="small text-body-secondary">
              {claimWorkflowState.pending
                ? claimWorkflowState.canRespond
                  ? `You can ${claimWorkflowState.approveActionLabel.toLowerCase()} this claim.`
                  : claimWorkflowState.nextRole
                    ? `Pending ${claimWorkflowState.stageLabel} by ${claimWorkflowState.nextRole}.`
                    : `Pending ${claimWorkflowState.stageLabel}.`
                : 'Workflow completed.'}
            </div>
            <div className="d-flex flex-column flex-md-row justify-content-end gap-2">
              <CButton
                color="light"
                onClick={() =>
                  onTriggerClaimAction(selectedClaim, selectedClaimActions.download.key)
                }
                disabled={selectedClaimActions.download.disabled}
              >
                <Download size={14} className="me-1 align-text-bottom" />
                {selectedClaimActions.download.label}
              </CButton>
              <CButton
                color="danger"
                variant="outline"
                onClick={() => onTriggerClaimAction(selectedClaim, selectedClaimActions.reject.key)}
                disabled={selectedClaimActions.reject.disabled}
              >
                {selectedClaimActions.reject.label}
              </CButton>
              <CButton
                color="primary"
                onClick={() =>
                  onTriggerClaimAction(
                    selectedClaim,
                    selectedClaimActions.primaryWorkflowAction.key,
                  )
                }
                disabled={selectedClaimActions.primaryWorkflowAction.disabled}
              >
                {selectedClaimActions.primaryWorkflowAction.label}
              </CButton>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ClaimDetailView
