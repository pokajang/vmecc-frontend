import { beforeEach, describe, expect, it } from 'vitest'
import { enqueueInspectionSubmission } from '../domain/offline/inspectionOfflineQueue'
import { enqueueFireExtinguisherOperation } from '../form/hooks/fireExtinguisherOperationStore'
import { buildInspectionSupportDiagnostics } from '../domain/support/inspectionDiagnostics'

describe('inspection support diagnostics', () => {
  beforeEach(() => {
    const store = new Map()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        get length() {
          return store.size
        },
        key: (index) => [...store.keys()][index] || null,
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => store.set(key, String(value)),
        removeItem: (key) => store.delete(key),
      },
    })
  })

  it('exports scoped queue metadata without inspection payloads or raw asset keys', () => {
    enqueueFireExtinguisherOperation({
      userId: 'user-1',
      sessionUid: 'session-1',
      type: 'complete',
      row: {
        barcodeNo: 'fe-secret-asset',
        remarks: 'Sensitive inspection remarks',
      },
    })
    enqueueInspectionSubmission({
      userId: 'user-1',
      record: { id: 'report-1', description: 'Sensitive report description' },
    })

    const diagnostics = buildInspectionSupportDiagnostics('user-1')
    const serialized = JSON.stringify(diagnostics)

    expect(diagnostics.operationCount).toBe(1)
    expect(serialized).not.toContain('fe-secret-asset')
    expect(serialized).not.toContain('Sensitive inspection remarks')
    expect(serialized).not.toContain('Sensitive report description')
    expect(diagnostics.operations[0].assetKeyHash).toMatch(/^h[0-9a-f]{8}$/)
  })
})
