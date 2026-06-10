import { useEffect } from 'react'
import { loadLeaveAssignmentsForUser, loadLeaveDraft } from '../leavePersistence'

const loadAssignmentRowsForLeaveUser = async (userId) => {
  const result = await loadLeaveAssignmentsForUser(userId, [])
  return result?.rows || []
}

export default function useLeaveBootEffects({
  userId,
  loadMeta,
  draftHydratedRef,
  activeSection,
  editingRecordId,
  setAssignmentRows,
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
  pushToast,
}) {
  useEffect(() => {
    if (!userId) return
    draftHydratedRef.current = false
    const notify = (message) => {
      setTimeout(() => {
        pushToast(message, { title: 'Load error', color: 'warning' })
      }, 0)
    }

    if (loadMeta && Object.keys(loadMeta).length > 0) {
      if (!loadMeta.loadedOk) {
        notify('Unable to load leave records. Please refresh the page.')
      }
      if (!loadMeta.assignmentOk) {
        notify('Unable to load leave balance data. Please refresh the page.')
      }
    }
  }, [draftHydratedRef, loadMeta, pushToast, userId])

  useEffect(() => {
    if (!userId) return
    if (activeSection === 'new-leave') {
      loadAssignmentRowsForLeaveUser(userId).then(setAssignmentRows)
    }
  }, [activeSection, setAssignmentRows, userId])

  useEffect(() => {
    if (!userId) return
    if (activeSection !== 'new-leave') return
    if (draftHydratedRef.current) return
    if (editingRecordId) return

    const hydrateDraft = async () => {
      const draftResult = await loadLeaveDraft(userId)
      const draft = draftResult?.data
      draftHydratedRef.current = true

      if (!draft) return

      setLeaveType(draft.leaveType || 'Annual Leave')
      setLeaveTypeConfirmed(Boolean(draft.leaveTypeConfirmed))
      setStartDate(draft.startDate || '')
      setEndDate(draft.endDate || '')
      setWorkShift(draft.workShift || 'normal')
      setStartTimeSlot(draft.startTimeSlot || 'shift-start')
      setEndTimeSlot(draft.endTimeSlot || 'shift-end')
      setReason(draft.reason || '')
      setCoverBy(draft.coverBy || '')
      setAttachmentName(draft.attachmentName || '')
      setAttachmentId(draft.attachmentId || null)
      setAttachmentMeta(draft.attachmentMeta || null)
      setAttachmentStatus(
        draft.attachmentName
          ? {
              tone: 'muted',
              label: 'Draft restored',
              detail: draft.attachmentName,
            }
          : null,
      )
      pushToast('Saved leave draft restored.', { title: 'Draft loaded', color: 'info' })
    }
    hydrateDraft()
  }, [
    activeSection,
    draftHydratedRef,
    editingRecordId,
    pushToast,
    setAttachmentId,
    setAttachmentMeta,
    setAttachmentName,
    setAttachmentStatus,
    setCoverBy,
    setEndDate,
    setEndTimeSlot,
    setLeaveType,
    setLeaveTypeConfirmed,
    setReason,
    setStartDate,
    setStartTimeSlot,
    setWorkShift,
    userId,
  ])
}
