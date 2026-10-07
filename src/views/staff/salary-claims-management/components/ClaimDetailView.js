import React from 'react'
import { CAlert, CButton } from '@coreui/react'
import { Download, X } from 'lucide-react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'
import CreateActionButton from 'src/components/CreateActionButton'
import PageState from 'src/components/PageState'
import RecordDetailSummary from 'src/components/report-workflow/RecordDetailSummary'
import ResponsiveKeyValueList from 'src/components/workflow/ResponsiveKeyValueList'
import WorkflowDetailActions from 'src/components/workflow/WorkflowDetailActions'
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
  const renderWorkflowActions = () => (
    <WorkflowDetailActions
      statusMessage={
        claimWorkflowState.pending
          ? claimWorkflowState.canRespond
            ? `You can ${claimWorkflowState.approveActionLabel.toLowerCase()} this claim.`
            : claimWorkflowState.nextRole
              ? `Pending ${claimWorkflowState.stageLabel} by ${claimWorkflowState.nextRole}.`
              : `Pending ${claimWorkflowState.stageLabel}.`
          : 'Workflow completed.'
      }
    >
      <CButton
        color="light"
        className="icon-label-action"
        onClick={() => onTriggerClaimAction(selectedClaim, selectedClaimActions.download.key)}
        disabled={selectedClaimActions.download.disabled}
      >
        <Download size={14} aria-hidden="true" />
        {selectedClaimActions.download.label}
      </CButton>
      {!selectedClaimActions.reject.disabled ? (
        <CButton
          color="danger"
          variant="outline"
          onClick={() => onTriggerClaimAction(selectedClaim, selectedClaimActions.reject.key)}
        >
          {selectedClaimActions.reject.label}
        </CButton>
      ) : null}
      {!selectedClaimActions.primaryWorkflowAction.disabled ? (
        <CButton
          color="primary"
          onClick={() =>
            onTriggerClaimAction(selectedClaim, selectedClaimActions.primaryWorkflowAction.key)
          }
        >
          {selectedClaimActions.primaryWorkflowAction.label}
        </CButton>
      ) : null}
    </WorkflowDetailActions>
  )

  return (
    <div
      className="inspection-detail-section d-grid gap-4"
      data-testid="salary-claims-management-detail"
    >
      <RecordDetailSummary
        title={selectedClaim ? `${selectedClaimTypeMeta.label} Claim` : 'Claim Details'}
        status={selectedClaim?.status}
        context={selectedClaim?.period || ''}
        metadata={[
          selectedClaim?.id,
          selectedClaim?.submittedAt ? `Submitted ${formatDate(selectedClaim.submittedAt)}` : '',
        ]}
        nextAction={claimWorkflowState?.nextRole || ''}
        statusColor={statusColorMap?.[selectedClaim?.status] || 'secondary'}
        actions={
          <div className="d-flex align-items-start gap-2">
            {selectedClaim ? (
              <div className="d-none d-md-block">{renderWorkflowActions()}</div>
            ) : null}
            <BackButton onClick={onBack} label="Back to claims" />
          </div>
        }
      />

      {!selectedClaim ? (
        <PageState variant="error" message="Claim record not found." />
      ) : (
        <>
          {isSalaryClaim && selectedClaim?.salaryContractIncomplete === true && (
            <CAlert color="warning" className="mb-0">
              Salary breakdown is unavailable because required details are missing
              {Array.isArray(selectedClaim?.salaryContractMissingFields) &&
              selectedClaim.salaryContractMissingFields.length > 0
                ? ` (missing: ${selectedClaim.salaryContractMissingFields.join(', ')}).`
                : '.'}{' '}
              Workflow actions remain available when the current stage allows them.
            </CAlert>
          )}

          {isSalaryClaim && selectedClaim?.salaryContractIncomplete !== true ? (
            <SalaryClaimReadonlyView
              key={`${selectedClaim.userId || selectedClaim.ownerId || selectedClaim.employeeId || 'unknown'}::${selectedClaim.id || 'unknown'}`}
              claim={selectedClaim}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ) : !isSalaryClaim ? (
            <>
              <section className="inspection-form-section d-grid gap-3">
                <div className="fw-semibold text-muted">Saved claim items</div>
                <div className="d-grid gap-2">
                  {submittedClaimItems.map((item) => (
                    <div
                      key={item.id}
                      className={`workflow-detail-list-item d-flex align-items-start gap-3 pb-3 ${
                        selectedClaimItem?.id === item.id ? 'bg-light rounded px-2 pt-2' : ''
                      }`}
                    >
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-center flex-wrap gap-2">
                          <CButton
                            type="button"
                            color="link"
                            className="workflow-item-action p-0 text-start fw-semibold text-decoration-none"
                            aria-label={`Open claim item ${item.title || item.id}`}
                            onClick={() => onSelectClaimItem(item.id)}
                          >
                            {item.title}
                          </CButton>
                          {item.date ? (
                            <span className="small text-body-secondary">
                              {formatDate(item.date)}
                            </span>
                          ) : null}
                        </div>
                        <div className="small text-body-secondary mt-1 d-flex align-items-center flex-wrap gap-2">
                          <span>{item.note || 'No additional notes for this item.'}</span>
                          {item.attachmentName ? (
                            <CButton
                              color="light"
                              size="sm"
                              className="workflow-attachment-action text-body-secondary"
                              aria-label={`Preview ${item.attachmentName}`}
                              onClick={() =>
                                onOpenAttachmentPreview(item.attachmentName, item, 'item-list')
                              }
                            >
                              {truncateAttachmentLabel(item.attachmentName)}
                            </CButton>
                          ) : null}
                        </div>
                      </div>
                      <div className="fw-semibold text-nowrap">{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-1 d-flex justify-content-between align-items-center gap-3">
                  <span className="fw-semibold">{submittedTotalLabel}</span>
                  <span className="h5 mb-0 text-nowrap">{submittedDisplayTotal}</span>
                </div>
              </section>

              {isItemDetailsVisible ? (
                <section className="inspection-form-section d-grid gap-3">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <div className="fw-semibold text-muted">Item details</div>
                    <CreateActionButton
                      label="Close"
                      onClick={onCloseItemDetails}
                      icon={<X size={13} />}
                    />
                  </div>
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
                            <CButton
                              color="light"
                              size="sm"
                              className="workflow-attachment-action text-body-secondary"
                              aria-label={`Preview ${selectedClaimItem.attachmentName}`}
                              onClick={() =>
                                onOpenAttachmentPreview(
                                  selectedClaimItem.attachmentName,
                                  selectedClaimItem,
                                  'item-details',
                                )
                              }
                            >
                              {truncateAttachmentLabel(selectedClaimItem.attachmentName)}
                            </CButton>,
                          )
                        }
                        return renderItemDetailsField(key, entry.label, entry.value)
                      })}
                    </div>
                  )}
                </section>
              ) : null}
            </>
          ) : null}

          <section className="inspection-form-section d-grid gap-3">
            <div className="fw-semibold text-muted">Workflow progress</div>
            <ApprovalGates
              gates={CLAIM_GATES}
              approvalHistory={selectedClaim.approvalHistory}
              isCancelled={selectedClaim.status === 'Cancelled'}
              direction="horizontal"
            />
            <ResponsiveKeyValueList
              compact
              items={[
                {
                  key: 'owner',
                  label: 'Current Action Owner',
                  value: claimWorkflowState.nextRole || '-',
                },
                {
                  key: 'action',
                  label: 'Next Action',
                  value: claimWorkflowState.stageLabel || '-',
                },
              ]}
            />
            <AuditHistoryPanel
              title="Activity"
              entries={claimHistoryEntries}
              emptyMessage="No workflow activity yet."
              formatDateTime={formatDateTime}
              compact
            />
          </section>

          <div className="d-md-none">{renderWorkflowActions()}</div>
        </>
      )}
    </div>
  )
}

export default ClaimDetailView
