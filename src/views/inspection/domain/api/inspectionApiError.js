const text = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeFieldErrors = (errors) => {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {}

  return Object.entries(errors).reduce((result, [field, messages]) => {
    const normalized = (Array.isArray(messages) ? messages : [messages]).map(text).filter(Boolean)
    if (normalized.length > 0) result[text(field)] = normalized
    return result
  }, {})
}

const isNetworkFailure = (error, status) =>
  status === 0 &&
  (error?.name === 'TypeError' ||
    /failed to fetch|network|offline|connection|timeout/i.test(text(error?.message)))

const isRetryableStatus = (status) =>
  status === 0 || status === 408 || status === 429 || status >= 500

export const normalizeInspectionApiError = (error, fallbackMessage = 'Request failed.') => {
  const payload =
    error?.payload && typeof error.payload === 'object' && !Array.isArray(error.payload)
      ? error.payload
      : {}
  const status = Math.max(0, Number(error?.status || payload?.status || 0) || 0)
  const fieldErrors = normalizeFieldErrors(payload?.errors)
  const [firstField = '', firstMessages = []] = Object.entries(fieldErrors)[0] || []
  const code = text(payload?.code || error?.code)
  const message =
    text(firstMessages[0]) ||
    text(payload?.message) ||
    text(error?.message) ||
    text(fallbackMessage)

  return {
    status,
    code,
    message,
    fieldErrors,
    firstField,
    retryable: isRetryableStatus(status),
    networkFailure: isNetworkFailure(error, status),
    authenticationRequired: status === 401,
    authorizationDenied: status === 403,
    csrfExpired: status === 419,
    validationFailed: status === 422,
    conflict: status === 409,
    payload,
    originalError: error,
  }
}

export const getInspectionApiErrorMessage = (error, fallbackMessage) =>
  normalizeInspectionApiError(error, fallbackMessage).message
