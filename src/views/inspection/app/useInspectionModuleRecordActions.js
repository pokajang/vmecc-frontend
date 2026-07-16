import { useCallback, useRef } from 'react'
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
import { triggerBlobDownload } from 'src/utils/downloadFile'
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
  const downloadLockRef = useRef(false)

  const downloadRecord = useCallback(
    async (id) => {
      if (downloadLockRef.current) return
      const record = records.find((row) => String(row.id || '') === String(id || ''))
      if (!record) return
      if (record.canDownloadPdf !== true) {
        pushToast('PDF download is not available for this report.', {
          title: 'Download unavailable',
          color: 'warning',
        })
        return
      }
      downloadLockRef.current = true
      setDownloadingId(id)
      pushToast('Preparing your PDF for download...', {
        title: 'Downloading report',
        color: 'info',
        delay: 0,
      })
      const downloadFilename = buildInspectionPdfFilename(record, user)
      try {
        const { blob } = await downloadInspectionReportPdf(record)
        triggerBlobDownload(blob, downloadFilename)
        pushToast(
          "Your PDF is ready. Check your browser downloads or your device's Downloads folder.",
          {
            title: 'Download started',
            color: 'success',
            delay: 7000,
          },
        )
      } catch (err) {
        pushToast(err?.message || 'Unable to download PDF. Please try again.', {
          title: 'Download failed',
          color: 'danger',
        })
      } finally {
        downloadLockRef.current = false
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
