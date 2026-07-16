import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CAlert, CButton } from '@coreui/react'
import { useLocation, useNavigate } from 'react-router-dom'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { clearPendingCameraOperation } from 'src/utils/cameraRecovery'
import { clearReportDraft, loadReportDraftRow, saveReportDraft } from '../reportStorage'
import useReportDraft from '../hooks/useReportDraft'
import { resetReportViewport, scrollToFirstError } from '../utils'
import { DRILL_NEW_SECTIONS } from './constants'
import DrillChronologyStep from './DrillChronologyStep'
import DrillDetailsStep from './DrillDetailsStep'
import DrillPersonnelStep from './DrillPersonnelStep'
import DrillPostAnalysisStep from './DrillPostAnalysisStep'
import DrillSetupStep from './DrillSetupStep'
import DrillStageHeader from './DrillStageHeader'
import {
  createDefaultDrillForm,
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
  validateDrillPersonnel,
  validateDrillSetup,
} from './validation'

const signature = (form) => {
  const value = toSerializableDrillForm(form)
  return JSON.stringify({
    ...value,
    exerciseObjectives: value.exerciseObjectives.map(({ text }) => ({ text })),
    erpReferences: value.erpReferences.map(({ annexNumber, title }) => ({ annexNumber, title })),
    chronology: value.chronology.map(({ time, action }) => ({ time, action })),
  })
}
const SAVE_MESSAGES = {
  idle: '',
  dirty: 'Unsaved changes',
  saving: 'Saving draft...',
  saved: 'Draft saved',
  failed: 'Draft save failed. Your changes remain unsaved.',
}

const DrillForm = ({
  user,
  reportTypeSlug,
  reportTypeIdPrefix,
  nextReportSequence,
  reportTypeLabel,
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
  const draftLoadedRef = useRef(false)
  const initialSeedAppliedRef = useRef(false)
  const editSeedAppliedRef = useRef('')
  const reviewSeedAppliedRef = useRef(false)
  const formRef = useRef(null)
  const saveLockRef = useRef(false)
  const originalSeedRef = useRef(null)
  const draftSeedRef = useRef(null)
  const draftIdRef = useRef('')
  const draftVersionRef = useRef(0)
  const [showReset, setShowReset] = useState(false)
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
  } = useDrillForm()
  useEffect(() => {
    formRef.current = form
  }, [form])

  const normalizedSection = String(newSection || '')
    .trim()
    .toLowerCase()
  const activeSection = DRILL_NEW_SECTIONS.includes(normalizedSection) ? normalizedSection : 'setup'
  const saveLabel = editingRecord ? 'Save Update Draft' : 'Save Draft'

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
      onDirtyChange(false)
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

  const saveDraft = async ({ silentSuccess = false } = {}) => {
    if (saveLockRef.current) {
      setBlockerMessage('A draft save is still in progress. Wait for it to finish and retry.')
      return false
    }
    saveLockRef.current = true
    const snapshot = toSerializableDrillForm(formRef.current)
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
      setBlockerMessage('Draft could not be saved to the server. Check your connection and retry.')
      onDirtyChange(true)
      pushToast('Draft could not be saved to the server. Your form remains open and unsaved.', {
        title: 'Draft save failed',
        color: 'danger',
      })
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
    return true
  }

  const resetForm = async () => {
    setBlockerMessage('')
    let cleared = false
    try {
      cleared = Boolean(await clearReportDraft(user?.id, reportTypeSlug))
    } catch {
      cleared = false
    }
    if (!cleared) {
      setBlockerMessage(
        'The saved server draft could not be cleared. The form was kept to prevent the old draft returning later.',
      )
      setShowReset(false)
      return
    }
    setForm(createDefaultDrillForm())
    setFieldErrors({})
    setSetupFieldErrors({})
    setLastSavedSignature(null)
    draftIdRef.current = ''
    draftVersionRef.current = 0
    draftSeedRef.current = null
    setHasDraftSeed(false)
    setSaveState('idle')
    clearPendingCameraOperation()
    setShowReset(false)
    navigateToSection('setup')
    onDraftSaved?.()
    pushToast('Drill report and saved draft reset.', { title: 'Report reset', color: 'info' })
  }

  const validateStage = (validator, message, errorTarget = 'field') => {
    const result = validator(formRef.current)
    if (errorTarget === 'setup') setSetupFieldErrors(result.errors)
    else setFieldErrors(result.errors)
    if (result.isValid) {
      setBlockerMessage('')
      return true
    }
    setBlockerMessage(message)
    window.setTimeout(scrollToFirstError, 0)
    return false
  }

  const continueTo = async (validator, nextSection, message, errorTarget) => {
    if (!validateStage(validator, message, errorTarget)) return
    const saved = await saveDraft({ silentSuccess: true })
    if (!saved) return
    navigateToSection(nextSection)
  }

  const navigateWithDraft = (section) => {
    void saveDraft({ silentSuccess: true })
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
      const firstSection = result.errors.incidentType || result.errors.reportDate ? 'setup' : null
      setBlockerMessage('Complete the required Drill fields before review.')
      if (firstSection) navigateToSection(firstSection)
      window.setTimeout(scrollToFirstError, 0)
      return
    }
    const draftSaved = await saveDraft({ silentSuccess: true })
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
    onRequestReview?.(record, 'analysis')
  }

  const loadSeed = (seed, mode) => {
    if (!seed) return
    setForm(normalizeDrillForm(seed))
    setEditViewMode(mode)
    setBlockerMessage('')
  }

  const common = {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    onReset: () => setShowReset(true),
    onSaveDraft: saveDraft,
    saveLabel,
    draftStatus:
      saveState === 'saving' || saveState === 'failed'
        ? SAVE_MESSAGES[saveState]
        : isDirty
          ? SAVE_MESSAGES.dirty
          : lastSavedSignature
            ? SAVE_MESSAGES.saved
            : SAVE_MESSAGES.idle,
    blockerMessage,
    isSaving: saveState === 'saving',
  }

  return (
    <>
      <ActionConfirmModal
        visible={showReset}
        title={`Reset ${reportTypeLabel} Report`}
        message="Reset this form and clear its saved server draft? This cannot be undone."
        confirmLabel="Reset"
        confirmColor="danger"
        onClose={() => setShowReset(false)}
        onConfirm={() => void resetForm()}
      />
      {editingRecord ? (
        <CAlert color="info" className="d-flex flex-wrap justify-content-between gap-2">
          <span>
            Editing <strong>{editingRecord.displayId}</strong>. The submitted record changes only
            after Confirm Update.
          </span>
          <div className="d-flex gap-2">
            <CButton
              type="button"
              color={editViewMode === 'original' ? 'primary' : 'light'}
              onClick={() => loadSeed(originalSeedRef.current, 'original')}
            >
              Load Original
            </CButton>
            <CButton
              type="button"
              color={editViewMode === 'draft' ? 'primary' : 'light'}
              disabled={!hasDraftSeed}
              onClick={() => loadSeed(draftSeedRef.current, 'draft')}
            >
              Load Draft
            </CButton>
          </div>
        </CAlert>
      ) : null}

      <form onSubmit={(event) => event.preventDefault()}>
        <DrillStageHeader activeSection={activeSection} onNavigate={navigateWithDraft} />
        {activeSection === 'setup' ? (
          <DrillSetupStep
            user={user}
            form={form}
            setForm={setForm}
            setupFieldErrors={setupFieldErrors}
            setSetupFieldErrors={setSetupFieldErrors}
            datePresetOptions={datePresetOptions}
            timePresetOptions={timePresetOptions}
            pushToast={pushToast}
            onSaveDraft={saveDraft}
            saveLabel={saveLabel}
            draftStatus={
              saveState === 'saving' || saveState === 'failed'
                ? SAVE_MESSAGES[saveState]
                : isDirty
                  ? SAVE_MESSAGES.dirty
                  : lastSavedSignature
                    ? SAVE_MESSAGES.saved
                    : SAVE_MESSAGES.idle
            }
            blockerMessage={blockerMessage}
            onReset={() => setShowReset(true)}
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
            onPhotoProcessingChange={setPhotoProcessing}
          />
        ) : null}
      </form>
    </>
  )
}

export default DrillForm
