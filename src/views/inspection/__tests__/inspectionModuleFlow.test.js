import { describe, expect, it, vi } from 'vitest'
import {
  buildTypedInspectionWorkspaceForm,
  trackInspectionDraftSyncTask,
  waitForInspectionDraftSyncTasks,
} from '../app/inspectionModuleFlow'
import { HSE_INSPECTION_TYPE } from '../types/hse/helpers'

describe('inspection module draft synchronization', () => {
  it('waits for a newer queued draft write before direct submission continues', async () => {
    let resolveFirst
    let resolveSecond
    const first = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const second = new Promise((resolve) => {
      resolveSecond = resolve
    })
    const taskRef = { current: null }
    const inFlightRef = { current: true }
    trackInspectionDraftSyncTask(taskRef, first)

    const settled = vi.fn()
    const waiting = waitForInspectionDraftSyncTasks(taskRef, inFlightRef).then(settled)
    trackInspectionDraftSyncTask(taskRef, second)
    resolveFirst()
    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()

    inFlightRef.current = false
    resolveSecond()
    await waiting
    expect(settled).toHaveBeenCalledOnce()
  })
})

describe('typed inspection workspace initialization', () => {
  it('starts HSE on the only supported payload contract', () => {
    const normalizeInspectionForm = vi.fn((form) => form)

    const form = buildTypedInspectionWorkspaceForm({
      inspectionType: HSE_INSPECTION_TYPE,
      defaultInspectionForm: {
        hsePayloadVersion: 0,
        hseSelections: [],
      },
      getDefaultInspectionDateTime: () => '2026-07-28T09:30',
      normalizeInspectionForm,
    })

    expect(form).toMatchObject({
      inspectionType: HSE_INSPECTION_TYPE,
      inspectedAt: '2026-07-28T09:30',
      hsePayloadVersion: 2,
      hseSelections: [],
    })
    expect(normalizeInspectionForm).toHaveBeenCalledOnce()
  })
})
