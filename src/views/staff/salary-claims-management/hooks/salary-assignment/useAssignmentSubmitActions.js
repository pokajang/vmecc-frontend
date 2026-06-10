import { useCallback } from 'react'
import {
  deleteSalaryAssignmentDraftApiFirst,
  upsertSalaryAssignmentApiFirst,
} from 'src/services/salaryAssignmentsApi'
import { parseAmount } from '../../utils'
import { buildSalaryAssignmentRow } from './assignmentStateDomain'

const useAssignmentSubmitActions = ({
  user,
  pushToast,
  assignmentDraft,
  assignmentDraftRows,
  assignmentRows,
  setAssignmentRows,
  setAssignmentDraftRows,
  activeAssignmentDraftId,
  setActiveAssignmentDraftId,
  setActiveAssignmentDraftName,
  editingAssignmentId,
  payComponentsEditMode,
  salaryDetailTotals,
  statutoryRates,
  statutoryRatesFeatureEnabled,
  mergeAssignmentHistoryEntry,
  refreshAssignmentHistory,
}) => {
  const setSalaryAssignment = useCallback(
    async ({ actorName, staffOptions }) => {
      if (payComponentsEditMode) {
        pushToast('Save or cancel Pay Components edits before saving assignment.', {
          title: 'Unsaved changes',
          color: 'warning',
        })
        return { ok: false }
      }
      if (!assignmentDraft.employee?.trim()) {
        pushToast('Select staff for this assignment.', { title: 'Missing staff', color: 'danger' })
        return { ok: false }
      }
      if (!assignmentDraft.effectiveFrom) {
        pushToast('Select effective month.', { title: 'Missing month', color: 'danger' })
        return { ok: false }
      }
      if (parseAmount(assignmentDraft.basicSalary) <= 0) {
        pushToast('Basic salary must be greater than 0.', {
          title: 'Invalid amount',
          color: 'danger',
        })
        return { ok: false }
      }

      const allowances = salaryDetailTotals.allowances.map((row) => ({
        id: row.id,
        name: String(row.name || '').trim(),
        amount: parseAmount(row.amount),
      }))
      const invalidAllowance = allowances.find(
        (row) => parseAmount(row.amount) > 0 && !String(row.name || '').trim(),
      )
      const negativeAllowance = allowances.find((row) => parseAmount(row.amount) < 0)
      if (invalidAllowance) {
        pushToast('Allowance name is required when amount is provided.', {
          title: 'Invalid allowance',
          color: 'danger',
        })
        return { ok: false }
      }
      if (negativeAllowance) {
        pushToast('Allowance amount cannot be negative.', {
          title: 'Invalid allowance',
          color: 'danger',
        })
        return { ok: false }
      }
      if (salaryDetailTotals.allowanceTotal < 0) {
        pushToast('Allowances and deductions must be 0 or above.', {
          title: 'Invalid amount',
          color: 'danger',
        })
        return { ok: false }
      }

      const selectedOption =
        staffOptions.find((option) => option.key === assignmentDraft.selectedStaffKey) || null
      const { row: nextRow, targetRow } = buildSalaryAssignmentRow({
        actorName,
        assignmentDraft,
        assignmentRows,
        editingAssignmentId,
        salaryDetailTotals,
        selectedOption,
        statutoryRates,
        statutoryRatesFeatureEnabled,
      })
      const hasNegativeEmployeeContribution = Object.values(
        nextRow.employeeContributions || {},
      ).some((value) => value < 0)
      if (hasNegativeEmployeeContribution) {
        pushToast('Employee deductions cannot be negative.', {
          title: 'Invalid deduction',
          color: 'danger',
        })
        return { ok: false }
      }

      const apiUpsertResult = await upsertSalaryAssignmentApiFirst(
        user?.id,
        nextRow,
        targetRow?.serverId || targetRow?.id || null,
      )
      if (!apiUpsertResult?.ok || !apiUpsertResult?.data) {
        pushToast('Unable to save salary assignment to backend.', {
          title: 'Save failed',
          color: 'danger',
        })
        return { ok: false }
      }
      const { id: _apiId, referenceId: _apiRefId, ...apiDataRest } = apiUpsertResult.data
      const persistedRow = { ...nextRow, ...apiDataRest }
      const nextRows = targetRow
        ? assignmentRows.map((row) =>
            String(row.id) === String(targetRow.id) ? persistedRow : row,
          )
        : [persistedRow, ...assignmentRows]
      setAssignmentRows(nextRows)
      if (apiUpsertResult?.history) {
        mergeAssignmentHistoryEntry(apiUpsertResult.history)
      } else {
        await refreshAssignmentHistory({
          warningMessage: 'Salary assignment saved, but history refresh failed.',
        })
      }
      if (activeAssignmentDraftId) {
        const activeDraft = assignmentDraftRows.find(
          (row) => String(row?.id || '') === String(activeAssignmentDraftId || ''),
        )
        const deleteResult = await deleteSalaryAssignmentDraftApiFirst(
          user?.id,
          activeAssignmentDraftId,
          activeDraft?.backendId || activeDraft?.id || null,
        )
        if (deleteResult?.ok) {
          setAssignmentDraftRows(deleteResult.rows || [])
          setActiveAssignmentDraftId('')
          setActiveAssignmentDraftName('')
        }
      }
      return {
        ok: true,
        row: persistedRow,
        isEditing: Boolean(targetRow),
        overwrittenExistingEmployee: false,
      }
    },
    [
      activeAssignmentDraftId,
      assignmentDraft,
      assignmentDraftRows,
      assignmentRows,
      editingAssignmentId,
      mergeAssignmentHistoryEntry,
      payComponentsEditMode,
      pushToast,
      refreshAssignmentHistory,
      salaryDetailTotals,
      setActiveAssignmentDraftId,
      setActiveAssignmentDraftName,
      setAssignmentDraftRows,
      setAssignmentRows,
      statutoryRates,
      statutoryRatesFeatureEnabled,
      user?.id,
    ],
  )

  return { setSalaryAssignment }
}

export default useAssignmentSubmitActions
