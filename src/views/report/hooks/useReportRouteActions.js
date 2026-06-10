import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearReportDraft,
  createErcoDraft,
  deleteErcoDraft,
  listErcoDrafts,
  loadReportDraft,
  saveReportDraft,
  updateErcoDraft,
} from '../reportStorage'
import { downloadErcoReportPdf } from '../reportApi'
import { recordToDraft } from '../reportDraftDomain'
import { toDateTime } from '../utils'
import useReportWorkflowActions from './useReportWorkflowActions'

const useReportRouteActions = ({
  activeFormSlug,
  activeSection,
  isFormDirty,
  location,
  navigate,
  persistRecords,
  pushToast,
  queryDraftId,
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
  } = useReportWorkflowActions({ navigate, pushToast, reloadRecords, reportBasePath })

  useEffect(() => {
    if (activeSection === 'new') return
    submitLockRef.current = false
  }, [activeSection])

  const removeDraft = useCallback(
    async (draftId = '') => {
      const trimmedDraftId = String(draftId || '').trim()
      setActiveDraftRows((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev
        if (activeFormSlug === 'erco' && trimmedDraftId) {
          return prev.filter((row) => String(row?.draftId || '').trim() !== trimmedDraftId)
        }
        return []
      })
      const removed =
        activeFormSlug === 'erco' && trimmedDraftId
          ? await deleteErcoDraft(user?.id, trimmedDraftId)
          : await clearReportDraft(user?.id, activeFormSlug)
      setDraftVersion((prev) => prev + 1)
      return removed
    },
    [activeFormSlug, setActiveDraftRows, setDraftVersion, user?.id],
  )

  const downloadRecord = useCallback(
    async (id) => {
      const record = records.find((r) => String(r.id) === String(id))
      if (!record) return

      if (String(record.reportType || '').toLowerCase() === 'erco') {
        setDownloadingId(id)
        try {
          const { blob, filename } = await downloadErcoReportPdf(record)
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename || `${record.displayId || record.id}.pdf`
          a.click()
          URL.revokeObjectURL(url)
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

      const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${record.displayId || record.id}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    [records, pushToast],
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

  const canEditRecord = useCallback((row) => {
    if (!row) return false
    if (row.recordKind === 'draft') return true
    return ['Submitted', 'Rejected'].includes(String(row.status || '').trim())
  }, [])

  const canDeleteRecord = useCallback((row) => Boolean(row), [])

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

  const requestDeleteRecord = useCallback((row) => setDeleteTarget(row || null), [])

  const confirmDeleteRecord = useCallback(async () => {
    const target = deleteTarget
    setDeleteTarget(null)
    if (!target) return
    if (!canDeleteRecord(target)) {
      pushToast('This report cannot be deleted in its current status.', {
        title: 'Delete unavailable',
        color: 'warning',
      })
      return
    }
    setIsDeleting(true)
    try {
      if (target.recordKind === 'draft') {
        await removeDraft(target.draftId)
        await reloadRecords()
        pushToast('Draft deleted.', { title: 'Draft deleted', color: 'info' })
        return
      }
      const { saved } = await persistRecords(records.filter((row) => row.id !== target.id))
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
    }
  }, [
    canDeleteRecord,
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
        const next = [record, ...records.filter((row) => row.id !== record.id)].sort(
          (a, b) => toDateTime(b) - toDateTime(a),
        )
        const { saved, trimmed } = await persistRecords(next)
        if (!saved) {
          pushToast('Unable to save this report in browser storage. Please try again.', {
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
        await removeDraft(queryDraftId)
        setIsFormDirty(false)
        setFormSessionKey((prev) => prev + 1)
        pushToast(`${reportTypeLabel} report ${record.displayId} submitted.`, {
          title: 'Submitted',
          color: 'success',
        })
        navigate(reportBasePath)
      } catch {
        pushToast('Unable to save this report. Please try again.', {
          title: 'Save failed',
          color: 'danger',
        })
      } finally {
        submitLockRef.current = false
        setIsSubmitting(false)
      }
    },
    [
      navigate,
      persistRecords,
      pushToast,
      queryDraftId,
      records,
      removeDraft,
      reportBasePath,
      reportTypeLabel,
      setFormSessionKey,
      setIsFormDirty,
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
        saved = queryDraftId
          ? await updateErcoDraft(user?.id, queryDraftId, payload, {
              title,
              originMode: selectedEditingRecord ? 'edit' : 'new',
              sourceReportUid: selectedEditingRecord?.id || '',
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
        const ok = await saveReportDraft(user?.id, payload, activeFormSlug)
        saved = ok ? { draftId: '' } : null
      }
      if (!saved) {
        pushToast('Unable to save draft in browser storage. Please try again.', {
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
      setPendingReviewRecord(record)
      setPendingReviewBackSection(backSection)
      navigate(`${reportBasePath}/new/review`, {
        state: {
          reviewRecord: record,
          reviewBackSection: backSection,
        },
      })
    },
    [navigate, reportBasePath],
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
    pendingAction,
    pendingReviewBackSection,
    pendingReviewRecord,
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
  }
}

export default useReportRouteActions
