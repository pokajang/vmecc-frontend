import React from 'react'
import { CBadge } from '@coreui/react'
import ApprovalGates from 'src/components/ApprovalGates'
import AuditHistoryPanel from 'src/components/AuditHistoryPanel'
import BackButton from 'src/components/BackButton'
import PageState from 'src/components/PageState'
import { buildClaimHistoryEntries } from 'src/components/auditHistory'
import RecordDetailActions from 'src/components/report-workflow/RecordDetailActions'
import RecordDetailSummary from 'src/components/report-workflow/RecordDetailSummary'
import SalaryClaimReadonlyView from './SalaryClaimReadonlyView'
import { getClaimStatusColor } from '../payrollUtils'

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
  onCancelClaim,
  onDeleteClaim,
  canCancelClaim = false,
  canDeleteClaim = false,
  showHeaderBack = true,
  isLoading = false,
}) => {
  const isSalaryClaim = selectedClaim?.type === 'salary'
  const claimTitle = /\bclaim$/i.test(String(selectedClaimTypeMeta?.label || '').trim())
    ? selectedClaimTypeMeta.label
    : `${selectedClaimTypeMeta?.label || 'Claim'} Claim`
  const renderClaimActions = (mode) => (
    <RecordDetailActions
      record={selectedClaim}
      mode={mode}
      ariaLabel="Claim actions"
      testAnchorPrefix="payroll-claim"
      handlers={{
        download: onDownloadClaim,
        edit: onEditClaim,
        cancel: onCancelClaim,
        delete: onDeleteClaim,
      }}
      fallbackCapabilities={{
        download: true,
        edit: canEditSubmittedClaim,
        cancel: canCancelClaim,
        delete: canDeleteClaim,
      }}
    />
  )
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
    <div
      className="inspection-detail-section inspection-form-sections d-grid gap-4"
      data-testid="payroll-claim-detail"
    >
      {!selectedClaim ? (
        <>
          {showHeaderBack ? <BackButton to="/payroll" /> : null}
          {isLoading ? (
            <PageState variant="loading" message="Loading claim record..." />
          ) : (
            <PageState variant="error" message="Claim record not found." />
          )}
        </>
      ) : (
        <>
          <RecordDetailSummary
            title={claimTitle}
            status={selectedClaim.status || ''}
            statusColor={getClaimStatusColor(selectedClaim.status)}
            context={selectedClaim.period || '-'}
            metadata={[
              selectedClaim.id,
              selectedClaim.submittedAt ? `Submitted ${formatDate(selectedClaim.submittedAt)}` : '',
            ]}
            actions={
              <div className="d-flex align-items-center gap-2">
                {showHeaderBack ? <BackButton to="/payroll" /> : null}
                {renderClaimActions('desktop')}
              </div>
            }
          />
          {isSalaryClaim ? (
            <SalaryClaimReadonlyView
              key={`${selectedClaim.userId || selectedClaim.ownerId || selectedClaim.employeeId || 'unknown'}::${selectedClaim.id || 'unknown'}`}
              claim={selectedClaim}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ) : (
            <section className="inspection-form-section d-grid gap-3">
              <div className="fw-semibold text-muted">Saved claim items</div>
              <div className="d-grid gap-3">
                <div className="d-grid gap-2">
                  {submittedClaimItems.map((item) => (
                    <div
                      key={item.id}
                      className="workflow-detail-list-item d-flex align-items-start gap-3 pb-3"
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
              </div>
            </section>
          )}

          {selectedClaim.status ? (
            <section className="inspection-form-section d-grid gap-3">
              <div className="fw-semibold text-muted">Workflow progress</div>
              <ApprovalGates
                gates={CLAIM_GATES}
                approvalHistory={selectedClaim.approvalHistory}
                isCancelled={selectedClaim.status === 'Cancelled'}
                direction="horizontal"
              />
              <AuditHistoryPanel
                title="Activity"
                entries={claimHistoryEntries}
                emptyMessage="No workflow activity yet."
                formatDateTime={formatDate}
                compact
              />
            </section>
          ) : null}

          {renderClaimActions('mobile')}
        </>
      )}
    </div>
  )
}

export default ClaimDetailSection
