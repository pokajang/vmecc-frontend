// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { prepareInspectionPhotoUploads } from '../form/inspectionPhotoUtils'

describe('inspection photo utilities', () => {
  it('classifies oversized camera captures as file_too_large instead of low_memory', async () => {
    const onFailure = vi.fn()

    const result = await prepareInspectionPhotoUploads({
      files: [
        {
          name: 'large-camera-photo.jpg',
          type: 'image/jpeg',
          size: 13 * 1024 * 1024,
        },
      ],
      form: { photos: [] },
      createPhotoId: () => 'photo-id',
      isCameraUpload: true,
      suppressToasts: true,
      onFailure,
    })

    expect(result).toBeNull()
    expect(onFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'file_too_large',
        message: expect.stringContaining('over 12 MB'),
      }),
    )
    expect(onFailure).not.toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'low_memory',
      }),
    )
  })
})
