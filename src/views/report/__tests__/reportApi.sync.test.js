import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from 'src/services/apiClient'
import {
  deleteReportRecord,
  persistReportRecord,
  persistReportRecords,
  runReportApiBackfillMigration,
} from '../reportApi'
import { loadReportRecords, saveReportRecords } from '../reportStorage'

const mediaMocks = vi.hoisted(() => ({ upload: vi.fn() }))

vi.mock('src/services/apiClient', () => ({
  apiRequest: vi.fn(),
  buildApiUrl: vi.fn((path) => path),
}))

vi.mock('../reportStorage', () => ({
  loadReportRecords: vi.fn(),
  saveReportRecords: vi.fn(),
}))

vi.mock('src/services/api/reportMediaApi', () => ({
  uploadReportPhoto: (...args) => mediaMocks.upload(...args),
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
    mediaMocks.upload.mockResolvedValue({
      mediaId: 'rpm-backfill-layout',
      url: '/api/report-media/rpm-backfill-layout',
      thumbnailUrl: '/api/report-media/rpm-backfill-layout?variant=thumbnail',
      fileName: 'layout.png',
    })
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

  it('deletes a single report directly without updating sibling reports', async () => {
    apiRequest.mockResolvedValue({ data: null })

    const ok = await deleteReportRecord('report-erco-260429-fbac5462a3')

    expect(ok).toBe(true)
    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(apiRequest).toHaveBeenCalledWith('/reports/report-erco-260429-fbac5462a3', {
      method: 'DELETE',
    })
  })

  it('creates one ERCO report without fetching, updating, or deleting siblings', async () => {
    apiRequest.mockResolvedValue({
      data: {
        id: 'erco-new',
        displayId: 'ERCO-NEW',
        reportType: 'erco',
        status: 'Submitted',
        version: 1,
      },
    })

    const saved = await persistReportRecord(
      'u-1',
      {
        id: 'erco-new',
        displayId: 'ERCO-NEW',
        reportType: 'erco',
        status: 'Submitted',
        submissionKey: 'erco-submit-stable',
        incidentType: 'Fire',
        location: 'Zone 1',
        timeline: [{ action: 'Submitted' }],
        workflowStage: 'review',
        recordActionsVersion: 1,
        recordActions: { edit: { applicable: true, allowed: true } },
      },
      {
        reportTypeSlug: 'erco',
        submissionKey: 'erco-submit-stable',
        sourceDraftId: 'drf_erco_resumed',
      },
    )

    expect(saved).toEqual(expect.objectContaining({ id: 'erco-new', version: 1 }))
    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(apiRequest).toHaveBeenCalledWith('/reports', {
      method: 'POST',
      body: expect.any(String),
    })
    const body = JSON.parse(apiRequest.mock.calls[0][1].body)
    expect(body.submission_key).toBe('erco-submit-stable')
    expect(body.source_draft_id).toBe('drf_erco_resumed')
    expect(body.payload).toEqual(
      expect.objectContaining({ incidentType: 'Fire', location: 'Zone 1' }),
    )
    expect(body.payload).not.toHaveProperty('timeline')
    expect(body.payload).not.toHaveProperty('workflowStage')
    expect(body.payload).not.toHaveProperty('submissionKey')
    expect(body.payload).not.toHaveProperty('sourceDraftId')
    expect(body.payload).not.toHaveProperty('recordActionsVersion')
    expect(body.payload).not.toHaveProperty('recordActions')
  })

  it('updates only the requested ERCO report with its expected server version', async () => {
    apiRequest.mockResolvedValue({
      data: {
        id: 'erco-1',
        displayId: 'ERCO-001',
        reportType: 'erco',
        status: 'Submitted',
        version: 4,
      },
    })

    await persistReportRecord(
      'u-1',
      {
        id: 'erco-1',
        displayId: 'ERCO-001',
        reportType: 'erco',
        status: 'Submitted',
        summary: 'Updated summary',
      },
      { reportTypeSlug: 'erco', isUpdate: true, expectedVersion: 3 },
    )

    expect(apiRequest).toHaveBeenCalledTimes(1)
    expect(apiRequest).toHaveBeenCalledWith('/reports/erco-1', {
      method: 'PUT',
      body: expect.any(String),
    })
    expect(JSON.parse(apiRequest.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({ version: 3 }),
    )
  })

  it('scopes active report persistence away from unrelated local fallback rows', async () => {
    const writePaths = []
    loadReportRecords.mockReturnValue([
      {
        id: 'drill-1',
        displayId: 'DRL-01-01012026',
        reportType: 'drill',
        status: 'Submitted',
      },
    ])
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === '/reports' && !options.method) return { data: [] }
      if (path.startsWith('/reports') && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
        writePaths.push(`${options.method} ${path}`)
      }
      return { data: null }
    })

    const ok = await persistReportRecords(
      'u-1',
      [
        {
          id: 'fitness-1',
          displayId: 'FIT-01-01012026',
          reportType: 'fitness-test',
          status: 'Submitted',
        },
      ],
      { reportTypeSlug: 'fitness-test' },
    )

    expect(ok).toBe(true)
    expect(writePaths).toEqual(['POST /reports'])
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

  it('uploads legacy ER Assessment layout data before backfilling the report', async () => {
    let reportsFetchCount = 0
    loadReportRecords.mockReturnValue([
      {
        id: 'era-local-1',
        displayId: 'ERA-LOCAL-1',
        reportType: 'er-assessment',
        status: 'Submitted',
        assessmentType: 'working-at-height',
        responses: [
          {
            requirement: 'Scaffold tagged & inspected (Green/Yellow/Red)',
            response: 'Yes',
            remarks: '',
          },
        ],
        rescueAccessLayout: {
          name: 'layout.png',
          url: 'data:image/png;base64,QQ==',
        },
      },
    ])
    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path === '/reports' && !options.method) {
        reportsFetchCount += 1
        return reportsFetchCount === 1
          ? { data: [] }
          : { data: [{ id: 'era-local-1', reportType: 'er-assessment', version: 1 }] }
      }
      return { data: null }
    })

    const result = await runReportApiBackfillMigration({
      userId: 'u-1',
      reportTypeSlug: 'er-assessment',
    })

    expect(result).toEqual({ migrated: true, reason: 'migrated' })
    expect(mediaMocks.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'er-assessment',
        uploadId: 'era-backfill-era-local-1',
      }),
    )
    const createCall = apiRequest.mock.calls.find(
      ([path, options]) => path === '/reports' && options?.method === 'POST',
    )
    const body = JSON.parse(createCall[1].body)
    expect(body.payload.rescueAccessLayout).toEqual(
      expect.objectContaining({ mediaId: 'rpm-backfill-layout' }),
    )
    expect(body.payload.rescueAccessLayout.url).not.toContain('data:image')
    expect(body.payload.responses[0].requirementId).toBe('wah.scaffold-tagged')
  })
})
