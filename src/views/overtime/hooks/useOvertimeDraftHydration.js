import { useEffect } from 'react'
import { buildFormSnapshot } from '../domain/overtimeFormDomain'
import { normalizeOvertimeType } from '../utils'

const useOvertimeDraftHydration = ({
  activeSection,
  claimDate,
  defaultOvertimeType,
  draftHydratedRef,
  editingRecordId,
  endTime,
  overtimeDraft,
  overtimeType,
  overtimeTypeConfirmed,
  overtimeTypeDerivedMode,
  pushToast,
  reason,
  setClaimDate,
  setEndTime,
  setFormBaseline,
  setOvertimeType,
  setOvertimeTypeConfirmed,
  setReason,
  setStartTime,
  startTime,
  userId,
}) => {
  useEffect(() => {
    if (!userId) return
    if (activeSection !== 'new-overtime') return
    if (draftHydratedRef.current) return
    if (editingRecordId) return

    draftHydratedRef.current = true
    if (!overtimeDraft) {
      setFormBaseline(
        buildFormSnapshot({
          editingRecordId: null,
          overtimeType,
          overtimeTypeConfirmed,
          claimDate,
          startTime,
          endTime,
          reason,
        }),
      )
      return
    }
    if (String(overtimeDraft?.sourceRecordId || '').trim() !== '') {
      setFormBaseline(
        buildFormSnapshot({
          editingRecordId: null,
          overtimeType,
          overtimeTypeConfirmed,
          claimDate,
          startTime,
          endTime,
          reason,
        }),
      )
      return
    }

    setClaimDate(overtimeDraft.claimDate || '')
    setStartTime(overtimeDraft.startTime || '')
    setEndTime(overtimeDraft.endTime || '')
    setReason(overtimeDraft.reason || '')
    setOvertimeType(normalizeOvertimeType(overtimeDraft.overtimeType || defaultOvertimeType))
    setOvertimeTypeConfirmed(
      overtimeTypeDerivedMode ? true : Boolean(overtimeDraft.overtimeTypeConfirmed),
    )
    setFormBaseline(
      buildFormSnapshot({
        editingRecordId: null,
        overtimeType: normalizeOvertimeType(overtimeDraft.overtimeType || defaultOvertimeType),
        overtimeTypeConfirmed: overtimeTypeDerivedMode
          ? true
          : Boolean(overtimeDraft.overtimeTypeConfirmed),
        claimDate: overtimeDraft.claimDate || '',
        startTime: overtimeDraft.startTime || '',
        endTime: overtimeDraft.endTime || '',
        reason: overtimeDraft.reason || '',
      }),
    )
    setTimeout(() => {
      pushToast('Saved overtime draft restored.', { title: 'Draft loaded', color: 'info' })
    }, 0)
  }, [
    activeSection,
    claimDate,
    defaultOvertimeType,
    draftHydratedRef,
    editingRecordId,
    endTime,
    overtimeDraft,
    overtimeTypeDerivedMode,
    overtimeType,
    overtimeTypeConfirmed,
    pushToast,
    reason,
    setClaimDate,
    setEndTime,
    setFormBaseline,
    setOvertimeType,
    setOvertimeTypeConfirmed,
    setReason,
    setStartTime,
    startTime,
    userId,
  ])
}

export default useOvertimeDraftHydration
