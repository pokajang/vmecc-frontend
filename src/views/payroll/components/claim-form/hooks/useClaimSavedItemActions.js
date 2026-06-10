import { useCallback } from 'react'
import { CToast, CToastBody, CToastHeader } from '@coreui/react'
import { formatCurrency, parseAmount } from '../utils/claimFormUtils'
import {
  CLAIM_PERIOD_OPTIONS,
  createClaimItem,
  normalizeItem,
  validateClaimSubmissionDraft,
} from '../utils/claimSubmissionUtils'

const useClaimSavedItemActions = ({
  addToast,
  buildDraftPayload,
  claimType,
  draftItem,
  editingIndex,
  header,
  isExceptionalClaim,
  pushToast,
  releaseAttachmentIds,
  resetDraft,
  saveDraft,
  savedItems,
  setDraftItem,
  setEditingIndex,
  setSavedItems,
  setShowForm,
  writeLocalBackup,
}) => {
  const saveItem = useCallback(() => {
    const error = validateClaimSubmissionDraft(draftItem, isExceptionalClaim)
    if (error) {
      pushToast(error, { title: 'Incomplete item', color: 'danger' })
      return
    }
    const normalizedItem = normalizeItem({ ...draftItem })
    const previousItem = editingIndex !== null ? savedItems[editingIndex] : null
    const previousAttachmentId = Number(previousItem?.attachmentId || 0) || 0
    const nextAttachmentId = Number(normalizedItem?.attachmentId || 0) || 0
    const nextSavedItems =
      editingIndex !== null
        ? savedItems.map((item, index) => (index === editingIndex ? normalizedItem : item))
        : [...savedItems, normalizedItem]
    const nextDraftItem = createClaimItem(claimType)
    setSavedItems(nextSavedItems)

    const parsedAmount = parseAmount(normalizedItem.amount)
    const amountLabel = parsedAmount > 0 ? formatCurrency(parsedAmount) : ''
    const actionLabel = editingIndex !== null ? 'updated' : 'added to claim'
    const periodLabel =
      CLAIM_PERIOD_OPTIONS.find((option) => option.value === header.period)?.label ||
      header.period ||
      'this'
    addToast(
      <CToast autohide delay={6000}>
        <CToastHeader closeButton>
          <strong className="me-auto">
            Claim item {editingIndex !== null ? 'updated' : 'saved'}
          </strong>
        </CToastHeader>
        <CToastBody>
          {normalizedItem.category}
          {amountLabel ? ` (${amountLabel}) ` : ' '}
          {actionLabel} to {periodLabel} claim.
        </CToastBody>
      </CToast>,
    )

    setDraftItem(nextDraftItem)
    setEditingIndex(null)
    if (editingIndex === null) {
      setShowForm(false)
    }
    const payload = buildDraftPayload({
      savedItems: nextSavedItems,
      draftItem: nextDraftItem,
    })
    writeLocalBackup(payload)
    void saveDraft({
      showNotice: false,
      showErrorNotice: false,
      payloadOverride: payload,
      syncSource: 'item-commit',
    })
    if (previousAttachmentId > 0 && previousAttachmentId !== nextAttachmentId) {
      releaseAttachmentIds([previousAttachmentId])
    }
  }, [
    addToast,
    buildDraftPayload,
    claimType,
    draftItem,
    editingIndex,
    header.period,
    pushToast,
    releaseAttachmentIds,
    saveDraft,
    savedItems,
    setDraftItem,
    setEditingIndex,
    setSavedItems,
    setShowForm,
    isExceptionalClaim,
    writeLocalBackup,
  ])

  const editSavedItem = useCallback(
    (index) => {
      const item = savedItems[index]
      if (!item) return
      setDraftItem(normalizeItem({ ...item }))
      setEditingIndex(index)
    },
    [savedItems, setDraftItem, setEditingIndex],
  )

  const removeSavedItem = useCallback(
    (index) => {
      const removedItem = savedItems[index]
      const nextSavedItems = savedItems.filter((_, itemIndex) => itemIndex !== index)
      setSavedItems(nextSavedItems)
      const payloadOverrides = { savedItems: nextSavedItems }
      if (editingIndex === index) {
        resetDraft()
        payloadOverrides.draftItem = createClaimItem(claimType)
      } else if (editingIndex !== null && index < editingIndex) {
        setEditingIndex((prev) => prev - 1)
      }
      pushToast('Claim item removed.', { title: 'Item removed', color: 'info' })
      const payload = buildDraftPayload(payloadOverrides)
      writeLocalBackup(payload)
      void saveDraft({
        showNotice: false,
        showErrorNotice: false,
        payloadOverride: payload,
        syncSource: 'item-remove',
      })
      releaseAttachmentIds([removedItem?.attachmentId])
    },
    [
      buildDraftPayload,
      claimType,
      editingIndex,
      pushToast,
      releaseAttachmentIds,
      resetDraft,
      saveDraft,
      savedItems,
      setEditingIndex,
      setSavedItems,
      writeLocalBackup,
    ],
  )

  const handleAddItem = useCallback(() => {
    setShowForm(true)
    if (editingIndex === null) {
      resetDraft()
    }
  }, [editingIndex, resetDraft, setShowForm])

  const cancelAddItem = useCallback(() => {
    resetDraft()
    setShowForm(false)
  }, [resetDraft, setShowForm])

  return {
    cancelAddItem,
    editSavedItem,
    handleAddItem,
    removeSavedItem,
    saveItem,
  }
}

export default useClaimSavedItemActions
