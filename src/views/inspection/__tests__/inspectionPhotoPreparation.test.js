// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  inspectionPhotoPreparationPolicy,
  prepareInspectionPhotoFile,
} from '../form/inspectionPhotoPreparation'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('inspection photo preparation', () => {
  it('leaves small and browser-unsupported image formats unchanged', async () => {
    const smallJpeg = new File(['small'], 'small.jpg', { type: 'image/jpeg' })
    const heic = new File(
      [new Uint8Array(inspectionPhotoPreparationPolicy.prepareThresholdBytes + 1)],
      'mobile.heic',
      { type: 'image/heic' },
    )

    await expect(prepareInspectionPhotoFile(smallJpeg)).resolves.toBe(smallJpeg)
    await expect(prepareInspectionPhotoFile(heic)).resolves.toBe(heic)
  })

  it('sends very large originals directly to the server without allocating decode memory', async () => {
    const createImageBitmap = vi.fn()
    vi.stubGlobal('createImageBitmap', createImageBitmap)
    const largeJpeg = new File(
      [new Uint8Array(inspectionPhotoPreparationPolicy.maxClientPrepareBytes + 1)],
      'large-mobile.jpg',
      { type: 'image/jpeg' },
    )

    await expect(prepareInspectionPhotoFile(largeJpeg)).resolves.toBe(largeJpeg)
    expect(createImageBitmap).not.toHaveBeenCalled()
  })

  it('resizes a large decodable image and releases its bitmap', async () => {
    const close = vi.fn()
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 4000, height: 3000, close })),
    )
    const context = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    }
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback) =>
        callback(new Blob([new Uint8Array(1024)], { type: 'image/jpeg' })),
      ),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    const file = new File(
      [new Uint8Array(inspectionPhotoPreparationPolicy.prepareThresholdBytes + 1)],
      'large.png',
      { type: 'image/png' },
    )
    const states = []

    const prepared = await prepareInspectionPhotoFile(file, {
      onState: (state) => states.push(state),
    })

    expect(prepared).not.toBe(file)
    expect(prepared.name).toBe('large.jpg')
    expect(prepared.type).toBe('image/jpeg')
    expect(prepared.size).toBeLessThan(file.size)
    expect(canvas.width).toBe(1)
    expect(canvas.height).toBe(1)
    expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2048, 1536)
    expect(states).toContainEqual({ status: 'preparing', percent: 0 })
    expect(close).toHaveBeenCalledOnce()
  })
})
