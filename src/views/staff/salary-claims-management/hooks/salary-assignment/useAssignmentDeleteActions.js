import { useCallback } from 'react'
import { deleteSalaryAssignmentApiFirst } from 'src/services/salaryAssignmentsApi'

const useAssignmentDeleteActions = ({
  pushToast,
  assignmentRows,
  setAssignmentRows,
  mergeAssignmentHistoryEntry,
  refreshAssignmentHistory,
}) => {
  const removeAssignmentRow = useCallback(
    async (assignmentId) => {
      const targetId = String(assignmentId || '').trim()
      if (!targetId) return false
      const target = assignmentRows.find((row) => String(row?.id || '') === targetId)
      if (!target) return false
      const deleteResult = await deleteSalaryAssignmentApiFirst(target?.serverId || target?.id)
      if (!deleteResult?.ok) {
        pushToast('Unable to delete salary assignment from backend.', {
          title: 'Delete failed',
          color: 'danger',
        })
        return false
      }

      setAssignmentRows(assignmentRows.filter((row) => String(row?.id || '') !== targetId))
      if (deleteResult?.history) {
        mergeAssignmentHistoryEntry(deleteResult.history)
      } else {
        await refreshAssignmentHistory({
          warningMessage: 'Salary assignment deleted, but history refresh failed.',
        })
      }
      return true
    },
    [
      assignmentRows,
      mergeAssignmentHistoryEntry,
      pushToast,
      refreshAssignmentHistory,
      setAssignmentRows,
    ],
  )

  return { removeAssignmentRow }
}

export default useAssignmentDeleteActions
