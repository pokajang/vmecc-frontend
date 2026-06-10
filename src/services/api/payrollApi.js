import { apiRequest, buildUrl, getClientId } from './httpClient'

export const fetchPayrollClaims = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/payroll/claims?${query.toString()}` : '/payroll/claims'
  return apiRequest(path)
}

export const fetchPayrollPayslips = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString() ? `/payroll/payslips?${query.toString()}` : '/payroll/payslips'
  return apiRequest(path)
}

export const downloadPayrollPayslip = async (id) => {
  const numericId = Number(id || 0) || 0
  if (!numericId) {
    const error = new Error('Missing payslip id')
    error.status = 400
    throw error
  }
  const response = await fetch(buildUrl(`/payroll/payslips/${numericId}/download`), {
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

export const fetchPayrollClaim = (id) => apiRequest(`/payroll/claims/${id}`)
export const createPayrollClaim = (payload, options = {}) =>
  apiRequest('/payroll/claims', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
    ...options,
  })
export const updatePayrollClaim = (id, payload, options = {}) =>
  apiRequest(`/payroll/claims/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload || {}),
    ...options,
  })
export const deletePayrollClaimApi = (id, options = {}) =>
  apiRequest(`/payroll/claims/${id}`, { method: 'DELETE', ...options })
export const cancelPayrollClaim = (id, payload = {}, options = {}) =>
  apiRequest(`/payroll/claims/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(payload),
    ...options,
  })

export const fetchPayrollClaimDrafts = (claimType = '') => {
  const query = new URLSearchParams()
  if (claimType) query.set('claim_type', claimType)
  const path = query.toString()
    ? `/payroll/claims/drafts?${query.toString()}`
    : '/payroll/claims/drafts'
  return apiRequest(path)
}
export const savePayrollClaimDraftApi = (payload, options = {}) =>
  apiRequest('/payroll/claims/drafts', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
    ...options,
  })
export const deletePayrollClaimDraftApi = (id, options = {}) =>
  apiRequest(`/payroll/claims/drafts/${id}`, { method: 'DELETE', ...options })

export const fetchStaffPayrollClaims = (params = {}) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.append(key, value)
  })
  const path = query.toString()
    ? `/staff/salary-claims/records?${query.toString()}`
    : '/staff/salary-claims/records'
  return apiRequest(path)
}

const encodePathSegment = (value) => encodeURIComponent(String(value ?? ''))

export const fetchStaffPayrollClaim = (ownerId, claimId) =>
  apiRequest(
    `/staff/salary-claims/records/${encodePathSegment(ownerId)}/${encodePathSegment(claimId)}`,
  )
export const checkStaffPayrollClaim = (ownerId, claimId, payload = {}) =>
  apiRequest(
    `/staff/salary-claims/records/${encodePathSegment(ownerId)}/${encodePathSegment(claimId)}/check`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
export const reviewStaffPayrollClaim = (ownerId, claimId, payload = {}) =>
  apiRequest(
    `/staff/salary-claims/records/${encodePathSegment(ownerId)}/${encodePathSegment(claimId)}/review`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
export const approveStaffPayrollClaim = (ownerId, claimId, payload = {}) =>
  apiRequest(
    `/staff/salary-claims/records/${encodePathSegment(ownerId)}/${encodePathSegment(claimId)}/approve`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
export const rejectStaffPayrollClaim = (ownerId, claimId, payload = {}) =>
  apiRequest(
    `/staff/salary-claims/records/${encodePathSegment(ownerId)}/${encodePathSegment(claimId)}/reject`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
export const cancelStaffPayrollClaim = (ownerId, claimId, payload = {}) =>
  apiRequest(
    `/staff/salary-claims/records/${encodePathSegment(ownerId)}/${encodePathSegment(claimId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
export const markStaffPayrollClaimPaid = (ownerId, claimId, payload = {}) =>
  apiRequest(
    `/staff/salary-claims/records/${encodePathSegment(ownerId)}/${encodePathSegment(claimId)}/mark-paid`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
export const unmarkStaffPayrollClaimPaid = (ownerId, claimId, payload = {}) =>
  apiRequest(
    `/staff/salary-claims/records/${encodePathSegment(ownerId)}/${encodePathSegment(claimId)}/unmark-paid`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
export const bulkMarkStaffPayrollClaimsPaid = (payload = {}) =>
  apiRequest('/staff/salary-claims/records/mark-paid/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
export const bulkUnmarkStaffPayrollClaimsPaid = (payload = {}) =>
  apiRequest('/staff/salary-claims/records/unmark-paid/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
