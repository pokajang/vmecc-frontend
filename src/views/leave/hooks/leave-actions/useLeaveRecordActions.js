import { useCallback, useMemo, useState } from 'react'
import { apiRequest } from 'src/services/apiClient'
import { loadLeaveAssignmentsForUser, loadLeaveRecords } from '../../leavePersistence'
import { isLeaveCancellableByApplicant } from '../../leaveWorkflow'

export default function useLeaveRecordActions({
  user,
  leaveId,
  navigate,
  leaveRecords,
  setLeaveRecords,
  setAssignmentRows,
  pushToast,
  getDisplayLeaveId,
  deleteAttachmentBlobSafe,
  setEditingRecordId,
  setOriginalAttachmentId,
  setLeaveType,
  setLeaveTypeConfirmed,
  setStartDate,
  setEndDate,
  setWorkShift,
  setStartTimeSlot,
  setEndTimeSlot,
  setReason,
  setCoverBy,
  setAttachmentName,
  setAttachmentId,
  setAttachmentMeta,
  setAttachmentStatus,
  setIsAttachmentProcessing,
  clearInlineErrors,
  resetSubmitPreview,
}) {
  const [isCancelConfirmVisible, setIsCancelConfirmVisible] = useState(false)
  const [cancelPreviewRecordId, setCancelPreviewRecordId] = useState('')
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)
  const [deletePreviewRecordId, setDeletePreviewRecordId] = useState('')

  const cancelPreviewRecord = useMemo(
    () =>
      leaveRecords.find((row) => String(row?.id || '') === String(cancelPreviewRecordId || '')) ||
      null,
    [cancelPreviewRecordId, leaveRecords],
  )
  const deletePreviewRecord = useMemo(
    () =>
      leaveRecords.find((row) => String(row?.id || '') === String(deletePreviewRecordId || '')) ||
      null,
    [deletePreviewRecordId, leaveRecords],
  )

  const closeCancelConfirmModal = useCallback(() => {
    setIsCancelConfirmVisible(false)
    setCancelPreviewRecordId('')
  }, [])

  const closeDeleteConfirmModal = useCallback(() => {
    setIsDeleteConfirmVisible(false)
    setDeletePreviewRecordId('')
  }, [])

  const openLeaveForEdit = useCallback(
    (row) => {
      if (!row?.id) return
      if (!['Pending', 'Draft'].includes(row.status)) {
        pushToast('Only Pending or Draft leave requests can be edited.', {
          title: 'Edit unavailable',
          color: 'warning',
        })
        return
      }
      setEditingRecordId(row.id)
      setOriginalAttachmentId(row.attachmentId || null)
      setLeaveType(row.leaveType || '')
      setLeaveTypeConfirmed(true)
      setStartDate(row.startDate || '')
      setEndDate(row.endDate || row.startDate || '')
      setWorkShift(row.workShift || 'normal')
      setStartTimeSlot(row.startTimeSlot || 'shift-start')
      setEndTimeSlot(row.endTimeSlot || 'shift-end')
      setReason(row.reason || '')
      setCoverBy(row.coverBy || '')
      setAttachmentName(row.attachmentName || '')
      setAttachmentId(row.attachmentId || null)
      setAttachmentMeta(
        row.attachmentName
          ? {
              name: row.attachmentName,
              type: row.attachmentMimeType || '',
              size: Number(row.attachmentSize || 0) || null,
              originalSize: Number(row.attachmentOriginalSize || row.attachmentSize || 0) || null,
              wasCompressed: Boolean(row.attachmentCompressed),
              attachmentId: row.attachmentId || null,
            }
          : null,
      )
      setAttachmentStatus(
        row.attachmentName ? { tone: 'muted', label: 'Ready', detail: row.attachmentName } : null,
      )
      setIsAttachmentProcessing(false)
      clearInlineErrors()
      resetSubmitPreview()
      navigate('/leave/new')
    },
    [
      clearInlineErrors,
      navigate,
      pushToast,
      resetSubmitPreview,
      setAttachmentId,
      setAttachmentMeta,
      setAttachmentName,
      setAttachmentStatus,
      setCoverBy,
      setEditingRecordId,
      setEndDate,
      setEndTimeSlot,
      setIsAttachmentProcessing,
      setLeaveType,
      setLeaveTypeConfirmed,
      setOriginalAttachmentId,
      setReason,
      setStartDate,
      setStartTimeSlot,
      setWorkShift,
    ],
  )

  const canCancelLeave = useCallback((row) => {
    if (!row?.id) return false
    return isLeaveCancellableByApplicant(row)
  }, [])

  const cancelLeave = useCallback(
    (row) => {
      if (!row?.id) return
      if (!isLeaveCancellableByApplicant(row)) {
        pushToast('Only pending leave requests can be cancelled.', {
          title: 'Cancel unavailable',
          color: 'warning',
        })
        return
      }
      setCancelPreviewRecordId(String(row.id))
      setIsCancelConfirmVisible(true)
    },
    [pushToast],
  )

  const confirmCancelLeave = useCallback(async () => {
    if (!cancelPreviewRecord?.id) return
    if (!isLeaveCancellableByApplicant(cancelPreviewRecord)) {
      closeCancelConfirmModal()
      pushToast('This leave request can no longer be cancelled.', {
        title: 'Cancel unavailable',
        color: 'warning',
      })
      return
    }
    const targetId = cancelPreviewRecord._id || cancelPreviewRecord.id
    const displayId = getDisplayLeaveId(cancelPreviewRecord)
    const displayLeaveId = String(cancelPreviewRecord.id)
    try {
      await apiRequest(`/leave/${targetId}/cancel`, { method: 'POST' })
      const [recordsResult, assignmentsResult] = await Promise.all([
        loadLeaveRecords(user?.id),
        loadLeaveAssignmentsForUser(user?.id),
      ])
      if (Array.isArray(recordsResult?.data)) setLeaveRecords(recordsResult.data)
      if (Array.isArray(assignmentsResult?.rows)) setAssignmentRows(assignmentsResult.rows)
      closeCancelConfirmModal()
      if (leaveId && String(leaveId) === displayLeaveId) navigate('/leave')
      pushToast(`Leave request ${displayId} cancelled.`, { title: 'Cancelled', color: 'warning' })
    } catch (error) {
      pushToast(error?.message || 'Unable to cancel leave request. Please retry.', {
        title: 'Cancel failed',
        color: 'danger',
      })
    }
  }, [
    cancelPreviewRecord,
    closeCancelConfirmModal,
    getDisplayLeaveId,
    leaveId,
    navigate,
    pushToast,
    setAssignmentRows,
    setLeaveRecords,
    user,
  ])

  const deleteLeave = useCallback(
    (row) => {
      if (!row?.id) return
      if (String(row?.status || '') !== 'Draft') {
        pushToast('Only Draft leave requests can be deleted.', {
          title: 'Delete unavailable',
          color: 'warning',
        })
        return
      }
      setDeletePreviewRecordId(String(row.id))
      setIsDeleteConfirmVisible(true)
    },
    [pushToast],
  )

  const confirmDeleteLeave = useCallback(async () => {
    if (!deletePreviewRecord?.id) return
    if (String(deletePreviewRecord?.status || '') !== 'Draft') {
      closeDeleteConfirmModal()
      pushToast('This leave request can no longer be deleted.', {
        title: 'Delete unavailable',
        color: 'warning',
      })
      return
    }
    const targetId = deletePreviewRecord._id || deletePreviewRecord.id
    const displayId = getDisplayLeaveId(deletePreviewRecord)
    try {
      await apiRequest(`/leave/${targetId}`, { method: 'DELETE' })
      setLeaveRecords((prev) => prev.filter((record) => record.id !== deletePreviewRecord.id))
      if (deletePreviewRecord.attachmentId) {
        deleteAttachmentBlobSafe(deletePreviewRecord.attachmentId)
      }
      if (String(leaveId || '') === String(deletePreviewRecord.id || '')) navigate('/leave')
      pushToast(`Leave request ${displayId} deleted.`, { title: 'Deleted', color: 'danger' })
      closeDeleteConfirmModal()
    } catch (error) {
      pushToast(error?.message || 'Unable to delete leave request. Please retry.', {
        title: 'Delete failed',
        color: 'danger',
      })
    }
  }, [
    closeDeleteConfirmModal,
    deleteAttachmentBlobSafe,
    deletePreviewRecord,
    getDisplayLeaveId,
    leaveId,
    navigate,
    pushToast,
    setLeaveRecords,
  ])

  return {
    isCancelConfirmVisible,
    cancelPreviewRecord,
    isDeleteConfirmVisible,
    deletePreviewRecord,
    closeCancelConfirmModal,
    closeDeleteConfirmModal,
    openLeaveForEdit,
    canCancelLeave,
    cancelLeave,
    confirmCancelLeave,
    deleteLeave,
    confirmDeleteLeave,
  }
}
