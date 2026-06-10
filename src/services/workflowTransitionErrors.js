const FIELD_KEY_MAP = {
  remarks: 'remarks',
  role: 'role',
  stage: 'stage',
  status: 'status',
}

const normalizeFieldErrors = (errors) => {
  if (!errors || typeof errors !== 'object') return {}
  const mapped = {}
  Object.entries(errors).forEach(([field, value]) => {
    const key = FIELD_KEY_MAP[field] || String(field || '').trim()
    if (!key) return
    const first = Array.isArray(value) ? value[0] : value
    const message = String(first || '').trim()
    if (message) mapped[key] = message
  })
  return mapped
}

export const parseWorkflowTransitionError = (
  error,
  fallbackMessage = 'Unable to process workflow action. Please retry.',
) => {
  const payload = error?.payload && typeof error.payload === 'object' ? error.payload : {}
  const fieldErrors = normalizeFieldErrors(payload?.errors)
  const preferredFieldMessage =
    fieldErrors.remarks || fieldErrors.role || fieldErrors.stage || fieldErrors.status || ''
  const message =
    preferredFieldMessage ||
    String(payload?.message || error?.message || '').trim() ||
    fallbackMessage
  return {
    message,
    fieldErrors,
    status: Number(error?.status || 0) || 0,
    isValidation: Number(error?.status || 0) === 422 || Object.keys(fieldErrors).length > 0,
  }
}
