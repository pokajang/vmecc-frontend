import { describe, expect, it, vi } from 'vitest'
import {
  buildPhotoViewerUploadOptions,
  buildStagedPhotoUploadOptions,
} from '../form/inspectionPhotoFlow'

describe('inspection photo flow', () => {
  it('opens the shared photo viewer with the completed upload list', () => {
    const openViewer = vi.fn()
    const currentPhotos = [{ id: 'current-photo' }]
    const options = buildPhotoViewerUploadOptions(openViewer, { currentPhotos })
    const photos = [{ id: 'photo-1' }]

    options.onAfterAddPhotos({ photos })

    expect(openViewer).toHaveBeenCalledWith(photos)
    expect(options.currentPhotos).toBe(currentPhotos)
  })

  it('preserves viewer callbacks when staged row persistence is added', () => {
    const onAfterAddPhotos = vi.fn()
    const onAddPhotos = vi.fn()
    const options = buildStagedPhotoUploadOptions({ onAfterAddPhotos }, onAddPhotos)

    expect(options).toEqual({ onAfterAddPhotos, onAddPhotos })
  })

  it('ignores invalid upload options instead of spreading caller values', () => {
    const onAddPhotos = vi.fn()

    expect(buildStagedPhotoUploadOptions('photos', onAddPhotos)).toEqual({ onAddPhotos })
  })
})
