import React from 'react'
import { CBadge } from '@coreui/react'
import {
  formatFileSize,
  knowledgeEntryName,
  knowledgeScopeLabel,
  moduleLabel,
} from 'src/components/ai-helper/constants'

export const REVIEW_FILTERS = ['all', 'pending', 'approved', 'rejected', 'processing', 'failed']

export const REVIEW_FILTER_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing',
  failed: 'Failed',
  all: 'All',
}

export const SCOPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All scopes' },
  { value: 'global', label: 'General guidance' },
  { value: 'module', label: 'Module guidance' },
  { value: 'route', label: 'Page guidance' },
]

export const VISIBILITY_FILTER_OPTIONS = [
  { value: 'all', label: 'All visibility' },
  { value: 'shared', label: 'Shared guidance' },
  { value: 'personal', label: 'Personal guidance' },
]

export const truncate = (value, length = 120) => {
  const text = String(value || '').trim()
  if (text.length <= length) return text
  return `${text.slice(0, length).trim()}...`
}

export const uploaderName = (entry) => entry?.uploader_name || 'Unknown user'

export const formatBytes = (value) => {
  const size = Number(value || 0)
  if (!size) return '0 KB'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export const isEntryDisabled = (entry = {}) => entry.status === 'disabled' || entry.active === false

export const scopeSummary = (entry = {}) => {
  if (entry?.scope_type === 'module' && entry?.module_key) {
    return `${moduleLabel(entry.module_key)}`
  }
  if (entry?.scope_type === 'route' && entry?.route_key) return entry.route_key
  return 'General guidance'
}

export const scopeDetail = (entry = {}) => {
  if (entry?.scope_type === 'module' && entry?.module_key)
    return `${moduleLabel(entry.module_key)} module`
  if (entry?.scope_type === 'route' && entry?.route_key) return 'Page guidance'
  return knowledgeScopeLabel(entry)
}

export const reviewState = (entry = {}) => {
  if (entry.status === 'processing') return { label: 'Processing', color: 'warning' }
  if (entry.status === 'failed') return { label: 'Failed', color: 'danger' }
  if (entry.review_status === 'approved') return { label: 'Approved', color: 'success' }
  if (entry.review_status === 'rejected') return { label: 'Rejected', color: 'danger' }
  return { label: 'Pending', color: 'warning' }
}

export const getUseStateBadge = (entry = {}) => {
  if (entry.status === 'processing') return null
  if (entry.status === 'failed') return null
  if (isEntryDisabled(entry)) return { label: 'Disabled', color: 'secondary' }
  return {
    label: entry.visibility === 'personal' ? 'Personal' : 'Shared',
    color: entry.visibility === 'personal' ? 'info' : 'primary',
  }
}

export const renderStatusBadges = (entry = {}) => {
  const review = reviewState(entry)
  const useState = getUseStateBadge(entry)

  return (
    <div className="d-flex flex-wrap align-items-center gap-1">
      <CBadge color={review.color}>{review.label}</CBadge>
      {useState ? <CBadge color={useState.color}>{useState.label}</CBadge> : null}
    </div>
  )
}

export const buildKnowledgeSearchText = (entry = {}) =>
  [
    entry.title,
    entry.summary,
    entry.source_filename,
    uploaderName(entry),
    entry.module_key,
    entry.route_key,
    scopeSummary(entry),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

export const matchesKnowledgeFilters = (
  entry,
  { search = '', scope = 'all', status = 'all', visibility = 'all' } = {},
) => {
  const normalizedSearch = String(search || '')
    .trim()
    .toLowerCase()
  if (normalizedSearch && !buildKnowledgeSearchText(entry).includes(normalizedSearch)) return false
  if (status !== 'all') {
    if (status === 'processing' || status === 'failed') {
      if (String(entry?.status || '') !== status) return false
    } else if (String(entry?.review_status || '') !== status) {
      return false
    }
  }
  if (scope !== 'all' && String(entry?.scope_type || 'global') !== scope) return false
  if (visibility !== 'all' && String(entry?.visibility || 'shared') !== visibility) return false
  return true
}

export const knowledgeRowSummary = (entry = {}) =>
  truncate(entry.summary || knowledgeEntryName(entry), 110) || 'No summary available.'

export const knowledgeMetadata = (entry = {}) => {
  const safeEntry = entry || {}

  return {
    title: safeEntry.title || 'Untitled knowledge',
    fileName: knowledgeEntryName(safeEntry),
    scopeLabel: scopeDetail(safeEntry),
    scopeValue: scopeSummary(safeEntry),
    visibilityLabel: safeEntry.visibility === 'personal' ? 'Personal guidance' : 'Shared guidance',
    uploaderLabel: uploaderName(safeEntry),
    fileSizeLabel: formatFileSize(safeEntry.source_size) || 'Unknown size',
  }
}
