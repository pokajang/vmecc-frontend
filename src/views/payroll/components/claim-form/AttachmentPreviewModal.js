import React from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import { getAttachmentKind } from './utils/claimFormUtils'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

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
}) => {
  const isMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const isImage =
    getAttachmentKind({
      attachmentName: attachmentPreviewItem?.attachmentName || '',
      attachmentMimeType: attachmentPreviewMimeType,
    }) === 'image'

  const body = (
    <>
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
      ) : isImage ? (
        <div className="vmecc-scroll-both" style={{ maxHeight: '70vh' }}>
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
    </>
  )
  const footer = (
    <>
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
    </>
  )

  if (isMobileDrawer) {
    return (
      <MobileBottomDrawer visible={visible} title="Attachment Preview" onClose={onClose}>
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid gap-2">
          {body}
        </div>
        <div className="mobile-bottom-drawer__footer d-flex align-items-center justify-content-end gap-2">
          {footer}
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" size="lg">
      <CModalHeader>
        <CModalTitle>Attachment preview</CModalTitle>
      </CModalHeader>
      <CModalBody>{body}</CModalBody>
      <CModalFooter>{footer}</CModalFooter>
    </CModal>
  )
}

export default AttachmentPreviewModal
