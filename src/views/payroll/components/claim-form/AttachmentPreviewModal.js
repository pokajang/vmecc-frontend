import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'
import { getAttachmentKind } from './utils/claimFormUtils'

const AttachmentPreviewModal = ({
  visible,
  onClose,
  attachmentPreviewItem,
  attachmentPreviewUrl,
  attachmentPreviewMimeType,
  attachmentPreviewLoading,
  attachmentPreviewZoom,
  isImageAttachmentPreview,
  onZoomChange,
}) => (
  <CModal visible={visible} onClose={onClose} alignment="center" size="lg">
    <CModalHeader>Attachment Preview</CModalHeader>
    <CModalBody>
      {attachmentPreviewItem?.attachmentName && (
        <div className="small text-body-secondary mb-2">{attachmentPreviewItem.attachmentName}</div>
      )}
      {isImageAttachmentPreview && (
        <div className="d-flex align-items-center gap-2 mb-2">
          <CButton
            type="button"
            color="light"
            size="sm"
            onClick={() => onZoomChange(attachmentPreviewZoom - 0.25)}
          >
            -
          </CButton>
          <div className="small text-body-secondary" style={{ minWidth: 64 }}>
            {Math.round(attachmentPreviewZoom * 100)}%
          </div>
          <CButton
            type="button"
            color="light"
            size="sm"
            onClick={() => onZoomChange(attachmentPreviewZoom + 0.25)}
          >
            +
          </CButton>
          <CButton type="button" color="light" size="sm" onClick={() => onZoomChange(1)}>
            Reset
          </CButton>
        </div>
      )}
      {attachmentPreviewLoading ? (
        <div className="text-body-secondary">Loading attachment preview...</div>
      ) : !attachmentPreviewUrl ? (
        <div className="text-body-secondary">
          Preview is unavailable for this attachment in current draft state.
        </div>
      ) : getAttachmentKind({
          attachmentName: attachmentPreviewItem?.attachmentName || '',
          attachmentMimeType: attachmentPreviewMimeType,
        }) === 'image' ? (
        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <img
            src={attachmentPreviewUrl}
            alt={attachmentPreviewItem.attachmentName || 'Attachment preview'}
            style={{
              width: `${attachmentPreviewZoom * 100}%`,
              maxWidth: 'none',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>
      ) : (
        <iframe
          src={attachmentPreviewUrl}
          title={attachmentPreviewItem.attachmentName || 'Attachment preview'}
          style={{ width: '100%', height: '70vh', border: 0 }}
        />
      )}
    </CModalBody>
    <CModalFooter>
      {attachmentPreviewUrl && (
        <a
          href={attachmentPreviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-light"
        >
          Open in new tab
        </a>
      )}
      <CButton color="primary" onClick={onClose}>
        Close
      </CButton>
    </CModalFooter>
  </CModal>
)

export default AttachmentPreviewModal
