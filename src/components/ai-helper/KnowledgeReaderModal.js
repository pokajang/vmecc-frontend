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

const HEADING_TAGS_ENABLED = true

const isMarkdownHeading = (line) => {
  if (!HEADING_TAGS_ENABLED) return null

  const headingMatch = String(line).match(/^\s{0,3}(#{1,3})\s+(.*\S.*)$/)
  if (!headingMatch) return null

  return {
    level: headingMatch[1].length,
    text: headingMatch[2].trim(),
  }
}

const isMarkdownList = (line) => {
  const bulletMatch = String(line).match(/^\s{0,3}[-*+]\s+(.*)$/)
  if (bulletMatch) {
    return { ordered: false, text: bulletMatch[1] }
  }

  const orderedMatch = String(line).match(/^\s{0,3}\d+\.\s+(.*)$/)
  if (orderedMatch) {
    return { ordered: true, text: orderedMatch[1] }
  }

  return null
}

const renderMarkdownLikeText = (text) => {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')

  const nodes = []
  const paragraphLines = []
  let listItems = null
  let orderedList = false

  const flushParagraph = () => {
    if (!paragraphLines.length) return

    nodes.push(
      <p className="ai-helper-knowledge-reader__markdown-paragraph" key={`para-${nodes.length}`}>
        {paragraphLines.map((line, index) => (
          <span key={`para-line-${nodes.length}-${index}`}>
            {line}
            {index < paragraphLines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>,
    )
    paragraphLines.length = 0
  }

  const flushList = () => {
    if (!listItems?.length) return

    const listNode = orderedList ? (
      <ol className="ai-helper-knowledge-reader__markdown-list" key={`list-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li key={`${nodes.length}-item-${index}`}>{item}</li>
        ))}
      </ol>
    ) : (
      <ul className="ai-helper-knowledge-reader__markdown-list" key={`list-${nodes.length}`}>
        {listItems.map((item, index) => (
          <li key={`${nodes.length}-item-${index}`}>{item}</li>
        ))}
      </ul>
    )

    nodes.push(listNode)
    listItems = null
    orderedList = false
  }

  for (const line of lines) {
    const heading = isMarkdownHeading(line)
    if (heading) {
      flushParagraph()
      flushList()

      const HeadingTag = `h${heading.level}`
      nodes.push(
        <HeadingTag
          className="ai-helper-knowledge-reader__markdown-heading"
          key={`heading-${nodes.length}`}
        >
          {heading.text}
        </HeadingTag>,
      )
      continue
    }

    const list = isMarkdownList(line)
    if (list) {
      if (!listItems) {
        flushParagraph()
        listItems = []
        orderedList = list.ordered
      }

      if (orderedList !== list.ordered) {
        flushList()
        listItems = [list.text]
        orderedList = list.ordered
      } else {
        listItems.push(list.text)
      }

      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }

    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  return nodes.length ? nodes : [<p key="empty-markdown"></p>]
}

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
  const fileUrl = detail?.id ? buildAiHelperKnowledgeFileUrl(detail.id) : ''
  const isMarkdown = detail?.source_mime === 'text/markdown'
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
        <pre className="ai-helper-knowledge-reader__code" aria-label="Original Markdown source">
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
          aria-label="Extracted Markdown content"
        >
          {renderMarkdownLikeText(detail.extracted_content)}
        </div>
      )
    }

    return <pre className="ai-helper-knowledge-reader__text">{detail.extracted_content}</pre>
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
                {hasOriginal ? (
                  <button
                    type="button"
                    className={selectedTab === KNOWLEDGE_READER_TAB_ORIGINAL ? 'active' : ''}
                    onClick={() => onTabChange(KNOWLEDGE_READER_TAB_ORIGINAL)}
                    role="tab"
                    aria-selected={selectedTab === KNOWLEDGE_READER_TAB_ORIGINAL}
                  >
                    Original
                  </button>
                ) : null}
                <button
                  type="button"
                  className={selectedTab === KNOWLEDGE_READER_TAB_EXTRACTED ? 'active' : ''}
                  onClick={() => onTabChange(KNOWLEDGE_READER_TAB_EXTRACTED)}
                  role="tab"
                  aria-selected={selectedTab === KNOWLEDGE_READER_TAB_EXTRACTED}
                >
                  Extracted text
                </button>
                <button
                  type="button"
                  className={selectedTab === KNOWLEDGE_READER_TAB_METADATA ? 'active' : ''}
                  onClick={() => onTabChange(KNOWLEDGE_READER_TAB_METADATA)}
                  role="tab"
                  aria-selected={selectedTab === KNOWLEDGE_READER_TAB_METADATA}
                >
                  Metadata
                </button>
              </div>
              {selectedTab === KNOWLEDGE_READER_TAB_ORIGINAL && hasOriginal ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Open in new tab
                </a>
              ) : null}
            </div>

            <div className="ai-helper-knowledge-reader__content">
              {selectedTab === KNOWLEDGE_READER_TAB_ORIGINAL ? renderOriginal() : null}
              {selectedTab === KNOWLEDGE_READER_TAB_EXTRACTED ? renderExtracted() : null}
              {selectedTab === KNOWLEDGE_READER_TAB_METADATA ? renderMetadata() : null}
            </div>
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
