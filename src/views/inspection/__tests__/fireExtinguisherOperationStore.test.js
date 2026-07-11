// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acknowledgeFireExtinguisherOperation,
  enqueueFireExtinguisherOperation,
  enqueueFireExtinguisherOperationDurably,
  loadFireExtinguisherOperations,
  rebaseFollowingFireExtinguisherOperations,
} from '../form/hooks/fireExtinguisherOperationStore'

const createStorageMock = () => {
  const rows = new Map()
  return {
    getItem: vi.fn((key) => (rows.has(key) ? rows.get(key) : null)),
    setItem: vi.fn((key, value) => rows.set(key, String(value))),
    removeItem: vi.fn((key) => rows.delete(key)),
    key: vi.fn((index) => Array.from(rows.keys())[index] || null),
    get length() {
      return rows.size
    },
  }
}

const row = {
  id: 'fe-1',
  canonicalAssetKey: 'catalog:fe-1',
  physicalCondition: 'Good',
}

describe('fire extinguisher operation store', () => {
  beforeEach(() => {
    const localStorage = createStorageMock()
    vi.stubGlobal('localStorage', localStorage)
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorage,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('migrates a legacy retry once and retains it until server acknowledgement', () => {
    const legacyKey = 'inspection_fe_session_complete_retry_v1_user-1_session-1'
    localStorage.setItem(
      legacyKey,
      JSON.stringify([
        {
          assetKey: 'catalog:fe-1',
          row,
          options: { baseVersion: 2, clientResultId: 'deterministic-legacy-id' },
          attempts: 1,
        },
      ]),
    )

    const [migrated] = loadFireExtinguisherOperations({
      userId: 'user-1',
      sessionUid: 'session-1',
    })

    expect(migrated).toMatchObject({
      type: 'complete',
      assetKey: 'catalog:fe-1',
      baseVersion: 2,
      legacyAssetKey: 'catalog:fe-1',
    })
    expect(migrated.operationId).toMatch(/^fe-op:/)
    expect(migrated.operationId).not.toBe('deterministic-legacy-id')
    expect(localStorage.getItem(legacyKey)).not.toBeNull()
    expect(
      loadFireExtinguisherOperations({ userId: 'user-1', sessionUid: 'session-1' }),
    ).toHaveLength(1)

    expect(
      acknowledgeFireExtinguisherOperation({
        userId: 'user-1',
        sessionUid: 'session-1',
        operationId: migrated.operationId,
      }),
    ).toBe(true)
    expect(localStorage.getItem(legacyKey)).toBeNull()
  })

  it('keeps complete and reset operations ordered and rebases the dependent reset', () => {
    enqueueFireExtinguisherOperation({
      userId: 'user-1',
      sessionUid: 'session-1',
      operationId: 'fe-op:complete-1',
      type: 'complete',
      row,
      baseVersion: 2,
    })
    enqueueFireExtinguisherOperation({
      userId: 'user-1',
      sessionUid: 'session-1',
      operationId: 'fe-op:reset-1',
      type: 'reset',
      row: { ...row, physicalCondition: '' },
      baseVersion: 2,
    })

    rebaseFollowingFireExtinguisherOperations({
      userId: 'user-1',
      sessionUid: 'session-1',
      operationId: 'fe-op:complete-1',
      resultVersion: 3,
    })

    const operations = loadFireExtinguisherOperations({
      userId: 'user-1',
      sessionUid: 'session-1',
    })
    expect(operations.map((operation) => operation.type)).toEqual(['complete', 'reset'])
    expect(operations[1].baseVersion).toBe(3)
  })

  it('reports when neither browser persistence layer can safely store an operation', async () => {
    vi.stubGlobal('indexedDB', undefined)
    localStorage.setItem.mockImplementation(() => {
      throw new Error('Quota exceeded')
    })

    await expect(
      enqueueFireExtinguisherOperationDurably({
        userId: 'user-1',
        sessionUid: 'session-1',
        operationId: 'fe-op:storage-failure',
        type: 'complete',
        row,
      }),
    ).rejects.toMatchObject({ code: 'inspection_operation_storage_unavailable' })
  })
})
