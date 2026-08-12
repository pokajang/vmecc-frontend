import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest, loadAllInspectionRecords, loadInspectionRecords, saveInspectionRecords } =
  vi.hoisted(() => ({
    apiRequest: vi.fn(),
    loadAllInspectionRecords: vi.fn(),
    loadInspectionRecords: vi.fn(),
    saveInspectionRecords: vi.fn(),
  }))

vi.mock('src/services/apiClient', () => ({
  apiRequest: (...args) => apiRequest(...args),
  buildApiUrl: vi.fn((path) => path),
  fetchWithCsrfRetry: vi.fn(),
}))

vi.mock('../inspectionStorage', () => ({
  loadAllInspectionRecords: (...args) => loadAllInspectionRecords(...args),
  loadInspectionRecords: (...args) => loadInspectionRecords(...args),
  saveInspectionRecords: (...args) => saveInspectionRecords(...args),
}))

describe('inspectionApi local fallback policy', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('VITE_REPORT_API_TYPES', 'erco')
    vi.stubEnv('VITE_REPORT_LOCAL_FALLBACK_ENABLED', 'false')
    loadInspectionRecords.mockReturnValue([])
    saveInspectionRecords.mockReturnValue(true)
    apiRequest.mockResolvedValue({ data: [] })
  })

  it('does not persist inspection records to localStorage when fallback is disabled', async () => {
    const { persistInspectionRecord } = await import('../inspectionApi')

    await expect(
      persistInspectionRecord('user-1', {
        id: 'inspection-1',
        reportType: 'inspection',
        status: 'Submitted',
      }),
    ).rejects.toThrow('Inspection report API is disabled')

    expect(saveInspectionRecords).not.toHaveBeenCalled()
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('requests all inspection records when all scope is selected', async () => {
    vi.stubEnv('VITE_REPORT_API_TYPES', '*')
    apiRequest.mockResolvedValue({ data: [] })

    const { fetchInspectionRecords } = await import('../inspectionApi')

    await fetchInspectionRecords({ scope: 'all' })

    expect(apiRequest).toHaveBeenCalledWith('/reports?reportType=inspection&scope=all')
  })

  it('strips local queue history from API payloads', async () => {
    vi.stubEnv('VITE_REPORT_API_TYPES', '*')
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (String(path).startsWith('/reports?')) {
        return {
          data: [
            {
              id: 'inspection-1',
              reportType: 'inspection',
              version: 3,
            },
          ],
        }
      }
      return { data: { id: 'inspection-1' } }
    })

    const { persistInspectionRecord } = await import('../inspectionApi')

    await persistInspectionRecord('user-1', {
      id: 'inspection-1',
      reportType: 'inspection',
      status: 'Submitted',
      displayId: 'INS-001',
      incidentType: 'Routine',
      description: 'Done',
      history: [{ action: 'queued' }],
      queueId: 'queue-1',
    })

    const putCall = apiRequest.mock.calls.find(([path]) => String(path).includes('/inspection-1'))
    const body = JSON.parse(putCall[1].body)

    expect(body.payload.history).toBeUndefined()
    expect(body.payload.queueId).toBeUndefined()
    expect(body.payload.description).toBe('Done')
  })

  it('never creates a replacement report when an edit target is missing', async () => {
    vi.stubEnv('VITE_REPORT_API_TYPES', '*')
    apiRequest.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }))
    const { persistInspectionRecord } = await import('../inspectionApi')

    await expect(
      persistInspectionRecord(
        'user-1',
        {
          id: 'missing-report',
          reportType: 'inspection',
          status: 'Submitted',
        },
        { isUpdate: true },
      ),
    ).rejects.toMatchObject({ code: 'inspection_update_target_missing' })

    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(apiRequest).toHaveBeenCalledWith('/reports/missing-report')
  })

  it('loads the exact report when updating an authorized cross-user record', async () => {
    vi.stubEnv('VITE_REPORT_API_TYPES', '*')
    apiRequest.mockImplementation(async (path) => {
      if (path === '/reports/cross-user-report') {
        return {
          data: {
            id: 'cross-user-report',
            reportType: 'inspection',
            version: 4,
          },
        }
      }
      return { data: { id: 'cross-user-report' } }
    })
    const { persistInspectionRecord } = await import('../inspectionApi')

    await persistInspectionRecord(
      'admin-user',
      {
        id: 'cross-user-report',
        reportType: 'inspection',
        status: 'Submitted',
      },
      { isUpdate: true },
    )

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/reports/cross-user-report')
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      '/reports/cross-user-report',
      expect.objectContaining({ method: 'PUT' }),
    )
  })
})
