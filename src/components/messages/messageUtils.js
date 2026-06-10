const EMPTY = '--'

export const formatChatTime = (value) => {
  if (!value) return EMPTY
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return EMPTY
  const now = new Date()
  const isToday = dt.toDateString() === now.toDateString()
  if (isToday) {
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return dt.toLocaleDateString()
}

export const getPreview = (message) => {
  const body = (message?.body || '').replace(/\s+/g, ' ').trim()
  const snippet = body ? body.slice(0, 80) : ''
  return snippet || 'Image'
}

export const getDraftPreview = (draft) => {
  const body = (draft || '').replace(/\s+/g, ' ').trim()
  if (!body) return ''
  return body.slice(0, 80)
}

export const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export const EMPTY_VALUE = EMPTY
