import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const formatBytes = (value) => {
  const bytes = Number(value || 0)
  if (!bytes) return '--'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

const formatValueDateTime = (value) => {
  const parsed = new Date(String(value || '').trim())
  return Number.isNaN(parsed.getTime()) ? '--' : parsed.toLocaleString()
}

const InspectionQueueDetailsModal = ({
  visible,
  onClose,
  queueRows = [],
  offlineHealth = null,
  isOfflineHealthLoading = false,
  isRefreshingOfflineAssets = false,
  onRefreshOfflineAssets,
  canRecoverLocalDraft = false,
  onRecoverLocalDraft,
  isQueueSyncing = false,
  onRetryQueue,
  onOpenQueueConflict,
  onSaveQueuedAsDraft,
  onDeleteRecord,
}) => {
  const queueDetailRows = Array.isArray(queueRows) ? queueRows : []
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const title = 'Queued inspection reports'
  const body = (
    <>
      <div className="border rounded-3 p-3 mb-3 d-grid gap-2">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
          <div>
            <div className="fw-semibold">Offline readiness</div>
            <div className="small text-body-secondary">
              {isOfflineHealthLoading
                ? 'Checking local storage...'
                : 'Local storage and app shell status'}
            </div>
          </div>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            disabled={isRefreshingOfflineAssets}
            onClick={onRefreshOfflineAssets}
          >
            {isRefreshingOfflineAssets ? 'Refreshing...' : 'Refresh offline assets'}
          </CButton>
        </div>
        <div className="row g-2 small">
          <div className="col-6 col-md-3">
            <div className="text-body-secondary">IndexedDB</div>
            <div>{offlineHealth?.indexedDbStatus || '--'}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="text-body-secondary">App shell</div>
            <div>{offlineHealth?.cacheName || '--'}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="text-body-secondary">Pending queue</div>
            <div>{offlineHealth?.pendingQueueCount ?? queueDetailRows.length}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="text-body-secondary">Storage left</div>
            <div>{formatBytes(offlineHealth?.storageRemaining)}</div>
          </div>
        </div>
        <div className="small">
          Last local draft save: {formatValueDateTime(offlineHealth?.lastLocalDraftSave)}
        </div>
        <div className="small">
          Last server draft sync: {formatValueDateTime(offlineHealth?.lastServerDraftSync)}
        </div>
        {offlineHealth?.warnings?.length ? (
          <div className="small text-warning">{offlineHealth.warnings.join(', ')}</div>
        ) : null}
        {canRecoverLocalDraft ? (
          <div>
            <CButton size="sm" color="secondary" variant="outline" onClick={onRecoverLocalDraft}>
              Recover local draft
            </CButton>
          </div>
        ) : null}
      </div>
      {queueDetailRows.length === 0 ? (
        <div className="text-body-secondary">No queued inspection reports.</div>
      ) : (
        <div className="d-grid gap-3">
          {queueDetailRows.map((row) => (
            <div key={row.queueId || row.id} className="rounded-3 border p-3 d-grid gap-2">
              {row.queueStatus === 'conflict' ? (
                <div className="small text-warning-emphasis bg-warning-subtle border border-warning-subtle rounded px-2 py-1">
                  Resolve this conflict before retrying sync.
                </div>
              ) : null}
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <div className="fw-semibold">{row.displayId || 'Queued inspection'}</div>
                <div className="small text-body-secondary">{row.status || row.queueStatus}</div>
              </div>
              <div className="small text-body-secondary">
                {row.operation || 'create'} - Attempts {row.attempts || 0}
              </div>
              <div className="small">Created: {row.queuedAt || row.createdAt || '--'}</div>
              <div className="small">Last attempt: {row.lastAttemptAt || '--'}</div>
              <div className="small">Next retry: {row.nextRetryAt || '--'}</div>
              {row.lastError ? <div className="small text-danger">{row.lastError}</div> : null}
              {Array.isArray(row.history) && row.history.length > 0 ? (
                <div className="pt-2 mt-1">
                  <div className="small fw-semibold mb-1">Queue history</div>
                  <div className="d-grid gap-1">
                    {row.history.slice(-6).map((event, index) => (
                      <div key={`${event.action}-${event.at}-${index}`} className="small">
                        <span className="text-body-secondary">
                          {formatValueDateTime(event.at)}:
                        </span>{' '}
                        {event.message || event.action}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="d-flex flex-wrap gap-2">
                {row.queueStatus === 'conflict' ? (
                  <CButton size="sm" color="warning" onClick={() => onOpenQueueConflict?.(row)}>
                    Open conflict
                  </CButton>
                ) : null}
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={isQueueSyncing || row.queueStatus === 'conflict'}
                  title={
                    row.queueStatus === 'conflict'
                      ? 'Resolve the conflict before retrying.'
                      : isQueueSyncing
                        ? 'Queue sync is already running.'
                        : undefined
                  }
                  onClick={() => onRetryQueue?.(row)}
                >
                  Retry now
                </CButton>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => onSaveQueuedAsDraft?.(row)}
                >
                  Save as draft
                </CButton>
                <CButton
                  size="sm"
                  color="danger"
                  variant="outline"
                  onClick={() => onDeleteRecord(row)}
                >
                  Delete queued
                </CButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
  const footer = (
    <CButton color="secondary" variant="outline" onClick={onClose}>
      Close
    </CButton>
  )

  if (useMobileDrawer) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title={title}
        bodyClassName="inspection-equipment-detail-drawer-shell"
        onClose={onClose}
      >
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
          {body}
        </div>
        <div className="mobile-bottom-drawer__footer d-flex justify-content-end gap-2">
          {footer}
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="lg"
      scrollable
      className="inspection-queue-details-modal"
    >
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{footer}</CModalFooter>
    </CModal>
  )
}

export default InspectionQueueDetailsModal
