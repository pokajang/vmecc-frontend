import { useCallback, useState } from 'react'
import { ASSIGNMENT_DRAFT_STATUS, SET_SALARY_BASE } from '../constants'

const useAssignmentRowActions = ({
  actorName,
  navigate,
  navigateRaw,
  buildTabPath,
  setAssignmentDraft,
  saveAssignmentAsDraft,
  setSalaryAssignment,
  staffOptions,
  closeAssignmentModal,
  removeAssignmentDraft,
  removeAssignmentRow,
  pushToast,
}) => {
  const [assignmentDeleteModalVisible, setAssignmentDeleteModalVisible] = useState(false)
  const [assignmentDeleteTarget, setAssignmentDeleteTarget] = useState(null)

  const handleAssignmentDraftFieldChange = useCallback(
    (field, value) => {
      setAssignmentDraft((prev) => ({
        ...prev,
        [field]: value,
      }))
    },
    [setAssignmentDraft],
  )

  const saveAssignmentDraft = useCallback(
    async ({ showNotice = true } = {}) => {
      const result = await saveAssignmentAsDraft({ actorName })
      if (result?.ok) {
        if (showNotice) {
          pushToast('Salary assignment draft saved.', {
            title: 'Draft saved',
            color: 'success',
          })
        }
        return true
      }
      return false
    },
    [actorName, pushToast, saveAssignmentAsDraft],
  )

  const setSalary = useCallback(async () => {
    const result = await setSalaryAssignment({ actorName, staffOptions })
    if (!result?.ok) return false
    closeAssignmentModal()
    const successMessage = result?.isEditing
      ? 'Salary assignment updated.'
      : 'Salary assignment set successfully.'
    pushToast(successMessage, {
      title: 'Saved',
      color: 'success',
    })
    const navigateAfterSave = navigateRaw || navigate
    navigateAfterSave(buildTabPath('assignment'))
    return true
  }, [
    actorName,
    buildTabPath,
    closeAssignmentModal,
    navigate,
    navigateRaw,
    pushToast,
    setSalaryAssignment,
    staffOptions,
  ])

  const openCreateAssignmentPage = useCallback(() => {
    navigate(`${SET_SALARY_BASE}/assignment/new`)
  }, [navigate])

  const openEditAssignmentPage = useCallback(
    (row) => {
      if (!row?.id) return
      if (String(row?.status || '') === ASSIGNMENT_DRAFT_STATUS) {
        navigate(`${SET_SALARY_BASE}/assignment/new`, {
          state: { draftId: row.id },
        })
        return
      }
      navigate(`${SET_SALARY_BASE}/assignment/${encodeURIComponent(row.id)}/edit`)
    },
    [navigate],
  )

  const openAssignmentDetailPage = useCallback(
    (row) => {
      if (!row?.id) return
      if (String(row?.status || '') === ASSIGNMENT_DRAFT_STATUS) {
        navigate(`${SET_SALARY_BASE}/assignment/new`, {
          state: { draftId: row.id },
        })
        return
      }
      navigate(`${SET_SALARY_BASE}/assignment/${encodeURIComponent(row.id)}/view`)
    },
    [navigate],
  )

  const resumeAssignmentDraftPage = useCallback(
    (row) => {
      if (!row?.id) return
      navigate(`${SET_SALARY_BASE}/assignment/new`, {
        state: { draftId: row.id },
      })
    },
    [navigate],
  )

  const openAssignmentEditById = useCallback(
    (assignmentId) => {
      const id = String(assignmentId || '').trim()
      if (!id) return
      navigate(`${SET_SALARY_BASE}/assignment/${encodeURIComponent(id)}/edit`)
    },
    [navigate],
  )

  const deleteAssignmentRow = useCallback((row) => {
    if (!row?.id) return false
    setAssignmentDeleteTarget(row)
    setAssignmentDeleteModalVisible(true)
    return true
  }, [])

  const closeAssignmentDeleteModal = useCallback(() => {
    setAssignmentDeleteModalVisible(false)
    setAssignmentDeleteTarget(null)
  }, [])

  const confirmDeleteAssignmentRow = useCallback(async () => {
    if (!assignmentDeleteTarget?.id) {
      closeAssignmentDeleteModal()
      return false
    }
    const isDraft = String(assignmentDeleteTarget?.status || '') === ASSIGNMENT_DRAFT_STATUS
    const ok = isDraft
      ? await removeAssignmentDraft(assignmentDeleteTarget.id)
      : await removeAssignmentRow(assignmentDeleteTarget.id, { actorName })
    if (!ok) {
      pushToast('Unable to delete assignment.', {
        title: 'Delete failed',
        color: 'danger',
      })
      return false
    }
    pushToast(isDraft ? 'Draft deleted.' : 'Salary assignment deleted.', {
      title: isDraft ? 'Draft removed' : 'Assignment removed',
      color: 'success',
    })
    closeAssignmentDeleteModal()
    return true
  }, [
    actorName,
    assignmentDeleteTarget,
    closeAssignmentDeleteModal,
    pushToast,
    removeAssignmentDraft,
    removeAssignmentRow,
  ])

  const backToAssignments = useCallback(() => {
    closeAssignmentModal()
    navigate(buildTabPath('assignment'))
  }, [buildTabPath, closeAssignmentModal, navigate])

  const saveAssignmentWithoutNavigate = useCallback(async () => {
    const result = await setSalaryAssignment({ actorName, staffOptions })
    return Boolean(result?.ok)
  }, [actorName, setSalaryAssignment, staffOptions])

  return {
    handleAssignmentDraftFieldChange,
    saveAssignmentDraft,
    setSalary,
    saveAssignmentWithoutNavigate,
    openCreateAssignmentPage,
    openEditAssignmentPage,
    openAssignmentEditById,
    openAssignmentDetailPage,
    resumeAssignmentDraftPage,
    deleteAssignmentRow,
    assignmentDeleteModalVisible,
    assignmentDeleteTarget,
    closeAssignmentDeleteModal,
    confirmDeleteAssignmentRow,
    backToAssignments,
  }
}

export default useAssignmentRowActions
