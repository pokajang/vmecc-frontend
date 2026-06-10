import { apiRequest, buildUrl, getClientId } from './httpClient'

export const fetchOvertimeApprovalRules = () => apiRequest('/settings/overtime-approval-rules')
export const saveOvertimeApprovalRules = (payload) =>
  apiRequest('/settings/overtime-approval-rules', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })

export const fetchOvertimeRateSettings = () => apiRequest('/settings/overtime-rate-settings')
export const saveOvertimeRateSettings = (payload) =>
  apiRequest('/settings/overtime-rate-settings', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })

export const fetchSalaryWorkflowRules = () => apiRequest('/settings/salary-workflow-rules')
export const saveSalaryWorkflowRulesApi = (payload) =>
  apiRequest('/settings/salary-workflow-rules', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })

export const fetchSalaryStatutoryRates = () => apiRequest('/settings/salary-statutory-rates')
export const saveSalaryStatutoryRates = (payload) =>
  apiRequest('/settings/salary-statutory-rates', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })

export const fetchPayrollCompanyProfile = () => apiRequest('/settings/payroll-company-profile')
export const savePayrollCompanyProfile = (payload) =>
  apiRequest('/settings/payroll-company-profile', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })

export const fetchSystemMaintenanceSetting = () => apiRequest('/settings/system-maintenance')
export const saveSystemMaintenanceSetting = (payload) =>
  apiRequest('/settings/system-maintenance', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })

export const uploadWorkflowAttachment = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest('/workflow/attachments', {
    method: 'POST',
    body: formData,
  })
}

export const downloadWorkflowAttachment = async (id) => {
  const response = await fetch(buildUrl(`/workflow/attachments/${id}`), {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: '*/*',
      ...(getClientId() ? { 'X-Client-Id': getClientId() } : {}),
    },
  })

  if (!response.ok) {
    let message = 'Request failed'
    try {
      const payload = await response.json()
      message = payload?.message || message
    } catch {
      const text = await response.text()
      if (text) message = text
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  const blob = await response.blob()
  const contentDisposition = response.headers.get('content-disposition') || ''
  const filenameMatch = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(contentDisposition)
  const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : ''
  return {
    blob,
    filename: String(filename || '').trim(),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  }
}

export const deleteWorkflowAttachment = (id) =>
  apiRequest(`/workflow/attachments/${id}`, {
    method: 'DELETE',
  })

export const fetchWorkflowNotifications = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString()
    ? `/workflow/notifications?${query.toString()}`
    : '/workflow/notifications'
  return apiRequest(path)
}

export const fetchWorkflowNotificationUnreadCount = (module = '') => {
  const query = new URLSearchParams()
  if (module) query.set('module', module)
  const path = query.toString()
    ? `/workflow/notifications/unread-count?${query.toString()}`
    : '/workflow/notifications/unread-count'
  return apiRequest(path)
}

export const markWorkflowNotificationRead = (id) =>
  apiRequest(`/workflow/notifications/${id}/read`, {
    method: 'POST',
  })

export const markAllWorkflowNotificationsRead = (module = '') => {
  const payload = module ? { module } : {}
  return apiRequest('/workflow/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const deleteWorkflowNotification = (id) =>
  apiRequest(`/workflow/notifications/${id}`, { method: 'DELETE' })

export const deleteAllWorkflowNotifications = () =>
  apiRequest('/workflow/notifications', { method: 'DELETE' })
