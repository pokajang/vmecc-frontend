import React from 'react'
import { CButton, CButtonGroup } from '@coreui/react'
import BulkSelectionActionBar from 'src/components/BulkSelectionActionBar'
import BulkActionButton from 'src/views/staff/components/BulkActionButton'

const SummaryPreview = ({ summary, showTotal = false, totalLabel = 'Total payable' }) => {
  if (!summary?.count) return null

  return (
    <div className="small text-body-secondary d-grid gap-1">
      <div>
        {summary.count} eligible claim{summary.count === 1 ? '' : 's'}
        {showTotal && summary.totalLabel ? ` | ${totalLabel}: ${summary.totalLabel}` : ''}
      </div>
      <div className="d-flex flex-wrap gap-1">
        {summary.sampleItems.map((item) => (
          <span key={item.key} className="rounded-pill border bg-body px-2 py-1">
            {item.id} | {item.owner} | {item.period}
            {item.amount ? ` | ${item.amount}` : ''}
          </span>
        ))}
        {summary.remainingCount > 0 ? (
          <span className="rounded-pill border bg-body px-2 py-1">
            +{summary.remainingCount} more
          </span>
        ) : null}
      </div>
    </div>
  )
}

const SalaryBulkModeBar = ({
  totalSelectedCount = 0,
  intent = 'approval',
  onIntentChange = () => {},
  paymentMode = 'mark',
  onPaymentModeChange = () => {},
  workflowSummary,
  markPaidSummary,
  unmarkPaidSummary,
  onClear = () => {},
  onReject = () => {},
  onApprove = () => {},
  onMarkPaid = () => {},
  onUnmarkPaid = () => {},
}) => {
  const workflowAvailable = Boolean(workflowSummary?.count)
  const markAvailable = Boolean(markPaidSummary?.count)
  const unmarkAvailable = Boolean(unmarkPaidSummary?.count)
  const paymentAvailable = markAvailable || unmarkAvailable
  const activePaymentSummary = paymentMode === 'unmark' ? unmarkPaidSummary : markPaidSummary

  const controls = (
    <>
      {workflowAvailable && paymentAvailable ? (
        <CButtonGroup role="group" aria-label="Bulk action intent">
          <CButton
            size="sm"
            color={intent === 'approval' ? 'primary' : 'secondary'}
            variant={intent === 'approval' ? undefined : 'outline'}
            onClick={() => onIntentChange('approval')}
            aria-pressed={intent === 'approval'}
          >
            Approval
          </CButton>
          <CButton
            size="sm"
            color={intent === 'payment' ? 'primary' : 'secondary'}
            variant={intent === 'payment' ? undefined : 'outline'}
            onClick={() => onIntentChange('payment')}
            aria-pressed={intent === 'payment'}
          >
            Payment
          </CButton>
        </CButtonGroup>
      ) : null}
      {intent === 'payment' && markAvailable && unmarkAvailable ? (
        <CButtonGroup role="group" aria-label="Payment bulk action">
          <CButton
            size="sm"
            color={paymentMode === 'mark' ? 'success' : 'secondary'}
            variant={paymentMode === 'mark' ? undefined : 'outline'}
            onClick={() => onPaymentModeChange('mark')}
            aria-pressed={paymentMode === 'mark'}
          >
            Mark paid
          </CButton>
          <CButton
            size="sm"
            color={paymentMode === 'unmark' ? 'warning' : 'secondary'}
            variant={paymentMode === 'unmark' ? undefined : 'outline'}
            onClick={() => onPaymentModeChange('unmark')}
            aria-pressed={paymentMode === 'unmark'}
          >
            Unmark paid
          </CButton>
        </CButtonGroup>
      ) : null}
    </>
  )

  const summary =
    intent === 'approval' ? (
      <SummaryPreview summary={workflowSummary} />
    ) : (
      <SummaryPreview
        summary={activePaymentSummary}
        showTotal={paymentMode === 'mark'}
        totalLabel="Total payable"
      />
    )

  const actions = (
    <>
      <BulkActionButton label="Clear selection" intent="neutral" onClick={onClear} />
      {intent === 'approval' ? (
        <>
          <BulkActionButton
            label="Reject selected"
            intent="reject"
            disabled={!workflowAvailable}
            onClick={onReject}
          />
          <BulkActionButton
            label="Approve selected"
            intent="approve"
            disabled={!workflowAvailable}
            onClick={onApprove}
          />
        </>
      ) : paymentMode === 'unmark' ? (
        <BulkActionButton
          label="Unmark selected paid"
          intent="reject"
          disabled={!unmarkAvailable}
          onClick={onUnmarkPaid}
        />
      ) : (
        <BulkActionButton
          label="Mark selected paid"
          intent="approve"
          disabled={!markAvailable}
          onClick={onMarkPaid}
        />
      )}
    </>
  )

  return (
    <BulkSelectionActionBar
      label={`${totalSelectedCount} salary claim${totalSelectedCount === 1 ? '' : 's'} selected`}
      controls={controls}
      summary={summary}
      actions={actions}
      mobileSticky
      className="salary-bulk-mode-bar"
    />
  )
}

export default SalaryBulkModeBar
