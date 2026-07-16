import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('src/services/apiClient', () => ({
  apiRequest,
  buildApiUrl: vi.fn((path) => path),
  fetchWithCsrfRetry: vi.fn(),
}))

vi.mock('../domain/storage/inspectionStorage', () => ({
  loadAllInspectionRecords: vi.fn(() => []),
  loadInspectionRecords: vi.fn(() => []),
  saveInspectionRecords: vi.fn(() => true),
}))

describe('inspection duty token propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_REPORT_API_TYPES', '*')
    vi.stubEnv('VITE_REPORT_LOCAL_FALLBACK_ENABLED', 'false')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('attaches a supplied token to report create and update requests', async () => {
    apiRequest.mockImplementation(async (path) => {
      if (String(path).startsWith('/reports?')) return { data: [] }
      return { data: {} }
    })
    const { persistInspectionRecord } = await import('../domain/api/inspectionApi')
    const row = {
      id: 'report-duty-1',
      displayId: 'INS-DUTY-1',
      reportType: 'inspection',
      status: 'Submitted',
      incidentType: 'General Inspection',
      description: 'Token propagation.',
      recordActionsVersion: 1,
      recordActions: { delete: { applicable: true, allowed: true } },
    }

    await persistInspectionRecord('user-1', row, {
      submissionKey: 'submit-duty-1',
      dutyConfirmationToken: 'create-token',
    })
    const createCall = apiRequest.mock.calls.find(([path]) => path === '/reports')
    expect(createCall[1].headers).toEqual({ 'X-Duty-Confirmation': 'create-token' })
    const createBody = JSON.parse(createCall[1].body)
    expect(createBody.payload).not.toHaveProperty('recordActionsVersion')
    expect(createBody.payload).not.toHaveProperty('recordActions')

    apiRequest.mockClear()
    apiRequest.mockImplementation(async (path) => {
      if (String(path).startsWith('/reports?')) {
        return { data: [{ ...row, version: 3 }] }
      }
      return { data: {} }
    })
    await persistInspectionRecord(
      'user-1',
      { ...row, version: 3 },
      {
        submissionKey: 'submit-duty-1',
        dutyConfirmationToken: 'update-token',
      },
    )
    const updateCall = apiRequest.mock.calls.find(([path]) => path === '/reports/report-duty-1')
    expect(updateCall[1]).toMatchObject({
      method: 'PUT',
      headers: { 'X-Duty-Confirmation': 'update-token' },
    })
  })

  it('acquires and attaches a token during an enabled report submission', async () => {
    vi.stubEnv('VITE_INSPECTION_DUTY_CONFIRMATION_ENABLED', 'true')
    vi.resetModules()
    apiRequest.mockImplementation(async (path) => {
      if (String(path).startsWith('/reports?')) return { data: [] }
      if (path === '/inspection/duty-context') {
        return {
          data: {
            status: 'assigned',
            confidence: 'high',
            contextVersion: 'dcv1:report',
            teamId: 7,
            shiftKey: 'day',
          },
        }
      }
      if (path === '/inspection/duty-context/confirm') {
        return { data: { dutyConfirmationToken: 'acquired-report-token' } }
      }
      return { data: {} }
    })
    const { persistInspectionRecord } = await import('../domain/api/inspectionApi')

    await persistInspectionRecord(
      'user-1',
      {
        id: 'report-acquired-1',
        displayId: 'INS-ACQUIRED-1',
        reportType: 'inspection',
        status: 'Submitted',
        incidentType: 'General Inspection',
      },
      { submissionKey: 'acquired-submit-1' },
    )

    const createCall = apiRequest.mock.calls.find(([path]) => path === '/reports')
    expect(createCall[1].headers).toEqual({
      'X-Duty-Confirmation': 'acquired-report-token',
    })
  })

  it('attaches operation-scoped tokens to delete and workflow transitions', async () => {
    apiRequest.mockResolvedValue({ data: {} })
    const {
      approveInspectionRecord,
      deleteInspectionRecord,
      rejectInspectionRecord,
      reviewInspectionRecord,
    } = await import('../domain/api/inspectionApi')

    await deleteInspectionRecord('user-1', 'report-duty-2', {
      dutyConfirmationToken: 'delete-token',
    })
    await reviewInspectionRecord({
      reportUid: 'report-duty-2',
      version: 1,
      dutyConfirmationToken: 'review-token',
    })
    await approveInspectionRecord({
      reportUid: 'report-duty-2',
      version: 2,
      dutyConfirmationToken: 'approve-token',
    })
    await rejectInspectionRecord({
      reportUid: 'report-duty-2',
      version: 2,
      remarks: 'Rejected.',
      dutyConfirmationToken: 'reject-token',
    })

    expect(apiRequest).toHaveBeenCalledWith('/reports/report-duty-2', {
      method: 'DELETE',
      headers: { 'X-Duty-Confirmation': 'delete-token' },
    })
    for (const [action, token] of [
      ['review', 'review-token'],
      ['approve', 'approve-token'],
      ['reject', 'reject-token'],
    ]) {
      expect(apiRequest).toHaveBeenCalledWith(
        `/reports/report-duty-2/${action}`,
        expect.objectContaining({ headers: { 'X-Duty-Confirmation': token } }),
      )
    }
  })

  it('attaches tokens to extinguisher completion, reset, and session submission', async () => {
    apiRequest.mockResolvedValue({ data: {}, meta: {}, operation: {} })
    const {
      completeInspectionSessionExtinguisher,
      resetInspectionSessionExtinguisher,
      submitInspectionSessionReport,
    } = await import('../domain/api/inspectionSessionApi')

    await completeInspectionSessionExtinguisher({
      sessionUid: 'session-duty-1',
      row: { id: 22 },
      operationId: 'complete-1',
      dutyConfirmationToken: 'write-token',
    })
    await resetInspectionSessionExtinguisher({
      sessionUid: 'session-duty-1',
      row: { id: 22 },
      operationId: 'reset-1',
      dutyConfirmationToken: 'reset-token',
    })
    await submitInspectionSessionReport({
      sessionUid: 'session-duty-1',
      submissionKey: 'session-submit-1',
      reportRemarks: 'General evidence remarks',
      photos: [{ id: 'photo-1', url: '/api/report-media/rpm-photo-1' }],
      dutyConfirmationToken: 'submit-token',
    })

    const [completeCall, resetCall, submitCall] = apiRequest.mock.calls
    expect(completeCall[1].headers).toEqual({ 'X-Duty-Confirmation': 'write-token' })
    expect(resetCall[1].headers).toEqual({ 'X-Duty-Confirmation': 'reset-token' })
    expect(submitCall[1].headers).toEqual({ 'X-Duty-Confirmation': 'submit-token' })
    expect(JSON.parse(submitCall[1].body)).toEqual(
      expect.objectContaining({
        report_remarks: 'General evidence remarks',
        photos: [{ id: 'photo-1', url: '/api/report-media/rpm-photo-1' }],
      }),
    )
  })
})
