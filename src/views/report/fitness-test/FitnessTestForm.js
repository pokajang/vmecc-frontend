import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CAlert } from '@coreui/react'
import WorkflowInlineFeedback from 'src/components/report-workflow/WorkflowInlineFeedback'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadReportDraftRow, saveReportDraft } from '../reportStorage'
import useReportDraft from '../hooks/useReportDraft'
import { resetReportViewport, scrollToFirstError } from '../utils'
import FitnessStageHeader from './FitnessStageHeader'
import FitnessContextSummary from './FitnessContextSummary'
import FitnessTestFormStep from './FitnessTestFormStep'
import FitnessTestPersonnelStep from './FitnessTestPersonnelStep'
import FitnessTestSetupStep from './FitnessTestSetupStep'
import FitnessTestSignoffStep from './FitnessTestSignoffStep'
import {
  isFitnessTestDirty,
  normalizeFitnessTestForm,
  toSerializableFitnessTestForm,
} from './fitnessFormDomain'
import { buildFitnessTestRecord } from './recordFactory'
import useFitnessTestForm from './useFitnessTestForm'
import {
  firstFitnessTestError,
  validateFitnessPeriod,
  validateFitnessPersonnel,
  validateFitnessResults,
  validateFitnessSignoff,
  validateFitnessTestForm,
} from './validation'

const signature = (form) => JSON.stringify(toSerializableFitnessTestForm(form))
const VALIDATORS = {
  period: validateFitnessPeriod,
  personnel: validateFitnessPersonnel,
  results: validateFitnessResults,
  signoff: validateFitnessSignoff,
}
const SAVE_MESSAGES = {
  idle: '',
  dirty: 'Unsaved changes',
  saving: 'Saving draft...',
  saved: 'Draft saved',
}

const FitnessTestForm = ({
  user,
  reportTypeSlug,
  reportTypeIdPrefix,
  nextReportSequence,
  reportBasePath,
  newSection,
  pushToast,
  onDirtyChange,
  skipDraftLoad = false,
  editingRecord = null,
  editingDraftSeed = null,
  reviewReturnRecord = null,
  initialFormSeed = null,
  onRequestReview,
  onDraftSaved,
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const draftLoadedRef = useRef(false)
  const seedAppliedRef = useRef(false)
  const formRef = useRef(null)
  const saveLockRef = useRef(false)
  const draftIdRef = useRef('')
  const draftVersionRef = useRef(0)
  const requestedStep = ['period', 'personnel', 'results', 'signoff'].includes(newSection)
    ? newSection
    : 'period'
  const [activeStep, setActiveStep] = useState(requestedStep)
  const [lastSavedSignature, setLastSavedSignature] = useState(null)
  const [saveState, setSaveState] = useState('idle')
  const [blockerMessage, setBlockerMessage] = useState('')
  const [photoProcessing, setPhotoProcessing] = useState(false)
  const [showIncompleteResultsOnly, setShowIncompleteResultsOnly] = useState(false)
  const {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    updateParticipant,
    applyShiftTestDate,
    setShiftAssessor,
  } = useFitnessTestForm()

  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    resetReportViewport()
  }, [activeStep])

  const navigateToStep = useCallback(
    (step, replace = false) => {
      if (!reportBasePath) return
      navigate(`${reportBasePath}/new/${step}${location.search || ''}`, {
        replace,
        state: location.state,
      })
    },
    [location.search, location.state, navigate, reportBasePath],
  )

  useEffect(() => {
    if (newSection === requestedStep) return
    navigateToStep(requestedStep, true)
  }, [navigateToStep, newSection, requestedStep])

  useEffect(() => {
    if (newSection && requestedStep !== activeStep) setActiveStep(requestedStep)
  }, [activeStep, newSection, requestedStep])

  useReportDraft({
    userId: user?.id,
    reportTypeSlug,
    draftLoadedRef,
    setForm,
    pushToast,
    skipDraftLoad,
    normalizeDraft: normalizeFitnessTestForm,
    loadDraft: async ({ userId }) => {
      const row = await loadReportDraftRow(userId, reportTypeSlug)
      draftIdRef.current = String(row?.draftId || '').trim()
      draftVersionRef.current = Number(row?.version || 0) || 0
      return row?.payload || null
    },
    onDraftLoaded: (draftForm) => {
      const normalized = normalizeFitnessTestForm(draftForm)
      setActiveStep(normalized.workflowStep)
      navigateToStep(normalized.workflowStep, true)
      setLastSavedSignature(signature(normalized))
      setSaveState('saved')
      onDirtyChange(false)
    },
  })

  useEffect(() => {
    if (seedAppliedRef.current) return
    const source = reviewReturnRecord || editingDraftSeed || initialFormSeed
    if (!source) return
    const normalized = normalizeFitnessTestForm(source)
    setForm(normalized)
    const seedStep = newSection || (reviewReturnRecord ? 'signoff' : normalized.workflowStep)
    setActiveStep(seedStep)
    setLastSavedSignature(signature(normalized))
    seedAppliedRef.current = true
    onDirtyChange(false)
  }, [editingDraftSeed, initialFormSeed, newSection, onDirtyChange, reviewReturnRecord, setForm])

  const dirty = isFitnessTestDirty(form) && signature(form) !== lastSavedSignature
  useEffect(() => {
    onDirtyChange(dirty)
    if (dirty && saveState !== 'saving') setSaveState('dirty')
  }, [dirty, onDirtyChange, saveState])

  const clearError = useCallback(
    (field) => setFieldErrors((current) => ({ ...current, [field]: undefined })),
    [setFieldErrors],
  )

  const focusField = (field) => {
    if (!field || typeof document === 'undefined') return
    const container = document.querySelector(`[data-fitness-test-field="${field}"]`)
    container?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => container?.querySelector('input, textarea, button')?.focus(), 100)
  }

  const saveDraft = async ({ silentSuccess = false, step = activeStep } = {}) => {
    if (saveLockRef.current) return false
    saveLockRef.current = true
    const snapshot = toSerializableFitnessTestForm({ ...formRef.current, workflowStep: step })
    setSaveState('saving')
    setBlockerMessage('')
    try {
      const saved = await saveReportDraft(
        user?.id,
        {
          ...snapshot,
          savedAt: new Date().toISOString(),
          __draftMode: editingRecord ? 'edit' : 'new',
          __editReportId: String(editingRecord?.id || ''),
        },
        reportTypeSlug,
        {
          draftId: draftIdRef.current,
          baseVersion: draftVersionRef.current,
        },
      )
      if (!saved) throw new Error('Draft save failed')
      draftIdRef.current = String(saved?.draftId || draftIdRef.current).trim()
      draftVersionRef.current = Number(saved?.version || draftVersionRef.current) || 0
      setLastSavedSignature(signature(snapshot))
      setSaveState('saved')
      onDirtyChange(false)
      onDraftSaved?.()
      if (!silentSuccess) pushToast('Draft saved.', { title: 'Draft saved', color: 'success' })
      return true
    } catch {
      setSaveState('failed')
      setBlockerMessage(
        'The draft could not be saved. Your changes remain in this form; use Retry save when ready.',
      )
      return false
    } finally {
      saveLockRef.current = false
    }
  }

  const goToStep = (nextStep) => {
    const validation = VALIDATORS[activeStep](form)
    setFieldErrors(validation.errors)
    if (!validation.isValid) {
      const firstError = firstFitnessTestError(validation.errors)
      focusField(firstError.field)
      scrollToFirstError()
      return
    }
    setBlockerMessage('')
    setForm((current) => ({ ...current, workflowStep: nextStep }))
    setActiveStep(nextStep)
    navigateToStep(nextStep)
    void saveDraft({ silentSuccess: true, step: nextStep })
  }

  const returnToStep = (nextStep) => {
    setForm((current) => ({ ...current, workflowStep: nextStep }))
    setActiveStep(nextStep)
    navigateToStep(nextStep)
  }

  const requestReview = () => {
    if (photoProcessing) {
      setBlockerMessage('Wait for the photo upload to finish before reviewing the report.')
      return
    }
    const validation = validateFitnessTestForm(form)
    setFieldErrors(validation.errors)
    if (!validation.isValid) {
      const firstError = firstFitnessTestError(validation.errors)
      setActiveStep(firstError.stage)
      navigateToStep(firstError.stage)
      window.setTimeout(() => focusField(firstError.field), 80)
      return
    }
    setBlockerMessage('')
    const nextRecord = buildFitnessTestRecord({
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
          ownerUserId: editingRecord.ownerUserId || nextRecord.ownerUserId,
          submittedAt: editingRecord.submittedAt || nextRecord.submittedAt,
          submittedBy: editingRecord.submittedBy || nextRecord.submittedBy,
          version: editingRecord.version,
          timeline: Array.isArray(editingRecord.timeline)
            ? editingRecord.timeline
            : nextRecord.timeline,
        }
      : nextRecord
    onRequestReview?.(
      draftIdRef.current ? { ...record, sourceDraftId: draftIdRef.current } : record,
      'signoff',
    )
  }

  const saveLabel = editingRecord ? 'Save Update Draft' : 'Save Draft'
  const common = {
    form,
    fieldErrors,
    clearError,
    onSaveDraft: saveDraft,
    saveLabel,
    draftStatus: saveState === 'failed' ? '' : SAVE_MESSAGES[saveState],
    pushToast,
  }

  return (
    <form
      className="fitness-test-form"
      onSubmit={(event) => {
        event.preventDefault()
        requestReview()
      }}
    >
      {editingRecord ? (
        <CAlert color="info">
          Editing <strong>{editingRecord.displayId}</strong>. Changes are applied only after review
          and update.
        </CAlert>
      ) : null}
      {blockerMessage ? (
        <WorkflowInlineFeedback
          kind={saveState === 'failed' ? 'error' : 'warning'}
          message={blockerMessage}
          action={
            saveState === 'failed'
              ? { label: 'Retry save', onAction: () => saveDraft() }
              : undefined
          }
        />
      ) : null}
      <FitnessStageHeader activeStep={activeStep} />
      {activeStep !== 'period' ? <FitnessContextSummary form={form} /> : null}
      {activeStep === 'period' ? (
        <FitnessTestSetupStep
          {...common}
          setForm={setForm}
          onContinue={() => goToStep('personnel')}
        />
      ) : null}
      {activeStep === 'personnel' ? (
        <FitnessTestPersonnelStep
          {...common}
          setForm={setForm}
          onBack={() => returnToStep('period')}
          onContinue={() => goToStep('results')}
        />
      ) : null}
      {activeStep === 'results' ? (
        <FitnessTestFormStep
          {...common}
          setForm={setForm}
          updateParticipant={updateParticipant}
          applyShiftTestDate={applyShiftTestDate}
          incompleteOnly={showIncompleteResultsOnly}
          onShowAllResults={() => setShowIncompleteResultsOnly(false)}
          photoProcessing={photoProcessing}
          onPhotoProcessingChange={(isProcessing) => {
            setPhotoProcessing(isProcessing)
            if (!isProcessing) {
              setBlockerMessage((current) => (/photo upload/i.test(current) ? '' : current))
            }
          }}
          onBack={() => returnToStep('personnel')}
          onContinue={() => goToStep('signoff')}
        />
      ) : null}
      {activeStep === 'signoff' ? (
        <FitnessTestSignoffStep
          {...common}
          user={user}
          setForm={setForm}
          setShiftAssessor={setShiftAssessor}
          onBack={() => returnToStep('results')}
          onReviewIncomplete={() => {
            setShowIncompleteResultsOnly(true)
            returnToStep('results')
          }}
          submitLabel={editingRecord ? 'Review & Update' : 'Review & Submit'}
        />
      ) : null}
    </form>
  )
}

export default FitnessTestForm
