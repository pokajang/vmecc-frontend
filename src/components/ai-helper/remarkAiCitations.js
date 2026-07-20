const CITATION_PATTERN = /\[(S[1-9]\d{0,3}(?:\s*,\s*S[1-9]\d{0,3}){0,11})\]/g
const SKIPPED_NODE_TYPES = new Set([
  'code',
  'definition',
  'image',
  'imageReference',
  'inlineCode',
  'link',
  'linkReference',
])

const citationNodes = (value) => {
  const nodes = []
  let cursor = 0

  for (const match of value.matchAll(CITATION_PATTERN)) {
    const start = match.index ?? 0
    if (start > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, start) })
    }

    const sourceIds = match[1].split(/\s*,\s*/).filter(Boolean)
    const label = sourceIds.join(', ')
    nodes.push({
      type: 'link',
      url: `#ai-helper-source-${sourceIds.join(',')}`,
      children: [{ type: 'text', value: label }],
    })
    cursor = start + match[0].length
  }

  if (cursor === 0) return null
  if (cursor < value.length) {
    nodes.push({ type: 'text', value: value.slice(cursor) })
  }

  return nodes
}

const transformNode = (node) => {
  if (!node || SKIPPED_NODE_TYPES.has(node.type) || !Array.isArray(node.children)) return

  node.children = node.children.flatMap((child) => {
    if (child?.type === 'text') {
      return citationNodes(child.value) || child
    }

    transformNode(child)
    return child
  })
}

const remarkAiCitations = () => (tree) => {
  transformNode(tree)
}

export default remarkAiCitations
