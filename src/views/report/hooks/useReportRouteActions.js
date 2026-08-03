import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearReportDraft,
  createErcoDraft,
  deleteErcoDraft,
  deleteReportDraft,
  listErcoDrafts,
  loadReportDraft,
  saveReportDraft,
  updateErcoDraft,
} from '../reportStorage'
import {
  deleteReportRecord,
  downloadFitnessTestReportJson,
  downloadDrillReportPdf,
  downloadErcoReportPdf,
  isReportApiEnabled,
} from '../reportApi'
import { hasPermission, isSystemAdministrator } from 'src/utils/authz'
import { triggerBlobDownload } from 'src/utils/downloadFile'
import { recordToDraft } from '../reportDraftDomain'
import { buildReportPdfFilename } from '../reportUiUtils'
import { toDateTime, uid } from '../utils'
import useReportWorkflowActions from './useReportWorkflowActions'
import {
  getRecordActionContract,
  getRecordActionCapability,
  isRecordActionAllowed,
} from 'src/components/report-workflow/recordActionResolver'

const REPORT_PERMISSION_SLUGS = {
  erco: 'erco',
  drill: 'drill',
  'fitness-test': 'fitness',
}

const getReportPermission = (reportType, action) => {
  const slug =
    REPORT_PERMISSION_SLUGS[
      String(reportType || '')
        .trim()
        .toLowerCase()
    ]
  return slug ? `reports.${slug}.${action}` : ''
}

const getReportOwnerId = (row = {}) =>
  String(row.ownerUserId || row.owner_user_id || row.createdById || row.created_by_id || '').trim()

const isOwnReport = (row = {}, user = {}) => {
  const ownerId = getReportOwnerId(row)
  if (ownerId) return ownerId === String(user?.id || '').trim()
  const submittedBy = String(row.submittedBy || row.createdBy || row.reportedBy || '').trim()
  const userName = String(user?.name || user?.email || '').trim()
  return Boolean(submittedBy && userName && submittedBy === userName)
}

const useReportRouteActions = ({
  activeFormSlug,
  activeSection,
  activeDraftRows = [],
  isFormDirty,
  location,
  navigate,
  persistRecord,
  persistRecords,
  pushToast,
  queryDraftId,
  recordFallbacks = [],
  records,
  reloadRecords,
  reportBasePath,
  reportId,
  reportTypeLabel,
  setActiveDraftRows,
  setDraftVersion,
  setFormSessionKey,
  setIsFormDirty,
  user,
}) => {
  const [showDiscard, setShowDiscard] = useState(false)
  const [showDraftChoice, setShowDraftChoice] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDraftChoice, setShowEditDraftChoice] = useState(false)
  const [pendingEditRow, setPendingEditRow] = useState(null)
  const [pendingReviewRecord, setPendingReviewRecord] = useState(null)
  const [pendingReviewBackSection, setPendingReviewBackSection] = useState('')
  const submitLockRef = useRef(false)
  const deleteLockRef = useRef(false)
  const {
    canApproveRecord,
    canRejectRecord,
    canReviewRecord,
    closeWorkflowActionModal,
    isActionBusy,
    setWorkflowDeclarationChecked,
    setWorkflowRemarks,
    submitWorkflowAction,
    transitionApprove,
    transitionReject,
    transitionReview,
    workflowActionState,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    workflowRemarks,
    setWorkflowDeclarationError,
    setWorkflowRejectError,
  } = useReportWorkflowActions({ navigate, pushToast, reloadRecords, reportBasePath })

  useEffect(() => {
    if (activeSection === 'new') return
    submitLockRef.current = false
  }, [activeSection])

  const removeDraft = useCallback(
    async (draftId = '') => {
      const trimmedDraftId = String(draftId || '').trim()
      if (!trimmedDraftId) {
        if (activeFormSlug === 'erco') return true
        const fallbackDraftId = Array.isArray(activeDraftRows)
          ? String(
              activeDraftRows.find((row) => String(row?.draftId || '').trim())?.draftId || '',
            ).trim()
          : ''
        if (fallbackDraftId) {
          const removedById = await deleteReportDraft(user?.id, fallbackDraftId)
          if (!removedById) return false
          setActiveDraftRows((prev) => {
            if (!Array.isArray(prev) || prev.length === 0) return prev
            return prev.filter((row) => String(row?.draftId || '').trim() !== fallbackDraftId)
          })
          setDraftVersion((prev) => prev + 1)
          return true
        }
        if (!Array.isArray(activeDraftRows) || activeDraftRows.length === 0) return true
        const removed = await clearReportDraft(user?.id, activeFormSlug)
        if (!removed) return false
        setActiveDraftRows([])
        setDraftVersion((prev) => prev + 1)
        return true
      }

      if (activeFormSlug === 'erco') {
        const removed = await deleteErcoDraft(user?.id, trimmedDraftId)
        if (!removed) return false
        setActiveDraftRows((prev) => {
          if (!Array.isArray(prev) || prev.length === 0) return prev
          return prev.filter((row) => String(row?.draftId || '').trim() !== trimmedDraftId)
        })
        setDraftVersion((prev) => prev + 1)
        return true
      }

      const removed = await deleteReportDraft(user?.id, trimmedDraftId)
      if (!removed) return false
      setActiveDraftRows((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev
        const next = prev.filter((row) => String(row?.draftId || '').trim() !== trimmedDraftId)
        return next.length === prev.length ? prev : next
      })
      setDraftVersion((prev) => prev + 1)
      return removed
    },
    [activeDraftRows, activeFormSlug, setActiveDraftRows, setDraftVersion, user?.id],
  )

  const downloadRecord = useCallback(
    async (id) => {
      const record =
        records.find((r) => String(r.id) === String(id)) ||
        recordFallbacks.find((r) => String(r?.id) === String(id))
      if (!record) return

      const downloadCapability = getRecordActionCapability(record, 'download')
      if (downloadCapability && !downloadCapability.allowed) {
        pushToast(
          downloadCapability.reasonCode === 'download_forbidden'
            ? 'Download is unavailable for this report.'
            : 'This report is not available for download.',
          {
            title: 'Download unavailable',
            color: 'warning',
          },
        )
        return
      }

      const recordType = String(record.reportType || '').toLowerCase()
      if (recordType === 'erco' || recordType === 'drill') {
        if (record.canDownloadPdf !== true) {
          pushToast('PDF download is not available for this report.', {
            title: 'Download unavailable',
            color: 'warning',
          })
          return
        }
        setDownloadingId(id)
        try {
          const { blob, filename } =
            recordType === 'drill'
              ? await downloadDrillReportPdf(record)
              : await downloadErcoReportPdf(record)
          triggerBlobDownload(
            blob,
            buildReportPdfFilename(record, user, activeFormSlug) ||
              filename ||
              `${record.displayId || record.id}.pdf`,
          )
        } catch (err) {
          pushToast(err.message || 'Unable to download PDF. Please try again.', {
            title: 'Download failed',
            color: 'danger',
          })
        } finally {
          setDownloadingId(null)
        }
        return
      }

      if (recordType === 'fitness-test') {
        setDownloadingId(id)
        try {
          const { blob, filename } = await downloadFitnessTestReportJson(record)
          triggerBlobDownload(blob, filename || `${record.displayId || record.id}.json`)
        } catch (err) {
          pushToast(err.message || 'Unable to export report data. Please try again.', {
            title: 'Download failed',
            color: 'danger',
          })
        } finally {
          setDownloadingId(null)
        }
        return
      }

      const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
      triggerBlobDownload(blob, `${record.displayId || record.id}.json`)
    },
    [activeFormSlug, recordFallbacks, records, pushToast, user],
  )

  const runGuardedAction = useCallback(
    (action) => {
      if (activeSection === 'new' && isFormDirty) {
        setPendingAction(() => action)
        setShowDiscard(true)
        return
      }
      action()
    },
    [activeSection, isFormDirty],
  )

  const canEditRecord = useCallback(
    (row) => {
      if (!row) return false
      if (row.recordKind === 'draft') return true
      if (getRecordActionContract(row)) return isRecordActionAllowed(row, 'edit')
      if (isSystemAdministrator(user)) return true
      const permission = getReportPermission(row.reportType || activeFormSlug, 'edit')
      if (permission && hasPermission(user, permission)) return true
      if (!isOwnReport(row, user)) return false
      return ['Submitted', 'Rejected'].includes(String(row.status || '').trim())
    },
    [activeFormSlug, user],
  )

  const canDeleteRecord = useCallback(
    (row) => {
      if (!row) return false
      if (row.recordKind === 'draft') return true
      if (getRecordActionContract(row)) return isRecordActionAllowed(row, 'delete')
      if (isSystemAdministrator(user)) return true
      const permission = getReportPermission(row.reportType || activeFormSlug, 'delete')
      if (permission && hasPermission(user, permission)) return true
      return isOwnReport(row, user)
    },
    [activeFormSlug, user],
  )

  const startNew = useCallback(() => {
    const run = async () => {
      const hasSavedDraft =
        activeFormSlug === 'erco'
          ? (await listErcoDrafts(user?.id, { limit: 1, page: 1 })).length > 0
          : Boolean(await loadReportDraft(user?.id, activeFormSlug))
      if (activeSection !== 'new' && hasSavedDraft) {
        setShowDraftChoice(true)
        return
      }
      submitLockRef.current = false
      setIsFormDirty(false)
      setFormSessionKey((prev) => prev + 1)
      navigate(`${reportBasePath}/new`)
    }
    run()
  }, [
    activeFormSlug,
    activeSection,
    navigate,
    reportBasePath,
    setFormSessionKey,
    setIsFormDirty,
    user?.id,
  ])

  const openSavedDraft = useCallback(() => {
    const run = async () => {
      setShowDraftChoice(false)
      submitLockRef.current = false
      setIsFormDirty(false)
      setFormSessionKey((prev) => prev + 1)
      if (activeFormSlug === 'erco') {
        const drafts = await listErcoDrafts(user?.id, { limit: 1, page: 1 })
        const latestId = String(drafts?.[0]?.draftId || '').trim()
        const search = latestId ? `?draft=${encodeURIComponent(latestId)}` : ''
        navigate(`${reportBasePath}/new${search}`)
        return
      }
      navigate(`${reportBasePath}/new`, {
        state: { skipReportDraft: '' },
      })
    }
    run()
  }, [activeFormSlug, navigate, reportBasePath, setFormSessionKey, setIsFormDirty, user?.id])

  const startBlankReport = useCallback(() => {
    setShowDraftChoice(false)
    submitLockRef.current = false
    setIsFormDirty(false)
    setFormSessionKey((prev) => prev + 1)
    navigate(`${reportBasePath}/new`, { state: { skipReportDraft: activeFormSlug } })
  }, [activeFormSlug, navigate, reportBasePath, setFormSessionKey, setIsFormDirty])

  const editRecord = useCallback(
    async (row) => {
      if (!row) return
      if (!canEditRecord(row)) {
        pushToast('This report cannot be edited in its current status.', {
          title: 'Edit unavailable',
          color: 'warning',
        })
        return
      }
      if (row.recordKind === 'draft') {
        const draftId = String(row.draftId || '').trim()
        const editId = String(row.sourceReportUid || '').trim()
        if (activeFormSlug === 'erco') {
          const query = new URLSearchParams()
          if (draftId) query.set('draft', draftId)
          if (editId) query.set('edit', editId)
          setIsFormDirty(false)
          setFormSessionKey((prev) => prev + 1)
          navigate(`${reportBasePath}/new${query.toString() ? `?${query.toString()}` : ''}`, {
            state: { skipReportDraft: '' },
          })
          return
        }
        const payload = {
          ...recordToDraft(row, activeFormSlug),
          ...(editId
            ? { __draftMode: 'edit', __editReportId: editId }
            : { __draftMode: 'new', __editReportId: '' }),
          savedAt: new Date().toISOString(),
        }
        const saved = await saveReportDraft(user?.id, payload, activeFormSlug)
        if (!saved) {
          pushToast('Unable to load this draft. Please try again.', {
            title: 'Draft load failed',
            color: 'danger',
          })
          return
        }
        let persistedDraft = null
        for (let i = 0; i < 3; i += 1) {
          persistedDraft = await loadReportDraft(user?.id, activeFormSlug)
          if (persistedDraft) break
          await new Promise((resolve) => window.setTimeout(resolve, 120))
        }
        if (!persistedDraft) {
          pushToast('Draft was not persisted yet. Please try again.', {
            title: 'Draft load failed',
            color: 'danger',
          })
          return
        }
        setDraftVersion((prev) => prev + 1)
        setIsFormDirty(false)
        setFormSessionKey((prev) => prev + 1)
        navigate(`${reportBasePath}/new`, { state: { skipReportDraft: '' } })
        return
      }
      if (activeFormSlug === 'erco') {
        const drafts = await listErcoDrafts(user?.id, { limit: 50, page: 1 })
        const matchedDraft = drafts.find(
          (draft) => String(draft?.sourceReportUid || '').trim() === String(row.id || '').trim(),
        )
        if (matchedDraft) {
          setPendingEditRow({ ...row, matchedDraftId: matchedDraft.draftId })
          setShowEditDraftChoice(true)
          return
        }
        const created = await createErcoDraft(
          user?.id,
          {
            ...recordToDraft(row, activeFormSlug),
            __draftMode: 'edit',
            __editReportId: String(row.id || ''),
          },
          {
            title: `${row?.incidentType || reportTypeLabel} draft`,
            originMode: 'edit',
            sourceReportUid: String(row.id || ''),
          },
        )
        if (!created) {
          pushToast('Unable to prepare this report for editing. Please try again.', {
            title: 'Edit failed',
            color: 'danger',
          })
          return
        }
        setDraftVersion((prev) => prev + 1)
        setIsFormDirty(false)
        setFormSessionKey((prev) => prev + 1)
        navigate(
          `${reportBasePath}/new?edit=${encodeURIComponent(String(row.id || ''))}&draft=${encodeURIComponent(String(created.draftId || ''))}`,
        )
        return
      }
      const existingDraft = await loadReportDraft(user?.id, activeFormSlug)
      const existingDraftEditId = String(existingDraft?.__editReportId || '').trim()
      if (existingDraftEditId && existingDraftEditId === String(row.id || '').trim()) {
        setPendingEditRow(row)
        setShowEditDraftChoice(true)
        return
      }
      const saved = await saveReportDraft(
        user?.id,
        {
          ...recordToDraft(row, activeFormSlug),
          __draftMode: 'edit',
          __editReportId: String(row.id || ''),
        },
        activeFormSlug,
      )
      if (!saved) {
        pushToast('Unable to prepare this report for editing. Please try again.', {
          title: 'Edit failed',
          color: 'danger',
        })
        return
      }
      setDraftVersion((prev) => prev + 1)
      setIsFormDirty(false)
      setFormSessionKey((prev) => prev + 1)
      navigate(`${reportBasePath}/new?edit=${encodeURIComponent(String(row.id || ''))}`)
    },
    [
      activeFormSlug,
      canEditRecord,
      navigate,
      pushToast,
      reportBasePath,
      reportTypeLabel,
      setDraftVersion,
      setFormSessionKey,
      setIsFormDirty,
      user?.id,
    ],
  )

  const continueEditWithDraft = useCallback(() => {
    const row = pendingEditRow
    setShowEditDraftChoice(false)
    setPendingEditRow(null)
    if (!row) return
    setIsFormDirty(false)
    setFormSessionKey((prev) => prev + 1)
    const draftQuery =
      activeFormSlug === 'erco' && row?.matchedDraftId
        ? `&draft=${encodeURIComponent(String(row.matchedDraftId || ''))}`
        : ''
    navigate(
      `${reportBasePath}/new?edit=${encodeURIComponent(String(row.id || ''))}${draftQuery}`,
      {
        state: { preferSavedEditDraft: true },
      },
    )
  }, [activeFormSlug, navigate, pendingEditRow, reportBasePath, setFormSessionKey, setIsFormDirty])

  const discardEditDraftAndLoadOriginal = useCallback(async () => {
    const row = pendingEditRow
    setShowEditDraftChoice(false)
    setPendingEditRow(null)
    if (!row) return
    if (activeFormSlug === 'erco' && row?.matchedDraftId) {
      const savedDraft = await updateErcoDraft(
        user?.id,
        row.matchedDraftId,
        {
          ...recordToDraft(row, activeFormSlug),
          __draftMode: 'edit',
          __editReportId: String(row.id || ''),
        },
        {
          title: `${row?.incidentType || reportTypeLabel} draft`,
          originMode: 'edit',
          sourceReportUid: String(row.id || ''),
        },
      )
      if (!savedDraft) {
        pushToast('Unable to load original row for editing. Please try again.', {
          title: 'Edit failed',
          color: 'danger',
        })
        return
      }
      setDraftVersion((prev) => prev + 1)
      setIsFormDirty(false)
      setFormSessionKey((prev) => prev + 1)
      navigate(
        `${reportBasePath}/new?edit=${encodeURIComponent(String(row.id || ''))}&draft=${encodeURIComponent(String(row.matchedDraftId || ''))}`,
        {
          state: { preferSavedEditDraft: false },
        },
      )
      return
    }
    const saved = await saveReportDraft(
      user?.id,
      {
        ...recordToDraft(row, activeFormSlug),
        __draftMode: 'edit',
        __editReportId: String(row.id || ''),
      },
      activeFormSlug,
    )
    if (!saved) {
      pushToast('Unable to load original row for editing. Please try again.', {
        title: 'Edit failed',
        color: 'danger',
      })
      return
    }
    setDraftVersion((prev) => prev + 1)
    setIsFormDirty(false)
    setFormSessionKey((prev) => prev + 1)
    navigate(`${reportBasePath}/new?edit=${encodeURIComponent(String(row.id || ''))}`, {
      state: { preferSavedEditDraft: false },
    })
  }, [
    activeFormSlug,
    navigate,
    pendingEditRow,
    pushToast,
    reportBasePath,
    reportTypeLabel,
    setDraftVersion,
    setFormSessionKey,
    setIsFormDirty,
    user?.id,
  ])

  const requestDeleteRecord = useCallback((row) => {
    if (deleteLockRef.current) return
    setDeleteTarget(row || null)
  }, [])

  const confirmDeleteRecord = useCallback(async () => {
    if (deleteLockRef.current) return
    const target = deleteTarget
    if (!target) return
    deleteLockRef.current = true
    setDeleteTarget(null)
    try {
      if (!canDeleteRecord(target)) {
        pushToast('This report cannot be deleted in its current status.', {
          title: 'Delete unavailable',
          color: 'warning',
        })
        return
      }
      setIsDeleting(true)
      if (target.recordKind === 'draft') {
        await removeDraft(target.draftId)
        await reloadRecords()
        pushToast('Draft deleted.', { title: 'Draft deleted', color: 'info' })
        return
      }
      let saved = false
      if (isReportApiEnabled(activeFormSlug)) {
        try {
          saved = await deleteReportRecord(target.id)
        } catch {
          saved = false
        }
      } else {
        const sameTypeRecords = records.filter(
          (row) => String(row?.reportType || '').toLowerCase() === activeFormSlug,
        )
        const result = await persistRecords(sameTypeRecords.filter((row) => row.id !== target.id))
        saved = Boolean(result?.saved)
      }
      if (!saved) {
        pushToast('Unable to delete this report. Please try again.', {
          title: 'Delete failed',
          color: 'danger',
        })
        return
      }
      await reloadRecords()
      pushToast(`${target.displayId || 'Report'} deleted.`, {
        title: 'Report deleted',
        color: 'info',
      })
      if (String(reportId || '') === String(target.id)) navigate(reportBasePath)
    } finally {
      setIsDeleting(false)
      deleteLockRef.current = false
    }
  }, [
    canDeleteRecord,
    activeFormSlug,
    deleteTarget,
    navigate,
    persistRecords,
    pushToast,
    records,
    reloadRecords,
    removeDraft,
    reportBasePath,
    reportId,
  ])

  const submit = useCallback(
    async (record) => {
      if (submitLockRef.current) return
      submitLockRef.current = true
      setIsSubmitting(true)

      try {
        const sameTypeRecords = records.filter(
          (row) => String(row?.reportType || '').toLowerCase() === activeFormSlug,
        )
        const existingRecord =
          sameTypeRecords.find((row) => String(row?.id || '') === String(record?.id || '')) || null
        const isUpdate = Boolean(existingRecord)
        const nowIso = new Date().toISOString()
        const actor = user?.name || user?.email || 'Requester'
        const usesSingleRecordPersistence = ['erco', 'drill', 'fitness-test'].includes(
          activeFormSlug,
        )
        const sourceDraftId = String(
          record?.sourceDraftId || record?.source_draft_id || queryDraftId || '',
        ).trim()
        const nextRecord =
          isUpdate && !usesSingleRecordPersistence
            ? {
                ...record,
                ownerUserId: record.ownerUserId || existingRecord.ownerUserId || '',
                submittedAt: record.submittedAt || existingRecord.submittedAt || '',
                submittedBy: record.submittedBy || existingRecord.submittedBy || '',
                updatedAt: nowIso,
                updatedBy: actor,
                version: Number(existingRecord.version || record.version || 0) + 1,
                revision: Number(existingRecord.revision || record.revision || 0) + 1,
                timeline: [
                  ...(Array.isArray(record.timeline)
                    ? record.timeline
                    : Array.isArray(existingRecord.timeline)
                      ? existingRecord.timeline
                      : []),
                  {
                    id: `t-${uid()}`,
                    action: 'Updated',
                    by: actor,
                    at: nowIso,
                    remarks: 'Report updated.',
                  },
                ],
              }
            : record
        const persistenceResult = usesSingleRecordPersistence
          ? await persistRecord(nextRecord, {
              isUpdate,
              expectedVersion: isUpdate
                ? Number(existingRecord?.version || record?.version || 0)
                : 0,
              submissionKey: isUpdate ? '' : String(record?.submissionKey || '').trim(),
              sourceDraftId,
            })
          : await persistRecords(
              [nextRecord, ...sameTypeRecords.filter((row) => row.id !== record.id)].sort(
                (a, b) => toDateTime(b) - toDateTime(a),
              ),
            )
        const { saved, trimmed } = persistenceResult || {}
        if (!saved) {
          pushToast('Unable to save this report to the server. Please try again.', {
            title: 'Save failed',
            color: 'danger',
          })
          return
        }
        if (trimmed) {
          pushToast('Storage limit reached. Your oldest reports have been removed to make room.', {
            title: 'Storage limit',
            color: 'warning',
            delay: 8000,
          })
        }
        let draftRemoved = true
        try {
          draftRemoved = await removeDraft(sourceDraftId || queryDraftId)
        } catch {
          draftRemoved = false
        }
        setIsFormDirty(false)
        setFormSessionKey((prev) => prev + 1)
        pushToast(
          `${reportTypeLabel} report ${record.displayId} ${isUpdate ? 'updated' : 'submitted'}.`,
          {
            title: isUpdate ? 'Updated' : 'Submitted',
            color: 'success',
          },
        )
        if (!draftRemoved) {
          pushToast(
            'Report saved, but the old draft could not be removed. You can delete it later.',
            {
              title: 'Draft cleanup pending',
              color: 'warning',
              delay: 8000,
            },
          )
        }
        navigate(reportBasePath)
      } catch (error) {
        const code = String(error?.payload?.code || error?.code || '').trim()
        if (error?.status === 409 || code === 'REPORT_VERSION_CONFLICT') {
          pushToast('This report changed on the server. Reload it before applying your update.', {
            title: 'Update conflict',
            color: 'warning',
            delay: 8000,
          })
          await reloadRecords()
        } else {
          pushToast(error?.message || 'Unable to save this report. Please try again.', {
            title: 'Save failed',
            color: 'danger',
          })
        }
      } finally {
        submitLockRef.current = false
        setIsSubmitting(false)
      }
    },
    [
      activeFormSlug,
      navigate,
      persistRecord,
      persistRecords,
      pushToast,
      queryDraftId,
      records,
      reloadRecords,
      removeDraft,
      reportBasePath,
      reportTypeLabel,
      setFormSessionKey,
      setIsFormDirty,
      user?.email,
      user?.name,
    ],
  )

  const saveReviewDraft = useCallback(
    async ({ reviewRecord, selectedEditingRecord }) => {
      if (!reviewRecord) return
      const payload = {
        ...recordToDraft(reviewRecord, activeFormSlug),
        ...(selectedEditingRecord
          ? { __draftMode: 'edit', __editReportId: String(selectedEditingRecord.id || '') }
          : { __draftMode: 'new', __editReportId: '' }),
        savedAt: new Date().toISOString(),
      }
      let saved = null
      if (activeFormSlug === 'erco') {
        const title = `${reviewRecord?.incidentType || reportTypeLabel} draft`
        const activeDraft = activeDraftRows.find(
          (row) => String(row?.draftId || '').trim() === String(queryDraftId || '').trim(),
        )
        saved = queryDraftId
          ? await updateErcoDraft(user?.id, queryDraftId, payload, {
              title,
              originMode: selectedEditingRecord ? 'edit' : 'new',
              sourceReportUid: selectedEditingRecord?.id || '',
              baseVersion: Number(activeDraft?.version || 0) || 0,
            })
          : await createErcoDraft(user?.id, payload, {
              title,
              originMode: selectedEditingRecord ? 'edit' : 'new',
              sourceReportUid: selectedEditingRecord?.id || '',
            })
        if (saved?.draftId && !queryDraftId) {
          const query = new URLSearchParams(location.search)
          query.set('draft', saved.draftId)
          navigate(`${location.pathname}?${query.toString()}`, { replace: true })
        }
      } else {
        const activeDraft = activeDraftRows[0] || null
        const ok = await saveReportDraft(user?.id, payload, activeFormSlug, {
          draftId: activeDraft?.draftId || '',
          baseVersion: Number(activeDraft?.version || 0) || 0,
        })
        saved = ok ? { draftId: '' } : null
      }
      if (!saved) {
        pushToast('Unable to save the draft to the server. Please try again.', {
          title: 'Draft save failed',
          color: 'danger',
        })
        return
      }
      setDraftVersion((prev) => prev + 1)
      setIsFormDirty(false)
      pushToast('Draft saved.', { title: 'Draft saved', color: 'success' })
    },
    [
      activeFormSlug,
      activeDraftRows,
      location.pathname,
      location.search,
      navigate,
      pushToast,
      queryDraftId,
      reportTypeLabel,
      setDraftVersion,
      setIsFormDirty,
      user?.id,
    ],
  )

  const requestReview = useCallback(
    (record, backSection = '') => {
      if (!record) return
      const sourceDraftId = String(
        record?.sourceDraftId || record?.source_draft_id || queryDraftId || '',
      ).trim()
      const reviewRecord = sourceDraftId ? { ...record, sourceDraftId } : record
      setPendingReviewRecord(reviewRecord)
      setPendingReviewBackSection(backSection)
      navigate(`${reportBasePath}/new/review${location.search || ''}`, {
        state: {
          reviewRecord,
          reviewBackSection: backSection,
        },
      })
    },
    [location.search, navigate, queryDraftId, reportBasePath],
  )

  const backFromReview = useCallback(
    ({ reviewBackSection, reviewRecord }) => {
      const suffix = reviewBackSection ? `/${reviewBackSection}` : ''
      navigate(`${reportBasePath}/new${suffix}${location.search || ''}`, {
        state: {
          ...(location.state || {}),
          returnFromReview: true,
          reviewRecord,
          reviewBackSection,
        },
      })
    },
    [location.search, location.state, navigate, reportBasePath],
  )

  const confirmReviewSubmit = useCallback(
    (reviewRecord) => {
      if (!reviewRecord) return
      submit(reviewRecord)
    },
    [submit],
  )

  return {
    backFromReview,
    canApproveRecord,
    canDeleteRecord,
    canEditRecord,
    canRejectRecord,
    canReviewRecord,
    closeWorkflowActionModal,
    confirmDeleteRecord,
    confirmReviewSubmit,
    continueEditWithDraft,
    deleteTarget,
    discardEditDraftAndLoadOriginal,
    downloadRecord,
    downloadingId,
    editRecord,
    isActionBusy,
    isDeleting,
    isSubmitting,
    openSavedDraft,
    pendingEditRow,
    pendingAction,
    pendingReviewBackSection,
    pendingReviewRecord,
    removeDraft,
    requestDeleteRecord,
    requestReview,
    runGuardedAction,
    saveReviewDraft,
    setDeleteTarget,
    setPendingAction,
    setShowDiscard,
    setShowDraftChoice,
    setShowEditDraftChoice,
    setWorkflowDeclarationChecked,
    setWorkflowRemarks,
    showDiscard,
    showDraftChoice,
    showEditDraftChoice,
    startBlankReport,
    startNew,
    submit,
    submitWorkflowAction,
    transitionApprove,
    transitionReject,
    transitionReview,
    workflowActionState,
    workflowDeclarationChecked,
    workflowDeclarationError,
    workflowRejectError,
    workflowRemarks,
    setWorkflowDeclarationError,
    setWorkflowRejectError,
  }
}

export default useReportRouteActions
