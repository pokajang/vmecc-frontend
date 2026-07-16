import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const NORMALIZED_NEWLINE_SOURCE = (value) => {
  const normalized = String(value || '').replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  const output = []

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index]
    const nextLine = lines[index + 1]
    output.push(
      nextLine !== undefined && currentLine !== '' && nextLine !== '' && nextLine !== ' '
        ? `${currentLine}  `
        : currentLine,
    )
  }

  return output.join('\n')
}

const MarkdownLink = ({ children, href = '', node: _node, ...props }) => {
  if (!href) return <span>{children}</span>

  const opensNewTab = /^https?:\/\//i.test(href)

  return (
    <a
      {...props}
      href={href}
      {...(opensNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

const MarkdownImage = ({ alt = '' }) =>
  alt ? <span className="ai-helper-knowledge-reader__markdown-image-note">Image: {alt}</span> : null

const MarkdownTable = ({ children, node: _node, ...props }) => (
  <div
    className="ai-helper-knowledge-reader__markdown-table-scroll"
    role="region"
    aria-label="Scrollable table"
    tabIndex={0}
  >
    <table {...props}>{children}</table>
  </div>
)

const MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
  img: MarkdownImage,
  table: MarkdownTable,
}

const MarkdownDocument = ({ source }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS} skipHtml>
    {NORMALIZED_NEWLINE_SOURCE(source)}
  </ReactMarkdown>
)

export default MarkdownDocument
