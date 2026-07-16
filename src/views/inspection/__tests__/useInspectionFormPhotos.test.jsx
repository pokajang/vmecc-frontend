// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useInspectionFormPhotos from '../form/useInspectionFormPhotos'
import { isCameraFailureToRetry } from '../form/inspectionPhotoUtils'
import * as cameraRecovery from 'src/utils/cameraRecovery'
import { getPendingCameraOperation } from 'src/utils/cameraRecovery'
import * as cameraCaptureUtils from '../form/inspectionCameraCaptureUtils'

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

vi.mock('src/services/api/reportMediaApi', async () => {
  const actual = await vi.importActual('src/services/api/reportMediaApi')
  return {
    ...actual,
    deleteReportMedia: vi.fn().mockResolvedValue(true),
  }
})

beforeEach(() => {
  vi.spyOn(cameraCaptureUtils, 'supportsInAppInspectionCamera').mockReturnValue(true)
  vi.spyOn(cameraRecovery, 'isLikelyEmbeddedBrowser').mockReturnValue(false)
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  noop.mockReset()
})

describe('useInspectionFormPhotos', () => {
  it('starts finding photos with a blank description even when the caller supplies a label', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const onAddPhotos = vi.fn()
    const uploadedPhoto = {
      id: 'finding-photo',
      fileName: 'finding.jpg',
      description: '',
      url: 'data:image/jpeg;base64,ZmFrZQ==',
    }
    prepare.prepareInspectionPhotoUploads.mockResolvedValueOnce([uploadedPhoto])
    const { result } = createTestHook()

    act(() => {
      result.current.requestInspectionIssuePhotoUpload(
        { id: 'finding-1', label: 'Finding', onAddPhotos },
        result.current.uploadInputRef,
        { defaultDescription: 'Finding' },
      )
    })
    await act(async () => {
      await result.current.handlePhotoSelect({
        target: {
          files: [new File(['photo'], 'finding.jpg', { type: 'image/jpeg' })],
          value: '',
        },
      })
    })

    expect(prepare.prepareInspectionPhotoUploads).toHaveBeenCalledWith(
      expect.objectContaining({ defaultDescription: '' }),
    )
    expect(onAddPhotos).toHaveBeenCalledWith([uploadedPhoto])
  })

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
    expect(getPendingCameraOperation()).toBeNull()
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
    expect(getPendingCameraOperation()).toBeNull()
  })

  it('shows an actionable toast instead of manual fallback when the session expired', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const pushToast = vi.fn()
    const { result } = renderHook(() =>
      useInspectionFormPhotos({
        appendInspectionText: noop,
        createPhotoId: () => 'photo-id',
        defaultHighAnglePhotosKey: 'photos',
        form: { photos: [] },
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

    prepare.prepareInspectionPhotoUploads.mockImplementationOnce(
      async ({ onFailure, pushToast: notify }) => {
        const failure = {
          code: 'session_expired',
          message: 'Your session expired before the photo could be uploaded.',
        }
        onFailure(failure)
        notify(failure.message, { title: 'Session expired', color: 'warning' })
        return null
      },
    )

    const file = new File(['photo'], 'camera.jpg', { type: 'image/jpeg' })
    act(() => result.current.requestFireExtinguisherPhotoUpload({ id: 'row-session' }, {}))
    await act(async () => {
      await result.current.handlePhotoSelect({ target: { files: [file], value: '' } })
    })

    expect(pushToast).toHaveBeenCalledWith(
      expect.stringContaining('session expired'),
      expect.objectContaining({ title: 'Session expired' }),
    )
    expect(result.current.cameraUploadFallback).toBeNull()
    expect(getPendingCameraOperation()).toBeNull()
  })

  it('does not show a recoverable fallback when an in-app capture is cancelled', async () => {
    const { result } = createTestHook()

    act(() => result.current.requestFireExtinguisherPhotoUpload({ id: 'row-cancelled' }, {}))
    expect(getPendingCameraOperation()).toBeTruthy()

    await act(async () => {
      await result.current.handlePhotoSelect({ target: { files: [], value: '' } })
    })

    expect(result.current.cameraUploadFallback).toBeNull()
    expect(getPendingCameraOperation()).toBeNull()
  })

  it('retains the camera marker when an actual page unload aborts the upload', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    prepare.prepareInspectionPhotoUploads.mockImplementationOnce(
      ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Upload cancelled', 'AbortError')),
            { once: true },
          )
        }),
    )
    const { result, unmount } = createTestHook()
    const file = new File(['photo'], 'camera.jpg', { type: 'image/jpeg' })

    act(() => result.current.requestFireExtinguisherPhotoUpload({ id: 'row-unload' }, {}))
    let uploadPromise
    act(() => {
      uploadPromise = result.current.handlePhotoSelect({
        target: { files: [file], value: '' },
      })
    })
    unmount()
    await uploadPromise

    expect(getPendingCameraOperation()).toMatchObject({
      module: 'inspection',
      phase: 'uploading',
      targetId: 'row-unload',
    })
  })

  it('uses the bounded in-app camera path and routes its file to the selected inspection row', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    })
    const updateFireExtinguisherCheck = vi.fn()
    const onAfterAddPhotos = vi.fn()
    const photo = {
      id: 'managed-photo',
      mediaId: 'rpm-camera',
      fileName: 'inspection-camera.jpg',
      url: '/report-media/rpm-camera',
    }
    prepare.prepareInspectionPhotoUploads.mockResolvedValueOnce([photo])

    try {
      const { result } = renderHook(() =>
        useInspectionFormPhotos({
          appendInspectionText: noop,
          createPhotoId: () => 'photo-id',
          defaultHighAnglePhotosKey: 'photos',
          form: { photos: [], fireExtinguisherChecks: [] },
          getLatestForm: () => ({ photos: [], fireExtinguisherChecks: [] }),
          getScbaExistingCheck: () => null,
          getScbaFieldEvidenceKeys: () => ({ photosKey: 'photos' }),
          pushToast: noop,
          updateErAuxCheck: noop,
          updateFireExtinguisherCheck,
          updateForm: noop,
          updateFrtCheck: noop,
          updateHighAngleCheck: noop,
          updateHydraulicCheck: noop,
          updateScbaGroupedCheck: noop,
        }),
      )

      const row = { id: 'FE-IN-APP', photos: [] }
      act(() =>
        result.current.requestFireExtinguisherPhotoUpload(row, {
          onAfterAddPhotos,
        }),
      )
      expect(result.current.cameraCaptureVisible).toBe(true)

      await act(async () => {
        await result.current.handleInAppCameraCapture(
          new File(['bounded-photo'], 'inspection-camera.jpg', { type: 'image/jpeg' }),
        )
      })

      expect(prepare.prepareInspectionPhotoUploads).toHaveBeenCalledWith(
        expect.objectContaining({ isCameraUpload: true }),
      )
      expect(updateFireExtinguisherCheck).toHaveBeenCalledWith(row, {
        photos: [photo],
      })
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(onAfterAddPhotos).toHaveBeenCalledWith(
        expect.objectContaining({
          photosKey: 'photos',
          photos: [photo],
          addedPhotos: [photo],
          row,
        }),
      )
      expect(result.current.cameraCaptureVisible).toBe(false)
      expect(getPendingCameraOperation()).toBeNull()
    } finally {
      if (mediaDevicesDescriptor) {
        Object.defineProperty(navigator, 'mediaDevices', mediaDevicesDescriptor)
      } else {
        delete navigator.mediaDevices
      }
    }
  })

  it('keeps a slow capture bound to its row and blocks a second camera session', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    let finishUpload
    prepare.prepareInspectionPhotoUploads.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishUpload = resolve
        }),
    )
    const pushToast = vi.fn()
    const updateFireExtinguisherCheck = vi.fn()
    const { result } = renderHook(() =>
      useInspectionFormPhotos({
        appendInspectionText: noop,
        createPhotoId: () => 'photo-id',
        defaultHighAnglePhotosKey: 'photos',
        form: { photos: [], fireExtinguisherChecks: [] },
        getLatestForm: () => ({ photos: [], fireExtinguisherChecks: [] }),
        getScbaExistingCheck: () => null,
        getScbaFieldEvidenceKeys: () => ({ photosKey: 'photos' }),
        pushToast,
        updateErAuxCheck: noop,
        updateFireExtinguisherCheck,
        updateForm: noop,
        updateFrtCheck: noop,
        updateHighAngleCheck: noop,
        updateHydraulicCheck: noop,
        updateScbaGroupedCheck: noop,
      }),
    )
    const firstRow = { id: 'FE-FIRST', photos: [] }
    const secondRow = { id: 'FE-SECOND', photos: [] }
    const uploadedPhoto = { id: 'photo-first', mediaId: 'media-first', url: '/media-first' }

    act(() => result.current.requestFireExtinguisherPhotoUpload(firstRow))
    let capturePromise
    act(() => {
      capturePromise = result.current.handleInAppCameraCapture(
        new File(['first'], 'first.jpg', { type: 'image/jpeg' }),
      )
    })

    expect(result.current.cameraCaptureVisible).toBe(false)
    expect(result.current.isPhotoProcessing).toBe(true)

    act(() => result.current.requestFireExtinguisherPhotoUpload(secondRow))

    expect(result.current.cameraCaptureVisible).toBe(false)
    expect(pushToast).toHaveBeenCalledWith(
      expect.stringContaining('current photo'),
      expect.objectContaining({ title: 'Photo upload in progress' }),
    )

    await act(async () => {
      finishUpload([uploadedPhoto])
      await capturePromise
    })

    expect(updateFireExtinguisherCheck).toHaveBeenCalledWith(firstRow, {
      photos: [uploadedPhoto],
    })
    expect(updateFireExtinguisherCheck).not.toHaveBeenCalledWith(secondRow, expect.anything())
  })

  it('appends to the latest row photos when the form changes during upload', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const existingPhoto = { id: 'existing-photo' }
    const concurrentPhoto = { id: 'concurrent-photo' }
    const uploadedPhoto = { id: 'uploaded-photo', mediaId: 'uploaded-media' }
    const row = { id: 'FE-LATEST', photos: [existingPhoto] }
    const latestRow = { ...row, photos: [existingPhoto, concurrentPhoto] }
    const getLatestForm = vi
      .fn()
      .mockReturnValueOnce({ photos: [], fireExtinguisherChecks: [row] })
      .mockReturnValue({ photos: [], fireExtinguisherChecks: [latestRow] })
    const updateFireExtinguisherCheck = vi.fn()
    prepare.prepareInspectionPhotoUploads.mockResolvedValueOnce([uploadedPhoto])
    const { result } = renderHook(() =>
      useInspectionFormPhotos({
        appendInspectionText: noop,
        createPhotoId: () => 'photo-id',
        defaultHighAnglePhotosKey: 'photos',
        form: { photos: [], fireExtinguisherChecks: [row] },
        getLatestForm,
        getScbaExistingCheck: () => null,
        getScbaFieldEvidenceKeys: () => ({ photosKey: 'photos' }),
        pushToast: noop,
        updateErAuxCheck: noop,
        updateFireExtinguisherCheck,
        updateForm: noop,
        updateFrtCheck: noop,
        updateHighAngleCheck: noop,
        updateHydraulicCheck: noop,
        updateScbaGroupedCheck: noop,
      }),
    )

    act(() => result.current.requestFireExtinguisherPhotoUpload(row))
    await act(async () => {
      await result.current.handleInAppCameraCapture(
        new File(['photo'], 'latest.jpg', { type: 'image/jpeg' }),
      )
    })

    expect(updateFireExtinguisherCheck).toHaveBeenCalledWith(row, {
      photos: [existingPhoto, concurrentPhoto, uploadedPhoto],
    })
  })

  it('cleans up managed media and reports a row-attachment failure', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const reportMediaApi = await import('src/services/api/reportMediaApi')
    const uploadedPhoto = { id: 'uploaded-photo', mediaId: 'uploaded-media' }
    const pushToast = vi.fn()
    prepare.prepareInspectionPhotoUploads.mockResolvedValueOnce([uploadedPhoto])
    const { result } = renderHook(() =>
      useInspectionFormPhotos({
        appendInspectionText: noop,
        createPhotoId: () => 'photo-id',
        defaultHighAnglePhotosKey: 'photos',
        form: { photos: [], fireExtinguisherChecks: [] },
        getLatestForm: () => ({ photos: [], fireExtinguisherChecks: [] }),
        getScbaExistingCheck: () => null,
        getScbaFieldEvidenceKeys: () => ({ photosKey: 'photos' }),
        pushToast,
        updateErAuxCheck: noop,
        updateFireExtinguisherCheck: () => {
          throw new Error('Row is no longer available')
        },
        updateForm: noop,
        updateFrtCheck: noop,
        updateHighAngleCheck: noop,
        updateHydraulicCheck: noop,
        updateScbaGroupedCheck: noop,
      }),
    )

    act(() => result.current.requestFireExtinguisherPhotoUpload({ id: 'FE-REMOVED' }))
    await act(async () => {
      await result.current.handleInAppCameraCapture(
        new File(['photo'], 'orphan.jpg', { type: 'image/jpeg' }),
      )
    })

    expect(reportMediaApi.deleteReportMedia).toHaveBeenCalledWith('uploaded-media')
    expect(pushToast).toHaveBeenCalledWith(
      expect.stringContaining('could not be attached'),
      expect.objectContaining({ title: 'Photo attachment failed' }),
    )
  })

  it('appends Add more captures to the current drawer photos when the row prop is stale', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const existingPhoto = {
      id: 'existing-photo',
      fileName: 'existing.jpg',
      url: '/report-media/existing',
    }
    const addedPhoto = {
      id: 'added-photo',
      fileName: 'added.jpg',
      url: '/report-media/added',
    }
    const onAddPhotos = vi.fn()
    prepare.prepareInspectionPhotoUploads.mockResolvedValueOnce([addedPhoto])

    const { result } = createTestHook()
    const staleRow = { id: 'FE-ADD-MORE', photos: [] }

    act(() =>
      result.current.requestFireExtinguisherPhotoUpload(staleRow, {
        currentPhotos: [existingPhoto],
        onAddPhotos,
      }),
    )
    await act(async () => {
      await result.current.handleInAppCameraCapture(
        new File(['next-photo'], 'added.jpg', { type: 'image/jpeg' }),
      )
    })

    expect(onAddPhotos).toHaveBeenCalledWith(staleRow, 'photos', [existingPhoto, addedPhoto])
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

    const fileOne = new File(['photo-one'], 'unsupported.gif', { type: 'image/gif' })
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

  it('routes root uploads to a custom staged photo target when provided', async () => {
    const prepare = await import('../form/inspectionPhotoUtils')
    const updateForm = vi.fn()
    const onAddPhotos = vi.fn()
    const existingPhoto = { id: 'existing', fileName: 'existing.jpg', url: 'data:' }
    const stagedPhoto = {
      id: 'staged-photo',
      fileName: 'staged.jpg',
      url: 'data:image/jpeg;base64,ZmFrZQ==',
    }
    const { result } = renderHook(() =>
      useInspectionFormPhotos({
        appendInspectionText: noop,
        createPhotoId: () => 'photo-id',
        defaultHighAnglePhotosKey: 'photos',
        form: { photos: [] },
        getLatestForm: () => ({ photos: [] }),
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

    prepare.prepareInspectionPhotoUploads.mockResolvedValueOnce([stagedPhoto])

    act(() => {
      result.current.requestRootPhotoUpload(result.current.uploadInputRef, '', {
        rootPhotos: [existingPhoto],
        onAddPhotos,
      })
    })
    await act(async () => {
      await result.current.handlePhotoSelect({
        target: {
          files: [new File(['photo'], 'staged.jpg', { type: 'image/jpeg' })],
          value: '',
        },
      })
    })

    expect(prepare.prepareInspectionPhotoUploads).toHaveBeenCalledWith(
      expect.objectContaining({
        form: expect.objectContaining({ photos: [existingPhoto] }),
        isCameraUpload: false,
      }),
    )
    expect(onAddPhotos).toHaveBeenCalledWith([stagedPhoto])
    expect(updateForm).not.toHaveBeenCalled()
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
