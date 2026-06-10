import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CAlert, CButton } from '@coreui/react'
import { useLocation, useNavigate } from 'react-router-dom'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import {
  clearReportDraft,
  createErcoDraft,
  deleteErcoDraft,
  loadErcoDraft,
  loadReportDraft,
  saveReportDraft,
  updateErcoDraft,
} from '../reportStorage'
import useReportDraft from '../hooks/useReportDraft'
import useErcoForm from './useErcoForm'
import {
  defaultErcoForm,
  defaultPostIncidentAnalysis,
  formatErcoLocation,
  isErcoDirty,
} from './utils'
import { scrollToFirstError } from '../utils'
import {
  validateErcoAnalysis,
  validateErcoDetails,
  validateErcoForm,
  validateErcoSetup,
} from './validation'
import { buildErcoRecord } from './recordFactory'
import ErcoSetupStep from './ErcoSetupStep'
import ErcoRespondingTeamStep from './ErcoRespondingTeamStep'
import ErcoDetailsStep from './ErcoDetailsStep'
import ErcoPostAnalysisStep from './ErcoPostAnalysisStep'

const ERCO_NEW_SECTIONS = ['setup', 'team', 'form', 'analysis']
const createDraftSignature = (form) => JSON.stringify(form || {})

const ErcoForm = ({
  user,
  reportTypeSlug,
  reportTypeIdPrefix,
  nextReportSequence,
  reportTypeLabel,
  reportBasePath,
  newSection,
  datePresetOptions,
  pushToast,
  onDirtyChange,
  skipDraftLoad = false,
  editingRecord = null,
  editingDraftSeed = null,
  preferSavedEditDraft = false,
  activeDraftId = '',
  showEditSourceBanner = true,
  reviewReturnRecord = null,
  onRequestReview,
  onDraftSaved,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const draftLoadedRef = useRef(false)
  const seededEditIdRef = useRef('')
  const reviewSeedAppliedRef = useRef(false)
  const lastSavedDraftSignatureRef = useRef(null)
  const [showReset, setShowReset] = useState(false)
  const [respondingTeamError, setRespondingTeamError] = useState('')
  const [editViewMode, setEditViewMode] = useState(preferSavedEditDraft ? 'draft' : 'original')
  const [hasDraftSeed, setHasDraftSeed] = useState(false)
  const originalSeedRef = useRef(null)
  const draftSeedRef = useRef(null)
  const activeDraftIdRef = useRef(String(activeDraftId || '').trim())
  const shouldShowEditBanner =
    Boolean(editingRecord) &&
    showEditSourceBanner &&
    String(editingRecord?.status || '')
      .trim()
      .toLowerCase() !== 'draft'
  const normalizeErcoDraft = useCallback((draft) => {
    const next = { ...(draft || {}) }
    if (!next.incidentDate && next.reportDate) next.incidentDate = next.reportDate
    if (!next.incidentTime && next.reportTime) next.incidentTime = next.reportTime
    if (!next.initialIncidentTime && next.initialReportTime) {
      next.initialIncidentTime = next.initialReportTime
    }
    const analysis =
      next.postIncidentAnalysis &&
      typeof next.postIncidentAnalysis === 'object' &&
      !Array.isArray(next.postIncidentAnalysis)
        ? next.postIncidentAnalysis
        : {}
    const fallbackAnalysis = defaultPostIncidentAnalysis()
    next.postIncidentAnalysis = {
      ...fallbackAnalysis,
      ...analysis,
      strengths: Array.isArray(analysis.strengths)
        ? analysis.strengths
        : fallbackAnalysis.strengths,
      resourcesMobilised: Array.isArray(analysis.resourcesMobilised)
        ? analysis.resourcesMobilised
        : Array.isArray(analysis.resourcesMobilized)
          ? analysis.resourcesMobilized
          : fallbackAnalysis.resourcesMobilised,
      improvementOpportunities: Array.isArray(analysis.improvementOpportunities)
        ? analysis.improvementOpportunities
        : Array.isArray(analysis.improvements)
          ? analysis.improvements
          : fallbackAnalysis.improvementOpportunities,
      photos: Array.isArray(analysis.photos) ? analysis.photos : fallbackAnalysis.photos,
    }
    delete next.reportDate
    delete next.reportTime
    delete next.initialReportTime
    return next
  }, [])

  const {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    setupFieldErrors,
    setSetupFieldErrors,
    setupConfirmed,
    setSetupConfirmed,
    respondingTeamConfirmed,
    setRespondingTeamConfirmed,
    detailsConfirmed,
    setDetailsConfirmed,
  } = useErcoForm()

  useReportDraft({
    userId: user?.id,
    reportTypeSlug,
    draftLoadedRef,
    setForm,
    setSetupConfirmed,
    setRespondingTeamConfirmed,
    setDetailsConfirmed,
    pushToast,
    normalizeDraft: normalizeErcoDraft,
    skipDraftLoad,
    loadDraft: ({ userId }) => {
      const id = String(activeDraftId || '').trim()
      if (reportTypeSlug === 'erco' && id) {
        return loadErcoDraft(userId, id).then((row) => row?.payload || null)
      }
      return loadReportDraft(userId, reportTypeSlug)
    },
    onDraftLoaded: (draftForm) => {
      lastSavedDraftSignatureRef.current = createDraftSignature(draftForm)
      if (editingRecord) {
        draftSeedRef.current = draftForm
        setHasDraftSeed(true)
      }
      onDirtyChange(false)
    },
  })

  useEffect(() => {
    activeDraftIdRef.current = String(activeDraftId || '').trim()
  }, [activeDraftId])

  useEffect(() => {
    onDirtyChange(
      isErcoDirty(form) && createDraftSignature(form) !== lastSavedDraftSignatureRef.current,
    )
  }, [form, onDirtyChange])

  useEffect(() => {
    const editId = String(editingRecord?.id || '').trim()
    if (!editId || !editingDraftSeed) return
    if (preferSavedEditDraft) return
    if (seededEditIdRef.current === editId) return
    const normalizedDraft =
      typeof normalizeErcoDraft === 'function'
        ? normalizeErcoDraft(editingDraftSeed || {})
        : editingDraftSeed || {}
    const draftForm = { ...normalizedDraft }
    delete draftForm.setupConfirmed
    delete draftForm.respondingTeamConfirmed
    delete draftForm.detailsConfirmed
    delete draftForm.savedAt
    setForm((prev) => ({
      ...prev,
      ...draftForm,
      chronology: draftForm.chronology?.length ? draftForm.chronology : prev.chronology,
    }))
    setSetupConfirmed(false)
    setRespondingTeamConfirmed(false)
    setDetailsConfirmed(false)
    originalSeedRef.current = draftForm
    lastSavedDraftSignatureRef.current = createDraftSignature(draftForm)
    seededEditIdRef.current = editId
    onDirtyChange(false)
  }, [
    editingDraftSeed,
    editingRecord?.id,
    normalizeErcoDraft,
    onDirtyChange,
    preferSavedEditDraft,
    setDetailsConfirmed,
    setForm,
    setRespondingTeamConfirmed,
    setSetupConfirmed,
  ])

  useEffect(() => {
    if (!editingRecord || !editingDraftSeed) return
    const normalizedDraft =
      typeof normalizeErcoDraft === 'function'
        ? normalizeErcoDraft(editingDraftSeed || {})
        : editingDraftSeed || {}
    const draftForm = { ...normalizedDraft }
    delete draftForm.setupConfirmed
    delete draftForm.respondingTeamConfirmed
    delete draftForm.detailsConfirmed
    delete draftForm.savedAt
    originalSeedRef.current = draftForm
  }, [editingDraftSeed, editingRecord, normalizeErcoDraft])

  useEffect(() => {
    if (!reviewReturnRecord || reviewSeedAppliedRef.current) return
    const normalizedDraft =
      typeof normalizeErcoDraft === 'function'
        ? normalizeErcoDraft(reviewReturnRecord || {})
        : reviewReturnRecord || {}
    const reviewForm = { ...normalizedDraft }
    delete reviewForm.setupConfirmed
    delete reviewForm.respondingTeamConfirmed
    delete reviewForm.detailsConfirmed
    delete reviewForm.savedAt
    setForm((prev) => ({
      ...prev,
      ...reviewForm,
      chronology: reviewForm.chronology?.length ? reviewForm.chronology : prev.chronology,
    }))
    setSetupConfirmed(Boolean(reviewReturnRecord.setupConfirmed ?? true))
    setRespondingTeamConfirmed(Boolean(reviewReturnRecord.respondingTeamConfirmed ?? true))
    setDetailsConfirmed(Boolean(reviewReturnRecord.detailsConfirmed ?? true))
    reviewSeedAppliedRef.current = true
  }, [
    normalizeErcoDraft,
    reviewReturnRecord,
    setDetailsConfirmed,
    setForm,
    setRespondingTeamConfirmed,
    setSetupConfirmed,
  ])

  const normalizedSection = String(newSection || '')
    .trim()
    .toLowerCase()
  const requestedSectionIndex = ERCO_NEW_SECTIONS.indexOf(normalizedSection)
  const unlockedSectionIndex = !setupConfirmed
    ? 0
    : !respondingTeamConfirmed
      ? 1
      : !detailsConfirmed
        ? 2
        : 3
  const activeSectionIndex =
    requestedSectionIndex < 0
      ? unlockedSectionIndex
      : Math.min(requestedSectionIndex, unlockedSectionIndex)
  const activeSection = ERCO_NEW_SECTIONS[activeSectionIndex]

  const navigateToSection = useCallback(
    (section, replace = false) => {
      if (!reportBasePath) return
      const search = String(location.search || '').trim()
      navigate(`${reportBasePath}/new/${section}${search}`, { replace })
    },
    [location.search, navigate, reportBasePath],
  )

  useEffect(() => {
    if (!reportBasePath) return
    if (normalizedSection === activeSection) return
    navigateToSection(activeSection, true)
  }, [activeSection, navigateToSection, normalizedSection, reportBasePath])

  const saveDraft = async ({ silentSuccess = false, overrides = {} } = {}) => {
    const draftPayload = {
      ...form,
      setupConfirmed,
      respondingTeamConfirmed,
      detailsConfirmed,
      ...overrides,
      savedAt: new Date().toISOString(),
      ...(editingRecord
        ? { __draftMode: 'edit', __editReportId: String(editingRecord.id || '') }
        : { __draftMode: 'new', __editReportId: '' }),
    }
    let saved = null
    try {
      if (reportTypeSlug === 'erco') {
        const title = `${form?.incidentType || 'ERCO'} draft`
        if (activeDraftIdRef.current) {
          try {
            saved = await updateErcoDraft(user?.id, activeDraftIdRef.current, draftPayload, {
              title,
              originMode: editingRecord ? 'edit' : 'new',
              sourceReportUid: editingRecord?.id || '',
            })
          } catch {
            saved = await createErcoDraft(user?.id, draftPayload, {
              title,
              originMode: editingRecord ? 'edit' : 'new',
              sourceReportUid: editingRecord?.id || '',
            })
          }
        } else {
          saved = await createErcoDraft(user?.id, draftPayload, {
            title,
            originMode: editingRecord ? 'edit' : 'new',
            sourceReportUid: editingRecord?.id || '',
          })
        }

        if (saved?.draftId) {
          activeDraftIdRef.current = saved.draftId
          const query = new URLSearchParams(location.search)
          query.set('draft', saved.draftId)
          if (editingRecord?.id) query.set('edit', String(editingRecord.id))
          const currentPath = globalThis.location?.pathname || location.pathname
          navigate(`${currentPath}?${query.toString()}`, { replace: true })
        }
      } else {
        const ok = await saveReportDraft(user?.id, draftPayload, reportTypeSlug)
        saved = ok ? { draftId: '' } : null
      }
    } catch {
      saved = null
    }
    if (!saved) {
      pushToast('Unable to save draft in browser storage. Please try again.', {
        title: 'Draft save failed',
        color: 'danger',
      })
      return
    }
    if (!silentSuccess) {
      pushToast('Draft saved.', { title: 'Draft saved', color: 'success' })
    }
    draftSeedRef.current = {
      ...form,
      setupConfirmed,
      respondingTeamConfirmed,
      detailsConfirmed,
      ...overrides,
    }
    setHasDraftSeed(true)
    lastSavedDraftSignatureRef.current = createDraftSignature(form)
    onDirtyChange(false)
    if (typeof onDraftSaved === 'function') onDraftSaved()
    return true
  }

  const clearForm = () => {
    const run = async () => {
      if (reportTypeSlug === 'erco' && activeDraftIdRef.current) {
        await deleteErcoDraft(user?.id, activeDraftIdRef.current)
      } else {
        await clearReportDraft(user?.id, reportTypeSlug)
      }
      if (typeof onDraftSaved === 'function') onDraftSaved()
      lastSavedDraftSignatureRef.current = null
      setForm(defaultErcoForm())
      setSetupConfirmed(false)
      setRespondingTeamConfirmed(false)
      setDetailsConfirmed(false)
      setRespondingTeamError('')
      navigateToSection('setup')
      setShowReset(false)
      pushToast('Form reset.', { title: 'Report reset', color: 'info' })
    }
    run()
  }

  const validateSetupBeforeContinue = () => {
    const result = validateErcoSetup(form)
    setSetupFieldErrors(result.errors)
    if (!result.isValid) {
      scrollToFirstError()
      pushToast('Complete all setup selections before continuing.', {
        title: 'Setup incomplete',
        color: 'warning',
      })
      return false
    }
    return true
  }

  const validateBeforeSubmit = () => {
    const result = validateErcoForm(form)
    setFieldErrors(result.errors)
    if (!result.isValid) {
      scrollToFirstError()
      pushToast('Please complete all required fields before submitting.', {
        title: 'Validation error',
        color: 'danger',
      })
      return false
    }
    return true
  }

  const validateDetailsBeforeContinue = () => {
    const result = validateErcoDetails(form)
    setFieldErrors(result.errors)
    if (!result.isValid) {
      scrollToFirstError()
      pushToast('Complete details, chronology, and summary before continuing.', {
        title: 'Details incomplete',
        color: 'warning',
      })
      return false
    }
    return true
  }

  const validateAnalysisBeforeSubmit = () => {
    const result = validateErcoAnalysis(form)
    setFieldErrors((prev) => {
      const next = { ...prev }
      if (result.errors.postIncidentStrengths) {
        next.postIncidentStrengths = result.errors.postIncidentStrengths
      } else {
        delete next.postIncidentStrengths
      }
      return next
    })
    if (!result.isValid) {
      scrollToFirstError()
      pushToast('Complete post-incident analysis before submitting.', {
        title: 'Analysis incomplete',
        color: 'warning',
      })
      return false
    }
    return true
  }

  const validateRespondingTeamBeforeContinue = () => {
    const rows = Array.isArray(form.respondingAttendance) ? form.respondingAttendance : []
    const selected = rows.filter((row) => row?.present)
    if (selected.length > 0) {
      setRespondingTeamError('')
      return true
    }
    setRespondingTeamError('Tick at least one responding member before continuing.')
    scrollToFirstError()
    pushToast('Tick at least one responding member before continuing.', {
      title: 'Attendance required',
      color: 'warning',
    })
    return false
  }

  const requestReview = () => {
    const nextRecord = buildErcoRecord({
      form,
      reportTypeSlug,
      reportTypeIdPrefix,
      sequence: nextReportSequence,
      user,
    })
    const record = editingRecord
      ? {
          ...nextRecord,
          id: editingRecord.id,
          displayId: editingRecord.displayId,
          timeline: Array.isArray(editingRecord.timeline)
            ? editingRecord.timeline
            : nextRecord.timeline,
        }
      : nextRecord
    onRequestReview?.(record, 'analysis')
  }

  return (
    <>
      <ActionConfirmModal
        visible={showReset}
        title={`Reset ${reportTypeLabel} Report`}
        message="Reset this report and clear the saved draft? This cannot be undone."
        confirmLabel="Reset"
        confirmColor="danger"
        onClose={() => setShowReset(false)}
        onConfirm={clearForm}
      />
      {shouldShowEditBanner ? (
        <CAlert
          color="info"
          className="d-flex flex-wrap align-items-center justify-content-between gap-2"
        >
          <span>
            Editing <strong>{editingRecord.displayId}</strong>. Original data stays unchanged until
            you click <strong>Update Report</strong>.{' '}
            {hasDraftSeed
              ? 'You can switch between original and saved draft values.'
              : 'No saved edit draft yet.'}
          </span>
          <div className="d-flex gap-2">
            <CButton
              type="button"
              color={editViewMode === 'original' ? 'primary' : 'light'}
              onClick={() => {
                const seed = originalSeedRef.current
                if (!seed) return
                setForm((prev) => ({
                  ...prev,
                  ...seed,
                  chronology: seed.chronology?.length ? seed.chronology : prev.chronology,
                }))
                setSetupConfirmed(false)
                setRespondingTeamConfirmed(false)
                setDetailsConfirmed(false)
                setEditViewMode('original')
              }}
            >
              Load Original
            </CButton>
            <CButton
              type="button"
              color={editViewMode === 'draft' ? 'primary' : 'light'}
              disabled={!hasDraftSeed}
              onClick={() => {
                const seed = draftSeedRef.current
                if (!seed) return
                setForm((prev) => ({
                  ...prev,
                  ...seed,
                  chronology: seed.chronology?.length ? seed.chronology : prev.chronology,
                }))
                setSetupConfirmed(Boolean(seed.setupConfirmed))
                setRespondingTeamConfirmed(Boolean(seed.respondingTeamConfirmed))
                setDetailsConfirmed(Boolean(seed.detailsConfirmed))
                setEditViewMode('draft')
              }}
            >
              Load Draft
            </CButton>
          </div>
        </CAlert>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (activeSection !== 'analysis') return
          if (!validateAnalysisBeforeSubmit()) return
          if (!validateBeforeSubmit()) return
          requestReview()
        }}
      >
        {activeSection === 'setup' ? (
          <ErcoSetupStep
            userId={user?.id}
            form={form}
            setForm={setForm}
            setupFieldErrors={setupFieldErrors}
            setSetupFieldErrors={setSetupFieldErrors}
            datePresetOptions={datePresetOptions}
            pushToast={pushToast}
            onSaveDraft={() => saveDraft()}
            onContinue={() => {
              if (!validateSetupBeforeContinue()) return
              setSetupConfirmed(true)
              void saveDraft({ silentSuccess: true, overrides: { setupConfirmed: true } })
              navigateToSection('team')
            }}
          />
        ) : null}
        {activeSection === 'team' ? (
          <ErcoRespondingTeamStep
            user={user}
            form={form}
            setForm={setForm}
            errorMessage={respondingTeamError}
            clearError={() => setRespondingTeamError('')}
            pushToast={pushToast}
            onSaveDraft={() => saveDraft()}
            onBack={() => {
              setSetupConfirmed(false)
              setRespondingTeamConfirmed(false)
              setDetailsConfirmed(false)
              navigateToSection('setup')
            }}
            onContinue={() => {
              if (!validateRespondingTeamBeforeContinue()) return
              setRespondingTeamConfirmed(true)
              void saveDraft({
                silentSuccess: true,
                overrides: { setupConfirmed: true, respondingTeamConfirmed: true },
              })
              navigateToSection('form')
            }}
          />
        ) : null}
        {activeSection === 'form' ? (
          <ErcoDetailsStep
            userId={user?.id}
            form={form}
            fieldErrors={fieldErrors}
            setForm={setForm}
            pushToast={pushToast}
            onBack={() => {
              setRespondingTeamConfirmed(false)
              setDetailsConfirmed(false)
              navigateToSection('team')
            }}
            onContinue={() => {
              if (!validateDetailsBeforeContinue()) return
              setDetailsConfirmed(true)
              void saveDraft({
                silentSuccess: true,
                overrides: {
                  setupConfirmed: true,
                  respondingTeamConfirmed: true,
                  detailsConfirmed: true,
                },
              })
              navigateToSection('analysis')
            }}
            onClear={() => setShowReset(true)}
            onSaveDraft={saveDraft}
          />
        ) : null}
        {activeSection === 'analysis' ? (
          <ErcoPostAnalysisStep
            form={form}
            fieldErrors={fieldErrors}
            setForm={setForm}
            pushToast={pushToast}
            onBack={() => {
              setDetailsConfirmed(false)
              navigateToSection('form')
            }}
            onClear={() => setShowReset(true)}
            onSaveDraft={saveDraft}
            primaryLabel={editingRecord ? 'Review & Update' : 'Review & Submit'}
          />
        ) : null}
      </form>
    </>
  )
}

export default ErcoForm
