import { useEffect, useRef, useState } from 'react'
import { deleteLeaveAttachmentBlob, putLeaveAttachmentBlob } from '../leavePersistence'
import {
  compressImageAttachment,
  formatFileSize,
  isImageAttachment,
  isPdfAttachment,
  isSupportedAttachment,
} from '../utils'
import { IMAGE_COMPRESSION_TRIGGER_BYTES, MAX_ATTACHMENT_BYTES } from '../constants'

const asText = (value, fallback = '') => String(value || fallback).trim()

const CAMERA_FALLBACK_MESSAGES = {
  low_memory: 'Camera processing failed due to low memory. Upload the photo manually to continue.',
  processing_failed: 'Camera processing failed. Upload the photo manually.',
  unsupported_file_type:
    'This photo format is not supported by this camera flow. Upload the photo manually.',
  invalid_file: 'The captured file is invalid. Upload the photo manually.',
  read_failed: 'Unable to read the captured photo. Upload the photo manually.',
  file_too_large:
    'Camera captured file is too large. Upload a smaller photo manually or try again.',
  compression_failed: 'Camera photo compression failed. Upload the photo manually.',
  unexpected_error: 'Camera upload failed unexpectedly. Upload the photo manually.',
}

const CAMERA_RETRYABLE_CODES = new Set([
  'low_memory',
  'processing_failed',
  'file_too_large',
  'unsupported_file_type',
  'invalid_file',
  'read_failed',
  'compression_failed',
  'unexpected_error',
])

const withFileName = (message, fileName = '') => {
  const targetFile = asText(fileName)
  if (!targetFile) return asText(message)
  return asText(message).replace(/\{\{file\}\}/g, `"${targetFile}"`)
}

const isLikelyLowMemory = (error = {}) => {
  const name = asText(error?.name).toLowerCase()
  const message = asText(error?.message).toLowerCase()
  return (
    name === 'quotaexceedederror' ||
    /out of memory|low memory|not enough memory|memory allocation|allocation failed|quota/.test(
      message,
    )
  )
}

const toCameraFailureCode = (error = {}) => {
  const name = asText(error?.name).toLowerCase()
  const message = asText(error?.message).toLowerCase()
  if (isLikelyLowMemory(error)) return 'low_memory'
  if (
    name === 'notfounderror' ||
    name === 'unsupportedformaterror' ||
    /unsupported|unsupported format|unsupported image format/.test(message)
  ) {
    return 'unsupported_file_type'
  }
  if (name === 'notreadableerror' || /could not be read|unable to read|decode/.test(message)) {
    return 'read_failed'
  }
  if (name === 'dataerror' || /invalid file|invalid file type/.test(message)) {
    return 'invalid_file'
  }
  return 'processing_failed'
}

const resolveCameraFailureMessage = (code, fileName = '') =>
  withFileName(
    CAMERA_FALLBACK_MESSAGES[code] || CAMERA_FALLBACK_MESSAGES.processing_failed,
    fileName,
  )

export default function useAttachment({
  userId,
  cameraInputRef,
  pushToast,
  originalAttachmentId = null,
} = {}) {
  const transientAttachmentIdsRef = useRef(new Set())
  const hasShownIndexedDbFallbackRef = useRef(false)
  const originalAttachmentIdRef = useRef(originalAttachmentId ? String(originalAttachmentId) : null)

  const uploadInputRef = useRef(null)
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentId, setAttachmentId] = useState(null)
  const [attachmentMeta, setAttachmentMeta] = useState(null)
  const [attachmentStatus, setAttachmentStatus] = useState(null)
  const [cameraUploadFallback, setCameraUploadFallback] = useState(null)
  const [isAttachmentProcessing, setIsAttachmentProcessing] = useState(false)

  useEffect(() => {
    originalAttachmentIdRef.current = originalAttachmentId ? String(originalAttachmentId) : null
  }, [originalAttachmentId])

  const isOriginalAttachment = (id) => {
    if (!id) return false
    return String(id) === String(originalAttachmentIdRef.current || '')
  }

  const clearCameraUploadFallback = () => setCameraUploadFallback(null)

  const setCameraFailure = (code, fileName = '') => {
    if (!CAMERA_RETRYABLE_CODES.has(code)) return
    setCameraUploadFallback({
      message: resolveCameraFailureMessage(code, fileName),
      errorCode: code,
    })
    setAttachmentStatus({
      tone: 'warning',
      label: 'Attachment retry needed',
      detail: resolveCameraFailureMessage(code, fileName),
    })
  }

  const untrackTransientAttachment = (id) => {
    if (!id) return
    transientAttachmentIdsRef.current.delete(String(id))
  }
  const trackTransientAttachment = (id) => {
    if (!id) return
    transientAttachmentIdsRef.current.add(String(id))
  }
  const deleteBlob = (id) => {
    if (!id) return
    return deleteLeaveAttachmentBlob(id)
  }

  const cleanupTransientOnly = ({ keepIds = [] } = {}) => {
    const keep = new Set((Array.isArray(keepIds) ? keepIds : []).filter(Boolean).map(String))
    transientAttachmentIdsRef.current.forEach((id) => {
      if (!keep.has(String(id))) deleteBlob(id)
    })
    transientAttachmentIdsRef.current = new Set(
      Array.from(transientAttachmentIdsRef.current).filter((id) => keep.has(String(id))),
    )
  }

  const releaseCurrentAttachmentBlob = (id) => {
    if (!id) return
    if (isOriginalAttachment(id)) return
    deleteBlob(id)
    untrackTransientAttachment(id)
  }

  const commitAttachmentReplacement = async ({ previousAttachmentId, nextAttachmentId } = {}) => {
    if (!previousAttachmentId) return { ok: true, deleted: false }
    if (String(previousAttachmentId) === String(nextAttachmentId || '')) {
      return { ok: true, deleted: false }
    }

    const deleteResult = await deleteBlob(previousAttachmentId)
    untrackTransientAttachment(previousAttachmentId)
    return { ok: Boolean(deleteResult?.ok !== false), deleted: true }
  }

  const clearAttachment = () => {
    releaseCurrentAttachmentBlob(attachmentId)
    setAttachmentName('')
    setAttachmentId(null)
    setAttachmentMeta(null)
    setAttachmentStatus(null)
  }

  const clearInput = (event) => {
    if (event?.target) event.target.value = ''
  }

  const openFileInput = (inputRef) => {
    clearCameraUploadFallback()
    if (!inputRef?.current) return
    inputRef.current.value = ''
    inputRef.current.click()
  }

  const pushFailure = (message, options = {}) => {
    if (!pushToast) return
    pushToast(message, {
      title: options.title || 'Attachment failed',
      color: options.color || 'danger',
      ...(options.delay ? { delay: options.delay } : {}),
    })
  }

  const requestUploadFromCameraFallback = () => openFileInput(uploadInputRef)

  const openCameraCapture = () => openFileInput(cameraInputRef)

  const handleAttachmentChange = async (event, opts = {}) => {
    const { userId: uid = userId, push = pushToast, source = null } = opts
    const selectedFile = event?.target?.files?.[0]
    const isCameraUpload =
      source === 'camera' || event?.currentTarget === cameraInputRef?.current || false
    const fileName = asText(selectedFile?.name)

    clearInput(event)
    clearCameraUploadFallback()

    if (!selectedFile) {
      if (!isCameraUpload) return
      return
    }

    const recordFailure = ({
      code,
      message,
      detail = message,
      suppressToast = false,
      toastTitle = 'Attachment failed',
      toastColor = 'danger',
      statusLabel = 'Attachment rejected',
      statusTone = 'danger',
    }) => {
      const resolvedMessage = withFileName(asText(message), fileName)
      setAttachmentStatus({
        tone: statusTone,
        label: statusLabel,
        detail: resolvedMessage,
      })
      if (isCameraUpload) {
        setCameraFailure(code, fileName)
      }
      if (suppressToast) return
      if (isCameraUpload && CAMERA_RETRYABLE_CODES.has(code)) return
      pushFailure(resolvedMessage, { title: toastTitle, color: toastColor })
    }

    try {
      if (!isSupportedAttachment(selectedFile)) {
        recordFailure({
          code: 'unsupported_file_type',
          detail: `Only image files (JPG, PNG, WEBP) and PDF are allowed.`,
          message: `Only image files (JPG, PNG, WEBP) and PDF are allowed.`,
          statusTone: 'danger',
          toastTitle: 'Unsupported file',
          toastColor: 'danger',
        })
        return
      }

      if (selectedFile.size > MAX_ATTACHMENT_BYTES) {
        recordFailure({
          code: 'file_too_large',
          detail: `File is too large (${formatFileSize(selectedFile.size)}). Maximum allowed size is ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
          message: `File is too large (${formatFileSize(selectedFile.size)}). Maximum allowed size is ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
          statusTone: 'danger',
          statusLabel: 'Attachment rejected',
          toastTitle: 'File too large',
          toastColor: 'danger',
          ...(isCameraUpload ? { suppressToast: true } : {}),
        })
        return
      }

      if (isPdfAttachment(selectedFile)) {
        const putResult = await putLeaveAttachmentBlob(uid, selectedFile, {
          name: selectedFile.name,
          type: selectedFile.type || 'application/pdf',
          size: selectedFile.size,
        })
        if (putResult?.attachmentId) {
          releaseCurrentAttachmentBlob(attachmentId)
          setAttachmentId(putResult.attachmentId)
          trackTransientAttachment(putResult.attachmentId)
        } else {
          setAttachmentId(null)
          if (putResult?.unsupported && !hasShownIndexedDbFallbackRef.current) {
            hasShownIndexedDbFallbackRef.current = true
            if (!isCameraUpload && push)
              push('Attachment binary fallback mode: metadata only on this browser.', {
                title: 'IndexedDB unavailable',
                color: 'warning',
              })
            if (isCameraUpload) setCameraFailure('processing_failed', fileName)
          } else if (putResult && putResult.ok === false) {
            if (!isCameraUpload && push)
              push('Unable to persist attachment binary locally. Metadata only mode applied.', {
                title: 'Attachment warning',
                color: 'warning',
              })
            if (isCameraUpload) setCameraFailure('processing_failed', fileName)
          }
        }
        setAttachmentName(selectedFile.name)
        setAttachmentMeta({
          name: selectedFile.name,
          type: selectedFile.type || 'application/pdf',
          size: selectedFile.size,
          originalSize: selectedFile.size,
          wasCompressed: false,
          attachmentId: putResult?.attachmentId || null,
        })
        if (isCameraUpload && !putResult?.attachmentId) {
          setAttachmentStatus({
            tone: 'warning',
            label: 'Attachment retry needed',
            detail: resolveCameraFailureMessage('processing_failed', fileName),
          })
        } else {
          setAttachmentStatus({
            tone: 'success',
            label: 'PDF ready',
            detail: `${selectedFile.name} (${formatFileSize(selectedFile.size)})`,
          })
        }
        if (!isCameraUpload && push)
          push(`PDF attached (${formatFileSize(selectedFile.size)}).`, {
            title: 'Attachment ready',
            color: 'info',
          })
        return
      }

      if (!isImageAttachment(selectedFile)) {
        recordFailure({
          code: 'unsupported_file_type',
          message: `"${fileName || 'Selected file'}" is not an image file.`,
          statusTone: 'danger',
          toastTitle: 'Unsupported file',
          toastColor: 'danger',
        })
        return
      }

      if (selectedFile.size <= 0 || !Number.isFinite(Number(selectedFile.size))) {
        const code = 'invalid_file'
        recordFailure({
          code,
          message: `Unable to process selected file ${fileName ? `"${fileName}"` : 'file'}.`,
          statusTone: 'danger',
          toastTitle: 'Invalid file',
          toastColor: 'danger',
        })
        return
      }

      if (selectedFile.size <= IMAGE_COMPRESSION_TRIGGER_BYTES) {
        const putResult = await putLeaveAttachmentBlob(uid, selectedFile, {
          name: selectedFile.name,
          type: selectedFile.type || 'image/jpeg',
          size: selectedFile.size,
        })
        if (putResult?.attachmentId) {
          releaseCurrentAttachmentBlob(attachmentId)
          setAttachmentId(putResult.attachmentId)
          trackTransientAttachment(putResult.attachmentId)
        } else {
          setAttachmentId(null)
          if (putResult?.unsupported && !hasShownIndexedDbFallbackRef.current) {
            hasShownIndexedDbFallbackRef.current = true
            if (push && !isCameraUpload)
              push('Attachment binary fallback mode: metadata only on this browser.', {
                title: 'IndexedDB unavailable',
                color: 'warning',
              })
            if (isCameraUpload) setCameraFailure('processing_failed', fileName)
          } else if (putResult && putResult.ok === false) {
            if (!isCameraUpload && push)
              push('Unable to persist attachment binary locally. Metadata only mode applied.', {
                title: 'Attachment warning',
                color: 'warning',
              })
            if (isCameraUpload) setCameraFailure('processing_failed', fileName)
          }
        }
        setAttachmentName(selectedFile.name)
        setAttachmentMeta({
          name: selectedFile.name,
          type: selectedFile.type || 'image/jpeg',
          size: selectedFile.size,
          originalSize: selectedFile.size,
          wasCompressed: false,
          attachmentId: putResult?.attachmentId || null,
        })
        setAttachmentStatus({
          tone: isCameraUpload && !putResult?.attachmentId ? 'warning' : 'success',
          label: isCameraUpload && !putResult?.attachmentId ? 'Attachment retry needed' : 'Ready',
          detail:
            isCameraUpload && !putResult?.attachmentId
              ? resolveCameraFailureMessage('processing_failed', fileName)
              : `${selectedFile.name} (${formatFileSize(selectedFile.size)})`,
        })
        if (!isCameraUpload && push)
          push(`Image attached (${formatFileSize(selectedFile.size)}).`, {
            title: 'Attachment ready',
            color: 'info',
          })
        if (!isCameraUpload) clearInput(event)
        return
      }

      setIsAttachmentProcessing(true)
      setAttachmentStatus({
        tone: 'warning',
        label: 'Processing',
        detail: `Compressing ${selectedFile.name}...`,
      })
      if (!isCameraUpload && push)
        push(
          `Large image detected (${formatFileSize(selectedFile.size)}). Compressing before attachment. Keep the original file in your own records.`,
          { title: 'Compressing image', color: 'warning' },
        )

      try {
        const result = await compressImageAttachment(selectedFile)
        const finalFile = result.file
        const putResult = await putLeaveAttachmentBlob(uid, finalFile, {
          name: finalFile.name,
          type: finalFile.type || selectedFile.type || 'image/jpeg',
          size: finalFile.size,
          originalSize: selectedFile.size,
          wasCompressed: result.wasCompressed,
        })
        if (putResult?.attachmentId) {
          releaseCurrentAttachmentBlob(attachmentId)
          setAttachmentId(putResult.attachmentId)
          trackTransientAttachment(putResult.attachmentId)
        } else {
          setAttachmentId(null)
          if (putResult?.unsupported && !hasShownIndexedDbFallbackRef.current) {
            hasShownIndexedDbFallbackRef.current = true
            if (!isCameraUpload && push)
              push('Attachment binary fallback mode: metadata only on this browser.', {
                title: 'IndexedDB unavailable',
                color: 'warning',
              })
          } else if (putResult && putResult.ok === false) {
            if (!isCameraUpload && push)
              push('Unable to persist attachment binary locally. Metadata only mode applied.', {
                title: 'Attachment warning',
                color: 'warning',
              })
          }
          if (isCameraUpload) {
            setCameraFailure('processing_failed', fileName)
          }
        }

        setAttachmentName(finalFile.name)
        setAttachmentMeta({
          name: finalFile.name,
          type: finalFile.type || selectedFile.type || 'image/jpeg',
          size: finalFile.size,
          originalSize: selectedFile.size,
          wasCompressed: result.wasCompressed,
          attachmentId: putResult?.attachmentId || null,
        })
        setAttachmentStatus({
          tone:
            isCameraUpload && !putResult?.attachmentId
              ? 'warning'
              : result.wasCompressed
                ? 'success'
                : 'warning',
          label:
            isCameraUpload && !putResult?.attachmentId
              ? 'Attachment retry needed'
              : result.wasCompressed
                ? 'Compressed'
                : 'Ready',
          detail:
            isCameraUpload && !putResult?.attachmentId
              ? resolveCameraFailureMessage('processing_failed', fileName)
              : result.wasCompressed
                ? `${formatFileSize(selectedFile.size)} -> ${formatFileSize(finalFile.size)}`
                : `${finalFile.name} (${formatFileSize(finalFile.size)})`,
        })
        if (!isCameraUpload) {
          if (result.wasCompressed) {
            push(
              `Image compressed from ${formatFileSize(selectedFile.size)} to ${formatFileSize(finalFile.size)}. Keep your original image in your own records.`,
              { title: 'Compression complete', color: 'success', delay: 8000 },
            )
          } else {
            push(
              `Compression did not reduce size. Original image kept (${formatFileSize(selectedFile.size)}). Keep your original image in your own records.`,
              { title: 'Attachment ready', color: 'warning' },
            )
          }
        } else if (!putResult?.attachmentId) {
          setCameraFailure('processing_failed', fileName)
        }
      } catch (error) {
        if (!isCameraUpload) {
          const putResult = await putLeaveAttachmentBlob(uid, selectedFile, {
            name: selectedFile.name,
            type: selectedFile.type || 'image/jpeg',
            size: selectedFile.size,
          })
          if (putResult?.attachmentId) {
            releaseCurrentAttachmentBlob(attachmentId)
            setAttachmentId(putResult.attachmentId)
            trackTransientAttachment(putResult.attachmentId)
          } else {
            setAttachmentId(null)
            if (putResult?.unsupported && !hasShownIndexedDbFallbackRef.current) {
              hasShownIndexedDbFallbackRef.current = true
              if (push)
                push('Attachment binary fallback mode: metadata only on this browser.', {
                  title: 'IndexedDB unavailable',
                  color: 'warning',
                })
            } else if (putResult && putResult.ok === false) {
              if (push)
                push('Unable to persist attachment binary locally. Metadata only mode applied.', {
                  title: 'Attachment warning',
                  color: 'warning',
                })
            }
          }
          setAttachmentName(selectedFile.name)
          setAttachmentMeta({
            name: selectedFile.name,
            type: selectedFile.type || 'image/jpeg',
            size: selectedFile.size,
            originalSize: selectedFile.size,
            wasCompressed: false,
            attachmentId: putResult?.attachmentId || null,
          })
          setAttachmentStatus({
            tone: 'warning',
            label: 'Compression skipped',
            detail: `${selectedFile.name} (${formatFileSize(selectedFile.size)})`,
          })
          if (push)
            push(
              'Image compression failed. Original image is attached. Keep your original image in your own records.',
              {
                title: 'Compression skipped',
                color: 'warning',
                delay: 8000,
              },
            )
          return
        }

        setAttachmentName(selectedFile.name)
        setAttachmentMeta({
          name: selectedFile.name,
          type: selectedFile.type || 'image/jpeg',
          size: selectedFile.size,
          originalSize: selectedFile.size,
          wasCompressed: false,
          attachmentId: null,
        })
        setCameraFailure(toCameraFailureCode(error), fileName)
      } finally {
        setIsAttachmentProcessing(false)
      }
    } catch (error) {
      if (isCameraUpload) {
        setCameraFailure(toCameraFailureCode(error), fileName)
      } else {
        const message = asText(error?.message, CAMERA_FALLBACK_MESSAGES.unexpected_error)
        setAttachmentStatus({
          tone: 'danger',
          label: 'Attachment failed',
          detail: message,
        })
        if (push) {
          push(message, { title: 'Attachment failed', color: 'danger' })
        }
      }
    } finally {
      clearInput(event)
    }
  }

  return {
    attachmentName,
    setAttachmentName,
    attachmentId,
    setAttachmentId,
    attachmentMeta,
    setAttachmentMeta,
    attachmentStatus,
    setAttachmentStatus,
    isAttachmentProcessing,
    setIsAttachmentProcessing,
    cameraUploadFallback,
    clearCameraUploadFallback,
    clearAttachment,
    handleAttachmentChange,
    openCameraCapture,
    requestUploadFromCameraFallback,
    uploadInputRef,
    untrackTransientAttachment,
    trackTransientAttachment,
    deleteBlob,
    cleanupTransientOnly,
    releaseCurrentAttachmentBlob,
    commitAttachmentReplacement,
  }
}
