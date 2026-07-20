import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import remarkAiCitations from './remarkAiCitations'

const SOURCE_CITATION_TARGET_PATTERN = /^#ai-helper-source-(S[1-9]\d{0,3}(?:,S[1-9]\d{0,3}){0,11})$/
const SAFE_EXTERNAL_LINK_PATTERN = /^(https?:|mailto:)/i

const AiResponseHeading = ({ children }) => (
  <h3 className="ai-helper-message__section-heading">{children}</h3>
)

const markdownComponents = {
  h1: AiResponseHeading,
  h2: AiResponseHeading,
  h3: AiResponseHeading,
  h4: AiResponseHeading,
  h5: AiResponseHeading,
  h6: AiResponseHeading,
  blockquote: ({ children }) => (
    <blockquote className="ai-helper-message__quote">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div
      className="ai-helper-message__table-wrap"
      role="region"
      aria-label="Scrollable table in Ask AI response"
      tabIndex={0}
    >
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => (
    <div
      className="ai-helper-message__code-block"
      role="region"
      aria-label="Code block in Ask AI response"
      tabIndex={0}
    >
      <pre>{children}</pre>
    </div>
  ),
  code: ({ children }) => <code className="ai-helper-message__code">{children}</code>,
  hr: () => <hr className="ai-helper-message__divider" />,
  img: ({ alt }) => (
    <span className="ai-helper-message__image-omitted" role="note">
      Image omitted from AI response{String(alt || '').trim() ? `: ${String(alt).trim()}` : '.'}
    </span>
  ),
  a: ({ href, children }) => {
    const citationMatch = SOURCE_CITATION_TARGET_PATTERN.exec(String(href || ''))
    if (citationMatch) {
      const sourceIds = citationMatch[1].split(',')
      const accessibleIds = sourceIds.join(' and ')

      return (
        <span
          className="ai-helper-message__citation"
          aria-label={`Retrieved ${sourceIds.length === 1 ? 'source' : 'sources'} ${accessibleIds}`}
          title={`Retrieved ${sourceIds.length === 1 ? 'source' : 'sources'} ${accessibleIds}`}
        >
          {children}
        </span>
      )
    }

    const safeHref = SAFE_EXTERNAL_LINK_PATTERN.test(String(href || '')) ? href : null
    if (!safeHref) {
      return <span className="ai-helper-message__unsafe-link">{children}</span>
    }

    return (
      <a href={safeHref} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    )
  },
}

const AiResponseContent = ({ content }) => {
  const markdown = String(content || '')

  if (!markdown.trim()) {
    return <div className="ai-helper-message__content" dir="auto" />
  }

  return (
    <div className="ai-helper-message__content" dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkAiCitations]}
        skipHtml
        components={markdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

export default AiResponseContent
