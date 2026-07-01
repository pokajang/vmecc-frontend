// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearOfflineDraft,
  loadOfflineDraftSync,
  saveOfflineDraft,
  saveOfflineQueue,
  loadOfflineQueueSync,
} from '../inspectionOfflineStore'
import { getInspectionOfflineHealth } from '../inspectionOfflineHealth'

describe('inspectionOfflineStore', () => {
  beforeEach(() => {
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
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: undefined,
    })
  })

  it('saves and loads offline drafts through the mirror fallback', async () => {
    await saveOfflineDraft('user-1', { description: 'Local draft' })

    expect(loadOfflineDraftSync('user-1').description).toBe('Local draft')

    await clearOfflineDraft('user-1')
    expect(loadOfflineDraftSync('user-1')).toBeNull()
  })

  it('preserves hydraulic checks in offline draft storage', async () => {
    await saveOfflineDraft('user-1', {
      incidentType: 'Hydraulic Rescue Tools Inspection',
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
    })

    expect(loadOfflineDraftSync('user-1').hydraulicChecks).toEqual([
      expect.objectContaining({
        equipment: 'Hydraulic Pump Motor 1',
        functionTest: 'Defect',
        remarks: 'Slow response.',
      }),
    ])
  })

  it('saves and loads offline queue rows through the mirror fallback', async () => {
    await saveOfflineQueue('user-1', [{ queueId: 'queue-1' }])

    expect(loadOfflineQueueSync('user-1')).toEqual([{ queueId: 'queue-1' }])
  })

  it('preserves hydraulic checks in offline queue storage', async () => {
    await saveOfflineQueue('user-1', [
      {
        queueId: 'queue-1',
        record: {
          reportType: 'inspection',
          hydraulicChecks: [
            {
              id: 'store:hydraulic-cutter-2',
              location: 'Store',
              equipment: 'Hydraulic Cutter 2',
              physicalCondition: 'N/A',
            },
          ],
        },
      },
    ])

    expect(loadOfflineQueueSync('user-1')[0].record.hydraulicChecks[0]).toEqual(
      expect.objectContaining({
        equipment: 'Hydraulic Cutter 2',
        physicalCondition: 'N/A',
      }),
    )
  })

  it('summarizes offline health when IndexedDB is unavailable', async () => {
    await saveOfflineDraft('user-1', {
      description: 'Local draft',
      __offlineSyncStatus: 'waiting',
      __offlineSavedAt: '2026-06-26T00:00:00.000Z',
    })
    await saveOfflineQueue('user-1', [{ queueId: 'queue-1' }])

    Object.defineProperty(globalThis.navigator, 'storage', {
      configurable: true,
      value: {
        estimate: async () => ({ usage: 1024, quota: 2048 }),
      },
    })

    const health = await getInspectionOfflineHealth('user-1')

    expect(health.indexedDbAvailable).toBe(false)
    expect(health.pendingQueueCount).toBe(1)
    expect(health.localDraftExists).toBe(true)
    expect(health.warnings).toContain('IndexedDB unavailable')
  })
})
