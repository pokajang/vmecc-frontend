import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react'
import {
  downloadAttachmentPayload,
  downloadWorkflowAttachmentToBrowser,
  extractAttachmentPayload,
  loadWorkflowAttachmentForPreview,
} from 'src/views/payroll/components/attachmentUtils'

const isImageDataUrl = (value) => String(value || '').startsWith('data:image/')
const isPdfDataUrl = (value) => String(value || '').startsWith('data:application/pdf')
const isImageFileName = (name) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(name || ''))
const isPdfFileName = (name) => /\.pdf$/i.test(String(name || ''))
const isImageMimeType = (mime) =>
  String(mime || '')
    .trim()
    .toLowerCase()
    .startsWith('image/')
const isPdfMimeType = (mime) =>
  String(mime || '')
    .trim()
    .toLowerCase() === 'application/pdf'

const formatBytes = (value) => {
  const size = Number(value || 0)
  if (!Number.isFinite(size) || size <= 0) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

const AttachmentPreviewModal = ({ visible, attachment, onClose }) => {
  const payload = useMemo(() => extractAttachmentPayload(attachment), [attachment])
  const attachmentId = Number(payload?.attachmentId || 0) || 0
  const [previewAttachmentId, setPreviewAttachmentId] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewMimeType, setPreviewMimeType] = useState('')
  const objectUrlRef = useRef('')

  useEffect(() => {
    if (!visible || !attachmentId) return undefined

    let active = true
    void loadWorkflowAttachmentForPreview(attachmentId).then((loaded) => {
      if (!active || !loaded?.objectUrl) return
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = ''
      }
      objectUrlRef.current = loaded.objectUrl
      setPreviewUrl(loaded.objectUrl)
      setPreviewMimeType(String(loaded.contentType || '').trim())
      setPreviewAttachmentId(attachmentId)
    })

    return () => {
      active = false
    }
  }, [attachmentId, visible])

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = ''
      }
    },
    [],
  )

  const fallbackDataUrl = payload?.attachmentDataUrl || ''
  const hasApiPreview =
    attachmentId > 0 && previewAttachmentId === attachmentId && Boolean(previewUrl)
  const isPreviewPending = attachmentId > 0 && !hasApiPreview && !fallbackDataUrl
  const resolvedPreviewUrl = hasApiPreview ? previewUrl : fallbackDataUrl
  const resolvedMimeType = hasApiPreview ? previewMimeType : payload?.attachmentMimeType || ''
  const canPreviewImage =
    Boolean(resolvedPreviewUrl) &&
    (isImageMimeType(resolvedMimeType) ||
      isImageFileName(payload?.attachmentName) ||
      isImageDataUrl(resolvedPreviewUrl))
  const canPreviewPdf =
    Boolean(resolvedPreviewUrl) &&
    (isPdfMimeType(resolvedMimeType) ||
      isPdfFileName(payload?.attachmentName) ||
      isPdfDataUrl(resolvedPreviewUrl))
  const canPreview = canPreviewImage || canPreviewPdf
  const canDownload = Boolean(attachmentId || payload?.attachmentDataUrl)

  const handleDownload = useCallback(async () => {
    if (!payload) return
    if (attachmentId) {
      const downloaded = await downloadWorkflowAttachmentToBrowser(
        attachmentId,
        payload.attachmentName || 'attachment',
      )
      if (downloaded) return
    }
    downloadAttachmentPayload(payload, payload.attachmentName || 'attachment')
  }, [attachmentId, payload])

  return (
    <CModal size="lg" visible={visible} alignment="center" onClose={onClose}>
      <CModalHeader>Attachment Preview</CModalHeader>
      <CModalBody className="d-grid gap-3">
        <div>
          <div className="small text-body-secondary">File</div>
          <div className="fw-semibold">{payload?.attachmentName || '-'}</div>
        </div>

        <div className="small text-body-secondary d-grid gap-1">
          <div>Type: {resolvedMimeType || '-'}</div>
          <div>Size: {formatBytes(payload?.attachmentSizeBytes)}</div>
        </div>

        {isPreviewPending ? (
          <div className="text-body-secondary small">Loading attachment preview...</div>
        ) : (
          <>
            {canPreview && canPreviewImage && (
              <img
                src={resolvedPreviewUrl}
                alt={payload?.attachmentName || 'Attachment'}
                style={{ maxWidth: '100%', maxHeight: 480, objectFit: 'contain' }}
              />
            )}

            {canPreview && !canPreviewImage && canPreviewPdf && (
              <iframe
                title={payload?.attachmentName || 'Attachment PDF'}
                src={resolvedPreviewUrl}
                style={{ width: '100%', height: 560, border: '1px solid var(--cui-border-color)' }}
              />
            )}

            {!canPreview && (
              <div className="text-body-secondary small">
                Preview is unavailable for this attachment type. Use Download to open the file.
              </div>
            )}
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="light" onClick={onClose}>
          Close
        </CButton>
        <CButton color="primary" onClick={handleDownload} disabled={!canDownload}>
          Download
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AttachmentPreviewModal
