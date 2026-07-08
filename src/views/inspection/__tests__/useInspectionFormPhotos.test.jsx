// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import useInspectionFormPhotos from '../form/useInspectionFormPhotos'
import { isCameraFailureToRetry } from '../form/inspectionPhotoUtils'

const noop = vi.fn()

const createTestHook = () =>
  renderHook(() =>
    useInspectionFormPhotos({
      appendInspectionText: noop,
      createPhotoId: () => 'photo-id',
      defaultHighAnglePhotosKey: 'photos',
      form: {
        photos: [],
      },
      getLatestForm: () => ({ photos: [] }),
      getScbaExistingCheck: () => null,
      getScbaFieldEvidenceKeys: () => ({ photosKey: 'photos' }),
      pushToast: vi.fn(),
      updateErAuxCheck: noop,
      updateFireExtinguisherCheck: noop,
      updateForm: noop,
      updateFrtCheck: noop,
      updateHighAngleCheck: noop,
      updateHydraulicCheck: noop,
      updateScbaGroupedCheck: noop,
    }),
  )

vi.mock('../form/inspectionPhotoUtils', async () => {
  const actual = await vi.importActual('../form/inspectionPhotoUtils')
  return {
    ...actual,
    prepareInspectionPhotoUploads: vi.fn(),
  }
})

afterEach(() => {
  vi.clearAllMocks()
  noop.mockReset()
})

describe('useInspectionFormPhotos', () => {
  it('promotes low-memory camera failures to a manual upload fallback', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const pushToast = vi.fn()

    const { result } = renderHook(() =>
      useInspectionFormPhotos({
        appendInspectionText: noop,
        createPhotoId: () => 'photo-id',
        defaultHighAnglePhotosKey: 'photos',
        form: {
          photos: [],
        },
        getLatestForm: () => ({ photos: [] }),
        getScbaExistingCheck: () => null,
        getScbaFieldEvidenceKeys: () => ({ photosKey: 'photos' }),
        pushToast,
        updateErAuxCheck: noop,
        updateFireExtinguisherCheck: noop,
        updateForm: noop,
        updateFrtCheck: noop,
        updateHighAngleCheck: noop,
        updateHydraulicCheck: noop,
        updateScbaGroupedCheck: noop,
      }),
    )

    prepare.prepareInspectionPhotoUploads.mockImplementationOnce(async ({ onFailure }) => {
      onFailure({
        code: 'low_memory',
        message: 'Unable to complete due to low memory.',
      })
      return null
    })

    const file = new File([new Uint8Array([1, 2, 3])], 'camera-photo.jpg', {
      type: 'image/jpeg',
    })

    act(() => {
      result.current.requestErAuxPhotoUpload({ id: 'row-1' }, {})
    })

    await act(async () => {
      await result.current.handlePhotoSelect({
        target: { files: [file], value: '' },
      })
    })

    expect(prepare.prepareInspectionPhotoUploads).toHaveBeenCalledWith(
      expect.objectContaining({
        isCameraUpload: true,
        suppressToasts: true,
      }),
    )
    expect(result.current.cameraUploadFallback).toMatchObject({
      errorCode: 'low_memory',
      message: expect.stringContaining('low memory'),
    })
    expect(result.current.cameraUploadFallback).toBeTruthy()
    expect(isCameraFailureToRetry('low_memory')).toBe(true)
  })

  it('does not promote max-photo-count errors to camera manual fallback', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const { result } = createTestHook()

    prepare.prepareInspectionPhotoUploads.mockImplementationOnce(async ({ onFailure }) => {
      onFailure({
        code: 'max_photo_count',
        message: 'You can upload up to 10 photos.',
      })
      return null
    })

    const file = new File([new Uint8Array([1, 2, 3])], 'camera-photo.jpg', {
      type: 'image/jpeg',
    })

    act(() => result.current.requestFireExtinguisherPhotoUpload({ id: 'row-2' }, {}))
    await act(async () => {
      await result.current.handlePhotoSelect({ target: { files: [file], value: '' } })
    })

    expect(result.current.cameraUploadFallback).toBeNull()
    expect(isCameraFailureToRetry('max_photo_count')).toBe(false)
  })

  it('adds any successful photos and shows fallback when some camera photos fail', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const updateForm = vi.fn()
    const getLatestForm = vi.fn(() => ({
      photos: [{ id: 'existing', fileName: 'existing.jpg', url: 'data:' }],
    }))
    const { result } = renderHook(() =>
      useInspectionFormPhotos({
        appendInspectionText: noop,
        createPhotoId: () => 'photo-id',
        defaultHighAnglePhotosKey: 'photos',
        form: {
          photos: [{ id: 'existing', fileName: 'existing.jpg', url: 'data:' }],
        },
        getLatestForm,
        getScbaExistingCheck: () => null,
        getScbaFieldEvidenceKeys: () => ({ photosKey: 'photos' }),
        pushToast: noop,
        updateErAuxCheck: noop,
        updateFireExtinguisherCheck: noop,
        updateForm,
        updateFrtCheck: noop,
        updateHighAngleCheck: noop,
        updateHydraulicCheck: noop,
        updateScbaGroupedCheck: noop,
      }),
    )

    prepare.prepareInspectionPhotoUploads.mockImplementationOnce(async ({ onFailure }) => {
      onFailure({
        code: 'unsupported_file_type',
        message: 'Unable to process selected photo file.',
      })
      return [
        {
          id: 'generated-id',
          fileName: 'accepted-camera.jpg',
          url: 'data:image/jpeg;base64,ZmFrZQ==',
        },
      ]
    })

    const fileOne = new File(['photo-one'], 'unsupported.avif', { type: 'image/avif' })
    const fileTwo = new File(['photo-two'], 'accepted-camera.jpg', { type: 'image/jpeg' })

    act(() => {
      result.current.requestRootPhotoUpload(result.current.cameraInputRef)
    })
    await act(async () => {
      await result.current.handlePhotoSelect({
        target: { files: [fileOne, fileTwo], value: '' },
      })
    })

    expect(updateForm).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: expect.arrayContaining([
          expect.objectContaining({ id: 'existing', fileName: 'existing.jpg' }),
          expect.objectContaining({ id: 'generated-id', fileName: 'accepted-camera.jpg' }),
        ]),
      }),
    )
    expect(prepare.prepareInspectionPhotoUploads).toHaveBeenCalledWith(
      expect.objectContaining({
        isCameraUpload: true,
      }),
    )
    expect(result.current.cameraUploadFallback).toMatchObject({
      errorCode: 'unsupported_file_type',
      message: 'Unable to process selected photo file.',
    })
  })

  it('retains retryable fallback when a non-retryable error is also reported', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const { result } = createTestHook()

    prepare.prepareInspectionPhotoUploads.mockImplementationOnce(async ({ onFailure }) => {
      onFailure({ code: 'low_memory', message: 'Unable to complete due to low memory.' })
      onFailure({ code: 'max_photo_count', message: 'You can upload up to 10 photos.' })
      return null
    })

    const file = new File([new Uint8Array([1, 2, 3])], 'camera-photo.jpg', {
      type: 'image/jpeg',
    })

    act(() => {
      result.current.requestErAuxPhotoUpload({ id: 'row-3' }, {})
    })

    await act(async () => {
      await result.current.handlePhotoSelect({
        target: { files: [file], value: '' },
      })
    })

    expect(result.current.cameraUploadFallback).toMatchObject({
      errorCode: 'low_memory',
      message: expect.stringContaining('low memory'),
    })
  })
})
