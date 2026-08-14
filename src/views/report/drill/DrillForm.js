import React, { useCallback, useEffect, useRef, useState } from 'react'
import WorkflowEditStateBanner from 'src/components/report-workflow/WorkflowEditStateBanner'
import WorkflowInlineFeedback from 'src/components/report-workflow/WorkflowInlineFeedback'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadReportDraftRow, saveReportDraft } from '../reportStorage'
import useReportDraft from '../hooks/useReportDraft'
import { resetReportViewport, scrollToFirstError } from '../utils'
import { DRILL_NEW_SECTIONS } from './constants'
import DrillChronologyStep from './DrillChronologyStep'
import DrillDetailsStep from './DrillDetailsStep'
import DrillPersonnelStep from './DrillPersonnelStep'
import DrillPostAnalysisStep from './DrillPostAnalysisStep'
import DrillSetupStep from './DrillSetupStep'
import {
  hasMeaningfulDrillChanges,
  normalizeDrillForm,
  toSerializableDrillForm,
} from './drillFormDomain'
import { buildDrillRecord } from './recordFactory'
import useDrillForm from './useDrillForm'
import {
  validateDrillAnalysis,
  validateDrillChronology,
  validateDrillDetails,
  validateDrillForm,
  firstDrillError,
  validateDrillPersonnel,
  validateDrillSetup,
} from './validation'

const signature = (form) => {
  const value = toSerializableDrillForm(form)
  const content = { ...value }
  delete content.workflowSection
  return JSON.stringify({
    ...content,
    exerciseObjectives: value.exerciseObjectives.map(({ text }) => ({ text })),
    erpReferences: value.erpReferences.map(({ annexNumber, title }) => ({ annexNumber, title })),
    chronology: value.chronology.map(({ time, action }) => ({ time, action })),
  })
}
const DrillForm = ({
  user,
  reportTypeSlug,
  reportTypeIdPrefix,
  nextReportSequence,
  reportBasePath,
  newSection,
  datePresetOptions,
  timePresetOptions,
  pushToast,
  onDirtyChange,
  skipDraftLoad = false,
  editingRecord = null,
  editingDraftSeed = null,
  preferSavedEditDraft = false,
  reviewReturnRecord = null,
  initialFormSeed = null,
  onRequestReview,
  onDraftSaved,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const initialDrillFormSeed = reviewReturnRecord || editingDraftSeed || initialFormSeed || null
  const draftLoadedRef = useRef(false)
  const initialSeedAppliedRef = useRef(Boolean(initialFormSeed))
  const editSeedAppliedRef = useRef(
    editingDraftSeed && editingRecord?.id ? String(editingRecord.id).trim() : '',
  )
  const reviewSeedAppliedRef = useRef(Boolean(reviewReturnRecord))
  const formRef = useRef(null)
  const saveLockRef = useRef(false)
  const originalSeedRef = useRef(editingDraftSeed ? normalizeDrillForm(editingDraftSeed) : null)
  const draftSeedRef = useRef(null)
  const draftIdRef = useRef('')
  const draftVersionRef = useRef(0)
  const [pendingFocusField, setPendingFocusField] = useState('')
  const [lastSavedSignature, setLastSavedSignature] = useState(() =>
    editingDraftSeed ? signature(normalizeDrillForm(editingDraftSeed)) : null,
  )
  const [saveState, setSaveState] = useState('idle')
  const [blockerMessage, setBlockerMessage] = useState(() =>
    String(location.state?.reviewRecoveryMessage || '').trim(),
  )
  const [photoProcessing, setPhotoProcessing] = useState(false)
  const [hasDraftSeed, setHasDraftSeed] = useState(false)
  const [editViewMode, setEditViewMode] = useState(preferSavedEditDraft ? 'draft' : 'original')
  const [formHydrationVersion, setFormHydrationVersion] = useState(0)

  const {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    setupFieldErrors,
    setSetupFieldErrors,
    addChronology,
    updateChronology,
    removeChronology,
    moveChronology,
  } = useDrillForm(initialDrillFormSeed)
  const lastFormSignatureRef = useRef(signature(form))
  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    const nextSignature = signature(form)
    if (nextSignature === lastFormSignatureRef.current) return
    lastFormSignatureRef.current = nextSignature
    if (saveState !== 'failed' && !saveLockRef.current && !photoProcessing) {
      const timer = window.setTimeout(() => setBlockerMessage(''), 0)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [form, photoProcessing, saveState])

  const focusDrillField = useCallback((field) => {
    if (!field || typeof document === 'undefined') return false
    const container = document.querySelector(`[data-drill-field="${field}"]`)
    if (!container) return false
    container.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    const target = container.matches('input, textarea, select, button, [tabindex]')
      ? container
      : container.querySelector(
          'input:not([type="hidden"]):not(:disabled), textarea, select, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
    window.setTimeout(() => target?.focus?.({ preventScroll: true }), 120)
    return true
  }, [])

  useEffect(() => {
    if (!pendingFocusField) return
    const timer = window.setTimeout(() => {
      if (focusDrillField(pendingFocusField)) setPendingFocusField('')
    }, 80)
    return () => window.clearTimeout(timer)
  }, [focusDrillField, pendingFocusField])

  const normalizedSection = String(newSection || '')
    .trim()
    .toLowerCase()
  const activeSection = DRILL_NEW_SECTIONS.includes(normalizedSection) ? normalizedSection : 'setup'

  useEffect(() => {
    resetReportViewport()
  }, [activeSection])

  const navigateToSection = useCallback(
    (section, replace = false) => {
      if (!reportBasePath) return
      navigate(`${reportBasePath}/new/${section}${location.search || ''}`, { replace })
    },
    [location.search, navigate, reportBasePath],
  )

  useEffect(() => {
    if (!reportBasePath || normalizedSection === activeSection) return
    navigateToSection(activeSection, true)
  }, [activeSection, navigateToSection, normalizedSection, reportBasePath])

  useReportDraft({
    userId: user?.id,
    reportTypeSlug,
    draftLoadedRef,
    setForm,
    pushToast,
    skipDraftLoad,
    normalizeDraft: normalizeDrillForm,
    loadDraft: async ({ userId }) => {
      const row = await loadReportDraftRow(userId, reportTypeSlug)
      draftIdRef.current = String(row?.draftId || '').trim()
      draftVersionRef.current = Number(row?.version || 0) || 0
      return row?.payload || null
    },
    onDraftLoaded: (draftForm) => {
      const normalized = normalizeDrillForm(draftForm)
      setLastSavedSignature(signature(normalized))
      draftSeedRef.current = normalized
      setHasDraftSeed(true)
      setSaveState('saved')
      setFormHydrationVersion((prev) => prev + 1)
      onDirtyChange(false)
      navigateToSection(normalized.workflowSection, true)
    },
  })

  useEffect(() => {
    if (initialSeedAppliedRef.current || !initialFormSeed) return
    const normalized = normalizeDrillForm(initialFormSeed)
    setForm(normalized)
    initialSeedAppliedRef.current = true
  }, [initialFormSeed, setForm])

  useEffect(() => {
    const editId = String(editingRecord?.id || '').trim()
    if (!editId || !editingDraftSeed || editSeedAppliedRef.current === editId) return
    const normalized = normalizeDrillForm(editingDraftSeed)
    originalSeedRef.current = normalized
    setForm(normalized)
    editSeedAppliedRef.current = editId
    onDirtyChange(false)
  }, [editingDraftSeed, editingRecord?.id, onDirtyChange, setForm])

  useEffect(() => {
    if (!reviewReturnRecord || reviewSeedAppliedRef.current) return
    const normalized = normalizeDrillForm(reviewReturnRecord)
    setForm(normalized)
    reviewSeedAppliedRef.current = true
  }, [reviewReturnRecord, setForm])

  const isDirty = hasMeaningfulDrillChanges(form) && signature(form) !== lastSavedSignature
  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  const saveDraft = async ({ silentSuccess = false, section = activeSection } = {}) => {
    if (saveLockRef.current) {
      setBlockerMessage('A draft save is still in progress. Wait for it to finish and retry.')
      return false
    }
    saveLockRef.current = true
    const snapshot = toSerializableDrillForm({ ...formRef.current, workflowSection: section })
    const snapshotSignature = signature(snapshot)
    setSaveState('saving')
    setBlockerMessage('')
    const payload = {
      ...snapshot,
      savedAt: new Date().toISOString(),
      ...(editingRecord
        ? { __draftMode: 'edit', __editReportId: String(editingRecord.id || '') }
        : { __draftMode: 'new', __editReportId: '' }),
    }
    let saved = false
    try {
      const savedDraft = await saveReportDraft(user?.id, payload, reportTypeSlug, {
        draftId: draftIdRef.current,
        baseVersion: draftVersionRef.current,
      })
      saved = Boolean(savedDraft)
      if (savedDraft && typeof savedDraft === 'object') {
        draftIdRef.current = String(savedDraft?.draftId || draftIdRef.current).trim()
        draftVersionRef.current = Number(savedDraft?.version || 0) || draftVersionRef.current
      }
    } catch {
      saved = false
    }
    if (!saved) {
      saveLockRef.current = false
      setSaveState('failed')
      setBlockerMessage(
        'Draft could not be saved to the server. Check your connection, then retry.',
      )
      onDirtyChange(true)
      return false
    }

    setLastSavedSignature(snapshotSignature)
    draftSeedRef.current = snapshot
    setHasDraftSeed(true)
    const changedDuringSave = signature(formRef.current) !== snapshotSignature
    setSaveState(changedDuringSave ? 'dirty' : 'saved')
    onDirtyChange(changedDuringSave)
    if (!silentSuccess) pushToast('Draft saved.', { title: 'Draft saved', color: 'success' })
    saveLockRef.current = false
    onDraftSaved?.()
    if (changedDuringSave) {
      setBlockerMessage(
        'New changes were made while saving. Continue again to save the latest values.',
      )
      return false
    }
    return true
  }

  const validateStage = (validator, message, errorTarget = 'field') => {
    const result = validator(formRef.current)
    if (errorTarget === 'setup') setSetupFieldErrors(result.errors)
    else setFieldErrors(result.errors)
    if (result.isValid) {
      setBlockerMessage('')
      return true
    }
    const firstError = firstDrillError(result.errors)
    if (firstError.field) {
      if (firstError.stage && firstError.stage !== activeSection)
        navigateToSection(firstError.stage)
      setPendingFocusField(firstError.field)
    }
    setBlockerMessage(message)
    window.setTimeout(scrollToFirstError, 0)
    return false
  }

  const continueTo = async (validator, nextSection, message, errorTarget) => {
    if (!validateStage(validator, message, errorTarget)) return
    const saved = await saveDraft({ silentSuccess: true, section: nextSection })
    if (!saved) return
    navigateToSection(nextSection)
  }

  const navigateWithDraft = async (section) => {
    const saved = await saveDraft({ silentSuccess: true, section })
    if (!saved) return
    navigateToSection(section)
  }

  const requestReview = async () => {
    if (photoProcessing) {
      setBlockerMessage('Wait for the current photo upload to finish or cancel it before review.')
      return
    }
    const result = validateDrillForm(formRef.current)
    setFieldErrors(result.errors)
    setSetupFieldErrors(result.errors)
    if (!result.isValid) {
      const firstError = firstDrillError(result.errors)
      const firstSection = firstError.stage
      if (firstError.field) setPendingFocusField(firstError.field)
      setBlockerMessage('Complete the required Drill fields before review.')
      if (firstSection) navigateToSection(firstSection)
      window.setTimeout(scrollToFirstError, 0)
      return
    }
    const draftSaved = await saveDraft({ silentSuccess: true, section: 'analysis' })
    if (!draftSaved) return
    const nextRecord = buildDrillRecord({
      form: formRef.current,
      reportTypeSlug,
      reportTypeIdPrefix,
      sequence: nextReportSequence,
      user,
    })
    const record = editingRecord
      ? {
          ...editingRecord,
          ...nextRecord,
          id: editingRecord.id,
          displayId: editingRecord.displayId,
          ownerUserId: editingRecord.ownerUserId || nextRecord.ownerUserId,
          submittedAt: editingRecord.submittedAt || nextRecord.submittedAt,
          submittedBy: editingRecord.submittedBy || nextRecord.submittedBy,
          timeline: Array.isArray(editingRecord.timeline)
            ? editingRecord.timeline
            : nextRecord.timeline,
          ...(editingRecord.version !== undefined ? { version: editingRecord.version } : {}),
          ...(editingRecord.revision !== undefined ? { revision: editingRecord.revision } : {}),
        }
      : nextRecord
    onRequestReview?.(
      draftIdRef.current ? { ...record, sourceDraftId: draftIdRef.current } : record,
      'analysis',
    )
  }

  const loadSeed = (seed, mode) => {
    if (!seed) return
    setForm(normalizeDrillForm(seed))
    setFormHydrationVersion((prev) => prev + 1)
    setEditViewMode(mode)
    setBlockerMessage('')
  }

  const common = {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    blockerMessage: saveState === 'failed' ? '' : blockerMessage,
    isSaving: saveState === 'saving',
  }

  return (
    <>
      {editingRecord ? (
        <WorkflowEditStateBanner
          displayId={editingRecord.displayId}
          sourceMode={editViewMode}
          hasDraftSource={hasDraftSeed}
          onLoadOriginal={() => loadSeed(originalSeedRef.current, 'original')}
          onLoadDraft={() => loadSeed(draftSeedRef.current, 'draft')}
        >
          The submitted record changes only after Confirm Update.
        </WorkflowEditStateBanner>
      ) : null}

      <form onSubmit={(event) => event.preventDefault()}>
        {saveState === 'failed' ? (
          <WorkflowInlineFeedback
            kind="error"
            message={blockerMessage}
            action={{ label: 'Retry save', onAction: () => saveDraft() }}
          />
        ) : null}
        {activeSection === 'setup' ? (
          <DrillSetupStep
            key={`drill-setup-${formHydrationVersion}`}
            user={user}
            form={form}
            setForm={setForm}
            setupFieldErrors={setupFieldErrors}
            setSetupFieldErrors={setSetupFieldErrors}
            datePresetOptions={datePresetOptions}
            timePresetOptions={timePresetOptions}
            pushToast={pushToast}
            blockerMessage={saveState === 'failed' ? '' : blockerMessage}
            isSaving={saveState === 'saving'}
            onContinue={() =>
              void continueTo(
                validateDrillSetup,
                'personnel',
                'Complete the required exercise setup fields before continuing.',
                'setup',
              )
            }
          />
        ) : null}
        {activeSection === 'personnel' ? (
          <DrillPersonnelStep
            {...common}
            user={user}
            onBack={() => navigateWithDraft('setup')}
            onContinue={() =>
              void continueTo(
                validateDrillPersonnel,
                'details',
                'Resolve the personnel information before continuing.',
              )
            }
          />
        ) : null}
        {activeSection === 'details' ? (
          <DrillDetailsStep
            {...common}
            onBack={() => navigateWithDraft('personnel')}
            onContinue={() =>
              void continueTo(
                validateDrillDetails,
                'chronology',
                'Complete the required exercise details before continuing.',
              )
            }
          />
        ) : null}
        {activeSection === 'chronology' ? (
          <DrillChronologyStep
            {...common}
            addChronology={addChronology}
            updateChronology={updateChronology}
            removeChronology={removeChronology}
            moveChronology={moveChronology}
            onBack={() => navigateWithDraft('details')}
            onContinue={() =>
              void continueTo(
                validateDrillChronology,
                'analysis',
                'Add at least one complete chronology entry before continuing.',
              )
            }
          />
        ) : null}
        {activeSection === 'analysis' ? (
          <DrillPostAnalysisStep
            {...common}
            pushToast={pushToast}
            onBack={() => navigateWithDraft('chronology')}
            onRequestReview={() => {
              if (!validateStage(validateDrillAnalysis, 'Resolve analysis errors before review.'))
                return
              void requestReview()
            }}
            photoProcessing={photoProcessing}
            onPhotoProcessingChange={(isProcessing) => {
              setPhotoProcessing(isProcessing)
              if (!isProcessing) {
                setBlockerMessage((current) => (/photo upload/i.test(current) ? '' : current))
              }
            }}
          />
        ) : null}
      </form>
    </>
  )
}

export default DrillForm
