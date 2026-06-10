import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from 'src/services/apiClient'
import { persistReportRecords, runReportApiBackfillMigration } from '../reportApi'
import { loadReportRecords, saveReportRecords } from '../reportStorage'

vi.mock('src/services/apiClient', () => ({
  apiRequest: vi.fn(),
  buildApiUrl: vi.fn((path) => path),
}))

vi.mock('../reportStorage', () => ({
  loadReportRecords: vi.fn(),
  saveReportRecords: vi.fn(),
}))

const createStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
}

describe('reportApi sync hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', createStorageMock())
    saveReportRecords.mockReturnValue(true)
    loadReportRecords.mockReturnValue([])
  })

  it('deletes only stale records of the active report type', async () => {
    const deletedPaths = []
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === '/reports' && !options.method) {
        return {
          data: [
            { id: 'erco-1', reportType: 'erco', version: 2 },
            { id: 'erco-2', reportType: 'erco', version: 1 },
            { id: 'drill-1', reportType: 'drill', version: 7 },
          ],
        }
      }
      if (path.startsWith('/reports/') && options.method === 'DELETE') {
        deletedPaths.push(path)
        return { data: null }
      }
      return { data: null }
    })

    const ok = await persistReportRecords('u-1', [
      {
        id: 'erco-1',
        displayId: 'ERCO-01-01012026',
        reportType: 'erco',
        status: 'Submitted',
      },
    ])

    expect(ok).toBe(true)
    expect(deletedPaths).toContain('/reports/erco-2')
    expect(deletedPaths).not.toContain('/reports/drill-1')
  })

  it('does not mark backfill migrated when verification is incomplete', async () => {
    let reportsFetchCount = 0
    loadReportRecords.mockReturnValue([
      { id: 'erco-1', reportType: 'erco', status: 'Submitted' },
      { id: 'erco-2', reportType: 'erco', status: 'Submitted' },
    ])
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === '/reports' && !options.method) {
        reportsFetchCount += 1
        if (reportsFetchCount === 1) return { data: [] }
        return { data: [{ id: 'erco-1', reportType: 'erco', version: 1 }] }
      }
      return { data: null }
    })

    const result = await runReportApiBackfillMigration({ userId: 'u-1', reportTypeSlug: 'erco' })

    expect(result).toEqual({ migrated: false, reason: 'verification-failed' })
    expect(globalThis.localStorage.setItem).not.toHaveBeenCalled()
  })

  it('marks backfill migrated only after all local rows are present in API', async () => {
    let reportsFetchCount = 0
    loadReportRecords.mockReturnValue([
      { id: 'erco-1', reportType: 'erco', status: 'Submitted' },
      { id: 'erco-2', reportType: 'erco', status: 'Submitted' },
    ])
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === '/reports' && !options.method) {
        reportsFetchCount += 1
        if (reportsFetchCount === 1) return { data: [] }
        return {
          data: [
            { id: 'erco-1', reportType: 'erco', version: 1 },
            { id: 'erco-2', reportType: 'erco', version: 1 },
          ],
        }
      }
      return { data: null }
    })

    const result = await runReportApiBackfillMigration({ userId: 'u-1', reportTypeSlug: 'erco' })

    expect(result).toEqual({ migrated: true, reason: 'migrated' })
    expect(globalThis.localStorage.setItem).toHaveBeenCalledTimes(1)
  })
})
