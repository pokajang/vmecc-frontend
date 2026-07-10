// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPendingCameraOperation,
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
})
