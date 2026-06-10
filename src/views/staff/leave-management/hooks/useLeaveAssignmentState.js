import { useCallback, useState } from 'react'
import { saveLeaveAssignments } from '../leaveAssignmentStorage'

const useLeaveAssignmentState = ({
  userId,
  hydrateAssignmentsFromStorage,
  pushToast,
  leaveTypeCount = 0,
}) => {
  const [assignmentHistory, setAssignmentHistory] = useState([])

  const onCreateAssignment = useCallback(
    async ({ staff, year, entries }) => {
      if (!staff?.employee || !year || !Array.isArray(entries)) return

      const assignmentEntries = entries.map((entry) => ({
        user_id: staff.id || null,
        employee: staff.employee,
        team: staff.team,
        year: Number(year),
        leaveType: entry.leaveType,
        entitlement: Number(entry.entitlement || 0),
        used: 0,
        pending: 0,
      }))

      try {
        await saveLeaveAssignments(userId, assignmentEntries)
        await hydrateAssignmentsFromStorage()
        const eventTime = new Date().toISOString()
        setAssignmentHistory((prev) =>
          [
            {
              id: `lah-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              at: eventTime,
              by: 'HR Admin',
              employee: staff.employee,
              eventType: 'Saved',
              summary: `${year} across ${leaveTypeCount} leave types`,
            },
            ...prev,
          ].slice(0, 25),
        )
        const savedMessage = `Entitlement assignments saved for ${staff.employee} (${year}) across ${leaveTypeCount} leave types.`
        pushToast(savedMessage, { title: 'Saved', color: 'success' })
        return { ok: true }
      } catch (error) {
        const message = error?.message || 'Unable to save assignments. Please retry.'
        pushToast(message, { title: 'Save failed', color: 'danger' })
        return { ok: false, error: message }
      }
    },
    [hydrateAssignmentsFromStorage, leaveTypeCount, pushToast, userId],
  )

  return {
    assignmentHistory,
    setAssignmentHistory,
    onCreateAssignment,
  }
}

export default useLeaveAssignmentState
