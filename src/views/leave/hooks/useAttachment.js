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

export default function useAttachment({
  userId,
  cameraInputRef,
  pushToast,
  originalAttachmentId = null,
} = {}) {
  const transientAttachmentIdsRef = useRef(new Set())
  const hasShownIndexedDbFallbackRef = useRef(false)
  const originalAttachmentIdRef = useRef(originalAttachmentId ? String(originalAttachmentId) : null)

  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentId, setAttachmentId] = useState(null)
  const [attachmentMeta, setAttachmentMeta] = useState(null)
  const [attachmentStatus, setAttachmentStatus] = useState(null)
  const [isAttachmentProcessing, setIsAttachmentProcessing] = useState(false)

  useEffect(() => {
    originalAttachmentIdRef.current = originalAttachmentId ? String(originalAttachmentId) : null
  }, [originalAttachmentId])

  const isOriginalAttachment = (id) => {
    if (!id) return false
    return String(id) === String(originalAttachmentIdRef.current || '')
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

  const handleAttachmentChange = async (event, opts = {}) => {
    const { userId: uid = userId, push = pushToast } = opts
    const resetInput = () => {
      if (event?.target) event.target.value = ''
    }
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      clearAttachment()
      resetInput()
      return
    }

    if (!isSupportedAttachment(selectedFile)) {
      if (push)
        push('Only image files (JPG, PNG, WEBP) and PDF are allowed.', {
          title: 'Unsupported file',
          color: 'danger',
        })
      setAttachmentStatus({
        tone: 'danger',
        label: 'Attachment rejected',
        detail: 'Only JPG, PNG, WEBP, or PDF are allowed.',
      })
      resetInput()
      return
    }

    if (selectedFile.size > MAX_ATTACHMENT_BYTES) {
      if (push)
        push(
          `File is too large (${formatFileSize(selectedFile.size)}). Maximum allowed size is ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
          { title: 'File too large', color: 'danger' },
        )
      setAttachmentStatus({
        tone: 'danger',
        label: 'Attachment rejected',
        detail: `File exceeds ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
      })
      resetInput()
      return
    }

    // PDF flow
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
        type: selectedFile.type || 'application/pdf',
        size: selectedFile.size,
        originalSize: selectedFile.size,
        wasCompressed: false,
        attachmentId: putResult?.attachmentId || null,
      })
      setAttachmentStatus({
        tone: 'info',
        label: 'PDF ready',
        detail: `${selectedFile.name} (${formatFileSize(selectedFile.size)})`,
      })
      if (push)
        push(`PDF attached (${formatFileSize(selectedFile.size)}).`, {
          title: 'Attachment ready',
          color: 'info',
        })
      resetInput()
      return
    }

    // Image flow
    if (!isImageAttachment(selectedFile)) {
      if (push)
        push('Selected file type is not supported.', { title: 'Unsupported file', color: 'danger' })
      setAttachmentStatus({
        tone: 'danger',
        label: 'Attachment rejected',
        detail: 'Unsupported file type.',
      })
      resetInput()
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
        tone: 'success',
        label: 'Ready',
        detail: `${selectedFile.name} (${formatFileSize(selectedFile.size)})`,
      })
      if (push)
        push(`Image attached (${formatFileSize(selectedFile.size)}).`, {
          title: 'Attachment ready',
          color: 'info',
        })
      resetInput()
      return
    }

    setIsAttachmentProcessing(true)
    setAttachmentStatus({
      tone: 'warning',
      label: 'Processing',
      detail: `Compressing ${selectedFile.name}...`,
    })
    if (push)
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
        tone: result.wasCompressed ? 'success' : 'warning',
        label: result.wasCompressed ? 'Compressed' : 'Ready',
        detail: result.wasCompressed
          ? `${formatFileSize(selectedFile.size)} -> ${formatFileSize(finalFile.size)}`
          : `${finalFile.name} (${formatFileSize(finalFile.size)})`,
      })
      if (result.wasCompressed) {
        if (push)
          push(
            `Image compressed from ${formatFileSize(selectedFile.size)} to ${formatFileSize(finalFile.size)}. Keep your original image in your own records.`,
            { title: 'Compression complete', color: 'success', delay: 8000 },
          )
      } else {
        if (push)
          push(
            `Compression did not reduce size. Original image kept (${formatFileSize(selectedFile.size)}). Keep your original image in your own records.`,
            { title: 'Attachment ready', color: 'warning' },
          )
      }
    } catch (error) {
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
    } finally {
      setIsAttachmentProcessing(false)
      resetInput()
    }
  }

  const openCameraCapture = () => {
    if (isAttachmentProcessing) return
    cameraInputRef?.current?.click()
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
    clearAttachment,
    handleAttachmentChange,
    openCameraCapture,
    untrackTransientAttachment,
    trackTransientAttachment,
    deleteBlob,
    cleanupTransientOnly,
    releaseCurrentAttachmentBlob,
    commitAttachmentReplacement,
  }
}
