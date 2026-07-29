import {
  CAlert,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'

import { buildAiHelperDocumentFileUrl } from 'src/services/apiClient'
import { formatFileSize, formatKnowledgeDate, knowledgeEntryName } from './constants'

const KnowledgeReaderModal = ({ detail, error, loading, open, onClose }) => {
  const fileUrl =
    detail?.id && detail?.original_available ? buildAiHelperDocumentFileUrl(detail.id) : ''

  const renderMetadata = () => (
    <div className="ai-helper-knowledge-reader__meta-grid">
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">Title</div>
        <div>{detail?.title || 'Untitled document'}</div>
      </div>
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">File</div>
        <div className="text-break">{detail?.source_filename || 'PDF document'}</div>
      </div>
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">Availability</div>
        <div>{detail?.visibility === 'shared' ? 'Everyone' : 'Only me'}</div>
      </div>
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">Uploaded by</div>
        <div>{detail?.uploader_name || 'Unknown user'}</div>
      </div>
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">Uploaded</div>
        <div>{formatKnowledgeDate(detail?.created_at) || 'Unknown date'}</div>
      </div>
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">File size</div>
        <div>{formatFileSize(detail?.source_size) || 'Unknown size'}</div>
      </div>
      <div className="ai-helper-knowledge-reader__meta-span">
        <div className="ai-helper-knowledge-reader__meta-label">AI use</div>
        <div>This PDF is available for viewing only and is not ingested by Ask AI.</div>
      </div>
    </div>
  )

  return (
    <CModal
      fullscreen
      scrollable
      visible={open}
      onClose={onClose}
      className="ai-helper-knowledge-reader"
    >
      <CModalHeader onClose={onClose}>
        <CModalTitle>{detail?.title || 'Reference document'}</CModalTitle>
      </CModalHeader>
      <CModalBody className="ai-helper-knowledge-reader__body">
        {loading ? (
          <div className="ai-helper-knowledge-reader__empty">
            <CSpinner size="sm" className="me-2" />
            Loading document...
          </div>
        ) : error ? (
          <CAlert color="danger">{error}</CAlert>
        ) : detail ? (
          <>
            {fileUrl ? (
              <div className="ai-helper-knowledge-reader__toolbar">
                <CButton color="primary" href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Open PDF in new tab
                </CButton>
              </div>
            ) : null}
            <div className="ai-helper-knowledge-reader__content">{renderMetadata()}</div>
          </>
        ) : (
          <div className="ai-helper-knowledge-reader__empty">Document details are unavailable.</div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default KnowledgeReaderModal
