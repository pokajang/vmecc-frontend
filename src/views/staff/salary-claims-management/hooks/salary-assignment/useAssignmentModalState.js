import { useCallback, useState } from 'react'
import { emptyAssignmentDraft } from '../../utils'
import {
  buildAssignmentDraftFromDraftRecord,
  buildAssignmentDraftFromRow,
  buildStaffChangePatch,
  findLatestAssignmentForStaff,
} from './assignmentStateDomain'

const useAssignmentModalState = ({
  assignmentRows,
  assignmentDraftRows,
  resetPayComponentsEdit,
}) => {
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false)
  const [editingAssignmentId, setEditingAssignmentId] = useState(null)
  const [activeAssignmentDraftId, setActiveAssignmentDraftId] = useState('')
  const [activeAssignmentDraftName, setActiveAssignmentDraftName] = useState('')
  const [assignmentDraft, setAssignmentDraft] = useState(emptyAssignmentDraft())

  const openCreateAssignment = useCallback(() => {
    setEditingAssignmentId(null)
    setActiveAssignmentDraftId('')
    setActiveAssignmentDraftName('')
    setAssignmentDraft(emptyAssignmentDraft())
    resetPayComponentsEdit()
    setAssignmentModalVisible(true)
  }, [resetPayComponentsEdit])

  const openEditAssignment = useCallback(
    (row) => {
      if (!row?.id) return
      setEditingAssignmentId(row.id)
      setActiveAssignmentDraftId('')
      setActiveAssignmentDraftName('')
      setAssignmentDraft(buildAssignmentDraftFromRow(row))
      resetPayComponentsEdit()
      setAssignmentModalVisible(true)
    },
    [resetPayComponentsEdit],
  )

  const closeAssignmentModal = useCallback(() => {
    setAssignmentModalVisible(false)
    setEditingAssignmentId(null)
    setActiveAssignmentDraftId('')
    setActiveAssignmentDraftName('')
    setAssignmentDraft(emptyAssignmentDraft())
    resetPayComponentsEdit()
  }, [resetPayComponentsEdit])

  const loadAssignmentDraftFromRecord = useCallback(
    (draftRecord) => {
      if (!draftRecord) return false
      const sourceAssignmentId = String(draftRecord?.sourceAssignmentId || '').trim()
      const sourceRow = sourceAssignmentId
        ? assignmentRows.find((row) => String(row?.id || '') === sourceAssignmentId)
        : null
      setEditingAssignmentId(sourceRow?.id || null)
      setActiveAssignmentDraftId(String(draftRecord?.id || ''))
      setActiveAssignmentDraftName(String(draftRecord?.name || ''))
      setAssignmentDraft(buildAssignmentDraftFromDraftRecord(draftRecord))
      resetPayComponentsEdit()
      setAssignmentModalVisible(true)
      return true
    },
    [assignmentRows, resetPayComponentsEdit],
  )

  const openSavedAssignmentDraft = useCallback(
    (draftId) => {
      const normalizedId = String(draftId || '').trim()
      const record =
        assignmentDraftRows.find((row) => String(row?.id || '').trim() === normalizedId) || null
      if (!record) return false
      return loadAssignmentDraftFromRecord(record)
    },
    [assignmentDraftRows, loadAssignmentDraftFromRecord],
  )

  const handleStaffChange = useCallback(
    (key, staffOptions = []) => {
      const selected = staffOptions.find((option) => option.key === key)
      const latestForStaff = findLatestAssignmentForStaff(assignmentRows, selected)
      resetPayComponentsEdit()
      setAssignmentDraft((prev) => ({
        ...prev,
        ...buildStaffChangePatch({ key, selected, latestForStaff }),
      }))
    },
    [assignmentRows, resetPayComponentsEdit],
  )

  const updateContributionDraftField = useCallback((bucket, field, value) => {
    if (!bucket || !field) return
    setAssignmentDraft((prev) => ({
      ...prev,
      [bucket]: {
        ...(prev?.[bucket] || {}),
        [field]: value,
      },
    }))
  }, [])

  return {
    assignmentModalVisible,
    editingAssignmentId,
    setEditingAssignmentId,
    activeAssignmentDraftId,
    setActiveAssignmentDraftId,
    activeAssignmentDraftName,
    setActiveAssignmentDraftName,
    assignmentDraft,
    setAssignmentDraft,
    openCreateAssignment,
    openEditAssignment,
    openSavedAssignmentDraft,
    closeAssignmentModal,
    handleStaffChange,
    updateContributionDraftField,
  }
}

export default useAssignmentModalState
