import React from 'react'
import { CTooltip } from '@coreui/react'
import { Check, Copy, Flag, RotateCcw } from 'lucide-react'

import { MESSAGE_STATUS_SLOW, getMessageActions } from './constants'
import { buildAiHelperKnowledgeFileUrl } from 'src/services/apiClient'

const renderAssistantContent = (content) => {
  const lines = String(content || '').split(/\r?\n/)
  const blocks = []
  let paragraphLines = []
  let listType = null
  let listItems = []
  let orderedListStart = 1

  const flushParagraph = () => {
    if (!paragraphLines.length) return

    const key = `p-${blocks.length}`
    blocks.push(
      <p key={key}>
        {paragraphLines.map((line, index) => (
          <React.Fragment key={`${key}-${index}`}>
            {index ? <br /> : null}
            {line}
          </React.Fragment>
        ))}
      </p>,
    )
    paragraphLines = []
  }

  const flushList = () => {
    if (!listType || !listItems.length) {
      listItems = []
      listType = null
      orderedListStart = 1
      return
    }

    const key = `list-${blocks.length}`
    if (listType === 'ol') {
      const children = listItems.map((item, index) => (
        <li key={`${key}-${index}`}>
          <span>{item.text}</span>
          {item.children.length ? (
            <ul>
              {item.children.map((child, childIndex) => (
                <li key={`${key}-${index}-${childIndex}`}>{child}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))

      blocks.push(
        <ol key={key} start={orderedListStart}>
          {children}
        </ol>,
      )
    } else {
      const children = listItems.map((item, index) => <li key={`${key}-${index}`}>{item}</li>)
      blocks.push(<ul key={key}>{children}</ul>)
    }

    listType = null
    listItems = []
    orderedListStart = 1
  }

  const addParagraphLine = (line) => {
    paragraphLines.push(String(line))
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    const unorderedMatch = trimmed.match(/^[-*\u2022]\s*(.*)$/)
    const orderedMatch = trimmed.match(/^(\d+)[.)]\s*(.*)$/)

    if (!trimmed) {
      flushParagraph()
      return
    }

    if (orderedMatch) {
      const itemText = orderedMatch[2]
      const itemNumber = Number.parseInt(orderedMatch[1], 10) || 1
      if (!itemText.trim()) {
        flushParagraph()
        flushList()
        addParagraphLine(line)
        return
      }

      flushParagraph()
      if (listType === 'ul') {
        flushList()
      }

      if (listType !== 'ol') {
        listType = 'ol'
        orderedListStart = itemNumber
      } else if (listItems.length) {
        const expectedNumber = orderedListStart + listItems.length
        const continuesSequence = itemNumber === 1 || itemNumber === expectedNumber
        if (!continuesSequence) {
          flushList()
          listType = 'ol'
          orderedListStart = itemNumber
        }
      }

      listItems.push({ text: itemText, children: [] })
      return
    }

    if (unorderedMatch) {
      const itemText = unorderedMatch[1]
      if (!itemText.trim()) {
        flushParagraph()
        flushList()
        addParagraphLine(line)
        return
      }

      flushParagraph()
      if (listType === 'ol' && listItems.length) {
        listItems[listItems.length - 1].children.push(itemText)
        return
      }

      if (listType && listType !== 'ul') {
        flushList()
      }
      listType = 'ul'
      listItems.push(itemText)
      return
    }

    flushList()
    addParagraphLine(line)
  })

  flushParagraph()
  flushList()

  if (!blocks.length) {
    return <div className="ai-helper-message__content" />
  }

  return <div className="ai-helper-message__content">{blocks}</div>
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
            Thinking...
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
                const knowledgeId = Number(source?.knowledge_id)
                if (!Number.isInteger(knowledgeId) || knowledgeId < 1) return null

                const startPage = Number(source?.page_start)
                const endPage = Number(source?.page_end)
                const pageLabel =
                  Number.isInteger(startPage) && startPage > 0
                    ? endPage > startPage
                      ? ` - pages ${startPage}-${endPage}`
                      : ` - page ${startPage}`
                    : ''
                const href = `${buildAiHelperKnowledgeFileUrl(knowledgeId)}${
                  Number.isInteger(startPage) && startPage > 0 ? `#page=${startPage}` : ''
                }`

                return (
                  <a
                    key={`${knowledgeId}-${startPage || 'document'}-${index}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ai-helper-message__source-link"
                    aria-label={`Open source ${source?.title || 'knowledge document'}${pageLabel}`}
                  >
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
