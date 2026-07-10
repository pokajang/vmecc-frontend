// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPendingCameraOperation,
  consumeInterruptedCameraFallback,
  getPendingCameraOperation,
  getInterruptedCameraFallback,
  markPendingCameraOperation,
  markPendingCameraUploadStarted,
} from '../cameraRecovery'

describe('camera recovery marker', () => {
  beforeEach(() => sessionStorage.clear())

  it('retains the route and target until the camera operation completes', () => {
    markPendingCameraOperation({
      module: 'inspection',
      targetKind: 'fireExtinguisher',
      targetId: 'FE-1',
    })
    expect(getPendingCameraOperation()).toEqual(
      expect.objectContaining({
        module: 'inspection',
        targetKind: 'fireExtinguisher',
        targetId: 'FE-1',
      }),
    )
    expect(getPendingCameraOperation()?.phase).toBe('picker')
    expect(getInterruptedCameraFallback('inspection')?.errorCode).toBe('camera_interrupted')
    markPendingCameraUploadStarted('inspection')
    expect(getPendingCameraOperation()?.phase).toBe('uploading')
    clearPendingCameraOperation()
    expect(getPendingCameraOperation()).toBeNull()
  })

  it('consumes an interrupted operation after the form has recovered it', () => {
    markPendingCameraOperation({
      module: 'inspection',
      targetKind: 'fireExtinguisherDefect',
      targetId: 'FE-2',
    })

    expect(consumeInterruptedCameraFallback('inspection')).toMatchObject({
      errorCode: 'camera_interrupted',
      phase: 'picker',
    })
    expect(getPendingCameraOperation()).toBeNull()
    expect(consumeInterruptedCameraFallback('inspection')).toBeNull()
  })
})
