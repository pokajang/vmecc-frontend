import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

const InspectionQueueConflictModal = ({
  target,
  fields,
  onClose,
  onCopyLocalNotes,
  onKeepServer,
  onSaveLocalAsDraft,
  onRetryWithLatest,
}) => {
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const title = 'Resolve queued edit conflict'
  const body = (
    <div className="d-grid gap-3">
      <div className="text-body-secondary">
        The server report changed before this queued edit could sync. Compare the local edit with
        the current server version before resolving.
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Field</th>
              <th>Local queued edit</th>
              <th>Server version</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.label}>
                <td className="fw-semibold">{field.label}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{field.local}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{field.server}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {target?.lastError ? <div className="small text-danger">{target.lastError}</div> : null}
    </div>
  )
  const footer = (
    <>
      <CButton color="secondary" variant="outline" onClick={() => onCopyLocalNotes?.(target)}>
        Copy local notes
      </CButton>
      <CButton color="secondary" variant="outline" onClick={() => onKeepServer?.(target)}>
        Keep server
      </CButton>
      <CButton color="secondary" variant="outline" onClick={() => onSaveLocalAsDraft?.(target)}>
        Save local as draft
      </CButton>
      <CButton color="primary" onClick={() => onRetryWithLatest?.(target)}>
        Retry with latest version
      </CButton>
    </>
  )

  if (useMobileDrawer) {
    return (
      <MobileBottomDrawer visible={Boolean(target)} title={title} onClose={onClose}>
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
          {body}
        </div>
        <div className="mobile-bottom-drawer__footer d-flex flex-wrap justify-content-end gap-2">
          {footer}
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={Boolean(target)} onClose={onClose} size="lg">
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter className="d-flex flex-wrap gap-2">{footer}</CModalFooter>
    </CModal>
  )
}

export default InspectionQueueConflictModal
