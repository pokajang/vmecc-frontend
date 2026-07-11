// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getNextInspectionSyncAt,
  runInspectionSyncCoordinator,
} from '../domain/sync/inspectionSyncCoordinator'

const mocks = vi.hoisted(() => ({
  getInspectionQueueNextRetryAt: vi.fn(),
  loadInspectionQueue: vi.fn(),
  syncInspectionQueue: vi.fn(),
  listSessions: vi.fn(),
  loadOperations: vi.fn(),
  retryFe: vi.fn(),
}))

vi.mock('../domain/offline/inspectionOfflineQueue', () => ({
  getInspectionQueueNextRetryAt: mocks.getInspectionQueueNextRetryAt,
  loadInspectionQueue: mocks.loadInspectionQueue,
  syncInspectionQueue: mocks.syncInspectionQueue,
}))
vi.mock('../form/hooks/fireExtinguisherOperationStore', () => ({
  listFireExtinguisherOperationSessionUids: mocks.listSessions,
  loadFireExtinguisherOperations: mocks.loadOperations,
}))
vi.mock('../form/hooks/fireExtinguisherSessionRetryQueue', () => ({
  retryFireExtinguisherSessionQueue: mocks.retryFe,
}))

const createStorageMock = () => {
  const rows = new Map()
  return {
    getItem: vi.fn((key) => (rows.has(key) ? rows.get(key) : null)),
    setItem: vi.fn((key, value) => rows.set(key, String(value))),
    removeItem: vi.fn((key) => rows.delete(key)),
  }
}

describe('inspection sync coordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', createStorageMock())
    vi.stubGlobal('BroadcastChannel', undefined)
    mocks.loadInspectionQueue.mockReturnValue([])
    mocks.listSessions.mockReturnValue([])
    mocks.loadOperations.mockReturnValue([])
    mocks.syncInspectionQueue.mockResolvedValue([])
    mocks.retryFe.mockResolvedValue([])
  })

  afterEach(() => vi.unstubAllGlobals())

  it('deduplicates simultaneous same-tab sync cycles', async () => {
    let release
    mocks.syncInspectionQueue.mockImplementation(
      () => new Promise((resolve) => (release = () => resolve([{ synced: true }]))),
    )

    const first = runInspectionSyncCoordinator({ userId: 'user-1' })
    const second = runInspectionSyncCoordinator({ userId: 'user-1' })
    expect(second).toBe(first)
    await new Promise((resolve) => setTimeout(resolve, 50))
    release()
    await expect(first).resolves.toMatchObject({ generalResults: [{ synced: true }] })
    expect(mocks.syncInspectionQueue).toHaveBeenCalledTimes(1)
    expect(mocks.retryFe).toHaveBeenCalledTimes(1)
  })

  it('honors an unexpired worker lease owned by another tab', async () => {
    localStorage.setItem(
      'inspection_sync_worker_v1_user-1',
      JSON.stringify({ owner: 'another-tab', expiresAt: Date.now() + 30_000 }),
    )

    await expect(runInspectionSyncCoordinator({ userId: 'user-1' })).resolves.toMatchObject({
      skipped: 'worker-active',
    })
    expect(mocks.syncInspectionQueue).not.toHaveBeenCalled()
  })

  it('selects the earliest eligible generic or FE retry time', () => {
    mocks.loadInspectionQueue.mockReturnValue([{ status: 'failed' }])
    mocks.getInspectionQueueNextRetryAt.mockReturnValue('2026-07-11T12:05:00Z')
    mocks.listSessions.mockReturnValue(['session-1'])
    mocks.loadOperations.mockReturnValue([
      { state: 'retryable', nextRetryAt: '2026-07-11T12:03:00Z' },
    ])

    expect(getNextInspectionSyncAt('user-1')).toBe(Date.parse('2026-07-11T12:03:00Z'))
  })
})
