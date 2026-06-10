import { useCallback } from 'react'
import { createSalaryItem } from '../utils/salaryClaimUtils'

const useSalaryResetDraft = ({
  draftAttachmentId,
  getProtectedEditingAttachmentId,
  releaseAttachmentIds,
  setDraftItem,
  setEditingIndex,
}) =>
  useCallback(() => {
    const protectedAttachmentId = getProtectedEditingAttachmentId()
    if (draftAttachmentId > 0 && draftAttachmentId !== protectedAttachmentId) {
      releaseAttachmentIds([draftAttachmentId])
    }
    setDraftItem(createSalaryItem())
    setEditingIndex(null)
  }, [
    draftAttachmentId,
    getProtectedEditingAttachmentId,
    releaseAttachmentIds,
    setDraftItem,
    setEditingIndex,
  ])

export default useSalaryResetDraft
