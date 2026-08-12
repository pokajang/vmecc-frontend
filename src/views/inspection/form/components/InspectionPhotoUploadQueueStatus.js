import React, { useEffect, useMemo } from 'react'
import { CAlert, CButton } from '@coreui/react'
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

const summarizeBatch = (items) =>
  items.reduce(
    (summary, item) => {
      summary.total += 1
      if (item.status === 'uploaded') summary.uploaded += 1
      else if (item.status === 'failed') {
        summary.failed += 1
        summary.failedItems.push(item)
      } else if (ACTIVE_STATES.has(item.status)) summary.pending += 1
      return summary
    },
    { total: 0, uploaded: 0, failed: 0, pending: 0, failedItems: [] },
  )

const groupUploadBatches = (items) => {
  const grouped = new Map()
  ;(Array.isArray(items) ? items : [])
    .filter((item) => item?.status !== 'cancelled')
    .forEach((item) => {
      const batchId = String(item?.batchId || 'legacy-upload-batch')
      const batch = grouped.get(batchId) || []
      batch.push(item)
      grouped.set(batchId, batch)
    })

  return Array.from(grouped, ([batchId, batchItems]) => {
    const summary = summarizeBatch(batchItems)
    return {
      batchId,
      items: batchItems,
      summary,
      complete: summary.total > 0 && summary.uploaded === summary.total,
    }
  })
}

const batchTitle = ({ complete, summary }) => {
  if (complete) return `${summary.uploaded} of ${summary.total} photos uploaded`
  if (summary.pending > 0) {
    return `Uploading ${summary.uploaded} of ${summary.total} photos…`
  }
  return `${summary.uploaded} of ${summary.total} photos uploaded`
}

const batchDetail = ({ complete, summary }) => {
  if (complete) return 'Photos are ready to review.'
  const details = []
  if (summary.pending > 0) details.push(`${summary.pending} in progress`)
  if (summary.failed > 0) {
    details.push(`${summary.failed} ${summary.failed === 1 ? 'needs' : 'need'} attention`)
  }
  return details.join(' · ')
}

const publicFailureMessage = (message, fileName) => {
  const text = String(message || '').trim()
  const privateName = String(fileName || '').trim()
  if (!privateName) return text
  const escapedName = privateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text
    .replace(new RegExp(`(["'])${escapedName}\\1`, 'gi'), 'the selected photo')
    .replace(new RegExp(escapedName, 'gi'), 'selected photo')
}

const InspectionPhotoUploadQueueStatus = ({
  items = [],
  onDismissCompletedBatch,
  onRemoveItem,
  onRetryItem,
  successDismissMs = 3000,
}) => {
  const batches = useMemo(() => groupUploadBatches(items), [items])
  const completedBatchKey = batches
    .filter((batch) => batch.complete)
    .map((batch) => batch.batchId)
    .sort()
    .join('|')

  useEffect(() => {
    if (!completedBatchKey || typeof onDismissCompletedBatch !== 'function') return undefined
    const completedBatchIds = completedBatchKey.split('|').filter(Boolean)
    const timerIds = completedBatchIds.map((batchId) =>
      window.setTimeout(() => onDismissCompletedBatch(batchId), successDismissMs),
    )
    return () => timerIds.forEach((timerId) => window.clearTimeout(timerId))
  }, [completedBatchKey, onDismissCompletedBatch, successDismissMs])

  if (!batches.length) return null

  return (
    <div className="inspection-photo-upload-status d-grid gap-2" aria-label="Photo upload status">
      {batches.map((batch) => {
        const { summary } = batch
        const color = summary.failed > 0 ? 'warning' : batch.complete ? 'success' : 'info'
        const detail = batchDetail(batch)

        return (
          <CAlert
            key={batch.batchId}
            color={color}
            className="mb-0"
            role={summary.failed > 0 ? 'alert' : 'status'}
            aria-live={summary.failed > 0 ? 'assertive' : 'polite'}
            aria-atomic="true"
          >
            <div>
              <div className="fw-semibold">{batchTitle(batch)}</div>
              {detail ? <div className="small mt-1">{detail}</div> : null}
            </div>

            {summary.failedItems.length > 0 ? (
              <div className="inspection-photo-upload-failures d-grid gap-2 mt-3">
                {summary.failedItems.map((item, index) => {
                  const positionLabel = `Photo ${index + 1}`
                  const failureMessage = publicFailureMessage(item.failure?.message, item.fileName)
                  return (
                    <div
                      key={item.clientUploadId}
                      className="rounded-3 border bg-body p-2 d-flex align-items-start gap-2"
                    >
                      <div className="min-w-0 flex-grow-1">
                        <div className="small fw-semibold">{positionLabel}</div>
                        <div className="small text-danger mt-1">
                          {failureMessage || 'This photo needs attention.'}
                        </div>
                      </div>
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
                          aria-label={`Remove ${positionLabel} from upload queue`}
                          onClick={() => onRemoveItem?.(item.clientUploadId)}
                        >
                          <X size={14} aria-hidden="true" />
                        </CButton>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </CAlert>
        )
      })}
    </div>
  )
}

export default InspectionPhotoUploadQueueStatus
