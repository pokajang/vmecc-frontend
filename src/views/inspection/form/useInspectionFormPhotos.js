import { useEffect, useRef, useState } from 'react'
import { deleteReportMedia } from 'src/services/api/reportMediaApi'
import {
  clearPendingCameraOperation,
  getInterruptedCameraFallback,
  isLikelyEmbeddedBrowser,
  markPendingCameraOperation,
  markPendingCameraUploadStarted,
  subscribeToCameraReturn,
} from 'src/utils/cameraRecovery'
import { buildCameraDiagnostics, inspectCameraEnvironment } from 'src/utils/cameraDiagnostics'
import {
  applyPhotoCaptionById,
  getRowPhotoList,
  isCameraFailureToRetry,
  prepareInspectionPhotoUploads,
  normalizePhotoFailure,
  removePhotoById,
  updatePhotoDescriptionById,
} from './inspectionPhotoUtils'
import { createGroupedRowPhotoHandlers, createRowPhotoHandlers } from './inspectionRowPhotoActions'

const useInspectionFormPhotos = ({
  appendInspectionText,
  createPhotoId,
  defaultHighAnglePhotosKey,
  form,
  getLatestForm,
  onBeforeCameraOpen,
  getScbaExistingCheck,
  getScbaFieldEvidenceKeys,
  pushToast,
  updateErAuxCheck,
  updateFireExtinguisherCheck,
  updateForm,
  updateFrtCheck,
  updateHighAngleCheck,
  updateHydraulicCheck,
  updateScbaGroupedCheck,
}) => {
  const uploadInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const photoUploadTargetRef = useRef({ kind: 'root' })
  const activePhotoInputRef = useRef('upload')
  const photoSelectionSequenceRef = useRef(0)
  const photoUploadAbortRef = useRef(null)
  const [cameraUploadFallback, setCameraUploadFallback] = useState(() =>
    getInterruptedCameraFallback('inspection'),
  )
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false)
  const [photoUploadProgress, setPhotoUploadProgress] = useState(null)

  useEffect(() => () => photoUploadAbortRef.current?.abort(), [])
  useEffect(
    () => subscribeToCameraReturn('inspection', (fallback) => setCameraUploadFallback(fallback)),
    [],
  )
  const CAMERA_FALLBACK_ERROR_TITLES = {
    low_memory:
      'Camera processing failed due to low memory. Upload the photo manually to continue.',
    processing_failed: 'Camera processing failed. Upload the photo manually.',
    compressed_too_large: 'Photo is too large after compression. Upload manually.',
    total_size_exceeded: 'Combined photos are too large. Upload fewer photos manually.',
    read_failed: 'Unable to read photo. Upload the photo manually.',
    max_photo_count: 'Photo limit reached.',
    unsupported_file_type: 'This photo format is not supported. Upload the photo manually.',
    invalid_file: 'This photo file is invalid. Upload a valid photo manually.',
    no_photo_data: 'Photo has no readable data. Upload the photo manually.',
    operation_timeout: 'Photo upload timed out. Upload the photo manually.',
    scan_timeout_or_decode_failure: 'Camera decode timed out. Retry or upload the photo manually.',
  }

  const getCameraFallbackMessage = (failure = {}) => {
    const { code, message } = normalizePhotoFailure(failure)
    if (!isCameraFailureToRetry(code)) return null
    return (
      message ||
      CAMERA_FALLBACK_ERROR_TITLES[code] ||
      CAMERA_FALLBACK_ERROR_TITLES.processing_failed
    )
  }

  const buildCameraUploadFallback = async (failure = {}, phase = 'photo_processing') => {
    const fallbackMessage = getCameraFallbackMessage(failure)
    if (!fallbackMessage) return null

    const environment = await inspectCameraEnvironment().catch(() => null)
    const error = {
      name: failure?.code || 'camera_capture_failed',
      message: failure?.message || fallbackMessage,
    }
    const diagnostics = environment
      ? {
          ...buildCameraDiagnostics({
            environment,
            error,
            phase,
          }),
          failureType: failure?.code || 'camera_capture_failed',
        }
      : null

    return {
      message: fallbackMessage,
      errorCode: failure?.code || 'camera_capture_failed',
      phase,
      diagnostics,
    }
  }

  const openPhotoInput = (target, inputRef) => {
    photoUploadTargetRef.current = target || { kind: 'root' }
    clearCameraUploadFallback()
    activePhotoInputRef.current = inputRef === cameraInputRef ? 'camera' : 'upload'
    if (inputRef === cameraInputRef) {
      if (navigator.onLine === false) {
        setCameraUploadFallback({
          message: 'Connect to the internet before taking or uploading a photo.',
          errorCode: 'offline',
          phase: 'camera_startup',
        })
        return
      }
      if (isLikelyEmbeddedBrowser()) {
        setCameraUploadFallback({
          message: 'Open this page in Safari, Chrome, Edge, or Samsung Internet to use the camera.',
          errorCode: 'unsupported_browser',
          phase: 'camera_startup',
        })
        return
      }
      markPendingCameraOperation({
        module: 'inspection',
        targetKind: target?.kind || 'root',
        targetId: target?.row?.id || target?.issueId || '',
        photosKey: target?.photosKey || 'photos',
      })
      try {
        Promise.resolve(onBeforeCameraOpen?.(target)).catch(() => {})
      } catch {
        // Draft persistence is best-effort and must not block the native camera.
      }
    }
    if (inputRef.current) inputRef.current.value = ''
    inputRef.current?.click()
  }

  const handlePhotoSelect = async (event) => {
    const selectionSequence = ++photoSelectionSequenceRef.current
    photoUploadAbortRef.current?.abort()
    const abortController = new AbortController()
    photoUploadAbortRef.current = abortController
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return

    const uploadTarget = photoUploadTargetRef.current || { kind: 'root' }
    const source = activePhotoInputRef.current
    if (source === 'camera') markPendingCameraUploadStarted('inspection')
    const currentForm = typeof getLatestForm === 'function' ? getLatestForm() : form
    const currentFormForUpload = Array.isArray(uploadTarget?.rootPhotos)
      ? { ...currentForm, photos: uploadTarget.rootPhotos }
      : currentForm
    let nextPhotos = []
    let lastFailure = null
    let lastRetryableFailure = null
    let hadRetryableFailure = false
    setIsPhotoProcessing(true)
    setPhotoUploadProgress({ percent: 0, index: 0, count: files.length, retrying: false })

    try {
      const nextResult = await prepareInspectionPhotoUploads({
        files,
        form: currentFormForUpload,
        pushToast,
        defaultDescription: uploadTarget?.defaultDescription || uploadTarget?.caption || '',
        createPhotoId,
        isCameraUpload: source === 'camera',
        suppressToasts: source === 'camera',
        onFailure: (failure) => {
          lastFailure = failure || null
          if (failure && isCameraFailureToRetry(failure?.code)) {
            hadRetryableFailure = true
            lastRetryableFailure = failure
          }
        },
        signal: abortController.signal,
        onProgress: (progress) => setPhotoUploadProgress({ ...progress, retrying: false }),
        onRetry: (progress) => setPhotoUploadProgress({ ...progress, percent: 0, retrying: true }),
      })
      if (selectionSequence !== photoSelectionSequenceRef.current) {
        await Promise.all((nextResult || []).map((photo) => deleteReportMedia(photo.mediaId)))
        return
      }
      nextPhotos = nextResult || []
    } catch (error) {
      if (selectionSequence !== photoSelectionSequenceRef.current) return
      lastFailure = {
        code: 'unexpected_error',
        message: String(error?.message || '').trim() || 'Camera capture failed.',
      }
      hadRetryableFailure = true
    } finally {
      if (selectionSequence === photoSelectionSequenceRef.current) setIsPhotoProcessing(false)
    }

    if (selectionSequence !== photoSelectionSequenceRef.current) return

    if (!nextPhotos || nextPhotos.length === 0) {
      if (source === 'camera' && hadRetryableFailure) {
        const fallbackFailure = lastRetryableFailure || lastFailure
        const nextFallback = await buildCameraUploadFallback(fallbackFailure)
        if (selectionSequence !== photoSelectionSequenceRef.current) return
        if (nextFallback) setCameraUploadFallback(nextFallback)
      }
      return
    }

    clearPendingCameraOperation()

    if (source === 'camera' && hadRetryableFailure) {
      const fallbackFailure = lastRetryableFailure || lastFailure
      const nextFallback = await buildCameraUploadFallback(fallbackFailure)
      if (selectionSequence !== photoSelectionSequenceRef.current) return
      if (nextFallback) {
        setCameraUploadFallback(nextFallback)
      } else {
        setCameraUploadFallback(null)
      }
    } else {
      setCameraUploadFallback(null)
    }

    const committedForm = typeof getLatestForm === 'function' ? getLatestForm() : currentForm
    if (uploadTarget?.kind === 'inspectionIssue') {
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(nextPhotos)
        return
      }
      const issueId = String(uploadTarget.issueId || '').trim()
      const currentIssues = Array.isArray(committedForm.inspectionIssues)
        ? committedForm.inspectionIssues
        : []
      updateForm({
        ...committedForm,
        inspectionIssues: currentIssues.map((issue) =>
          String(issue?.id || '').trim() === issueId
            ? {
                ...issue,
                photos: [...(Array.isArray(issue.photos) ? issue.photos : []), ...nextPhotos],
                updatedAt: new Date().toISOString(),
              }
            : issue,
        ),
      })
      return
    }

    if (
      uploadTarget?.kind === 'fireExtinguisher' ||
      uploadTarget?.kind === 'fireExtinguisherDefect'
    ) {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        (Array.isArray(currentForm?.fireExtinguisherChecks)
          ? currentForm.fireExtinguisherChecks
          : []
        ).find((check) => String(check.id || '') === rowId) || row
      const photosKey =
        uploadTarget?.kind === 'fireExtinguisherDefect' ? uploadTarget.photosKey : 'photos'
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateFireExtinguisherCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'hydraulicEquipment' || uploadTarget?.kind === 'hydraulicDefect') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        (Array.isArray(currentForm?.hydraulicChecks) ? currentForm.hydraulicChecks : []).find(
          (check) => String(check.id || '') === rowId,
        ) || row
      const photosKey = uploadTarget?.kind === 'hydraulicDefect' ? uploadTarget.photosKey : 'photos'
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateHydraulicCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'frtIssue') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const isOneOff = String(row?.checklistKind || '').trim() === 'oneOff'
      const checksKey = isOneOff ? 'frtOneOffChecks' : 'frtDailyChecks'
      const checks = Array.isArray(currentForm[checksKey]) ? currentForm[checksKey] : []
      const existingCheck = checks.find((check) => String(check.id || '') === rowId) || row
      const photosKey = uploadTarget.photosKey || 'photos'
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      const photos = [
        ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
        ...nextPhotos,
      ]
      updateFrtCheck(row, {
        [photosKey]: photos,
      })
      return
    }

    if (uploadTarget?.kind === 'highAngleIssue') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        (Array.isArray(currentForm?.highAngleChecks) ? currentForm.highAngleChecks : []).find(
          (check) => String(check.id || '') === rowId,
        ) || row
      const photosKey = uploadTarget.photosKey || defaultHighAnglePhotosKey
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateHighAngleCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'scbaEquipment' || uploadTarget?.kind === 'scbaIssue') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const sectionKey = uploadTarget.sectionKey || row.sectionKey
      const existingCheck = getScbaExistingCheck(currentForm, sectionKey, rowId) || row
      const photosKey = uploadTarget.photosKey || 'photos'
      if (!photosKey) return
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(sectionKey, row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateScbaGroupedCheck(sectionKey, row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (uploadTarget?.kind === 'erAuxEquipment' || uploadTarget?.kind === 'erAuxDefect') {
      const row = uploadTarget.row || {}
      const rowId = String(row.id || '').trim()
      const existingCheck =
        (Array.isArray(currentForm?.erAuxChecks) ? currentForm.erAuxChecks : []).find(
          (check) => String(check.id || '') === rowId,
        ) || row
      const photosKey = uploadTarget?.kind === 'erAuxDefect' ? 'defectPhotos' : 'photos'
      if (typeof uploadTarget.onAddPhotos === 'function') {
        uploadTarget.onAddPhotos(row, photosKey, [
          ...(Array.isArray(row[photosKey]) ? row[photosKey] : []),
          ...nextPhotos,
        ])
        return
      }
      updateErAuxCheck(row, {
        [photosKey]: [
          ...(Array.isArray(existingCheck[photosKey]) ? existingCheck[photosKey] : []),
          ...nextPhotos,
        ],
      })
      return
    }

    if (typeof uploadTarget?.onAddPhotos === 'function') {
      uploadTarget.onAddPhotos(nextPhotos)
      return
    }

    updateForm({
      ...committedForm,
      photos: [...(Array.isArray(committedForm.photos) ? committedForm.photos : []), ...nextPhotos],
    })
  }

  const requestUploadFromCameraFallback = () =>
    openPhotoInput(photoUploadTargetRef.current || { kind: 'root' }, uploadInputRef)

  const clearCameraUploadFallback = () => setCameraUploadFallback(null)

  const requestRootPhotoUpload = (inputRef, defaultDescription = '', options = {}) =>
    openPhotoInput(
      { kind: 'root', defaultDescription: String(defaultDescription || '').trim(), ...options },
      inputRef,
    )

  const requestInspectionIssuePhotoUpload = (issue, inputRef = cameraInputRef) => {
    const label = String(issue?.label || issue?.description || 'Finding').trim()
    openPhotoInput(
      {
        kind: 'inspectionIssue',
        issueId: issue?.id,
        defaultDescription: label,
        onAddPhotos: issue?.onAddPhotos,
      },
      inputRef,
    )
  }

  const requestHydraulicPhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'hydraulicEquipment', row, ...options }, cameraInputRef)
  }

  const requestErAuxPhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'erAuxEquipment', row, ...options }, cameraInputRef)
  }

  const requestErAuxDefectPhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'erAuxDefect', row, ...options }, cameraInputRef)
  }

  const requestHydraulicDefectPhotoUpload = (row, field, options = {}) => {
    openPhotoInput(
      { kind: 'hydraulicDefect', row, photosKey: field.photosKey, ...options },
      cameraInputRef,
    )
  }

  const requestFireExtinguisherPhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'fireExtinguisher', row, ...options }, cameraInputRef)
  }

  const requestFireExtinguisherDefectPhotoUpload = (row, field, options = {}) => {
    openPhotoInput(
      { kind: 'fireExtinguisherDefect', row, photosKey: field.photosKey, ...options },
      cameraInputRef,
    )
  }

  const requestFrtIssuePhotoUpload = (row, options = {}) => {
    openPhotoInput({ kind: 'frtIssue', row, photosKey: 'photos', ...options }, cameraInputRef)
  }

  const requestHighAngleIssuePhotoUpload = (row, options = {}) => {
    openPhotoInput(
      { kind: 'highAngleIssue', row, photosKey: defaultHighAnglePhotosKey, ...options },
      cameraInputRef,
    )
  }

  const requestScbaIssuePhotoUpload = (sectionKey, row, field, options = {}) => {
    const { photosKey } = getScbaFieldEvidenceKeys(field)
    openPhotoInput({ kind: 'scbaIssue', sectionKey, row, photosKey, ...options }, cameraInputRef)
  }

  const requestScbaPhotoUpload = (sectionKey, row, options = {}) => {
    openPhotoInput(
      { kind: 'scbaEquipment', sectionKey, row, photosKey: 'photos', ...options },
      cameraInputRef,
    )
  }

  const removePhoto = (photoId) => {
    updateForm({
      ...form,
      photos: removePhotoById(form.photos, photoId),
    })
  }

  const updatePhotoDescription = (photoId, description) => {
    updateForm({
      ...form,
      photos: updatePhotoDescriptionById(form.photos, photoId, description),
    })
  }

  const getHydraulicPhotoList = (row, photosKey = 'photos') =>
    getRowPhotoList(form.hydraulicChecks, row, photosKey)
  const hydraulicPhotoHandlers = createRowPhotoHandlers({
    getPhotos: getHydraulicPhotoList,
    updateRow: updateHydraulicCheck,
    appendText: appendInspectionText,
  })

  const getErAuxPhotoList = (row, photosKey = 'photos') =>
    getRowPhotoList(form.erAuxChecks, row, photosKey)
  const erAuxPhotoHandlers = createRowPhotoHandlers({
    getPhotos: getErAuxPhotoList,
    updateRow: updateErAuxCheck,
    appendText: appendInspectionText,
  })

  const getFrtPhotoList = (row, photosKey = 'photos') => {
    const rowId = String(row?.id || '').trim()
    const checksKey =
      String(row?.checklistKind || '').trim() === 'oneOff' ? 'frtOneOffChecks' : 'frtDailyChecks'
    const checks = Array.isArray(form[checksKey]) ? form[checksKey] : []
    const existing = checks.find((check) => String(check.id || '') === rowId)
    return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
  }

  const getHighAnglePhotoList = (row, photosKey = defaultHighAnglePhotosKey) =>
    getRowPhotoList(form.highAngleChecks, row, photosKey)
  const highAnglePhotoHandlers = createRowPhotoHandlers({
    getPhotos: getHighAnglePhotoList,
    updateRow: updateHighAngleCheck,
    appendText: appendInspectionText,
  })

  const getScbaPhotoList = (sectionKey, row, photosKey = 'photos') => {
    const rowId = String(row?.id || '').trim()
    const existing = getScbaExistingCheck(form, sectionKey, rowId)
    return Array.isArray(existing?.[photosKey]) ? existing[photosKey] : []
  }
  const scbaPhotoHandlers = createGroupedRowPhotoHandlers({
    getPhotos: getScbaPhotoList,
    updateRow: updateScbaGroupedCheck,
    appendText: appendInspectionText,
  })

  const getFireExtinguisherPhotoList = (row, photosKey = 'photos') =>
    getRowPhotoList(form.fireExtinguisherChecks, row, photosKey)
  const fireExtinguisherPhotoHandlers = createRowPhotoHandlers({
    getPhotos: getFireExtinguisherPhotoList,
    updateRow: updateFireExtinguisherCheck,
    appendText: appendInspectionText,
  })

  const removeFrtPhoto = (row, photoId, photosKey = 'photos') => {
    updateFrtCheck(row, {
      [photosKey]: removePhotoById(getFrtPhotoList(row, photosKey), photoId),
    })
  }

  const updateFrtPhotoDescription = (row, photoId, description, photosKey = 'photos') => {
    updateFrtCheck(row, {
      [photosKey]: updatePhotoDescriptionById(
        getFrtPhotoList(row, photosKey),
        photoId,
        description,
      ),
    })
  }

  const applyFrtPhotoCaption = (row, photoId, caption, photosKey = 'photos') => {
    updateFrtCheck(row, {
      [photosKey]: applyPhotoCaptionById(
        getFrtPhotoList(row, photosKey),
        photoId,
        caption,
        appendInspectionText,
      ),
    })
  }

  return {
    applyErAuxPhotoCaption: (...args) => erAuxPhotoHandlers.applyPhotoCaption(...args),
    applyFireExtinguisherPhotoCaption: (...args) =>
      fireExtinguisherPhotoHandlers.applyPhotoCaption(...args),
    applyFrtPhotoCaption,
    applyHighAnglePhotoCaption: (...args) => highAnglePhotoHandlers.applyPhotoCaption(...args),
    applyHydraulicPhotoCaption: (...args) => hydraulicPhotoHandlers.applyPhotoCaption(...args),
    applyScbaPhotoCaption: (...args) => scbaPhotoHandlers.applyPhotoCaption(...args),
    cameraInputRef,
    handlePhotoSelect,
    removeErAuxPhoto: (...args) => erAuxPhotoHandlers.removePhoto(...args),
    removeFireExtinguisherPhoto: (...args) => fireExtinguisherPhotoHandlers.removePhoto(...args),
    removeFrtPhoto,
    removeHighAnglePhoto: (...args) => highAnglePhotoHandlers.removePhoto(...args),
    removeHydraulicPhoto: (...args) => hydraulicPhotoHandlers.removePhoto(...args),
    removePhoto,
    removeScbaPhoto: (...args) => scbaPhotoHandlers.removePhoto(...args),
    requestErAuxDefectPhotoUpload,
    requestErAuxPhotoUpload,
    requestFireExtinguisherDefectPhotoUpload,
    requestFireExtinguisherPhotoUpload,
    requestFrtIssuePhotoUpload,
    requestHighAngleIssuePhotoUpload,
    requestHydraulicDefectPhotoUpload,
    requestHydraulicPhotoUpload,
    requestInspectionIssuePhotoUpload,
    requestRootPhotoUpload,
    requestScbaIssuePhotoUpload,
    requestScbaPhotoUpload,
    cameraUploadFallback,
    isPhotoProcessing,
    photoUploadProgress,
    clearCameraUploadFallback,
    requestUploadFromCameraFallback,
    updateErAuxPhotoDescription: (...args) => erAuxPhotoHandlers.updatePhotoDescription(...args),
    updateFireExtinguisherPhotoDescription: (...args) =>
      fireExtinguisherPhotoHandlers.updatePhotoDescription(...args),
    updateFrtPhotoDescription,
    updateHighAnglePhotoDescription: (...args) =>
      highAnglePhotoHandlers.updatePhotoDescription(...args),
    updateHydraulicPhotoDescription: (...args) =>
      hydraulicPhotoHandlers.updatePhotoDescription(...args),
    updatePhotoDescription,
    updateScbaPhotoDescription: (...args) => scbaPhotoHandlers.updatePhotoDescription(...args),
    uploadInputRef,
  }
}

export default useInspectionFormPhotos
