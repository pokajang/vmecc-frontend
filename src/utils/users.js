export const EMPTY = '\u2014'

export const formatLastLogin = (value) => (value ? new Date(value).toLocaleString() : EMPTY)

export const formatRoles = (arr) => (arr?.length ? arr.join(', ') : EMPTY)

export const formatDateTime = (value) => {
  if (!value) return EMPTY
  const dt = new Date(value)
  return Number.isNaN(dt.getTime()) ? EMPTY : dt.toLocaleString()
}

export const getRecordTime = (record) => {
  const when = record?.timestamp || record?.logged_at || record?.created_at || record?.time || null
  if (!when) return null
  const dt = new Date(when)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export const formatDaysAgo = (value) => {
  if (!value) return null
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return null
  const now = new Date()
  const diffMs = now.getTime() - dt.getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

export const renderStatus = (status) => {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'success' || normalized === 'successful') return { color: 'success', label: 'Success' }
  if (normalized === 'failed' || normalized === 'fail') return { color: 'danger', label: 'Failed' }
  return { color: 'secondary', label: status || 'Unknown' }
}

export const toSlug = (value) => {
  if (!value) return 'user'
  const cleaned = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned || 'user'
}
