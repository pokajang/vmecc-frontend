import React from 'react'
import { CTooltip } from '@coreui/react'
import { BookOpenText, Check, Copy, Flag, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { MESSAGE_STATUS_SLOW, getMessageActions } from './constants'
import { buildAiHelperDocumentFileUrl } from 'src/services/apiClient'

const SOURCE_CITATION_PATTERN = /\[(S[1-9]\d*)\](?!\()/g
const SOURCE_CITATION_TARGET_PATTERN = /^#ai-helper-source-(S[1-9]\d*)$/

const renderAssistantContent = (content) => {
  const markdown = String(content || '')
  if (!markdown.trim()) {
    return <div className="ai-helper-message__content" />
  }

  const markdownWithCitationLinks = markdown.replace(
    SOURCE_CITATION_PATTERN,
    (_, sourceId) => `[${sourceId}](#ai-helper-source-${sourceId})`,
  )

  return (
    <div className="ai-helper-message__content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          table: ({ children, ...props }) => (
            <div className="ai-helper-message__table-wrap">
              <table {...props}>{children}</table>
            </div>
          ),
          a: ({ href, children, ...props }) => {
            const sourceCitation = SOURCE_CITATION_TARGET_PATTERN.exec(String(href || ''))
            if (sourceCitation) {
              return (
                <span
                  className="ai-helper-message__citation"
                  aria-label={`Retrieved source ${sourceCitation[1]}`}
                  title={`Retrieved source ${sourceCitation[1]}`}
                >
                  {children}
                </span>
              )
            }

            const safeHref = /^(https?:|mailto:)/i.test(String(href || '')) ? href : null
            return safeHref ? (
              <a {...props} href={safeHref} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            )
          },
        }}
      >
        {markdownWithCitationLinks}
      </ReactMarkdown>
    </div>
  )
}

const MessageBubble = ({ message, copied, onCopy, onReport, onRetry, retryDisabled }) => {
  const isUser = message.role === 'user'
  const { canCopy, canReport, canRetry, hasContent, isStreamingOrSlow } = getMessageActions(message)
  const canAct = canCopy || canReport || canRetry
  const status = message?.status
  const sources = Array.isArray(message?.sources) ? message.sources : []
  const showSources = !isUser && status === 'completed' && sources.length > 0

  return (
    <div className={`ai-helper-message ${isUser ? 'ai-helper-message--user' : ''}`}>
      <div className="ai-helper-message__label">{isUser ? 'You' : 'Ask AI'}</div>
      <div
        className={`ai-helper-message__bubble${canAct ? ' ai-helper-message__bubble--actionable' : ''}`}
      >
        {message.content ? (
          isUser ? (
            <span>{message.content}</span>
          ) : (
            renderAssistantContent(message.content)
          )
        ) : status === MESSAGE_STATUS_SLOW ? (
          <span className="ai-helper-muted" aria-live="polite">
            Still working. This can take longer than usual.
          </span>
        ) : isStreamingOrSlow ? (
          <span className="ai-helper-muted" aria-live="polite">
            {message?.pipeline_status || 'Thinking...'}
          </span>
        ) : hasContent ? (
          <span className="ai-helper-muted">No content was returned.</span>
        ) : (
          <span className="ai-helper-muted">No response.</span>
        )}
        {showSources ? (
          <div className="ai-helper-message__sources" aria-label="Sources">
            <div className="ai-helper-message__sources-label">Retrieved sources</div>
            <div className="ai-helper-message__sources-list">
              {sources.map((source, index) => {
                const sourceType = String(source?.source_type || '')
                if (sourceType === 'system_guide') {
                  const version = Number(source?.guide_version)
                  const versionLabel =
                    Number.isInteger(version) && version > 0 ? ` (v${version})` : ''
                  const displayLabel = source?.display_label || 'VMECC System Guide'

                  return (
                    <div
                      key={`system-guide-${source?.source_id || index}`}
                      className="ai-helper-message__source-guide"
                      aria-label={`Internal application guidance: ${source?.title || 'VMECC System Guide'}`}
                    >
                      <BookOpenText size={14} aria-hidden="true" />
                      <span>
                        {source?.source_id ? `${source.source_id} — ` : ''}
                        {displayLabel}: {source?.title || 'System guidance'}
                        {versionLabel}
                      </span>
                    </div>
                  )
                }

                const documentId = Number(source?.document_id)
                if (!Number.isInteger(documentId) || documentId < 1) {
                  return (
                    <div
                      key={`knowledge-${source?.source_id || index}`}
                      className="ai-helper-message__source-guide"
                      aria-label={`Internal knowledge source: ${source?.title || 'VMECC knowledge'}`}
                    >
                      <BookOpenText size={14} aria-hidden="true" />
                      <span>
                        {source?.source_id ? `${source.source_id} — ` : ''}
                        {source?.title || 'VMECC knowledge'}
                      </span>
                    </div>
                  )
                }

                const startPage = Number(source?.page_start)
                const endPage = Number(source?.page_end)
                const pageLabel =
                  Number.isInteger(startPage) && startPage > 0
                    ? endPage > startPage
                      ? ` - pages ${startPage}-${endPage}`
                      : ` - page ${startPage}`
                    : ''
                const href = `${buildAiHelperDocumentFileUrl(documentId)}${
                  Number.isInteger(startPage) && startPage > 0 ? `#page=${startPage}` : ''
                }`

                return (
                  <a
                    key={`${documentId}-${startPage || 'document'}-${index}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ai-helper-message__source-link"
                    aria-label={`Open source ${source?.title || 'knowledge document'}${pageLabel}`}
                  >
                    {source?.source_id ? `${source.source_id} — ` : ''}
                    {source?.title || 'Knowledge document'}
                    {pageLabel}
                  </a>
                )
              })}
            </div>
          </div>
        ) : null}
        {canAct ? (
          <div className="ai-helper-message__actions">
            {canRetry ? (
              <CTooltip content="Retry response" placement="top">
                <button
                  type="button"
                  className="ai-helper-message__action"
                  onClick={() => onRetry(message)}
                  aria-label="Retry Ask AI response"
                  title="Retry response"
                  disabled={retryDisabled}
                >
                  <RotateCcw size={14} />
                </button>
              </CTooltip>
            ) : null}
            {canCopy ? (
              <CTooltip content={copied ? 'Copied' : 'Copy response'} placement="top">
                <button
                  type="button"
                  className="ai-helper-message__action"
                  onClick={() => onCopy(message)}
                  aria-label="Copy Ask AI response"
                  title="Copy response"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </CTooltip>
            ) : null}
            {canReport ? (
              <CTooltip content="Report response" placement="top">
                <button
                  type="button"
                  className="ai-helper-message__action"
                  onClick={() => onReport(message)}
                  aria-label="Report Ask AI response"
                  title="Report response"
                >
                  <Flag size={14} />
                </button>
              </CTooltip>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default MessageBubble
