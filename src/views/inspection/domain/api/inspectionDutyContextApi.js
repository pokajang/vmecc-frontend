import { apiRequest } from 'src/services/apiClient'

const text = (value) => String(value || '').trim()
const DUTY_CONFIRMATION_ENABLED =
  String(import.meta.env.VITE_INSPECTION_DUTY_CONFIRMATION_ENABLED || '').toLowerCase() === 'true'

export const fetchInspectionDutyContext = async () => {
  const response = await apiRequest('/inspection/duty-context')
  return response?.data || null
}

export const confirmInspectionDutyContext = async ({
  operation,
  contextVersion,
  teamId,
  shiftKey,
  formId,
  recordId,
  idempotencyKey,
  reason,
} = {}) => {
  const response = await apiRequest('/inspection/duty-context/confirm', {
    method: 'POST',
    body: JSON.stringify({
      operation: text(operation),
      contextVersion: text(contextVersion),
      ...(Number(teamId || 0) > 0 ? { teamId: Number(teamId) } : {}),
      ...(text(shiftKey) ? { shiftKey: text(shiftKey) } : {}),
      ...(text(formId) ? { formId: text(formId) } : {}),
      ...(text(recordId) ? { recordId: text(recordId) } : {}),
      ...(text(idempotencyKey) ? { idempotencyKey: text(idempotencyKey) } : {}),
      ...(text(reason) ? { reason: text(reason) } : {}),
    }),
  })
  return response?.data || null
}

export const dutyConfirmationHeaders = (token) => {
  const value = text(token)
  return value ? { 'X-Duty-Confirmation': value } : {}
}

export const resolveInspectionDutyConfirmation = async (binding = {}) => {
  if (!DUTY_CONFIRMATION_ENABLED) return ''

  const context = await fetchInspectionDutyContext()
  if (!context) throw new Error('Unable to verify the current duty assignment.')
  if (context.status === 'ambiguous') {
    const error = new Error('Select your active team and shift before continuing.')
    error.code = 'duty_context_ambiguous'
    error.context = context
    throw error
  }
  if (
    !['assigned', 'inferred'].includes(text(context.status).toLowerCase()) ||
    text(context.confidence).toLowerCase() !== 'high'
  ) {
    const error = new Error('No active duty assignment is available for this action.')
    error.code = 'duty_context_unmatched'
    error.context = context
    throw error
  }

  const confirmation = await confirmInspectionDutyContext({
    ...binding,
    contextVersion: context.contextVersion,
    teamId: context.teamId,
    shiftKey: context.shiftKey,
  })
  return text(confirmation?.dutyConfirmationToken)
}
