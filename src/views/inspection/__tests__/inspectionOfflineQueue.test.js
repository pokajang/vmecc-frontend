// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistInspectionRecord } from '../inspectionApi'
import {
  enqueueInspectionSubmission,
  getInspectionQueueNextRetryAt,
  isInspectionQueueableError,
  loadInspectionQueue,
  markInspectionQueueItem,
  removeInspectionQueueItem,
  syncInspectionQueue,
  toQueuedInspectionRecord,
} from '../inspectionOfflineQueue'

vi.mock('../inspectionApi', () => ({
  persistInspectionRecord: vi.fn(),
}))

const userId = 'user-queue-1'
const record = {
  id: 'inspection-1',
  displayId: 'INS-001',
  reportType: 'inspection',
  status: 'Submitted',
  incidentType: 'FRT Daily Inspection',
  location: 'Zone 1',
  description: 'Inspection completed.',
  photos: [],
}

describe('inspectionOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const store = new Map()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
        clear: () => store.clear(),
      },
    })
  })

  it('adds, loads, marks, and removes queued submissions', () => {
    const item = enqueueInspectionSubmission({
      userId,
      record,
      submissionKey: 'inspection-submit-key-1',
    })

    expect(item.queueId).toBeTruthy()
    expect(loadInspectionQueue(userId)).toHaveLength(1)

    const marked = markInspectionQueueItem(userId, item.queueId, {
      status: 'failed',
      lastError: 'Network unavailable',
    })

    expect(marked.status).toBe('failed')
    expect(loadInspectionQueue(userId)[0].lastError).toBe('Network unavailable')

    expect(removeInspectionQueueItem(userId, item.queueId)).toBe(true)
    expect(loadInspectionQueue(userId)).toHaveLength(0)
  })

  it('projects queued pseudo-records with owner identity for Mine scope', () => {
    const item = enqueueInspectionSubmission({
      userId,
      record,
      submissionKey: 'inspection-submit-key-owner',
    })
    const row = toQueuedInspectionRecord(item)

    expect(row.recordKind).toBe('queued')
    expect(row.userId).toBe(userId)
  })

  it('syncs queued submissions and removes successful items', async () => {
    persistInspectionRecord.mockResolvedValue(true)
    const item = enqueueInspectionSubmission({
      userId,
      record,
      submissionKey: 'inspection-submit-key-2',
    })

    const results = await syncInspectionQueue({ userId })

    expect(results).toEqual([{ queueId: item.queueId, synced: true }])
    expect(persistInspectionRecord).toHaveBeenCalledWith(userId, item.record, {
      submissionKey: 'inspection-submit-key-2',
    })
    expect(loadInspectionQueue(userId)).toHaveLength(0)
  })

  it('preserves hydraulic checks when syncing queued submissions', async () => {
    persistInspectionRecord.mockResolvedValue(true)
    const hydraulicRecord = {
      ...record,
      incidentType: 'Hydraulic Rescue Tools Inspection',
      mainLocation: 'FRT',
      location: 'FRT',
      hydraulicChecks: [
        {
          id: 'frt:hydraulic-pump-motor-1',
          location: 'FRT',
          equipment: 'Hydraulic Pump Motor 1',
          physicalCondition: 'OK',
          mechanicalCondition: 'OK',
          noLeakage: 'OK',
          functionTest: 'Defect',
          remarks: 'Slow response.',
        },
      ],
    }
    const item = enqueueInspectionSubmission({
      userId,
      record: hydraulicRecord,
      submissionKey: 'inspection-submit-key-hydraulic',
    })

    await syncInspectionQueue({ userId })

    expect(persistInspectionRecord).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        hydraulicChecks: [
          expect.objectContaining({
            equipment: 'Hydraulic Pump Motor 1',
            functionTest: 'Defect',
          }),
        ],
      }),
      { submissionKey: 'inspection-submit-key-hydraulic' },
    )
    expect(item.record.hydraulicChecks[0].remarks).toBe('Slow response.')
  })

  it('preserves explicit create operation even when the record has a version', async () => {
    persistInspectionRecord.mockResolvedValue(true)
    const item = enqueueInspectionSubmission({
      userId,
      record: { ...record, version: 1 },
      submissionKey: 'inspection-submit-key-create-version',
      operation: 'create',
    })

    expect(loadInspectionQueue(userId)[0].operation).toBe('create')

    await syncInspectionQueue({ userId })

    expect(persistInspectionRecord).toHaveBeenCalledWith(userId, item.record, {
      submissionKey: 'inspection-submit-key-create-version',
    })
  })

  it('keeps failed sync items and increments attempts', async () => {
    persistInspectionRecord.mockRejectedValue(new Error('Server unavailable'))
    const item = enqueueInspectionSubmission({
      userId,
      record,
      submissionKey: 'inspection-submit-key-3',
    })

    const results = await syncInspectionQueue({ userId })
    const queued = loadInspectionQueue(userId)[0]

    expect(results[0].synced).toBe(false)
    expect(results[0].queueId).toBe(item.queueId)
    expect(queued.status).toBe('failed')
    expect(queued.attempts).toBe(1)
    expect(queued.lastError).toBe('Server unavailable')
    expect(queued.history.map((event) => event.action)).toContain('sync_started')
    expect(queued.history.map((event) => event.action)).toContain('sync_failed')
  })

  it('keeps queued item when sync save returns false', async () => {
    persistInspectionRecord.mockResolvedValue(false)
    enqueueInspectionSubmission({
      userId,
      record,
      submissionKey: 'inspection-submit-key-false',
    })

    const results = await syncInspectionQueue({ userId })
    const queued = loadInspectionQueue(userId)[0]

    expect(results[0].synced).toBe(false)
    expect(queued.status).toBe('failed')
    expect(queued.lastError).toBe('Unable to sync queued inspection.')
  })

  it('skips automatic retry until backoff is due', async () => {
    persistInspectionRecord.mockResolvedValue(true)
    const item = enqueueInspectionSubmission({
      userId,
      record,
      submissionKey: 'inspection-submit-key-backoff',
    })
    markInspectionQueueItem(userId, item.queueId, {
      status: 'failed',
      attempts: 1,
      lastAttemptAt: new Date().toISOString(),
    })

    const results = await syncInspectionQueue({ userId })

    expect(results).toEqual([])
    expect(persistInspectionRecord).not.toHaveBeenCalled()
    expect(getInspectionQueueNextRetryAt(loadInspectionQueue(userId)[0])).toBeTruthy()
  })

  it('marks version conflicts for operator resolution', async () => {
    const error = new Error('Version conflict. Reload the latest report before updating.')
    error.status = 409
    error.payload = {
      code: 'REPORT_VERSION_CONFLICT',
      currentReport: { id: 'inspection-1', version: 2, description: 'Server edit' },
    }
    persistInspectionRecord.mockRejectedValue(error)
    const item = enqueueInspectionSubmission({
      userId,
      record: { ...record, version: 1 },
      submissionKey: 'inspection-submit-key-conflict',
      operation: 'update',
    })

    const results = await syncInspectionQueue({ userId, force: true })
    const queued = loadInspectionQueue(userId)[0]

    expect(results[0].conflict).toBe(true)
    expect(queued.queueId).toBe(item.queueId)
    expect(queued.status).toBe('conflict')
    expect(queued.conflictServerSnapshot.description).toBe('Server edit')
    expect(queued.history.map((event) => event.action)).toContain('conflict_detected')
  })

  it('does not retry conflicted items until conflict resolution requeues them', async () => {
    persistInspectionRecord.mockResolvedValue(true)
    const item = enqueueInspectionSubmission({
      userId,
      record: { ...record, version: 1 },
      submissionKey: 'inspection-submit-key-conflict-skip',
      operation: 'update',
    })
    markInspectionQueueItem(userId, item.queueId, {
      status: 'conflict',
      lastError: 'Version conflict',
    })

    const results = await syncInspectionQueue({ userId, force: true })

    expect(results).toEqual([])
    expect(persistInspectionRecord).not.toHaveBeenCalled()
    expect(loadInspectionQueue(userId)[0].status).toBe('conflict')
  })

  it('can retry a single queued item by queue id', async () => {
    persistInspectionRecord.mockResolvedValue(true)
    const first = enqueueInspectionSubmission({
      userId,
      record: { ...record, id: 'inspection-single-1' },
      submissionKey: 'inspection-submit-key-single-1',
    })
    enqueueInspectionSubmission({
      userId,
      record: { ...record, id: 'inspection-single-2' },
      submissionKey: 'inspection-submit-key-single-2',
    })

    const results = await syncInspectionQueue({ userId, force: true, queueId: first.queueId })

    expect(results).toEqual([{ queueId: first.queueId, synced: true }])
    expect(persistInspectionRecord).toHaveBeenCalledTimes(1)
    expect(loadInspectionQueue(userId)).toHaveLength(1)
  })

  it('classifies queueable and non-queueable errors', () => {
    expect(isInspectionQueueableError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isInspectionQueueableError({ status: 503 })).toBe(true)
    expect(isInspectionQueueableError({ status: 422 })).toBe(false)
    expect(isInspectionQueueableError({ status: 403 })).toBe(false)
    expect(isInspectionQueueableError({ status: 409 })).toBe(false)
  })
})
