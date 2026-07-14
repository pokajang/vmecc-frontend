import { describe, expect, it, vi } from 'vitest'
import {
  trackInspectionDraftSyncTask,
  waitForInspectionDraftSyncTasks,
} from '../app/inspectionModuleFlow'

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
