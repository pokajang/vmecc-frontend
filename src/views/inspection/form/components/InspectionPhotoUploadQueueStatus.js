import React from 'react'
import { CAlert, CButton, CSpinner } from '@coreui/react'
import { RefreshCw, X } from 'lucide-react'

const ACTIVE_STATES = new Set([
  'selected',
  'preparing',
  'queued',
  'uploading',
  'server_processing',
  'attaching',
  'retry_waiting',
])

const STATUS_LABELS = {
  selected: 'Selected',
  preparing: 'Preparing',
  queued: 'Queued',
  uploading: 'Uploading',
  server_processing: 'Processing on server',
  attaching: 'Saving to inspection',
  uploaded: 'Uploaded',
  retry_waiting: 'Waiting to retry',
  failed: 'Needs attention',
  cancelled: 'Cancelled',
}

const getSummary = (items) =>
  items.reduce(
    (summary, item) => {
      summary.total += 1
      if (item.status === 'uploaded') summary.uploaded += 1
      else if (item.status === 'failed') summary.failed += 1
      else if (ACTIVE_STATES.has(item.status)) summary.pending += 1
      return summary
    },
    { total: 0, uploaded: 0, failed: 0, pending: 0 },
  )

const InspectionPhotoUploadQueueStatus = ({
  items = [],
  onClearCompleted,
  onRemoveItem,
  onRetryItem,
}) => {
  if (!items.length) return null

  const summary = getSummary(items)
  const complete = summary.uploaded === summary.total
  const color = summary.failed > 0 ? 'warning' : complete ? 'success' : 'info'

  return (
    <CAlert
      color={color}
      className="inspection-photo-upload-status mx-3 mx-md-4 mt-3 mb-0"
      role="status"
      aria-live="polite"
    >
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div className="fw-semibold">
            {complete
              ? `${summary.uploaded} of ${summary.total} photos uploaded`
              : `${summary.total} photos selected`}
          </div>
          <div className="small">
            {summary.uploaded} uploaded
            {summary.pending ? ` · ${summary.pending} in progress` : ''}
            {summary.failed ? ` · ${summary.failed} need attention` : ''}
          </div>
        </div>
        {summary.uploaded > 0 && summary.pending === 0 ? (
          <CButton type="button" color={color} variant="ghost" size="sm" onClick={onClearCompleted}>
            Clear completed
          </CButton>
        ) : null}
      </div>

      <div className="d-grid gap-2 mt-3">
        {items.map((item) => {
          const active = ACTIVE_STATES.has(item.status)
          const failureMessage = String(item.failure?.message || '').trim()
          return (
            <div
              key={item.clientUploadId}
              className="rounded-3 border bg-body p-2 d-flex align-items-start gap-2"
            >
              {active ? <CSpinner size="sm" className="mt-1" aria-hidden="true" /> : null}
              <div className="min-w-0 flex-grow-1">
                <div className="small fw-semibold text-truncate">{item.fileName || 'Photo'}</div>
                <div className="small text-body-secondary">
                  {STATUS_LABELS[item.status] || item.status}
                  {item.status === 'uploading' || item.status === 'server_processing'
                    ? ` · ${Number(item.percent || 0)}%`
                    : ''}
                </div>
                {failureMessage ? (
                  <div className="small text-danger mt-1">{failureMessage}</div>
                ) : null}
              </div>
              {item.status === 'failed' ? (
                <div className="d-flex align-items-center gap-1">
                  <CButton
                    type="button"
                    color="warning"
                    variant="outline"
                    size="sm"
                    className="d-inline-flex align-items-center gap-1"
                    onClick={() => onRetryItem?.(item.clientUploadId)}
                  >
                    <RefreshCw size={13} aria-hidden="true" />
                    Retry
                  </CButton>
                  <CButton
                    type="button"
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${item.fileName || 'photo'} from upload queue`}
                    onClick={() => onRemoveItem?.(item.clientUploadId)}
                  >
                    <X size={14} aria-hidden="true" />
                  </CButton>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </CAlert>
  )
}

export default InspectionPhotoUploadQueueStatus
