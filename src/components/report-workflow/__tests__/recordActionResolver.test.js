import { describe, expect, it, vi } from 'vitest'
import {
  getPrimaryRecordActionKeys,
  isRecordActionAllowed,
  resolveRecordActions,
} from '../recordActionResolver'

const handlers = {
  view: vi.fn(),
  download: vi.fn(),
  edit: vi.fn(),
  review: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  delete: vi.fn(),
  back: vi.fn(),
}

describe('recordActionResolver', () => {
  it('uses the server contract as authority and hides denied actions', () => {
    const record = {
      id: 'erco-1',
      reportType: 'erco',
      recordActionsVersion: 1,
      recordActions: {
        view: { applicable: true, allowed: true },
        download: { applicable: true, allowed: true, format: 'pdf' },
        edit: { applicable: true, allowed: false },
        review: { applicable: true, allowed: true },
        approve: { applicable: false, allowed: false },
        reject: { applicable: true, allowed: true },
        delete: { applicable: true, allowed: false },
      },
    }

    const actions = resolveRecordActions({
      record,
      handlers,
      fallbackCapabilities: { edit: true, delete: true },
    })

    expect(actions.map((action) => action.key)).toEqual([
      'view',
      'download',
      'review',
      'reject',
      'back',
    ])
    expect(isRecordActionAllowed(record, 'edit', true)).toBe(false)
    expect(getPrimaryRecordActionKeys(actions)).toEqual(['review'])
  })

  it('labels Fitness downloads as explicit JSON exports', () => {
    const actions = resolveRecordActions({
      record: {
        id: 'fitness-1',
        reportType: 'fitness-test',
        recordActionsVersion: 1,
        recordActions: {
          download: { applicable: true, allowed: true, format: 'json' },
        },
      },
      handlers: { download: handlers.download },
    })

    expect(actions).toEqual([
      expect.objectContaining({ key: 'download', label: 'Export data (.json)' }),
    ])
  })
})
