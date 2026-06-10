import { useCallback, useEffect, useRef } from 'react'
import useAssignmentDeleteActions from './salary-assignment/useAssignmentDeleteActions'
import useAssignmentDerivedValues from './salary-assignment/useAssignmentDerivedValues'
import useAssignmentDraftActions from './salary-assignment/useAssignmentDraftActions'
import useAssignmentModalState from './salary-assignment/useAssignmentModalState'
import useAssignmentRecordsState from './salary-assignment/useAssignmentRecordsState'
import useAssignmentSubmitActions from './salary-assignment/useAssignmentSubmitActions'
import usePayComponentsState from './salary-assignment/usePayComponentsState'
import useSalaryAssignmentRatesState from './salary-assignment/useSalaryAssignmentRatesState'

const useSalaryAssignmentState = ({ user, pushToast }) => {
  const resetPayComponentsEditRef = useRef(() => {})
  const calculatedDeductionsRef = useRef({ rows: [] })
  const resetPayComponentsEdit = useCallback(() => {
    resetPayComponentsEditRef.current()
  }, [])

  const ratesState = useSalaryAssignmentRatesState({ user, pushToast })
  const recordsState = useAssignmentRecordsState({
    user,
    pushToast,
    hydrateStatutoryRates: ratesState.hydrateStatutoryRates,
  })
  const modalState = useAssignmentModalState({
    assignmentRows: recordsState.assignmentRows,
    assignmentDraftRows: recordsState.assignmentDraftRows,
    resetPayComponentsEdit,
  })
  const payComponentsState = usePayComponentsState({
    assignmentDraft: modalState.assignmentDraft,
    setAssignmentDraft: modalState.setAssignmentDraft,
    calculatedDeductionsRef,
    pushToast,
  })
  useEffect(() => {
    resetPayComponentsEditRef.current = payComponentsState.resetPayComponentsEdit
  }, [payComponentsState.resetPayComponentsEdit])

  const activeDerivedValues = useAssignmentDerivedValues({
    assignmentDraft: modalState.assignmentDraft,
    payComponentsDraft: payComponentsState.payComponentsDraft,
    payComponentsEditMode: payComponentsState.payComponentsEditMode,
    statutoryRates: ratesState.statutoryRates,
    statutoryRatesFeatureEnabled: ratesState.statutoryRatesFeatureEnabled,
  })
  useEffect(() => {
    calculatedDeductionsRef.current = activeDerivedValues.calculatedDeductions
  }, [activeDerivedValues.calculatedDeductions])
  const draftActions = useAssignmentDraftActions({
    user,
    pushToast,
    assignmentDraft: modalState.assignmentDraft,
    assignmentDraftRows: recordsState.assignmentDraftRows,
    setAssignmentDraftRows: recordsState.setAssignmentDraftRows,
    activeAssignmentDraftId: modalState.activeAssignmentDraftId,
    setActiveAssignmentDraftId: modalState.setActiveAssignmentDraftId,
    activeAssignmentDraftName: modalState.activeAssignmentDraftName,
    setActiveAssignmentDraftName: modalState.setActiveAssignmentDraftName,
    editingAssignmentId: modalState.editingAssignmentId,
    payComponentsEditMode: payComponentsState.payComponentsEditMode,
  })
  const submitActions = useAssignmentSubmitActions({
    user,
    pushToast,
    assignmentDraft: modalState.assignmentDraft,
    assignmentDraftRows: recordsState.assignmentDraftRows,
    assignmentRows: recordsState.assignmentRows,
    setAssignmentRows: recordsState.setAssignmentRows,
    setAssignmentDraftRows: recordsState.setAssignmentDraftRows,
    activeAssignmentDraftId: modalState.activeAssignmentDraftId,
    setActiveAssignmentDraftId: modalState.setActiveAssignmentDraftId,
    setActiveAssignmentDraftName: modalState.setActiveAssignmentDraftName,
    editingAssignmentId: modalState.editingAssignmentId,
    payComponentsEditMode: payComponentsState.payComponentsEditMode,
    salaryDetailTotals: activeDerivedValues.salaryDetailTotals,
    statutoryRates: ratesState.statutoryRates,
    statutoryRatesFeatureEnabled: ratesState.statutoryRatesFeatureEnabled,
    mergeAssignmentHistoryEntry: recordsState.mergeAssignmentHistoryEntry,
    refreshAssignmentHistory: recordsState.refreshAssignmentHistory,
  })
  const deleteActions = useAssignmentDeleteActions({
    pushToast,
    assignmentRows: recordsState.assignmentRows,
    setAssignmentRows: recordsState.setAssignmentRows,
    mergeAssignmentHistoryEntry: recordsState.mergeAssignmentHistoryEntry,
    refreshAssignmentHistory: recordsState.refreshAssignmentHistory,
  })

  return {
    assignmentRows: recordsState.assignmentRows,
    setAssignmentRows: recordsState.setAssignmentRows,
    assignmentDraftRows: recordsState.assignmentDraftRows,
    assignmentHistory: recordsState.assignmentHistory,
    setAssignmentHistory: recordsState.setAssignmentHistory,
    isAssignmentsLoading: recordsState.isAssignmentsLoading,
    assignmentLoadError: recordsState.assignmentLoadError,
    hydrateAssignments: recordsState.hydrateAssignments,
    assignmentModalVisible: modalState.assignmentModalVisible,
    editingAssignmentId: modalState.editingAssignmentId,
    activeAssignmentDraftId: modalState.activeAssignmentDraftId,
    activeAssignmentDraftName: modalState.activeAssignmentDraftName,
    assignmentDraft: modalState.assignmentDraft,
    setAssignmentDraft: modalState.setAssignmentDraft,
    payComponentsEditMode: payComponentsState.payComponentsEditMode,
    payComponentsDraft: payComponentsState.payComponentsDraft,
    openCreateAssignment: modalState.openCreateAssignment,
    openEditAssignment: modalState.openEditAssignment,
    openSavedAssignmentDraft: modalState.openSavedAssignmentDraft,
    closeAssignmentModal: modalState.closeAssignmentModal,
    handleStaffChange: modalState.handleStaffChange,
    saveAssignmentAsDraft: draftActions.saveAssignmentAsDraft,
    setSalaryAssignment: submitActions.setSalaryAssignment,
    renameAssignmentDraft: draftActions.renameAssignmentDraft,
    removeAssignmentDraft: draftActions.removeAssignmentDraft,
    removeAssignmentRow: deleteActions.removeAssignmentRow,
    editPayComponents: payComponentsState.editPayComponents,
    cancelPayComponentsEdit: payComponentsState.cancelPayComponentsEdit,
    savePayComponentsEdit: payComponentsState.savePayComponentsEdit,
    addAllowanceRow: payComponentsState.addAllowanceRow,
    updatePayComponentRow: payComponentsState.updatePayComponentRow,
    deletePayComponentRow: payComponentsState.deletePayComponentRow,
    updateContributionDraftField: modalState.updateContributionDraftField,
    statutoryRates: ratesState.statutoryRates,
    statutoryRatesFeatureEnabled: ratesState.statutoryRatesFeatureEnabled,
    statutoryRatesDraft: ratesState.statutoryRatesDraft,
    rateEditMode: ratesState.rateEditMode,
    editStatutoryRates: ratesState.editStatutoryRates,
    changeStatutoryRateField: ratesState.changeStatutoryRateField,
    saveStatutoryRates: ratesState.saveStatutoryRates,
    cancelStatutoryRateEdit: ratesState.cancelStatutoryRateEdit,
    calculatedDeductions: activeDerivedValues.calculatedDeductions,
    salaryDetailTotals: activeDerivedValues.salaryDetailTotals,
    otRateSettings: ratesState.otRateSettings,
    setOtRateSettings: ratesState.setOtRateSettings,
    otRateDirty: ratesState.otRateDirty,
    setOtRateDirty: ratesState.setOtRateDirty,
    updateOvertimeRateField: ratesState.updateOvertimeRateField,
    updateOvertimeBaseHourField: ratesState.updateOvertimeBaseHourField,
    updateOvertimeApplicabilityField: ratesState.updateOvertimeApplicabilityField,
    updateOvertimeRoleOverrideField: ratesState.updateOvertimeRoleOverrideField,
    resetOvertimeRates: ratesState.resetOvertimeRates,
    persistOvertimeRates: ratesState.persistOvertimeRates,
  }
}

export default useSalaryAssignmentState
