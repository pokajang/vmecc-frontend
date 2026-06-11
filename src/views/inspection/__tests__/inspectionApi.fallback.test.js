import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest, loadInspectionRecords, saveInspectionRecords } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  loadInspectionRecords: vi.fn(),
  saveInspectionRecords: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  apiRequest: (...args) => apiRequest(...args),
  buildApiUrl: vi.fn((path) => path),
  fetchWithCsrfRetry: vi.fn(),
}))

vi.mock('../inspectionStorage', () => ({
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
})
