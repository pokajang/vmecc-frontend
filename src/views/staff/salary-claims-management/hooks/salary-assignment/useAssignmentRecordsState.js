import { useCallback, useState } from 'react'
import {
  loadSalaryAssignmentDraftsApiFirst,
  loadSalaryAssignmentHistoryApiFirst,
  loadSalaryAssignmentsApiFirst,
} from 'src/services/salaryAssignmentsApi'
import { mergeAndSortAssignmentHistory } from './assignmentStateDomain'

const useAssignmentRecordsState = ({ user, pushToast, hydrateStatutoryRates }) => {
  const [assignmentRows, setAssignmentRows] = useState([])
  const [assignmentDraftRows, setAssignmentDraftRows] = useState([])
  const [assignmentHistory, setAssignmentHistory] = useState([])
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false)
  const [assignmentLoadError, setAssignmentLoadError] = useState(false)

  const refreshAssignmentHistory = useCallback(
    async ({ warningMessage }) => {
      const refreshedHistory = await loadSalaryAssignmentHistoryApiFirst({ limit: 100 })
      if (refreshedHistory?.ok) {
        setAssignmentHistory(mergeAndSortAssignmentHistory(refreshedHistory.data || []))
        return true
      }
      if (warningMessage) {
        pushToast(warningMessage, {
          title: 'History warning',
          color: 'warning',
        })
      }
      return false
    },
    [pushToast],
  )

  const mergeAssignmentHistoryEntry = useCallback((entry) => {
    if (!entry) return
    setAssignmentHistory((prev) =>
      mergeAndSortAssignmentHistory([entry, ...(Array.isArray(prev) ? prev : [])]),
    )
  }, [])

  const hydrateAssignments = useCallback(async () => {
    setIsAssignmentsLoading(true)
    setAssignmentLoadError(false)
    const [assignmentsResult, draftsResult, historyResult] = await Promise.all([
      loadSalaryAssignmentsApiFirst(user?.id),
      loadSalaryAssignmentDraftsApiFirst(user?.id),
      loadSalaryAssignmentHistoryApiFirst({ limit: 100 }),
    ])
    setAssignmentRows(Array.isArray(assignmentsResult?.data) ? assignmentsResult.data : [])
    setAssignmentDraftRows(Array.isArray(draftsResult?.data) ? draftsResult.data : [])
    if (!assignmentsResult?.ok) {
      setAssignmentLoadError(true)
      pushToast('Unable to load salary assignments from backend.', {
        title: 'Assignment warning',
        color: 'warning',
      })
    }
    if (!draftsResult?.ok) {
      pushToast('Unable to load salary assignment drafts from backend.', {
        title: 'Draft warning',
        color: 'warning',
      })
    }
    if (historyResult?.ok) {
      setAssignmentHistory(mergeAndSortAssignmentHistory(historyResult.data || []))
    } else {
      setAssignmentHistory([])
      pushToast('Unable to load salary assignment history from backend.', {
        title: 'History warning',
        color: 'warning',
      })
    }
    await hydrateStatutoryRates()
    setIsAssignmentsLoading(false)
  }, [hydrateStatutoryRates, pushToast, user?.id])

  return {
    assignmentRows,
    setAssignmentRows,
    assignmentDraftRows,
    setAssignmentDraftRows,
    assignmentHistory,
    setAssignmentHistory,
    isAssignmentsLoading,
    assignmentLoadError,
    hydrateAssignments,
    mergeAssignmentHistoryEntry,
    refreshAssignmentHistory,
  }
}

export default useAssignmentRecordsState
