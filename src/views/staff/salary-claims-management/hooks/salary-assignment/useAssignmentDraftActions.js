import { useCallback } from 'react'
import {
  deleteSalaryAssignmentDraftApiFirst,
  renameSalaryAssignmentDraftApiFirst,
  upsertSalaryAssignmentDraftApiFirst,
} from 'src/services/salaryAssignmentsApi'
import { buildAssignmentDraftName } from './assignmentStateDomain'

const useAssignmentDraftActions = ({
  user,
  pushToast,
  assignmentDraft,
  assignmentDraftRows,
  setAssignmentDraftRows,
  activeAssignmentDraftId,
  setActiveAssignmentDraftId,
  activeAssignmentDraftName,
  setActiveAssignmentDraftName,
  editingAssignmentId,
}) => {
  const saveAssignmentAsDraft = useCallback(
    async ({ actorName }) => {
      const now = new Date().toISOString()
      const draftName =
        String(activeAssignmentDraftName || '').trim() ||
        buildAssignmentDraftName(assignmentDraft, actorName)
      const nextDraftRecord = {
        id: activeAssignmentDraftId || undefined,
        backendId: activeAssignmentDraftId || undefined,
        name: draftName,
        status: 'Draft',
        savedAt: now,
        updatedAt: now,
        updatedBy: actorName,
        sourceAssignmentId: editingAssignmentId || '',
        draftData: assignmentDraft,
      }
      const result = await upsertSalaryAssignmentDraftApiFirst(user?.id, nextDraftRecord)
      if (!result?.ok) {
        pushToast('Unable to save assignment draft.', {
          title: 'Draft not saved',
          color: 'danger',
        })
        return { ok: false }
      }
      setAssignmentDraftRows(result.rows || [])
      setActiveAssignmentDraftId(result?.row?.id || '')
      setActiveAssignmentDraftName(result?.row?.name || draftName)
      return {
        ok: true,
        draftId: result?.row?.id || '',
        draftName: result?.row?.name || draftName,
      }
    },
    [
      activeAssignmentDraftId,
      activeAssignmentDraftName,
      assignmentDraft,
      editingAssignmentId,
      pushToast,
      setActiveAssignmentDraftId,
      setActiveAssignmentDraftName,
      setAssignmentDraftRows,
      user?.id,
    ],
  )

  const renameAssignmentDraft = useCallback(
    async (draftId, name) => {
      const target = assignmentDraftRows.find(
        (row) => String(row?.id || '') === String(draftId || ''),
      )
      const result = await renameSalaryAssignmentDraftApiFirst(
        user?.id,
        draftId,
        name,
        target?.backendId || target?.id || null,
      )
      if (!result?.ok) return false
      setAssignmentDraftRows(result.rows || [])
      if (String(draftId || '') === activeAssignmentDraftId) {
        setActiveAssignmentDraftName(result?.row?.name || '')
      }
      return true
    },
    [
      activeAssignmentDraftId,
      assignmentDraftRows,
      setActiveAssignmentDraftName,
      setAssignmentDraftRows,
      user?.id,
    ],
  )

  const removeAssignmentDraft = useCallback(
    async (draftId) => {
      const target = assignmentDraftRows.find(
        (row) => String(row?.id || '') === String(draftId || ''),
      )
      const result = await deleteSalaryAssignmentDraftApiFirst(
        user?.id,
        draftId,
        target?.backendId || target?.id || null,
      )
      if (!result?.ok) return false
      setAssignmentDraftRows(result.rows || [])
      if (String(draftId || '') === activeAssignmentDraftId) {
        setActiveAssignmentDraftId('')
        setActiveAssignmentDraftName('')
      }
      return true
    },
    [
      activeAssignmentDraftId,
      assignmentDraftRows,
      setActiveAssignmentDraftId,
      setActiveAssignmentDraftName,
      setAssignmentDraftRows,
      user?.id,
    ],
  )

  return {
    saveAssignmentAsDraft,
    renameAssignmentDraft,
    removeAssignmentDraft,
  }
}

export default useAssignmentDraftActions
