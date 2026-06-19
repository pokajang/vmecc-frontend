import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import { getSelectableStaffOptions } from 'src/utils/staffSelect'
import { ASSIGNMENT_DRAFT_STATUS } from '../constants'
import { getAssignmentEmployeeIdentityKey } from '../utils'
import {
  addAssignmentAllowanceRow,
  ASSIGNMENT_FORM_STEPS,
  buildAssignmentPayComponentRows,
  buildAssignmentPatchReviewSummary,
  buildAssignmentStepState,
  deleteAssignmentAllowanceRow,
  normalizeAssignmentRemarks,
  updateAssignmentPayDraft,
} from './salary-assignment/assignmentFormModel'
import { normalizeNotesHistory } from './salary-assignment/assignmentStateDomain'

const cloneDraftSnapshot = (value) => {
  try {
    return JSON.parse(JSON.stringify(value || {}))
  } catch {
    return {}
  }
}

const serializeDraftSnapshot = (value) => {
  try {
    return JSON.stringify(value || {})
  } catch {
    return '{}'
  }
}

const flowInitialState = {
  activeStep: 'staff',
  submitConfirmVisible: false,
  isSubmitting: false,
  isAutosaving: false,
  autosaveError: '',
  lastAutosavedAt: '',
}

const flowReducer = (state, action) => {
  switch (action.type) {
    case 'set-step':
      return { ...state, activeStep: action.step || state.activeStep }
    case 'set-submit-visible':
      return { ...state, submitConfirmVisible: Boolean(action.visible) }
    case 'set-submitting':
      return { ...state, isSubmitting: Boolean(action.value) }
    case 'set-autosaving':
      return { ...state, isAutosaving: Boolean(action.value) }
    case 'set-autosave-error':
      return { ...state, autosaveError: action.value || '' }
    case 'set-last-autosaved-at':
      return { ...state, lastAutosavedAt: action.value || '' }
    case 'reset-for-route':
      return {
        ...flowInitialState,
        activeStep: action.isReadOnly ? 'review' : 'staff',
      }
    default:
      return state
  }
}

const useSalaryAssignmentFormController = ({ vm, handlers }) => {
  const {
    isEditing,
    isReadOnly,
    draft,
    staffOptions,
    salaryDetailTotals,
    calculatedDeductions,
    formatDateTime,
    assignmentRows,
    currentAssignmentId,
    actorName,
  } = vm
  const { onBack, onStaffChange, onDraftFieldChange, onSaveDraft, onSetSalary } = handlers
  const [flowState, dispatchFlow] = useReducer(flowReducer, {
    ...flowInitialState,
    activeStep: isReadOnly ? 'review' : 'staff',
  })
  const [includeInactiveStaff, setIncludeInactiveStaff] = useState(false)
  const [baselineDraft, setBaselineDraft] = useState(() => cloneDraftSnapshot(draft))
  const userEditedRef = useRef(false)
  const draftRef = useRef(draft)
  const { registerGuard, unregisterGuard, requestNavigation } = useNavigationGuard()

  const visibleStaffOptions = useMemo(
    () =>
      getSelectableStaffOptions(staffOptions || [], {
        includeInactive: includeInactiveStaff,
        selectedKey: draft.selectedStaffKey,
      }),
    [draft.selectedStaffKey, includeInactiveStaff, staffOptions],
  )

  const remarksHistory = useMemo(() => normalizeNotesHistory(draft.notesHistory, draft), [draft])
  const activeRemarksValue = draft.notes || remarksHistory[0]?.text || ''
  const stepState = useMemo(
    () => buildAssignmentStepState({ draft, isReadOnly }),
    [draft, isReadOnly],
  )
  const isDraftChanged = serializeDraftSnapshot(draft) !== serializeDraftSnapshot(baselineDraft)
  const hasUnsavedChanges = !isReadOnly && Boolean(userEditedRef.current && isDraftChanged)

  const markDraftEdited = () => {
    userEditedRef.current = true
    dispatchFlow({ type: 'set-autosave-error', value: '' })
  }

  const handleStaffSelectChange = (key) => {
    markDraftEdited()
    onStaffChange(key, staffOptions)
  }

  const handleDraftFieldChange = (field, value) => {
    markDraftEdited()
    onDraftFieldChange(field, value)
  }

  const applyDraftPatch = (nextDraft) => {
    ;['basicSalary', 'allowances', 'employeeContributions'].forEach((field) => {
      if (nextDraft[field] !== draftRef.current[field]) {
        onDraftFieldChange(field, nextDraft[field])
      }
    })
  }

  const handlePayComponentUpdate = (rowType, rowId, field, value) => {
    markDraftEdited()
    applyDraftPatch(
      updateAssignmentPayDraft(draftRef.current, {
        rowType,
        rowId,
        field,
        value,
      }),
    )
  }

  const handleAddAllowanceRow = () => {
    markDraftEdited()
    const nextDraft = addAssignmentAllowanceRow(draftRef.current)
    onDraftFieldChange('allowances', nextDraft.allowances)
  }

  const handleDeleteAllowanceRow = (_rowType, rowId) => {
    markDraftEdited()
    const nextDraft = deleteAssignmentAllowanceRow(draftRef.current, rowId)
    onDraftFieldChange('allowances', nextDraft.allowances)
  }

  const handleRemarksChange = (value) => {
    markDraftEdited()
    const nextPatch = normalizeAssignmentRemarks({
      currentHistory: draftRef.current.notesHistory,
      value,
      actorName,
    })
    onDraftFieldChange('notesHistory', nextPatch.notesHistory)
    onDraftFieldChange('notes', nextPatch.notes)
    onDraftFieldChange('notesUpdatedAt', nextPatch.notesUpdatedAt || '')
    onDraftFieldChange('notesUpdatedBy', nextPatch.notesUpdatedBy || '')
  }

  const autosaveSummary = useMemo(() => {
    if (flowState.autosaveError) return flowState.autosaveError
    if (flowState.isAutosaving) return 'Saving draft...'
    if (flowState.lastAutosavedAt) {
      const savedLabel = formatDateTime?.(flowState.lastAutosavedAt) || flowState.lastAutosavedAt
      return `Draft saved ${savedLabel}.`
    }
    return 'Draft autosave is on.'
  }, [flowState.autosaveError, flowState.isAutosaving, flowState.lastAutosavedAt, formatDateTime])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    userEditedRef.current = false
    setBaselineDraft(cloneDraftSnapshot(draftRef.current))
    dispatchFlow({ type: 'reset-for-route', isReadOnly })
  }, [currentAssignmentId, isEditing, isReadOnly])

  useEffect(() => {
    registerGuard('salary-assignment-form', {
      active: hasUnsavedChanges,
      message: 'You have unsaved changes in this salary form. Leave this page and discard them?',
    })
  }, [hasUnsavedChanges, registerGuard])

  useEffect(
    () => () => {
      unregisterGuard('salary-assignment-form')
    },
    [unregisterGuard],
  )

  const handleBackClick = () => {
    requestNavigation(() => onBack())
  }

  useEffect(() => {
    if (isReadOnly || !userEditedRef.current || !isDraftChanged || flowState.isSubmitting) {
      return undefined
    }

    const timeoutId = window.setTimeout(async () => {
      dispatchFlow({ type: 'set-autosaving', value: true })
      dispatchFlow({ type: 'set-autosave-error', value: '' })
      const ok = await onSaveDraft({ showNotice: false })
      dispatchFlow({ type: 'set-autosaving', value: false })
      if (ok) {
        setBaselineDraft(cloneDraftSnapshot(draft))
        dispatchFlow({ type: 'set-last-autosaved-at', value: new Date().toISOString() })
      } else {
        dispatchFlow({
          type: 'set-autosave-error',
          value: 'Draft autosave failed. Changes remain unsaved.',
        })
      }
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [draft, flowState.isSubmitting, isDraftChanged, isReadOnly, onSaveDraft])

  const handleConfirmSetSalary = async () => {
    if (flowState.isSubmitting) return
    dispatchFlow({ type: 'set-submit-visible', visible: false })
    dispatchFlow({ type: 'set-submitting', value: true })
    try {
      await onSetSalary()
    } finally {
      dispatchFlow({ type: 'set-submitting', value: false })
    }
  }

  const finalizedAssignments = useMemo(
    () =>
      (Array.isArray(assignmentRows) ? assignmentRows : []).filter(
        (row) => String(row?.status || '') !== ASSIGNMENT_DRAFT_STATUS,
      ),
    [assignmentRows],
  )
  const selectedStaffIdentityKey = useMemo(
    () =>
      getAssignmentEmployeeIdentityKey({
        employeeId: draft.employeeId,
        email: draft.email,
        employee: draft.employee,
      }),
    [draft.email, draft.employee, draft.employeeId],
  )
  const matchingAssignments = useMemo(
    () =>
      finalizedAssignments
        .filter((row) => {
          const rowIdentityKey = getAssignmentEmployeeIdentityKey(row)
          return Boolean(rowIdentityKey) && rowIdentityKey === selectedStaffIdentityKey
        })
        .sort((a, b) => {
          const aMonth = String(a?.effectiveFrom || '')
          const bMonth = String(b?.effectiveFrom || '')
          if (aMonth !== bMonth) return aMonth > bMonth ? -1 : 1
          const aUpdated = String(a?.updatedAt || a?.createdAt || '')
          const bUpdated = String(b?.updatedAt || b?.createdAt || '')
          if (aUpdated !== bUpdated) return aUpdated > bUpdated ? -1 : 1
          return String(a?.id || '').localeCompare(String(b?.id || ''))
        }),
    [finalizedAssignments, selectedStaffIdentityKey],
  )
  const existingEmployeeAssignment = matchingAssignments[0] || null
  const willOverwriteExistingAssignment =
    Boolean(existingEmployeeAssignment) &&
    String(existingEmployeeAssignment?.id || '') !== String(currentAssignmentId || '')

  const { rows: componentRows, totalEmployeeDeductions } = useMemo(
    () =>
      buildAssignmentPayComponentRows({
        draft,
        salaryDetailTotals,
        calculatedDeductions,
      }),
    [calculatedDeductions, draft, salaryDetailTotals],
  )
  const reviewSummary = useMemo(
    () =>
      buildAssignmentPatchReviewSummary({
        baselineDraft,
        draft,
        salaryDetailTotals,
        calculatedDeductions,
      }),
    [baselineDraft, calculatedDeductions, draft, salaryDetailTotals],
  )

  const setActiveStep = (step) => {
    if (!stepState[step]?.available) return
    dispatchFlow({ type: 'set-step', step })
  }

  const goToNextStep = () => {
    const currentIndex = ASSIGNMENT_FORM_STEPS.findIndex(
      (step) => step.key === flowState.activeStep,
    )
    const nextStep = ASSIGNMENT_FORM_STEPS[currentIndex + 1]
    if (nextStep && stepState[nextStep.key]?.available) {
      dispatchFlow({ type: 'set-step', step: nextStep.key })
    }
  }

  const goToPreviousStep = () => {
    const currentIndex = ASSIGNMENT_FORM_STEPS.findIndex(
      (step) => step.key === flowState.activeStep,
    )
    const previousStep = ASSIGNMENT_FORM_STEPS[currentIndex - 1]
    if (previousStep) dispatchFlow({ type: 'set-step', step: previousStep.key })
  }

  return {
    activeRemarksValue,
    activeStep: flowState.activeStep,
    autosaveSummary,
    componentRows,
    goToNextStep,
    goToPreviousStep,
    handleAddAllowanceRow,
    handleBackClick,
    handleConfirmSetSalary,
    handleDeleteAllowanceRow,
    handleDraftFieldChange,
    handlePayComponentUpdate,
    handleRemarksChange,
    handleStaffSelectChange,
    includeInactiveStaff,
    isAutosaving: flowState.isAutosaving,
    isSubmitting: flowState.isSubmitting,
    remarksHistory,
    reviewSummary,
    setActiveStep,
    setIncludeInactiveStaff,
    setSubmitConfirmVisible: (visible) => dispatchFlow({ type: 'set-submit-visible', visible }),
    stepState,
    steps: ASSIGNMENT_FORM_STEPS,
    submitConfirmVisible: flowState.submitConfirmVisible,
    totalEmployeeDeductions,
    visibleStaffOptions,
    willOverwriteExistingAssignment,
  }
}

export default useSalaryAssignmentFormController
