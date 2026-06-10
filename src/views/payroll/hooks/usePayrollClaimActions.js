import { useState } from 'react'
import {
  cancelMyPayrollClaimApiFirst,
  deleteLocalPayrollAutosaveDraft,
  deleteMyPayrollClaimApiFirst,
  deleteMyPayrollClaimDraftApiFirst,
} from 'src/services/payrollClaimsApi'
import {
  downloadAttachmentPayload,
  downloadJsonFile,
  downloadWorkflowAttachmentToBrowser,
  extractAttachmentPayload,
} from 'src/views/payroll/components/attachmentUtils'
import { CLAIM_TYPE_ROUTES } from '../payrollConstants'
import {
  buildSubmittedClaimEditPayload,
  canCancelClaimRecord,
  canDeleteClaimRecord,
  canEditClaimRecord,
} from '../payrollUtils'

const buildActionIdempotencyKey = (action, claimOrId) =>
  `payroll:${action}:${String(claimOrId?.id || claimOrId?.serverId || claimOrId || '').trim() || Date.now()}`

const usePayrollClaimActions = ({
  userId,
  claimId,
  draftEntriesById,
  navigate,
  refreshClaimRows,
  pushToast,
  setClaimDraftPayload,
  setSelectedClaimType,
  setClaimPeriod,
  setClaimPeriodConfirmed,
}) => {
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelModalVisible, setCancelModalVisible] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteBlockedTarget, setDeleteBlockedTarget] = useState(null)
  const [deleteBlockedModalVisible, setDeleteBlockedModalVisible] = useState(false)

  const openClaim = (claim) => {
    if (!claim?.id) return
    if (claim.isDraft) {
      const draft = draftEntriesById[claim.id] || null
      if (draft) {
        setClaimDraftPayload({ ...draft, type: claim.type })
        setSelectedClaimType(claim.type || 'expense')
        navigate(CLAIM_TYPE_ROUTES[claim.type] || CLAIM_TYPE_ROUTES.expense)
        return
      }
    }
    navigate(`/payroll/claims/${claim.id}`)
  }

  const downloadAttachment = (claim) => {
    if (!claim?.attachmentAvailable) {
      pushToast(
        claim?.downloadAttachmentBlockedReason || 'Attachment is not available for this claim.',
        {
          title: 'Download unavailable',
          color: 'warning',
        },
      )
      return
    }
    if (claim?.actionPermissions?.downloadAttachment?.enabled === false) {
      pushToast(
        claim?.actionPermissions?.downloadAttachment?.blockedReason ||
          'Attachment download is not available for this claim.',
        {
          title: 'Download unavailable',
          color: 'warning',
        },
      )
      return
    }
    const attachmentSource =
      (Array.isArray(claim?.items) ? claim.items.find((item) => item?.attachmentName) : null) ||
      claim
    const attachmentId = Number(attachmentSource?.attachmentId || claim?.attachmentId || 0) || null
    if (attachmentId) {
      downloadWorkflowAttachmentToBrowser(
        attachmentId,
        attachmentSource?.attachmentName || claim?.attachmentName,
      )
        .then((ok) => {
          if (!ok) throw new Error('Attachment download failed')
          pushToast(`Attachment for ${claim.id} downloaded.`, {
            title: 'Download complete',
            color: 'success',
          })
        })
        .catch(() => {
          pushToast(
            `Unable to download attachment for ${claim.id} from API. Retrying with available attachment metadata.`,
            {
              title: 'API unavailable',
              color: 'warning',
            },
          )
          const payload = extractAttachmentPayload(attachmentSource)
          if (
            payload?.attachmentDataUrl &&
            downloadAttachmentPayload(payload, payload.attachmentName)
          ) {
            pushToast(`Attachment for ${claim.id} downloaded.`, {
              title: 'Download complete',
              color: 'success',
            })
            return
          }

          const fallbackName = payload?.attachmentName || claim?.attachmentName || 'attachment'
          downloadJsonFile(`${claim.id}-${fallbackName}-reference.json`, {
            claimId: claim.id,
            attachmentName: fallbackName,
            note: 'Binary content is not available locally for this record.',
          })
          pushToast(
            `Binary attachment is not available locally for ${claim.id}. Downloaded reference JSON instead.`,
            {
              title: 'Attachment fallback',
              color: 'warning',
            },
          )
        })
      return
    }
    const payload = extractAttachmentPayload(attachmentSource)
    if (payload?.attachmentDataUrl && downloadAttachmentPayload(payload, payload.attachmentName)) {
      pushToast(`Attachment for ${claim.id} downloaded.`, {
        title: 'Download complete',
        color: 'success',
      })
      return
    }

    const fallbackName = payload?.attachmentName || claim?.attachmentName || 'attachment'
    downloadJsonFile(`${claim.id}-${fallbackName}-reference.json`, {
      claimId: claim.id,
      attachmentName: fallbackName,
      note: 'Binary content is not available locally for this record.',
    })
    pushToast(
      `Binary attachment is not available locally for ${claim.id}. Downloaded reference JSON instead.`,
      {
        title: 'Attachment fallback',
        color: 'warning',
      },
    )
  }

  const downloadClaimPackage = (claim) => {
    if (!claim?.id) return
    const payload = {
      id: claim.id,
      type: claim.type || '',
      status: claim.status || '',
      period: claim.period || '',
      periodValue: claim.periodValue || '',
      amount: claim.amount || 0,
      submittedAt: claim.submittedAt || '',
      submittedBy: claim.submittedBy || claim.submittedByName || '',
      updatedAt: claim.updatedAt || '',
      updatedBy: claim.updatedBy || '',
      category: claim.category || '',
      notes: claim.notes || '',
      items: Array.isArray(claim.items) ? claim.items : [],
      workflowSnapshot: claim.workflowSnapshot || null,
      approvalHistory: Array.isArray(claim.approvalHistory) ? claim.approvalHistory : [],
      payrollSnapshot: claim.payrollSnapshot || null,
      overtimeRows: Array.isArray(claim.overtimeRows) ? claim.overtimeRows : [],
      overtimeRateSnapshot: claim.overtimeRateSnapshot || null,
    }
    const ok = downloadJsonFile(`${claim.id}-claim-package.json`, payload)
    if (!ok) {
      pushToast(`Unable to generate package for ${claim.id}.`, {
        title: 'Download failed',
        color: 'danger',
      })
      return
    }
    pushToast(`Claim package for ${claim.id} downloaded.`, {
      title: 'Download complete',
      color: 'success',
    })
  }

  const editSubmittedClaim = (claim) => {
    if (!claim?.id) return
    if (claim?.isDraft) {
      openClaim(claim)
      return
    }
    if (!canEditClaimRecord(claim) || claim?.actionPermissions?.edit?.enabled === false) {
      pushToast(
        claim?.editBlockedReason || 'Approved, rejected, or cancelled claims cannot be edited.',
        {
          title: 'Edit unavailable',
          color: 'warning',
        },
      )
      return
    }
    const payload = buildSubmittedClaimEditPayload(claim)
    if (!payload) return
    setClaimDraftPayload(payload)
    setSelectedClaimType(payload.type || 'expense')
    setClaimPeriod(payload.period || '')
    setClaimPeriodConfirmed(Boolean(payload.periodConfirmed))
    navigate(CLAIM_TYPE_ROUTES[payload.type] || CLAIM_TYPE_ROUTES.expense)
  }

  const cancelClaim = (claim) => {
    if (!claim?.id) return
    if (!canCancelClaimRecord(claim) || claim?.actionPermissions?.cancel?.enabled === false) {
      pushToast(claim?.cancelBlockedReason || 'Only active submitted claims can be cancelled.', {
        title: 'Cancel unavailable',
        color: 'warning',
      })
      return
    }
    setCancelTarget(claim)
    setCancelModalVisible(true)
  }

  const confirmCancel = async () => {
    if (!cancelTarget?.id) return
    if (
      !canCancelClaimRecord(cancelTarget) ||
      cancelTarget?.actionPermissions?.cancel?.enabled === false
    ) {
      pushToast(
        cancelTarget?.cancelBlockedReason || 'Only active submitted claims can be cancelled.',
        {
          title: 'Cancel unavailable',
          color: 'warning',
        },
      )
      setCancelModalVisible(false)
      setCancelTarget(null)
      return
    }
    if (!cancelTarget?.serverId) {
      pushToast('Unable to cancel claim. Backend record id is missing.', {
        title: 'Cancel failed',
        color: 'danger',
      })
      setCancelModalVisible(false)
      setCancelTarget(null)
      return
    }
    const apiResult = await cancelMyPayrollClaimApiFirst(cancelTarget.serverId, '', {
      idempotencyKey: buildActionIdempotencyKey('cancel-claim', cancelTarget),
    })
    if (!apiResult?.ok) {
      pushToast('Unable to cancel claim. API request failed.', {
        title: 'Cancel failed',
        color: 'danger',
      })
      return
    }
    await refreshClaimRows()
    pushToast(`Claim ${cancelTarget.id} cancelled.`, { title: 'Cancelled', color: 'warning' })
    setCancelModalVisible(false)
    setCancelTarget(null)
  }

  const deleteClaim = (claim) => {
    if (!claim?.id) return
    if (!canDeleteClaimRecord(claim) || claim?.actionPermissions?.delete?.enabled === false) {
      setDeleteBlockedTarget(claim)
      setDeleteBlockedModalVisible(true)
      return
    }
    setDeleteTarget(claim)
    setDeleteModalVisible(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return
    if (
      !canDeleteClaimRecord(deleteTarget) ||
      deleteTarget?.actionPermissions?.delete?.enabled === false
    ) {
      pushToast(
        deleteTarget?.deleteBlockedReason || 'Only drafts or cancelled claims can be deleted.',
        {
          title: 'Delete unavailable',
          color: 'warning',
        },
      )
      setDeleteModalVisible(false)
      setDeleteTarget(null)
      return
    }
    if (!deleteTarget.isDraft) {
      if (!deleteTarget?.serverId) {
        pushToast(`Unable to delete claim ${deleteTarget.id}. Backend record id is missing.`, {
          title: 'Delete failed',
          color: 'danger',
        })
        setDeleteModalVisible(false)
        setDeleteTarget(null)
        return
      }
      const apiResult = await deleteMyPayrollClaimApiFirst(deleteTarget.serverId, {
        idempotencyKey: buildActionIdempotencyKey('delete-claim', deleteTarget),
      })
      if (!apiResult?.ok) {
        pushToast(`Unable to delete claim ${deleteTarget.id}. API request failed.`, {
          title: 'Delete failed',
          color: 'danger',
        })
        return
      }
    }
    if (deleteTarget.isDraft) {
      if (deleteTarget.localOnly) {
        const deleted = deleteLocalPayrollAutosaveDraft(userId, deleteTarget.type)
        if (!deleted) {
          pushToast(`Unable to delete local draft ${deleteTarget.id}.`, {
            title: 'Delete failed',
            color: 'danger',
          })
          return
        }
        await refreshClaimRows()
        pushToast(`Draft ${deleteTarget.id} deleted.`, { title: 'Deleted', color: 'danger' })
        setDeleteModalVisible(false)
        setDeleteTarget(null)
        return
      }
      if (!deleteTarget?.backendId) {
        pushToast(`Unable to delete claim ${deleteTarget.id}. Backend draft id is missing.`, {
          title: 'Delete failed',
          color: 'danger',
        })
        setDeleteModalVisible(false)
        setDeleteTarget(null)
        return
      }
      const apiDraftDelete = await deleteMyPayrollClaimDraftApiFirst(
        {
          backendId: deleteTarget.backendId,
        },
        {
          idempotencyKey: buildActionIdempotencyKey('delete-draft', deleteTarget),
        },
      )
      if (!apiDraftDelete?.ok) {
        pushToast(`Unable to delete claim ${deleteTarget.id}. API request failed.`, {
          title: 'Delete failed',
          color: 'danger',
        })
        return
      }
    }
    await refreshClaimRows()
    if (claimId === deleteTarget.id) {
      navigate('/payroll')
    }
    pushToast(`Claim ${deleteTarget.id} deleted.`, { title: 'Deleted', color: 'danger' })
    setDeleteModalVisible(false)
    setDeleteTarget(null)
  }

  const closeCancelModal = () => {
    setCancelModalVisible(false)
    setCancelTarget(null)
  }

  const closeDeleteModal = () => {
    setDeleteModalVisible(false)
    setDeleteTarget(null)
  }

  const closeDeleteBlockedModal = () => {
    setDeleteBlockedModalVisible(false)
    setDeleteBlockedTarget(null)
  }

  return {
    cancelTarget,
    cancelModalVisible,
    deleteTarget,
    deleteModalVisible,
    deleteBlockedTarget,
    deleteBlockedModalVisible,
    openClaim,
    downloadAttachment,
    downloadClaimPackage,
    editSubmittedClaim,
    cancelClaim,
    confirmCancel,
    deleteClaim,
    confirmDelete,
    closeCancelModal,
    closeDeleteModal,
    closeDeleteBlockedModal,
  }
}

export default usePayrollClaimActions
