// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  buildInspectionPhotoListPatch,
  collectInspectionPhotos,
  mergeInspectionPhotoLists,
  prepareInspectionPhotoUploads,
} from '../form/inspectionPhotoUtils'

describe('inspection photo utilities', () => {
  it('merges staged uploads without replacing newer photo metadata', () => {
    const currentPhoto = { id: 'photo-1', description: 'Latest description' }
    const stalePhoto = { id: 'photo-1', description: '' }
    const uploadedPhoto = { id: 'photo-2', description: '' }

    expect(mergeInspectionPhotoLists([currentPhoto], [stalePhoto, uploadedPhoto])).toEqual([
      currentPhoto,
      uploadedPhoto,
    ])
  })

  it('builds photo patches from the latest draft row', () => {
    const latestRow = { photos: [{ id: 'photo-1' }, { id: 'photo-2' }] }

    expect(
      buildInspectionPhotoListPatch(latestRow, 'photos', (photos) =>
        photos.filter((photo) => photo.id !== 'photo-1'),
      ),
    ).toEqual({ photos: [{ id: 'photo-2' }] })
  })

  it('includes finding photos in the inspection-wide photo inventory', () => {
    const reportPhoto = { id: 'report-photo' }
    const findingPhoto = { id: 'finding-photo' }

    expect(
      collectInspectionPhotos({
        photos: [reportPhoto],
        inspectionIssues: [{ id: 'finding-1', photos: [findingPhoto] }],
      }),
    ).toEqual([reportPhoto, findingPhoto])
  })

  it('counts unsaved drawer photos when enforcing the inspection photo limit', async () => {
    const onFailure = vi.fn()
    const additionalCurrentPhotos = Array.from({ length: 10 }, (_, index) => ({
      id: `staged-photo-${index}`,
      url: `/report-media/staged-photo-${index}`,
    }))

    const result = await prepareInspectionPhotoUploads({
      files: [new File(['photo'], 'next.jpg', { type: 'image/jpeg' })],
      form: { photos: [] },
      additionalCurrentPhotos,
      createPhotoId: () => 'photo-id',
      onFailure,
    })

    expect(result).toBeNull()
    expect(onFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'max_photo_count',
      }),
    )
  })

  it('classifies oversized camera captures as file_too_large instead of low_memory', async () => {
    const onFailure = vi.fn()

    const result = await prepareInspectionPhotoUploads({
      files: [
        {
          name: 'large-camera-photo.jpg',
          type: 'image/jpeg',
          size: 31 * 1024 * 1024,
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
        message: expect.stringContaining('over 30 MB'),
      }),
    )
    expect(onFailure).not.toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'low_memory',
      }),
    )
  })
})
