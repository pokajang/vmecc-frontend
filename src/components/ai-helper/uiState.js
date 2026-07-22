const TOKEN_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/

let currentUiState = null

const browserPath = () => (typeof window !== 'undefined' ? window.location.pathname : '/')

const token = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return TOKEN_PATTERN.test(normalized) ? normalized : null
}

const tokens = (values, limit) =>
  [...new Set((Array.isArray(values) ? values : []).map(token).filter(Boolean))].slice(0, limit)

export const sanitizeAiHelperUiState = (state = {}) => {
  const normalized = {
    record_status: token(state.record_status),
    current_step: token(state.current_step),
    record_kind: token(state.record_kind),
    selected_type: token(state.selected_type),
    missing_fields: tokens(state.missing_fields, 12),
    available_actions: tokens(state.available_actions, 8),
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(
      ([, value]) => value != null && (!Array.isArray(value) || value.length),
    ),
  )
}

export const publishAiHelperUiState = (state, path = browserPath()) => {
  const value = sanitizeAiHelperUiState(state)
  currentUiState = Object.keys(value).length ? { path, value } : null
}

export const clearAiHelperUiState = () => {
  currentUiState = null
}

export const getAiHelperUiState = (path = browserPath()) => {
  if (!currentUiState || currentUiState.path !== path) return null
  return { ...currentUiState.value }
}
