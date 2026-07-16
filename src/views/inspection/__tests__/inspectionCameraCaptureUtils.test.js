// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  captureInspectionCameraFrame,
  startInspectionCameraStream,
  stopInspectionCameraStream,
} from '../form/inspectionCameraCaptureUtils'

describe('inspection in-app camera utilities', () => {
  it('falls back through progressively simpler rear-camera constraints', async () => {
    const stream = { getTracks: () => [] }
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Too strict', 'OverconstrainedError'))
      .mockResolvedValueOnce(stream)

    await expect(startInspectionCameraStream({ getUserMedia })).resolves.toBe(stream)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
    expect(getUserMedia.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
      }),
    )
  })

  it('does not repeatedly request permission after a terminal denial', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))

    await expect(startInspectionCameraStream({ getUserMedia })).rejects.toMatchObject({
      name: 'NotAllowedError',
    })
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it.each([
    { source: [4000, 3000], expected: [1600, 1200], orientation: 'landscape' },
    { source: [3000, 4000], expected: [1200, 1600], orientation: 'portrait' },
  ])(
    'captures a bounded $orientation jpeg without changing its aspect ratio',
    async ({ source, expected }) => {
      const context = { drawImage: vi.fn() }
      const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => context),
        toBlob: vi.fn((callback, type) => callback(new Blob(['jpeg'], { type }))),
      }
      const video = { videoWidth: source[0], videoHeight: source[1] }

      const file = await captureInspectionCameraFrame({
        video,
        createCanvas: () => canvas,
        now: () => 1234,
      })

      expect(canvas.width).toBe(expected[0])
      expect(canvas.height).toBe(expected[1])
      expect(canvas.width / canvas.height).toBeCloseTo(source[0] / source[1], 5)
      expect(context.drawImage).toHaveBeenCalledWith(video, 0, 0, expected[0], expected[1])
      expect(file).toMatchObject({
        name: 'inspection-camera-1234.jpg',
        type: 'image/jpeg',
      })
    },
  )

  it('stops every active camera track', () => {
    const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }]
    stopInspectionCameraStream({ getTracks: () => tracks })
    tracks.forEach((track) => expect(track.stop).toHaveBeenCalledTimes(1))
  })
})
