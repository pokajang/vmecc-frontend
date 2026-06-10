import { useCallback, useMemo, useState } from 'react'
import {
  calculateOvertimeDurationMinutes,
  isOvernightWindow,
  normalizeOvertimeClockTime,
  normalizeOvertimeType,
} from '../utils'
import { buildFormSnapshot, isSameFormSnapshot } from '../domain/overtimeFormDomain'

const useOvertimeForm = ({ overtimeTypeDerivedMode = false, editingRecordId = null } = {}) => {
  const [overtimeType, setOvertimeType] = useState('')
  const [overtimeTypeConfirmed, setOvertimeTypeConfirmed] = useState(false)
  const [claimDate, setClaimDate] = useState('')
  const [isOvertimeTypeDeriving, setIsOvertimeTypeDeriving] = useState(false)
  const [overtimeGuidanceMessage, setOvertimeGuidanceMessage] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formBaseline, setFormBaseline] = useState(() => buildFormSnapshot())

  const clearInlineErrors = useCallback(() => setFieldErrors({}), [])
  const clearFieldError = useCallback((field) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleClaimDateChange = useCallback(
    (value) => {
      setClaimDate(value)
      if (!value) setOvertimeGuidanceMessage('')
      clearFieldError('claimDate')
    },
    [clearFieldError],
  )

  const handleStartTimeChange = useCallback(
    (value) => {
      setStartTime(normalizeOvertimeClockTime(value))
      clearFieldError('startTime')
      clearFieldError('window')
    },
    [clearFieldError],
  )

  const handleEndTimeChange = useCallback(
    (value) => {
      setEndTime(normalizeOvertimeClockTime(value))
      clearFieldError('endTime')
      clearFieldError('window')
    },
    [clearFieldError],
  )

  const handleReasonChange = useCallback(
    (value) => {
      setReason(value)
      clearFieldError('reason')
    },
    [clearFieldError],
  )

  const handleSelectOvertimeType = useCallback(
    (value) => {
      setOvertimeType(normalizeOvertimeType(value))
      clearFieldError('overtimeType')
    },
    [clearFieldError],
  )

  const handleContinueOvertimeType = useCallback(
    (pushToast) => {
      if (overtimeTypeDerivedMode) {
        setOvertimeTypeConfirmed(true)
        return
      }
      if (!overtimeType) {
        setFieldErrors((prev) => ({ ...prev, overtimeType: 'Please select overtime type.' }))
        pushToast?.('Please select overtime type before continuing.', {
          title: 'Type required',
          color: 'warning',
        })
        return
      }
      setOvertimeTypeConfirmed(true)
      clearFieldError('overtimeType')
    },
    [clearFieldError, overtimeType, overtimeTypeDerivedMode],
  )

  const handleBackToOvertimeType = useCallback(() => {
    if (overtimeTypeDerivedMode) return
    setOvertimeTypeConfirmed(false)
  }, [overtimeTypeDerivedMode])

  const durationMinutes = useMemo(
    () => calculateOvertimeDurationMinutes(startTime, endTime),
    [startTime, endTime],
  )
  const isOvernight = useMemo(() => isOvernightWindow(startTime, endTime), [startTime, endTime])

  const currentFormSnapshot = useMemo(
    () =>
      buildFormSnapshot({
        editingRecordId,
        overtimeType,
        overtimeTypeConfirmed,
        claimDate,
        startTime,
        endTime,
        reason,
      }),
    [claimDate, editingRecordId, endTime, overtimeType, overtimeTypeConfirmed, reason, startTime],
  )

  const isFormDirty = useMemo(
    () => !isSameFormSnapshot(formBaseline, currentFormSnapshot),
    [currentFormSnapshot, formBaseline],
  )

  return {
    overtimeType,
    setOvertimeType,
    overtimeTypeConfirmed,
    setOvertimeTypeConfirmed,
    claimDate,
    setClaimDate,
    isOvertimeTypeDeriving,
    setIsOvertimeTypeDeriving,
    overtimeGuidanceMessage,
    setOvertimeGuidanceMessage,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    reason,
    setReason,
    fieldErrors,
    setFieldErrors,
    formBaseline,
    setFormBaseline,
    clearInlineErrors,
    clearFieldError,
    handleClaimDateChange,
    handleStartTimeChange,
    handleEndTimeChange,
    handleReasonChange,
    handleSelectOvertimeType,
    handleContinueOvertimeType,
    handleBackToOvertimeType,
    durationMinutes,
    isOvernight,
    currentFormSnapshot,
    isFormDirty,
  }
}

export default useOvertimeForm
