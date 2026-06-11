import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest, loadReportRecords, saveReportRecords } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  loadReportRecords: vi.fn(),
  saveReportRecords: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  apiRequest: (...args) => apiRequest(...args),
  buildApiUrl: vi.fn((path) => path),
  fetchWithCsrfRetry: vi.fn(),
}))

vi.mock('../reportStorage', () => ({
  loadReportRecords: (...args) => loadReportRecords(...args),
  saveReportRecords: (...args) => saveReportRecords(...args),
}))

describe('reportApi local fallback policy', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('VITE_REPORT_API_TYPES', 'erco')
    vi.stubEnv('VITE_REPORT_LOCAL_FALLBACK_ENABLED', 'false')
    loadReportRecords.mockReturnValue([])
    saveReportRecords.mockReturnValue(true)
    apiRequest.mockResolvedValue({ data: [] })
  })

  it('does not persist disabled report types to localStorage when fallback is disabled', async () => {
    const { persistReportRecords } = await import('../reportApi')

    const ok = await persistReportRecords('user-1', [
      {
        id: 'inspection-1',
        reportType: 'inspection',
        status: 'Submitted',
      },
    ])

    expect(ok).toBe(false)
    expect(saveReportRecords).not.toHaveBeenCalled()
    expect(apiRequest).not.toHaveBeenCalled()
  })
})
