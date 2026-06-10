import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import { getSelectableStaffOptions } from 'src/utils/staffSelect'
import { ASSIGNMENT_DRAFT_STATUS } from '../constants'
import { getAssignmentEmployeeIdentityKey } from '../utils'

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

const useSalaryAssignmentFormController = ({ vm, handlers }) => {
  const {
    isEditing,
    isReadOnly,
    draft,
    payComponentsEditMode,
    payComponentsDraft,
    staffOptions,
    salaryDetailTotals,
    calculatedDeductions,
    formatDateTime,
    assignmentRows,
    currentAssignmentId,
  } = vm
  const {
    onBack,
    onStaffChange,
    onDraftFieldChange,
    onSaveDraft,
    onSetSalary,
    onAddAllowanceRow,
    onUpdateComponentRow,
    onDeleteComponentRow,
  } = handlers
  const [remarksDraft, setRemarksDraft] = useState('')
  const [remarksDirty, setRemarksDirty] = useState(false)
  const [remarksEditMode, setRemarksEditMode] = useState(false)
  const [editingRemarkId, setEditingRemarkId] = useState('')
  const [includeInactiveStaff, setIncludeInactiveStaff] = useState(false)
  const [submitConfirmVisible, setSubmitConfirmVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAutosaving, setIsAutosaving] = useState(false)
  const [autosaveError, setAutosaveError] = useState('')
  const [lastAutosavedAt, setLastAutosavedAt] = useState('')
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

  const remarksHistory = useMemo(() => {
    const mappedHistory = Array.isArray(draft.notesHistory)
      ? draft.notesHistory
          .map((entry, index) => {
            const text = String(entry?.text || '').trim()
            if (!text) return null
            return {
              id:
                String(entry?.id || '').trim() ||
                `remark-${index + 1}-${String(entry?.createdAt || '').trim() || 'legacy'}`,
              text,
              createdAt: String(entry?.createdAt || '').trim(),
              createdBy: String(entry?.createdBy || '').trim(),
              updatedAt: String(entry?.updatedAt || '').trim(),
              updatedBy: String(entry?.updatedBy || '').trim(),
            }
          })
          .filter(Boolean)
      : []
    if (mappedHistory.length > 0) return mappedHistory

    const legacyText = String(draft.notes || '').trim()
    if (!legacyText) return []
    return [
      {
        id: 'remark-legacy',
        text: legacyText,
        createdAt: String(draft.notesUpdatedAt || '').trim(),
        createdBy: String(draft.notesUpdatedBy || '').trim(),
        updatedAt: '',
        updatedBy: '',
      },
    ]
  }, [draft.notes, draft.notesHistory, draft.notesUpdatedAt, draft.notesUpdatedBy])

  const activeRemarksValue = remarksDraft
  const isDraftChanged = serializeDraftSnapshot(draft) !== serializeDraftSnapshot(baselineDraft)
  const hasUnsavedChanges =
    !isReadOnly &&
    Boolean(
      (userEditedRef.current && isDraftChanged) ||
        payComponentsEditMode ||
        remarksDirty ||
        remarksEditMode,
    )

  const markDraftEdited = () => {
    userEditedRef.current = true
    setAutosaveError('')
  }

  const handleStaffSelectChange = (key) => {
    markDraftEdited()
    onStaffChange(key, staffOptions)
  }

  const handleDraftFieldChange = (field, value) => {
    markDraftEdited()
    onDraftFieldChange(field, value)
  }

  const handlePayComponentUpdate = (...args) => {
    markDraftEdited()
    onUpdateComponentRow(...args)
  }

  const handleAddAllowanceRow = () => {
    markDraftEdited()
    onAddAllowanceRow()
  }

  const handleDeleteAllowanceRow = (...args) => {
    markDraftEdited()
    onDeleteComponentRow(...args)
  }

  const autosaveSummary = useMemo(() => {
    if (autosaveError) return autosaveError
    if (payComponentsEditMode || remarksDirty || remarksEditMode) {
      return 'Draft autosave pauses until this section is saved or cancelled.'
    }
    if (isAutosaving) return 'Saving draft...'
    if (lastAutosavedAt) {
      const savedLabel = formatDateTime?.(lastAutosavedAt) || lastAutosavedAt
      return `Draft saved ${savedLabel}.`
    }
    return 'Draft autosave is on.'
  }, [
    autosaveError,
    formatDateTime,
    isAutosaving,
    lastAutosavedAt,
    payComponentsEditMode,
    remarksDirty,
    remarksEditMode,
  ])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    userEditedRef.current = false
    setBaselineDraft(cloneDraftSnapshot(draftRef.current))
    setAutosaveError('')
    setLastAutosavedAt('')
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
    if (
      isReadOnly ||
      !userEditedRef.current ||
      !isDraftChanged ||
      payComponentsEditMode ||
      remarksDirty ||
      remarksEditMode ||
      isSubmitting
    ) {
      return undefined
    }

    const timeoutId = window.setTimeout(async () => {
      setIsAutosaving(true)
      setAutosaveError('')
      const ok = await onSaveDraft({ showNotice: false })
      setIsAutosaving(false)
      if (ok) {
        setBaselineDraft(cloneDraftSnapshot(draft))
        setLastAutosavedAt(new Date().toISOString())
      } else {
        setAutosaveError('Draft autosave failed. Changes remain unsaved.')
      }
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [
    draft,
    isDraftChanged,
    isReadOnly,
    isSubmitting,
    onSaveDraft,
    payComponentsEditMode,
    remarksDirty,
    remarksEditMode,
  ])

  const handleConfirmSetSalary = async () => {
    if (isSubmitting) return
    setSubmitConfirmVisible(false)
    setIsSubmitting(true)
    try {
      await onSetSalary()
    } finally {
      setIsSubmitting(false)
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

  const { componentRows, totalEmployeeDeductions } = useMemo(() => {
    const activeBasicSalary = payComponentsEditMode
      ? payComponentsDraft?.basicSalary
      : draft?.basicSalary
    const activeAllowanceRows =
      payComponentsEditMode && Array.isArray(payComponentsDraft?.allowances)
        ? payComponentsDraft.allowances
        : Array.isArray(draft?.allowances)
          ? draft.allowances
          : []
    const deductionInputs =
      payComponentsEditMode && payComponentsDraft?.employeeDeductions
        ? payComponentsDraft.employeeDeductions
        : draft?.employeeContributions || {}
    const resolveDeductionAmount = (key, fallback) => {
      const raw = deductionInputs?.[key]
      if (raw === '' || raw === null || typeof raw === 'undefined') return fallback
      const numeric = Number.parseFloat(raw)
      return Number.isFinite(numeric) ? numeric : fallback
    }
    const employeeDeductionRows = calculatedDeductions.rows.map((row) => ({
      ...row,
      amount: resolveDeductionAmount(row.key, row.employeeAmount),
    }))
    const totalDeductions = employeeDeductionRows.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0,
    )
    const rows = [
      {
        id: 'component-basic',
        rowType: 'basic',
        label: 'Basic Salary',
        amount: activeBasicSalary,
        editable: true,
        deletable: false,
      },
      ...activeAllowanceRows.map((row, index) => ({
        id: row?.id || `allowance-${index}`,
        rowType: 'allowance',
        label: row?.name || `Allowance ${index + 1}`,
        name: row?.name || '',
        amount: row?.amount,
        editable: true,
        deletable: true,
      })),
      ...employeeDeductionRows.map((row) => ({
        id: `deduction-${row.key}`,
        componentKey: row.key,
        rowType: 'deduction',
        label: `${row.label} (Employee Deduction)`,
        amount: row.amount,
        editable: true,
        deletable: false,
      })),
      {
        id: 'summary-gross',
        rowType: 'summary',
        label: 'Gross Salary',
        amount: salaryDetailTotals.gross,
        editable: false,
        deletable: false,
      },
      {
        id: 'summary-total-deductions',
        rowType: 'summary',
        label: 'Total Employee Deductions',
        amount: totalDeductions,
        editable: false,
        deletable: false,
      },
      {
        id: 'summary-net-payable',
        rowType: 'summary-net',
        label: 'Net Payable',
        amount: salaryDetailTotals.gross - totalDeductions,
        editable: false,
        deletable: false,
      },
    ]
    return { componentRows: rows, totalEmployeeDeductions: totalDeductions }
  }, [
    calculatedDeductions.rows,
    draft?.allowances,
    draft?.basicSalary,
    draft?.employeeContributions,
    payComponentsEditMode,
    payComponentsDraft?.allowances,
    payComponentsDraft?.basicSalary,
    payComponentsDraft?.employeeDeductions,
    salaryDetailTotals.gross,
  ])

  return {
    activeRemarksValue,
    autosaveSummary,
    componentRows,
    editingRemarkId,
    handleAddAllowanceRow,
    handleBackClick,
    handleConfirmSetSalary,
    handleDeleteAllowanceRow,
    handleDraftFieldChange,
    handlePayComponentUpdate,
    handleStaffSelectChange,
    includeInactiveStaff,
    isAutosaving,
    isSubmitting,
    remarksDirty,
    remarksEditMode,
    remarksHistory,
    setEditingRemarkId,
    setIncludeInactiveStaff,
    setRemarksDirty,
    setRemarksDraft,
    setRemarksEditMode,
    setSubmitConfirmVisible,
    submitConfirmVisible,
    totalEmployeeDeductions,
    visibleStaffOptions,
    willOverwriteExistingAssignment,
  }
}

export default useSalaryAssignmentFormController
