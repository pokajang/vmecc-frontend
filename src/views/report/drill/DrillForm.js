import React, { useEffect, useRef, useState } from 'react'
import { CAlert, CButton } from '@coreui/react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { clearReportDraft, saveReportDraft } from '../reportStorage'
import { scrollToFirstError } from '../utils'
import useReportDraft from '../hooks/useReportDraft'
import DrillFormStep from './DrillFormStep'
import DrillSetupStep from './DrillSetupStep'
import { buildDrillRecord } from './recordFactory'
import useDrillForm from './useDrillForm'
import { defaultDrillForm, isDrillDirty } from './utils'
import { validateDrillForm, validateDrillSetup } from './validation'

const createDraftSignature = (form) => JSON.stringify(form || {})

const DrillForm = ({
  user,
  reportTypeSlug,
  reportTypeIdPrefix,
  nextReportSequence,
  reportTypeLabel,
  datePresetOptions,
  timePresetOptions,
  pushToast,
  onDirtyChange,
  skipDraftLoad = false,
  editingRecord = null,
  editingDraftSeed = null,
  preferSavedEditDraft = false,
  reviewReturnRecord = null,
  onRequestReview,
  onDraftSaved,
}) => {
  const draftLoadedRef = useRef(false)
  const seededEditIdRef = useRef('')
  const reviewSeedAppliedRef = useRef(false)
  const lastSavedDraftSignatureRef = useRef(null)
  const [showReset, setShowReset] = useState(false)
  const [editViewMode, setEditViewMode] = useState(preferSavedEditDraft ? 'draft' : 'original')
  const [hasDraftSeed, setHasDraftSeed] = useState(false)
  const originalSeedRef = useRef(null)
  const draftSeedRef = useRef(null)

  const {
    form,
    setForm,
    fieldErrors,
    setFieldErrors,
    setupFieldErrors,
    setSetupFieldErrors,
    setupConfirmed,
    setSetupConfirmed,
    addChronology,
    updateChronology,
    removeChronology,
  } = useDrillForm()

  useReportDraft({
    userId: user?.id,
    reportTypeSlug,
    draftLoadedRef,
    setForm,
    setSetupConfirmed,
    pushToast,
    skipDraftLoad,
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
    onDirtyChange(
      isDrillDirty(form) && createDraftSignature(form) !== lastSavedDraftSignatureRef.current,
    )
  }, [form, onDirtyChange])

  useEffect(() => {
    const editId = String(editingRecord?.id || '').trim()
    if (!editId || !editingDraftSeed) return
    if (preferSavedEditDraft) return
    if (seededEditIdRef.current === editId) return
    const draftForm = { ...(editingDraftSeed || {}) }
    delete draftForm.setupConfirmed
    delete draftForm.savedAt
    setForm((prev) => ({
      ...prev,
      ...draftForm,
      chronology: draftForm.chronology?.length ? draftForm.chronology : prev.chronology,
    }))
    setSetupConfirmed(false)
    originalSeedRef.current = draftForm
    lastSavedDraftSignatureRef.current = createDraftSignature(draftForm)
    seededEditIdRef.current = editId
    onDirtyChange(false)
  }, [
    editingDraftSeed,
    editingRecord?.id,
    onDirtyChange,
    preferSavedEditDraft,
    setForm,
    setSetupConfirmed,
  ])

  useEffect(() => {
    if (!editingRecord || !editingDraftSeed) return
    const draftForm = { ...(editingDraftSeed || {}) }
    delete draftForm.setupConfirmed
    delete draftForm.savedAt
    originalSeedRef.current = draftForm
  }, [editingDraftSeed, editingRecord])

  useEffect(() => {
    if (!reviewReturnRecord || reviewSeedAppliedRef.current) return
    const reviewForm = { ...(reviewReturnRecord || {}) }
    delete reviewForm.setupConfirmed
    delete reviewForm.savedAt
    setForm((prev) => ({
      ...prev,
      ...reviewForm,
      chronology: reviewForm.chronology?.length ? reviewForm.chronology : prev.chronology,
    }))
    setSetupConfirmed(Boolean(reviewReturnRecord.setupConfirmed ?? true))
    reviewSeedAppliedRef.current = true
  }, [reviewReturnRecord, setForm, setSetupConfirmed])

  const saveDraft = async ({ silentSuccess = false, overrides = {} } = {}) => {
    const draftPayload = {
      ...form,
      setupConfirmed,
      ...overrides,
      savedAt: new Date().toISOString(),
      ...(editingRecord
        ? { __draftMode: 'edit', __editReportId: String(editingRecord.id || '') }
        : { __draftMode: 'new', __editReportId: '' }),
    }
    const saved = await saveReportDraft(user?.id, draftPayload, reportTypeSlug)
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
    draftSeedRef.current = { ...form, setupConfirmed, ...overrides }
    setHasDraftSeed(true)
    lastSavedDraftSignatureRef.current = createDraftSignature(form)
    onDirtyChange(false)
    if (typeof onDraftSaved === 'function') onDraftSaved()
    return true
  }

  const clearForm = () => {
    const run = async () => {
      await clearReportDraft(user?.id, reportTypeSlug)
      if (typeof onDraftSaved === 'function') onDraftSaved()
      lastSavedDraftSignatureRef.current = null
      setForm(defaultDrillForm())
      setSetupConfirmed(false)
      setShowReset(false)
      pushToast('Form reset.', { title: 'Report reset', color: 'info' })
    }
    run()
  }

  const validateSetupBeforeContinue = () => {
    const result = validateDrillSetup(form)
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
    const result = validateDrillForm(form)
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

  const requestReview = () => {
    const nextRecord = buildDrillRecord({
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
    onRequestReview?.(record, '')
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
      {editingRecord && hasDraftSeed ? (
        <CAlert
          color="info"
          className="d-flex flex-wrap align-items-center justify-content-between gap-2"
        >
          <span>
            Editing <strong>{editingRecord.displayId}</strong>. Original data stays unchanged until
            you click <strong>Update Report</strong>.
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
          if (!validateBeforeSubmit()) return
          requestReview()
        }}
      >
        {!setupConfirmed ? (
          <DrillSetupStep
            form={form}
            setForm={setForm}
            setupFieldErrors={setupFieldErrors}
            setSetupFieldErrors={setSetupFieldErrors}
            datePresetOptions={datePresetOptions}
            timePresetOptions={timePresetOptions}
            onContinue={() => {
              if (!validateSetupBeforeContinue()) return
              setSetupConfirmed(true)
              void saveDraft({ silentSuccess: true, overrides: { setupConfirmed: true } })
            }}
          />
        ) : null}
        {setupConfirmed ? (
          <DrillFormStep
            form={form}
            fieldErrors={fieldErrors}
            setForm={setForm}
            setSetupConfirmed={setSetupConfirmed}
            addChronology={addChronology}
            updateChronology={updateChronology}
            removeChronology={removeChronology}
            onClear={() => setShowReset(true)}
            onSaveDraft={saveDraft}
            submitLabel={editingRecord ? 'Review & Update' : 'Review & Submit'}
          />
        ) : null}
      </form>
    </>
  )
}

export default DrillForm
