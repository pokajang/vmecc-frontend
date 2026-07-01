export const STORAGE_KEY = 'vmecc_ai_helper_open'
export const LANGUAGE_STORAGE_KEY = 'vmecc_ai_helper_language'
export const KNOWLEDGE_SCOPE_GLOBAL = 'global'
export const KNOWLEDGE_SCOPE_MODULE = 'module'
export const KNOWLEDGE_VIEW_UPLOAD = 'upload'
export const KNOWLEDGE_VIEW_MARKDOWN = 'markdown'
export const KNOWLEDGE_VIEW_LIST = 'list'
export const KNOWLEDGE_READER_TAB_ORIGINAL = 'original'
export const KNOWLEDGE_READER_TAB_EXTRACTED = 'extracted'
export const KNOWLEDGE_READER_TAB_METADATA = 'metadata'
export const AI_HELPER_LIST_STALE_MS = 60000
export const AI_HELPER_LANDING_GROUP_LIMIT = 2
export const AI_HELPER_CONTEXT_STALE_MS = 60000

export const MESSAGE_STATUS_COMPLETED = 'completed'
export const MESSAGE_STATUS_STREAMING = 'streaming'
export const MESSAGE_STATUS_SLOW = 'slow'
export const MESSAGE_STATUS_FAILED = 'failed'
export const MESSAGE_STATUS_ABORTED = 'aborted'

export const MESSAGE_STATUSES = new Set([
  MESSAGE_STATUS_COMPLETED,
  MESSAGE_STATUS_STREAMING,
  MESSAGE_STATUS_SLOW,
  MESSAGE_STATUS_FAILED,
  MESSAGE_STATUS_ABORTED,
])

export const normalizeMessageStatus = (status) => {
  if (MESSAGE_STATUSES.has(status)) return status
  return MESSAGE_STATUS_COMPLETED
}

export const messageHasContent = (message = {}) =>
  Boolean(String(message.content || '').trim()) ||
  Boolean(String(message.partial_content || '').trim())

export const buildFailedAssistantMessage = (text, context = {}) => ({
  content: text,
  status: MESSAGE_STATUS_FAILED,
  retry_prompt: context.retry_prompt || null,
  retry_context: context.retry_context || null,
  request_id: context.request_id || null,
})

export const getMessageActions = (message = {}) => {
  const status = normalizeMessageStatus(message?.status)
  const isUser = message.role === 'user'

  if (isUser) {
    return {
      canCopy: false,
      canReport: false,
      canRetry: false,
      hasContent: Boolean(String(message.content || '').trim()),
      isStreamingOrSlow: [MESSAGE_STATUS_STREAMING, MESSAGE_STATUS_SLOW].includes(status),
    }
  }

  const hasContent = Boolean(String(message.content || '').trim())
  const isInterrupted = status === MESSAGE_STATUS_ABORTED && !message.partial_content

  return {
    hasContent: hasContent && !isInterrupted,
    canCopy:
      hasContent &&
      !isInterrupted &&
      ![MESSAGE_STATUS_STREAMING, MESSAGE_STATUS_SLOW].includes(status),
    canReport:
      hasContent &&
      !isInterrupted &&
      ![MESSAGE_STATUS_STREAMING, MESSAGE_STATUS_SLOW, MESSAGE_STATUS_FAILED].includes(status),
    canRetry:
      [MESSAGE_STATUS_FAILED, MESSAGE_STATUS_ABORTED].includes(status) &&
      Boolean(message.retry_prompt),
    isStreamingOrSlow: [MESSAGE_STATUS_STREAMING, MESSAGE_STATUS_SLOW].includes(status),
  }
}

export const isAiHelperListFresh = (loadedAt) =>
  Boolean(loadedAt) && Date.now() - loadedAt < AI_HELPER_LIST_STALE_MS

export const RESPONSE_LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'en', label: 'EN' },
  { value: 'bm', label: 'BM' },
]

export const normalizeResponseLanguage = (value) =>
  RESPONSE_LANGUAGE_OPTIONS.some((option) => option.value === value) ? value : 'bm'

export const responseLanguageLabel = (value) =>
  RESPONSE_LANGUAGE_OPTIONS.find((option) => option.value === value)?.label || 'Auto'

export const KNOWLEDGE_MODULE_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'messages', label: 'Messages' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'leave', label: 'Leave' },
  { key: 'overtime', label: 'Overtime' },
  { key: 'staff', label: 'Staff' },
  { key: 'teams', label: 'Teams' },
  { key: 'roster', label: 'Roster' },
  { key: 'inspection', label: 'Inspection' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Settings' },
]

export const moduleKeyForNavPath = (path = '') => {
  const value = String(path || '')
  if (value === '/dashboard') return 'dashboard'
  if (value === '/messages') return 'messages'
  if (value.startsWith('/payroll') || value.startsWith('/staff/salary-claims')) return 'payroll'
  if (value.startsWith('/staff/set-salary')) return 'payroll'
  if (value.startsWith('/leave') || value.startsWith('/staff/leave-management')) return 'leave'
  if (value.startsWith('/overtime') || value.startsWith('/staff/overtime-management')) {
    return 'overtime'
  }
  if (value.startsWith('/staff/details') || value.startsWith('/staff/profile')) return 'staff'
  if (value.startsWith('/team')) return 'teams'
  if (value.startsWith('/roster') || value.startsWith('/staff/shift-settings')) return 'roster'
  if (value.startsWith('/inspection')) return 'inspection'
  if (value.startsWith('/report')) return 'reports'
  if (value.startsWith('/settings')) return 'settings'
  return null
}

export const collectVisibleModuleKeys = (items = [], keys = new Set()) => {
  items.forEach((item) => {
    const key = moduleKeyForNavPath(item?.to)
    if (key) keys.add(key)
    if (Array.isArray(item?.items)) collectVisibleModuleKeys(item.items, keys)
  })
  return keys
}

export const moduleLabel = (moduleKey) =>
  KNOWLEDGE_MODULE_OPTIONS.find((option) => option.key === moduleKey)?.label || moduleKey

export const knowledgeScopeLabel = (entry = {}) => {
  if (!entry.module_key && !entry.route_key) return 'General guidance'
  if (entry.module_key) return `${moduleLabel(entry.module_key)} module`
  return 'Page guidance'
}

export const knowledgeEntryName = (entry = {}) =>
  entry.source_filename || entry.title || 'Uploaded PDF'

export const makeLocalMessage = (role, content, status = 'completed', extra = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
  status,
  created_at: new Date().toISOString(),
  ...extra,
})

export const formatHistoryTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export const formatKnowledgeDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export const isMarkdownKnowledgeEntry = (entry = {}) => {
  const mimeType = String(entry?.source_mime || '').toLowerCase()
  const filename = String(entry?.source_filename || '').toLowerCase()

  return mimeType === 'text/markdown' || filename.endsWith('.md') || filename.endsWith('.markdown')
}

export const formatFileSize = (value) => {
  const size = Number(value || 0)
  if (!size) return ''
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export const statusLabel = (status) => {
  if (status === 'processing') return 'Processing'
  if (status === 'disabled') return 'Disabled'
  if (status === 'failed') return 'Failed'
  return 'Active'
}

export const knowledgeUseLabel = (entry = {}) => {
  if (entry.status === 'processing') return 'Processing'
  if (entry.status === 'failed') return 'Failed'
  if (entry.review_status === 'rejected') return 'Rejected'
  if (entry.visibility === 'shared' && entry.review_status === 'pending') return 'Pending review'
  if (entry.visibility === 'shared' && entry.review_status === 'approved') {
    return entry.active ? 'Approved shared' : 'Approved shared - disabled'
  }
  if (entry.visibility === 'personal') {
    return entry.active ? 'Ready for you' : 'Personal - disabled'
  }
  return statusLabel(entry.status)
}

export const safeAiHelperError = (
  error,
  fallback = 'Could not reach Ask AI. Check your connection and try again.',
) => {
  const status = Number(error?.status || 0)
  const code = error?.payload?.code

  if (error?.code === 'AI_HELPER_STREAM_INCOMPLETE') {
    return 'The Ask AI response stopped before it finished. Try again.'
  }

  if (error?.code === 'AI_HELPER_STREAM_ABORTED') {
    return 'Ask AI response was stopped.'
  }

  if (error?.code === 'AI_HELPER_STREAM_TRANSPORT_ERROR') {
    return 'Ask AI response could not be streamed. Please try again.'
  }

  if (code === 'AI_HELPER_UNAVAILABLE' || status === 503) {
    return 'Ask AI is not ready yet. Please contact an administrator.'
  }

  if (status === 429) {
    const retryAfter = Number(error?.payload?.retry_after || error?.payload?.retryAfter || 0)
    if (retryAfter > 0) {
      return `Ask AI is busy. Try again in ${Math.ceil(retryAfter)}s.`
    }
    return 'Ask AI is receiving too many requests. Try again shortly.'
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  if (status === 419) {
    return 'Your session needs to be refreshed. Reload the page and try again.'
  }

  return fallback
}

export const getPromptStarters = (context = {}) => {
  const moduleKey = String(context?.module_key || '').toLowerCase()
  const path = String(context?.path || '').toLowerCase()
  const title = String(context?.title || context?.route_name || 'this page')

  if (moduleKey.includes('inspection') || path.includes('/inspection')) {
    return [
      'What can I do on this Inspection page?',
      'What should I check before submitting an inspection?',
      'What guidance has been uploaded?',
      'Summarize the uploaded guidance.',
    ]
  }

  if (path.includes('/report/erco')) {
    return [
      'What should be included in this ERCO report?',
      'Help me review this ERCO report before submitting.',
      'What guidance has been uploaded?',
      'Summarize the uploaded guidance.',
    ]
  }

  if (moduleKey.includes('payroll') || path.includes('/payroll') || path.includes('/salary')) {
    return [
      'What can I do on this Payroll page?',
      'Explain the salary or claim workflow.',
      'What guidance has been uploaded?',
      'Summarize the uploaded guidance.',
    ]
  }

  if (path.includes('/leave')) {
    return [
      'What can I do on this Leave page?',
      'Explain the leave approval workflow.',
      'What guidance has been uploaded?',
      'Summarize the uploaded guidance.',
    ]
  }

  if (path.includes('/overtime')) {
    return [
      'What can I do on this Overtime page?',
      'Explain the overtime approval workflow.',
      'What guidance has been uploaded?',
      'Summarize the uploaded guidance.',
    ]
  }

  if (moduleKey.includes('messages') || path.includes('/messages')) {
    return [
      'What can I do in Messages?',
      'How do I find or start a conversation?',
      'What guidance has been uploaded?',
      'Summarize the uploaded guidance.',
    ]
  }

  if (path.includes('/settings')) {
    return [
      'What can I configure on this Settings page?',
      'Explain role permissions.',
      'What guidance has been uploaded?',
      'Summarize the uploaded guidance.',
    ]
  }

  if (moduleKey.includes('dashboard') || path.includes('/dashboard')) {
    return [
      'What does this dashboard show?',
      'Summarize what I should check first.',
      'What guidance has been uploaded?',
      'Summarize the uploaded guidance.',
    ]
  }

  return [
    `What can I do on ${title}?`,
    'Summarize what I should check here.',
    'What guidance has been uploaded?',
    'Summarize the uploaded guidance.',
  ]
}
