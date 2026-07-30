import { useCallback, useState } from 'react'
import {
  loadSalaryAssignmentDraftsApiFirst,
  loadSalaryAssignmentHistoryApiFirst,
  loadSalaryAssignmentsApiFirst,
} from 'src/services/salaryAssignmentsApi'
import { createPayrollRequestContext } from 'src/services/payrollPrivacy'
import { mergeAndSortAssignmentHistory } from './assignmentStateDomain'

const useAssignmentRecordsState = ({ user, pushToast, hydrateStatutoryRates }) => {
  const [assignmentRows, setAssignmentRows] = useState([])
  const [assignmentDraftRows, setAssignmentDraftRows] = useState([])
  const [assignmentHistory, setAssignmentHistory] = useState([])
  const [hydratedUserId, setHydratedUserId] = useState(() => String(user?.id || ''))
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false)
  const [assignmentLoadError, setAssignmentLoadError] = useState(false)

  const refreshAssignmentHistory = useCallback(
    async ({ warningMessage }) => {
      const requestContext = createPayrollRequestContext(user?.id)
      try {
        const refreshedHistory = await loadSalaryAssignmentHistoryApiFirst({ limit: 100 })
        if (!requestContext.isCurrent()) return false
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
      } finally {
        requestContext.release()
      }
    },
    [pushToast, user?.id],
  )

  const mergeAssignmentHistoryEntry = useCallback((entry) => {
    if (!entry) return
    setAssignmentHistory((prev) =>
      mergeAndSortAssignmentHistory([entry, ...(Array.isArray(prev) ? prev : [])]),
    )
  }, [])

  const hydrateAssignments = useCallback(async () => {
    const requestContext = createPayrollRequestContext(user?.id)
    setAssignmentRows([])
    setAssignmentDraftRows([])
    setAssignmentHistory([])
    if (!user?.id) {
      setHydratedUserId('')
      setIsAssignmentsLoading(false)
      requestContext.release()
      return
    }
    setIsAssignmentsLoading(true)
    setAssignmentLoadError(false)
    try {
      const [assignmentsResult, draftsResult, historyResult] = await Promise.all([
        loadSalaryAssignmentsApiFirst(user?.id),
        loadSalaryAssignmentDraftsApiFirst(user?.id),
        loadSalaryAssignmentHistoryApiFirst({ limit: 100 }),
      ])
      if (!requestContext.isCurrent()) return
      setAssignmentRows(Array.isArray(assignmentsResult?.data) ? assignmentsResult.data : [])
      setAssignmentDraftRows(Array.isArray(draftsResult?.data) ? draftsResult.data : [])
      setHydratedUserId(String(user.id))
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
        pushToast('Unable to load salary assignment history from backend.', {
          title: 'History warning',
          color: 'warning',
        })
      }
      await hydrateStatutoryRates()
    } finally {
      if (requestContext.isCurrent()) setIsAssignmentsLoading(false)
      requestContext.release()
    }
  }, [hydrateStatutoryRates, pushToast, user?.id])

  const hasCurrentIdentity = Boolean(user?.id) && String(user.id) === hydratedUserId

  return {
    assignmentRows: hasCurrentIdentity ? assignmentRows : [],
    setAssignmentRows,
    assignmentDraftRows: hasCurrentIdentity ? assignmentDraftRows : [],
    setAssignmentDraftRows,
    assignmentHistory: hasCurrentIdentity ? assignmentHistory : [],
    setAssignmentHistory,
    isAssignmentsLoading: Boolean(user?.id) && !hasCurrentIdentity ? true : isAssignmentsLoading,
    assignmentLoadError,
    hydrateAssignments,
    mergeAssignmentHistoryEntry,
    refreshAssignmentHistory,
    hasCurrentIdentity,
  }
}

export default useAssignmentRecordsState
