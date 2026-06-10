import { useCallback, useEffect, useState } from 'react'
import { loadLeaveAssignmentsForUser, loadLeaveRecords } from '../leavePersistence'

export default function useLeaveRecords(userId) {
  const [leaveRecords, setLeaveRecords] = useState([])
  const [assignmentRows, setAssignmentRows] = useState([])
  const [loadMeta, setLoadMeta] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const [recordsResult, assignmentsResult] = await Promise.all([
        loadLeaveRecords(userId),
        loadLeaveAssignmentsForUser(userId),
      ])
      setLeaveRecords(Array.isArray(recordsResult?.data) ? recordsResult.data : [])
      setAssignmentRows(Array.isArray(assignmentsResult?.rows) ? assignmentsResult.rows : [])
      setLoadMeta({
        loadedOk: Boolean(recordsResult?.ok),
        assignmentOk: Boolean(assignmentsResult?.ok),
        recovered: Boolean(recordsResult?.recovered),
        migrated: false,
      })
    } catch {
      setLoadMeta({ loadedOk: false, assignmentOk: false })
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    leaveRecords,
    setLeaveRecords,
    assignmentRows,
    setAssignmentRows,
    loadMeta,
    isLoading,
    reload,
  }
}
