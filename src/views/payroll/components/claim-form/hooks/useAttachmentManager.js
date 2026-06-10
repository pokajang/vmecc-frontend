import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadWorkflowAttachmentForPreview,
  releaseWorkflowAttachmentFromApi,
  uploadAttachmentPayloadToApi,
  uploadWorkflowAttachmentFileToApi,
} from '../../attachmentUtils'
import { getAttachmentKind, validatePayrollAttachmentFile } from '../utils/claimFormUtils'

const useAttachmentManager = ({
  draftItem,
  setDraftItem,
  editingIndex,
  savedItems,
  setSavedItems,
  pushToast,
  hasHydratedDraftRef,
  normalizeItem,
}) => {
  const [attachmentPreviewVisible, setAttachmentPreviewVisible] = useState(false)
  const [attachmentPreviewItem, setAttachmentPreviewItem] = useState(null)
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('')
  const [attachmentPreviewMimeType, setAttachmentPreviewMimeType] = useState('')
  const [attachmentPreviewLoading, setAttachmentPreviewLoading] = useState(false)
  const [attachmentPreviewZoom, setAttachmentPreviewZoom] = useState(1)
  const attachmentPreviewObjectUrlRef = useRef('')

  const updateDraftItem = useCallback(
    (changes) => setDraftItem((prev) => normalizeItem({ ...prev, ...changes })),
    [normalizeItem, setDraftItem],
  )

  const getProtectedEditingAttachmentId = useCallback(() => {
    if (editingIndex === null) return 0
    return Number(savedItems[editingIndex]?.attachmentId || 0) || 0
  }, [editingIndex, savedItems])

  const releaseAttachmentIds = useCallback((ids = []) => {
    const uniqueIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .map((value) => Number(value || 0) || 0)
          .filter((value) => value > 0),
      ),
    )
    if (uniqueIds.length === 0) return
    uniqueIds.forEach((id) => {
      void releaseWorkflowAttachmentFromApi(id)
    })
  }, [])

  const clearDraftAttachment = useCallback(() => {
    const attachmentId = Number(draftItem?.attachmentId || 0) || 0
    const protectedAttachmentId = getProtectedEditingAttachmentId()
    updateDraftItem({
      attachmentId: null,
      attachmentName: '',
      attachmentError: '',
      attachmentUploadState: 'idle',
      needsReattach: false,
      attachmentMigrationAttempted: false,
      legacyAttachmentDataUrl: '',
      attachmentMimeType: '',
      attachmentSizeBytes: 0,
    })
    if (attachmentId > 0 && attachmentId !== protectedAttachmentId) {
      releaseAttachmentIds([attachmentId])
    }
  }, [
    draftItem?.attachmentId,
    getProtectedEditingAttachmentId,
    releaseAttachmentIds,
    updateDraftItem,
  ])

  const updateAttachmentPreviewZoom = useCallback((nextZoom) => {
    const parsed = Number(nextZoom)
    if (!Number.isFinite(parsed)) return
    setAttachmentPreviewZoom(Math.min(4, Math.max(0.25, parsed)))
  }, [])

  const openAttachmentPreview = useCallback(
    async (item) => {
      const normalizedItem = item && typeof item === 'object' ? item : null
      if (!normalizedItem?.attachmentName && !normalizedItem?.attachmentId) return
      setAttachmentPreviewItem(normalizedItem)
      setAttachmentPreviewVisible(true)
      if (attachmentPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(attachmentPreviewObjectUrlRef.current)
        attachmentPreviewObjectUrlRef.current = ''
      }
      setAttachmentPreviewUrl('')
      setAttachmentPreviewMimeType('')
      setAttachmentPreviewZoom(1)
      const attachmentId = Number(normalizedItem?.attachmentId || 0) || 0
      if (!attachmentId) {
        pushToast('Preview is unavailable for this attachment in current draft state.', {
          title: 'Preview unavailable',
          color: 'warning',
        })
        return
      }
      setAttachmentPreviewLoading(true)
      try {
        const loaded = await loadWorkflowAttachmentForPreview(attachmentId)
        if (!loaded?.objectUrl) throw new Error('Attachment preview failed')
        attachmentPreviewObjectUrlRef.current = loaded.objectUrl
        setAttachmentPreviewUrl(loaded.objectUrl)
        setAttachmentPreviewMimeType(
          String(
            loaded.contentType || normalizedItem?.attachmentMimeType || 'application/octet-stream',
          ).trim(),
        )
      } catch {
        pushToast('Unable to load attachment preview from API. You can still download the file.', {
          title: 'Preview unavailable',
          color: 'warning',
        })
      } finally {
        setAttachmentPreviewLoading(false)
      }
    },
    [pushToast],
  )

  const closeAttachmentPreviewModal = useCallback(() => {
    setAttachmentPreviewVisible(false)
    setAttachmentPreviewItem(null)
    setAttachmentPreviewLoading(false)
    setAttachmentPreviewMimeType('')
    setAttachmentPreviewUrl('')
    setAttachmentPreviewZoom(1)
    if (attachmentPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(attachmentPreviewObjectUrlRef.current)
      attachmentPreviewObjectUrlRef.current = ''
    }
  }, [])

  useEffect(
    () => () => {
      if (attachmentPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(attachmentPreviewObjectUrlRef.current)
        attachmentPreviewObjectUrlRef.current = ''
      }
    },
    [],
  )

  const handleAttachmentChange = useCallback(
    async (file) => {
      if (!(file instanceof File)) {
        clearDraftAttachment()
        return
      }
      const validation = validatePayrollAttachmentFile(file)
      if (!validation.ok) {
        updateDraftItem({
          attachmentError: validation.message,
          attachmentUploadState: 'failed',
          needsReattach: true,
        })
        pushToast(validation.message, {
          title: 'Attachment rejected',
          color: 'danger',
        })
        return
      }
      const previousAttachmentId = Number(draftItem?.attachmentId || 0) || 0
      const protectedAttachmentId = getProtectedEditingAttachmentId()
      updateDraftItem({
        attachmentId: null,
        attachmentName: String(file.name || '').trim(),
        attachmentError: '',
        attachmentUploadState: 'uploading',
        needsReattach: false,
        attachmentMigrationAttempted: true,
        legacyAttachmentDataUrl: '',
        attachmentMimeType: String(file.type || '').trim(),
        attachmentSizeBytes: Number(file.size || 0) || 0,
      })
      try {
        const uploaded = await uploadWorkflowAttachmentFileToApi(file)
        if (!uploaded?.attachmentId) throw new Error('Attachment upload failed')
        updateDraftItem({
          attachmentId: uploaded.attachmentId,
          attachmentName: uploaded.attachmentName,
          attachmentError: '',
          attachmentUploadState: 'uploaded',
          needsReattach: false,
          attachmentMigrationAttempted: true,
          legacyAttachmentDataUrl: '',
          attachmentMimeType: uploaded.attachmentMimeType,
          attachmentSizeBytes: uploaded.attachmentSizeBytes,
        })
        if (
          previousAttachmentId > 0 &&
          previousAttachmentId !== uploaded.attachmentId &&
          previousAttachmentId !== protectedAttachmentId
        ) {
          releaseAttachmentIds([previousAttachmentId])
        }
      } catch (error) {
        const errorMessage =
          error?.message || 'Attachment upload failed. Reattach or remove this file before saving.'
        updateDraftItem({
          attachmentName: String(file.name || '').trim(),
          attachmentId: null,
          attachmentError: errorMessage,
          attachmentUploadState: 'failed',
          needsReattach: true,
          attachmentMigrationAttempted: true,
          legacyAttachmentDataUrl: '',
          attachmentMimeType: String(file.type || '').trim(),
          attachmentSizeBytes: Number(file.size || 0) || 0,
        })
        pushToast(errorMessage, {
          title: 'Attachment warning',
          color: 'warning',
        })
        if (previousAttachmentId > 0 && previousAttachmentId !== protectedAttachmentId) {
          releaseAttachmentIds([previousAttachmentId])
        }
      }
    },
    [
      clearDraftAttachment,
      draftItem?.attachmentId,
      getProtectedEditingAttachmentId,
      pushToast,
      releaseAttachmentIds,
      updateDraftItem,
    ],
  )

  useEffect(() => {
    if (!hasHydratedDraftRef.current) return
    const pendingSavedIndexes = savedItems
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) =>
          Boolean(item?.legacyAttachmentDataUrl) &&
          !item?.attachmentId &&
          item?.attachmentMigrationAttempted !== true,
      )
      .map(({ index }) => index)
    const shouldMigrateDraftItem =
      Boolean(draftItem?.legacyAttachmentDataUrl) &&
      !draftItem?.attachmentId &&
      draftItem?.attachmentMigrationAttempted !== true
    if (pendingSavedIndexes.length === 0 && !shouldMigrateDraftItem) return

    setSavedItems((prev) =>
      prev.map((item, index) =>
        pendingSavedIndexes.includes(index)
          ? normalizeItem({
              ...item,
              attachmentMigrationAttempted: true,
              attachmentUploadState: 'uploading',
            })
          : item,
      ),
    )
    if (shouldMigrateDraftItem) {
      setDraftItem((prev) =>
        normalizeItem({
          ...prev,
          attachmentMigrationAttempted: true,
          attachmentUploadState: 'uploading',
        }),
      )
    }

    let active = true
    const runMigration = async () => {
      const migrateAttachment = async (item) => {
        try {
          const uploaded = await uploadAttachmentPayloadToApi({
            attachmentName: item?.attachmentName || '',
            attachmentDataUrl: item?.legacyAttachmentDataUrl || '',
            attachmentMimeType: item?.attachmentMimeType || '',
            attachmentSizeBytes: item?.attachmentSizeBytes || 0,
          })
          if (uploaded?.attachmentId) {
            return {
              ok: true,
              next: {
                ...item,
                attachmentId: uploaded.attachmentId,
                attachmentName: uploaded.attachmentName,
                attachmentMimeType: uploaded.attachmentMimeType,
                attachmentSizeBytes: uploaded.attachmentSizeBytes,
                attachmentError: '',
                attachmentUploadState: 'uploaded',
                needsReattach: false,
                attachmentMigrationAttempted: true,
                legacyAttachmentDataUrl: '',
              },
            }
          }
        } catch {
          // fallback below
        }
        return {
          ok: false,
          next: {
            ...item,
            attachmentId: null,
            attachmentError: 'Attachment migration failed. Reattach the file before saving.',
            attachmentUploadState: 'failed',
            needsReattach: true,
            attachmentMigrationAttempted: true,
            legacyAttachmentDataUrl: '',
          },
        }
      }

      const savedResults = await Promise.all(
        pendingSavedIndexes.map(async (index) => ({
          index,
          ...(await migrateAttachment(savedItems[index])),
        })),
      )
      const draftResult = shouldMigrateDraftItem ? await migrateAttachment(draftItem) : null
      if (!active) return

      if (savedResults.length > 0) {
        setSavedItems((prev) =>
          prev.map((item, index) => {
            const result = savedResults.find((entry) => entry.index === index)
            return result ? normalizeItem(result.next) : item
          }),
        )
      }
      if (draftResult) {
        setDraftItem(normalizeItem(draftResult.next))
      }
      const failedCount =
        savedResults.filter((entry) => entry.ok === false).length +
        (draftResult?.ok === false ? 1 : 0)
      if (failedCount > 0) {
        pushToast(
          `${failedCount} legacy attachment(s) could not be migrated and require reattachment.`,
          { title: 'Attachment migration', color: 'warning' },
        )
      }
    }

    void runMigration()
    return () => {
      active = false
    }
  }, [
    draftItem,
    hasHydratedDraftRef,
    normalizeItem,
    pushToast,
    savedItems,
    setDraftItem,
    setSavedItems,
  ])

  const isImageAttachmentPreview = useMemo(
    () =>
      !attachmentPreviewLoading &&
      Boolean(attachmentPreviewUrl) &&
      getAttachmentKind({
        attachmentName: attachmentPreviewItem?.attachmentName || '',
        attachmentMimeType: attachmentPreviewMimeType,
      }) === 'image',
    [
      attachmentPreviewItem?.attachmentName,
      attachmentPreviewLoading,
      attachmentPreviewMimeType,
      attachmentPreviewUrl,
    ],
  )

  return {
    updateDraftItem,
    getProtectedEditingAttachmentId,
    releaseAttachmentIds,
    clearDraftAttachment,
    handleAttachmentChange,
    attachmentPreviewVisible,
    attachmentPreviewItem,
    attachmentPreviewUrl,
    attachmentPreviewMimeType,
    attachmentPreviewLoading,
    attachmentPreviewZoom,
    isImageAttachmentPreview,
    openAttachmentPreview,
    closeAttachmentPreviewModal,
    updateAttachmentPreviewZoom,
  }
}

export default useAttachmentManager
