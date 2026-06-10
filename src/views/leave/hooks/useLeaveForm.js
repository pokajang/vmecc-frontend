import { useCallback, useMemo, useReducer } from 'react'

const initialState = (initial = {}) => ({
  leaveType: initial.leaveType || '',
  leaveTypeConfirmed: Boolean(initial.leaveTypeConfirmed),
  startDate: initial.startDate || '',
  endDate: initial.endDate || '',
  workShift: initial.workShift || 'normal',
  startTimeSlot: initial.startTimeSlot || 'shift-start',
  endTimeSlot: initial.endTimeSlot || 'shift-end',
  reason: initial.reason || '',
  coverBy: initial.coverBy || '',
  fieldErrors: initial.fieldErrors || {},
})

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'CLEAR_FIELD_ERROR': {
      const next = { ...state.fieldErrors }
      if (next[action.field]) delete next[action.field]
      return { ...state, fieldErrors: next }
    }
    case 'CLEAR_INLINE_ERRORS':
      return { ...state, fieldErrors: {} }
    case 'RESET':
      return initialState()
    case 'BATCH':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export default function useLeaveForm(initial = {}) {
  const [state, dispatch] = useReducer(reducer, initial, initialState)

  const setField = useCallback((field, value) => dispatch({ type: 'SET_FIELD', field, value }), [])
  const clearInlineErrors = useCallback(() => dispatch({ type: 'CLEAR_INLINE_ERRORS' }), [])
  const clearFieldError = useCallback((field) => dispatch({ type: 'CLEAR_FIELD_ERROR', field }), [])
  const resetForm = useCallback(() => dispatch({ type: 'RESET' }), [])
  const batchSet = useCallback((payload) => dispatch({ type: 'BATCH', payload }), [])

  const handleShiftChange = useCallback(
    (event) => {
      setField('workShift', event.target.value)
      setField('startTimeSlot', 'shift-start')
      setField('endTimeSlot', 'shift-end')
      clearFieldError('schedule')
    },
    [clearFieldError, setField],
  )

  const handleStartDateChange = useCallback(
    (event) => {
      const nextStartDate = event.target.value
      setField('startDate', nextStartDate)
      clearFieldError('startDate')
      clearFieldError('schedule')
      if (!nextStartDate) {
        setField('endDate', '')
        return
      }
      if (!state.endDate || state.endDate < nextStartDate) {
        setField('endDate', nextStartDate)
      }
    },
    [clearFieldError, setField, state.endDate],
  )

  const handleEndDateChange = useCallback(
    (event) => {
      setField('endDate', event.target.value)
      clearFieldError('endDate')
      clearFieldError('schedule')
    },
    [clearFieldError, setField],
  )

  const handleStartTimeChange = useCallback(
    (event) => {
      setField('startTimeSlot', event.target.value)
      clearFieldError('schedule')
    },
    [clearFieldError, setField],
  )

  const handleEndTimeChange = useCallback(
    (event) => {
      setField('endTimeSlot', event.target.value)
      clearFieldError('schedule')
    },
    [clearFieldError, setField],
  )

  const handleCoverByChange = useCallback(
    (value) => {
      setField('coverBy', value)
      clearFieldError('coverBy')
    },
    [clearFieldError, setField],
  )

  const handleReasonChange = useCallback(
    (value) => {
      setField('reason', value)
      clearFieldError('reason')
    },
    [clearFieldError, setField],
  )

  const handleLeaveTypeContinue = useCallback(
    (selectedType) => {
      if (!selectedType) return
      setField('leaveType', selectedType)
      setField('leaveTypeConfirmed', true)
    },
    [setField],
  )

  const setLeaveType = useCallback((v) => setField('leaveType', v), [setField])
  const setLeaveTypeConfirmed = useCallback((v) => setField('leaveTypeConfirmed', v), [setField])
  const setStartDate = useCallback((v) => setField('startDate', v), [setField])
  const setEndDate = useCallback((v) => setField('endDate', v), [setField])
  const setWorkShift = useCallback((v) => setField('workShift', v), [setField])
  const setStartTimeSlot = useCallback((v) => setField('startTimeSlot', v), [setField])
  const setEndTimeSlot = useCallback((v) => setField('endTimeSlot', v), [setField])
  const setReason = useCallback((v) => setField('reason', v), [setField])
  const setCoverBy = useCallback((v) => setField('coverBy', v), [setField])
  const setFieldErrors = useCallback((v) => setField('fieldErrors', v), [setField])

  return useMemo(
    () => ({
      ...state,
      setLeaveType,
      setLeaveTypeConfirmed,
      setStartDate,
      setEndDate,
      setWorkShift,
      setStartTimeSlot,
      setEndTimeSlot,
      setReason,
      setCoverBy,
      setFieldErrors,
      clearInlineErrors,
      clearFieldError,
      resetForm,
      batchSet,
      handleShiftChange,
      handleStartDateChange,
      handleEndDateChange,
      handleStartTimeChange,
      handleEndTimeChange,
      handleCoverByChange,
      handleReasonChange,
      handleLeaveTypeContinue,
    }),
    [
      batchSet,
      clearFieldError,
      clearInlineErrors,
      handleCoverByChange,
      handleEndDateChange,
      handleEndTimeChange,
      handleLeaveTypeContinue,
      handleReasonChange,
      handleShiftChange,
      handleStartDateChange,
      handleStartTimeChange,
      resetForm,
      setCoverBy,
      setEndDate,
      setEndTimeSlot,
      setFieldErrors,
      setLeaveType,
      setLeaveTypeConfirmed,
      setReason,
      setStartDate,
      setStartTimeSlot,
      setWorkShift,
      state,
    ],
  )
}
