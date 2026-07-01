import React from 'react'
import { CButton } from '@coreui/react'

const InspectionQueueBanner = ({ summary, isSyncing = false, onRetry, onOpenDetails }) => {
  if (!summary?.count) return null
  const message = summary.failedCount
    ? `${summary.failedCount} queued inspection ${summary.failedCount === 1 ? 'report needs' : 'reports need'} retry.`
    : summary.conflictCount
      ? `${summary.conflictCount} queued inspection ${summary.conflictCount === 1 ? 'report has' : 'reports have'} a sync conflict.`
      : `${summary.count} inspection ${summary.count === 1 ? 'report is' : 'reports are'} queued for sync.`

  return (
    <div className="inspection-queue-banner rounded-3 border bg-warning-subtle p-3 d-flex flex-column flex-md-row justify-content-between gap-2 mb-3">
      <div>
        <div className="fw-semibold">{isSyncing ? 'Syncing queued reports...' : message}</div>
        {summary.lastError ? (
          <div className="small text-body-secondary mt-1">{summary.lastError}</div>
        ) : null}
      </div>
      <div className="d-flex flex-wrap gap-2">
        <CButton color="secondary" variant="outline" size="sm" onClick={onOpenDetails}>
          Details
        </CButton>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          disabled={isSyncing}
          onClick={onRetry}
        >
          {isSyncing ? 'Retrying...' : 'Retry now'}
        </CButton>
      </div>
    </div>
  )
}

export default InspectionQueueBanner
