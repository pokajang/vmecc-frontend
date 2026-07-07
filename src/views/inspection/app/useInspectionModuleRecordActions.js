import { useCallback } from 'react'
import {
  downloadInspectionReportPdf,
  persistInspectionRecord,
} from 'src/views/inspection/inspectionApi'
import {
  enqueueInspectionSubmission,
  isInspectionQueueableError,
  makeInspectionSubmissionKey,
} from 'src/views/inspection/inspectionOfflineQueue'
import { clearInspectionDraft } from 'src/views/inspection/inspectionStorage'
import { submitInspectionSessionReport } from '../domain/api/inspectionSessionApi'
import { getInspectionDraftMeta } from '../inspectionFormHelpers'
import {
  canDeleteInspectionRecord,
  canEditInspectionRecord,
  confirmInspectionDeleteAction,
  navigateBackFromInspectionReview,
  navigateToInspectionEdit,
  submitInspectionRecordAction,
} from './inspectionModuleActions'
import { buildInspectionPdfFilename } from './inspectionModuleUtils'
import { isSystemAdministrator } from 'src/utils/authz'

const useInspectionModuleRecordActions = ({
  clearWorkingState,
  deleteRecord,
  deleteTarget,
  editingRecord,
  loadWorkspace,
  navigate,
  prepareContinuationPrompt,
  pushToast,
  records,
  refreshQueueRows,
  reloadRecords,
  reportBasePath,
  reportId,
  reportTypeLabel,
  setDeleteTarget,
  setDraftVersion,
  setDownloadingId,
  setIsDeleting,
  setIsSubmitting,
  setContinuationPrompt,
  submitLockRef,
  user,
}) => {
  const downloadRecord = useCallback(
    async (id) => {
      const record = records.find((row) => String(row.id || '') === String(id || ''))
      if (!record) return
      setDownloadingId(id)
      const downloadFilename = buildInspectionPdfFilename(record, user)
      try {
        const { blob } = await downloadInspectionReportPdf(record)
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = downloadFilename
        a.click()
        URL.revokeObjectURL(a.href)
      } catch (err) {
        if (err?.status === 409 || String(err?.code || '') === 'REPORT_VERSION_CONFLICT') {
          try {
            const { blob } = await downloadInspectionReportPdf({
              id: record.id,
              displayId: record.displayId,
            })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = downloadFilename
            a.click()
            URL.revokeObjectURL(a.href)
            return
          } catch {
            // Fall through to default error toast below.
          }
        }
        pushToast(err.message || 'Unable to download PDF. Please try again.', {
          title: 'Download failed',
          color: 'danger',
        })
      } finally {
        setDownloadingId(null)
      }
    },
    [records, pushToast, setDownloadingId, user],
  )

  const backFromReview = useCallback(() => {
    navigateBackFromInspectionReview({
      loadWorkspace,
      userId: user?.id,
      navigate,
      reportBasePath,
    })
  }, [loadWorkspace, navigate, reportBasePath, user?.id])

  const submit = useCallback(
    async (record, options = {}) => {
      return submitInspectionRecordAction({
        record,
        submitLockRef,
        setIsSubmitting,
        makeInspectionSubmissionKey,
        userId: user?.id,
        persistInspectionRecord,
        submitInspectionSessionReport,
        prepareContinuationPrompt,
        reloadRecords,
        clearInspectionDraft,
        setDraftVersion,
        clearWorkingState,
        pushToast,
        reportTypeLabel,
        navigate,
        reportBasePath,
        setContinuationPrompt,
        isInspectionQueueableError,
        enqueueInspectionSubmission,
        editingRecord,
        refreshQueueRows,
        clearWorkingStateOnSuccess: options.clearWorkingStateOnSuccess !== false,
        navigateOnSuccess: options.navigateOnSuccess !== false,
        onSubmitted: options.onSubmitted,
      })
    },
    [
      clearWorkingState,
      editingRecord,
      navigate,
      prepareContinuationPrompt,
      pushToast,
      refreshQueueRows,
      reloadRecords,
      reportBasePath,
      reportTypeLabel,
      setContinuationPrompt,
      setDraftVersion,
      setIsSubmitting,
      submitLockRef,
      user?.id,
    ],
  )

  const confirmDeleteRecord = useCallback(async () => {
    const target = deleteTarget
    setDeleteTarget(null)
    return confirmInspectionDeleteAction({
      target,
      userId: user?.id,
      setIsDeleting,
      clearInspectionDraft,
      clearWorkingState,
      setDraftVersion,
      deleteRecord,
      pushToast,
      reportId,
      navigate,
      reportBasePath,
    })
  }, [
    clearWorkingState,
    deleteRecord,
    deleteTarget,
    navigate,
    pushToast,
    reportBasePath,
    reportId,
    setDeleteTarget,
    setDraftVersion,
    setIsDeleting,
    user?.id,
  ])

  const canEditRecord = useCallback(
    (row) => canEditInspectionRecord({ row, user, isSystemAdministrator }),
    [user],
  )

  const canDeleteRecord = useCallback(
    (row) => canDeleteInspectionRecord({ row, user, isSystemAdministrator }),
    [user],
  )

  const editRecord = useCallback(
    (row) => {
      navigateToInspectionEdit({
        row,
        getInspectionDraftMeta,
        navigate,
        reportBasePath,
      })
    },
    [navigate, reportBasePath],
  )

  return {
    backFromReview,
    canDeleteRecord,
    canEditRecord,
    confirmDeleteRecord,
    downloadRecord,
    editRecord,
    submit,
  }
}

export default useInspectionModuleRecordActions
