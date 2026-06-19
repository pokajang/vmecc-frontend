import React from 'react'

const BulkSelectionSummaryPreview = ({ summary, showTotal = false, totalLabel = 'Total' }) => {
  if (!summary?.count) {
    return <div className="text-body-secondary">No eligible claims selected.</div>
  }

  return (
    <div className="d-grid gap-2">
      <div className="text-body-secondary">
        {summary.count} eligible claim{summary.count === 1 ? '' : 's'} selected
        {showTotal && summary.totalLabel ? ` | ${totalLabel}: ${summary.totalLabel}` : ''}.
      </div>
      <div className="d-grid gap-1 small">
        {summary.sampleItems.map((item) => (
          <div key={item.key} className="rounded border bg-body px-2 py-1">
            <span className="fw-semibold">{item.id}</span>
            <span className="text-body-secondary"> | {item.owner}</span>
            <span className="text-body-secondary"> | {item.period}</span>
            {item.amount ? <span className="text-body-secondary"> | {item.amount}</span> : null}
          </div>
        ))}
        {summary.remainingCount > 0 ? (
          <div className="text-body-secondary">+{summary.remainingCount} more selected</div>
        ) : null}
      </div>
    </div>
  )
}

export default BulkSelectionSummaryPreview
