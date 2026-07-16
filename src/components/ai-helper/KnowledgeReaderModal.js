import { useId } from 'react'
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
import {
  formatFileSize,
  formatKnowledgeDate,
  knowledgeEntryName,
  KNOWLEDGE_READER_TAB_METADATA,
  KNOWLEDGE_READER_TAB_ORIGINAL,
} from './constants'

const KnowledgeReaderModal = ({
  activeTab,
  readerHasOriginal,
  detail,
  error,
  loading,
  pdfError,
  pdfLoading,
  pdfUrl,
  open,
  onClose,
  onTabChange,
}) => {
  const readerId = useId()
  const hasOriginal = Boolean(readerHasOriginal ?? detail?.original_available)
  const fileUrl = detail?.id ? buildAiHelperDocumentFileUrl(detail.id) : ''
  const tabs = [
    ...(hasOriginal ? [{ value: KNOWLEDGE_READER_TAB_ORIGINAL, label: 'Original PDF' }] : []),
    { value: KNOWLEDGE_READER_TAB_METADATA, label: 'Metadata' },
  ]
  const selectedTab = tabs.some((tab) => tab.value === activeTab) ? activeTab : tabs[0]?.value

  const handleTabKeyDown = (event, index) => {
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')?.[nextIndex]?.focus()
    onTabChange(tabs[nextIndex].value)
  }

  const renderOriginal = () => {
    if (pdfLoading) {
      return (
        <div className="ai-helper-knowledge-reader__empty">
          <CSpinner size="sm" className="me-2" />
          Loading original PDF...
        </div>
      )
    }
    if (pdfError) return <CAlert color="danger">{pdfError}</CAlert>
    if (!pdfUrl) {
      return (
        <div className="ai-helper-knowledge-reader__empty">
          The original PDF preview is not available.
        </div>
      )
    }

    return (
      <iframe
        className="ai-helper-knowledge-reader__frame"
        src={pdfUrl}
        title={knowledgeEntryName(detail)}
      />
    )
  }

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
            <div className="ai-helper-knowledge-reader__toolbar">
              <div
                className="ai-helper-knowledge-reader__tabs"
                role="tablist"
                aria-label="Reader tabs"
              >
                {tabs.map((tab, index) => (
                  <button
                    id={`${readerId}-tab-${tab.value}`}
                    key={tab.value}
                    type="button"
                    className={selectedTab === tab.value ? 'active' : ''}
                    onClick={() => onTabChange(tab.value)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    role="tab"
                    aria-selected={selectedTab === tab.value}
                    aria-controls={`${readerId}-panel-${tab.value}`}
                    tabIndex={selectedTab === tab.value ? 0 : -1}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {selectedTab === KNOWLEDGE_READER_TAB_ORIGINAL && hasOriginal ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Open PDF in new tab
                </a>
              ) : null}
            </div>
            <div
              id={`${readerId}-panel-${selectedTab}`}
              className="ai-helper-knowledge-reader__content"
              role="tabpanel"
              aria-labelledby={`${readerId}-tab-${selectedTab}`}
            >
              {selectedTab === KNOWLEDGE_READER_TAB_ORIGINAL ? renderOriginal() : renderMetadata()}
            </div>
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
