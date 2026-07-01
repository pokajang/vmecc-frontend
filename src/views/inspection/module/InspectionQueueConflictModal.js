import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'

const InspectionQueueConflictModal = ({
  target,
  fields,
  onClose,
  onCopyLocalNotes,
  onKeepServer,
  onSaveLocalAsDraft,
  onRetryWithLatest,
}) => (
  <CModal visible={Boolean(target)} onClose={onClose} size="lg">
    <CModalHeader>
      <CModalTitle>Resolve queued edit conflict</CModalTitle>
    </CModalHeader>
    <CModalBody>
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
    </CModalBody>
    <CModalFooter className="d-flex flex-wrap gap-2">
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
    </CModalFooter>
  </CModal>
)

export default InspectionQueueConflictModal
