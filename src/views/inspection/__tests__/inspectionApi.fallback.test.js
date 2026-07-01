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
})
