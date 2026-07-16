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

import { buildAiHelperKnowledgeFileUrl } from 'src/services/apiClient'
import {
  formatFileSize,
  formatKnowledgeDate,
  isMarkdownKnowledgeEntry,
  knowledgeEntryName,
  knowledgeActionableFindings,
  knowledgeFindings,
  knowledgeQualityLabel,
  knowledgeScopeLabel,
  knowledgeUseLabel,
  KNOWLEDGE_READER_TAB_EXTRACTED,
  KNOWLEDGE_READER_TAB_METADATA,
  KNOWLEDGE_READER_TAB_ORIGINAL,
} from './constants'
import MarkdownDocument from './MarkdownDocument'

const KnowledgeReaderModal = ({
  activeTab,
  readerHasOriginal,
  detail,
  error,
  loading,
  pdfError,
  pdfLoading,
  pdfUrl,
  markdownError,
  markdownLoading,
  markdownSource,
  open,
  onClose,
  onTabChange,
}) => {
  const readerId = useId()
  const fileUrl = detail?.id ? buildAiHelperKnowledgeFileUrl(detail.id) : ''
  const isMarkdown = isMarkdownKnowledgeEntry(detail)
  const processing = detail?.status === 'processing'
  const failed = detail?.status === 'failed'
  const hasOriginal = Boolean(readerHasOriginal ?? detail?.original_available)
  const selectedTab =
    !hasOriginal && activeTab === KNOWLEDGE_READER_TAB_ORIGINAL
      ? KNOWLEDGE_READER_TAB_EXTRACTED
      : activeTab
  const actionableFindings = knowledgeActionableFindings(detail)
  const notices = knowledgeFindings(detail, ['notice'])
  const warning = actionableFindings[0]?.message || null
  const tabs = isMarkdown
    ? [
        { value: KNOWLEDGE_READER_TAB_EXTRACTED, label: 'Rendered' },
        ...(hasOriginal ? [{ value: KNOWLEDGE_READER_TAB_ORIGINAL, label: 'Source' }] : []),
        { value: KNOWLEDGE_READER_TAB_METADATA, label: 'Metadata' },
      ]
    : [
        ...(hasOriginal ? [{ value: KNOWLEDGE_READER_TAB_ORIGINAL, label: 'Original PDF' }] : []),
        { value: KNOWLEDGE_READER_TAB_EXTRACTED, label: 'Extracted text' },
        { value: KNOWLEDGE_READER_TAB_METADATA, label: 'Metadata' },
      ]

  const handleTabKeyDown = (event, index) => {
    let nextIndex = null

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1

    if (nextIndex === null) return

    event.preventDefault()
    const tabButtons = event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')
    tabButtons?.[nextIndex]?.focus()
    onTabChange(tabs[nextIndex].value)
  }

  const renderOriginal = () => {
    if (!hasOriginal) {
      return (
        <div className="ai-helper-knowledge-reader__empty">
          The original file is not available for this knowledge source.
        </div>
      )
    }

    if (isMarkdown) {
      if (markdownLoading) {
        return (
          <div className="ai-helper-knowledge-reader__empty">
            <CSpinner size="sm" className="me-2" />
            Loading original Markdown...
          </div>
        )
      }

      if (markdownError) {
        return <CAlert color="danger">{markdownError}</CAlert>
      }

      return (
        <pre className="ai-helper-knowledge-reader__code" aria-label="Markdown source">
          {markdownSource}
        </pre>
      )
    }

    if (pdfLoading) {
      return (
        <div className="ai-helper-knowledge-reader__empty">
          <CSpinner size="sm" className="me-2" />
          Loading original PDF...
        </div>
      )
    }

    if (pdfError) {
      return <CAlert color="danger">{pdfError}</CAlert>
    }

    if (!pdfUrl) {
      return (
        <div className="ai-helper-knowledge-reader__empty">
          The original PDF preview is not available for this knowledge source.
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

  const renderExtracted = () => {
    if (processing && !detail?.extracted_content_available) {
      return (
        <div className="ai-helper-knowledge-reader__empty">
          This knowledge source is still processing. Extracted text will appear when processing
          finishes.
        </div>
      )
    }

    if (failed) {
      return (
        <div className="ai-helper-knowledge-reader__stack">
          {detail?.error ? <CAlert color="danger">{detail.error}</CAlert> : null}
          {warning ? <CAlert color="warning">{warning}</CAlert> : null}
          {!detail?.error && !warning ? (
            <div className="ai-helper-knowledge-reader__empty">
              No extracted text is available for this knowledge source.
            </div>
          ) : null}
        </div>
      )
    }

    if (!detail?.extracted_content_available) {
      return (
        <div className="ai-helper-knowledge-reader__empty">
          No extracted text is available for this knowledge source yet.
        </div>
      )
    }

    if (isMarkdown) {
      return (
        <div
          className="ai-helper-knowledge-reader__text ai-helper-knowledge-reader__markdown"
          aria-label="Rendered Markdown content"
        >
          <MarkdownDocument source={detail.extracted_content} />
        </div>
      )
    }

    return (
      <pre
        className="ai-helper-knowledge-reader__text ai-helper-knowledge-reader__extracted-text"
        aria-label="Extracted PDF text"
      >
        {detail.extracted_content}
      </pre>
    )
  }

  const renderMetadata = () => (
    <div className="ai-helper-knowledge-reader__meta-grid">
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">Title</div>
        <div>{detail?.title || 'Untitled knowledge'}</div>
      </div>
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">File</div>
        <div className="text-break">{knowledgeEntryName(detail)}</div>
      </div>
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">Scope</div>
        <div>{knowledgeScopeLabel(detail)}</div>
      </div>
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">Use status</div>
        <div>{knowledgeUseLabel(detail)}</div>
      </div>
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">Ingestion quality</div>
        <div>{knowledgeQualityLabel(detail)}</div>
      </div>
      {detail?.pdf_page_count && detail?.pages_indexed ? (
        <div>
          <div className="ai-helper-knowledge-reader__meta-label">Page coverage</div>
          <div>
            {Number(detail.pages_indexed || 0)} text-bearing pages indexed out of{' '}
            {Number(detail.pdf_page_count)}
            {detail.pages_ocr ? ` - ${Number(detail.pages_ocr)} used OCR` : ''}
            {detail.pages_blank ? ` - ${Number(detail.pages_blank)} blank` : ''}
          </div>
        </div>
      ) : null}
      <div>
        <div className="ai-helper-knowledge-reader__meta-label">Visibility</div>
        <div>{detail?.visibility === 'shared' ? 'Shared guidance' : 'Personal'}</div>
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
      {detail?.summary ? (
        <div className="ai-helper-knowledge-reader__meta-span">
          <div className="ai-helper-knowledge-reader__meta-label">Summary</div>
          <div>{detail.summary}</div>
        </div>
      ) : null}
      {detail?.review_note ? (
        <div className="ai-helper-knowledge-reader__meta-span">
          <div className="ai-helper-knowledge-reader__meta-label">Review note</div>
          <div>{detail.review_note}</div>
        </div>
      ) : null}
      {notices.length ? (
        <div className="ai-helper-knowledge-reader__meta-span">
          <div className="ai-helper-knowledge-reader__meta-label">Processing notices</div>
          <div className="ai-helper-knowledge-reader__stack">
            {notices.map((finding, index) => (
              <CAlert
                key={`${finding.code}-${finding.page || index}`}
                color="info"
                className="mb-0"
              >
                {finding.message}
              </CAlert>
            ))}
          </div>
        </div>
      ) : null}
      {actionableFindings.length ? (
        <div className="ai-helper-knowledge-reader__meta-span">
          <div className="ai-helper-knowledge-reader__meta-label">Findings requiring attention</div>
          <div className="ai-helper-knowledge-reader__stack">
            {actionableFindings.map((finding, index) => (
              <CAlert
                key={`${finding.code}-${finding.page || index}`}
                color={finding.severity === 'error' ? 'danger' : 'warning'}
                className="mb-0"
              >
                {finding.message}
              </CAlert>
            ))}
          </div>
        </div>
      ) : null}
      {detail?.error ? (
        <div className="ai-helper-knowledge-reader__meta-span">
          <div className="ai-helper-knowledge-reader__meta-label">Error</div>
          <CAlert color="danger" className="mb-0">
            {detail.error}
          </CAlert>
        </div>
      ) : null}
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
        <CModalTitle>{detail?.title || 'Knowledge reader'}</CModalTitle>
      </CModalHeader>
      <CModalBody className="ai-helper-knowledge-reader__body">
        {loading ? (
          <div className="ai-helper-knowledge-reader__empty">
            <CSpinner size="sm" className="me-2" />
            Loading knowledge...
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
                  {isMarkdown ? 'Open source in new tab' : 'Open PDF in new tab'}
                </a>
              ) : null}
            </div>

            {tabs.map((tab) => {
              const selected = selectedTab === tab.value

              return (
                <div
                  id={`${readerId}-panel-${tab.value}`}
                  key={tab.value}
                  className="ai-helper-knowledge-reader__content"
                  role="tabpanel"
                  aria-labelledby={`${readerId}-tab-${tab.value}`}
                  tabIndex={selected ? 0 : -1}
                  hidden={!selected}
                >
                  {selected && tab.value === KNOWLEDGE_READER_TAB_ORIGINAL
                    ? renderOriginal()
                    : null}
                  {selected && tab.value === KNOWLEDGE_READER_TAB_EXTRACTED
                    ? renderExtracted()
                    : null}
                  {selected && tab.value === KNOWLEDGE_READER_TAB_METADATA
                    ? renderMetadata()
                    : null}
                </div>
              )
            })}
          </>
        ) : (
          <div className="ai-helper-knowledge-reader__empty">
            Knowledge details are unavailable.
          </div>
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
