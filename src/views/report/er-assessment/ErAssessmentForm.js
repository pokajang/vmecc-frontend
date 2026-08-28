import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { Plus, Trash2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import ActionConfirmModal from 'src/components/ActionConfirmModal'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import WorkflowAttachmentField from 'src/components/report-workflow/WorkflowAttachmentField'
import WorkflowStageActions from 'src/components/report-workflow/WorkflowStageActions'
import WorkflowStatusChoice, {
  getWorkflowStatusTone,
} from 'src/components/report-workflow/WorkflowStatusChoice'
import WorkflowSummaryList from 'src/components/report-workflow/WorkflowSummaryList'
import { deleteReportMedia, uploadReportPhoto } from 'src/services/api/reportMediaApi'
import useReportIsMobile from 'src/hooks/useReportIsMobile'
import ReportPhotoSection from '../shared/emergency-report/ReportPhotoSection'
import { fetchErAssessmentTemplate } from '../reportApi'
import { loadReportDraftRow, saveReportDraft } from '../reportStorage'
import { resetReportViewport } from '../utils'
import {
  ER_ASSESSMENT_SCHEMA_VERSION,
  ER_ASSESSMENT_STEPS,
  ER_ASSESSMENT_TEMPLATE_VERSION,
  ER_ASSEMBLY_AREA_FIELD_SUFFIX,
  ER_FIELD_LABELS,
  ER_ASSESSMENT_TYPES,
  ER_RESPONSE_OPTIONS,
  ER_RESPONSE_FIELD_LABEL,
  getErAssessmentType,
  normalizeErAssessmentTemplate,
} from './constants'
import { buildErAssessmentRecord } from './recordFactory'
import {
  createEmptyErAssessmentForm,
  isErAssessmentDirty,
  normalizeErAssessmentForm,
  selectErAssessmentType,
  toSerializableErAssessmentForm,
} from './erAssessmentFormDomain'
import {
  firstErAssessmentError,
  validateErAssessmentForm,
  validateErAssessmentStep,
} from './validation'

const FieldError = ({ children }) =>
  children ? <div className="invalid-feedback d-block">{children}</div> : null

const ER_ASSESSMENT_STEP_KEYS = ER_ASSESSMENT_STEPS.map((step) => step.key)

const ErAssessmentForm = ({
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
  onRegisterMobileBackHandler,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const validSteps = ER_ASSESSMENT_STEP_KEYS
  const requestedStep = validSteps.includes(newSection) ? newSection : 'setup'
  const [form, setForm] = useState(createEmptyErAssessmentForm)
  const [activeStep, setActiveStep] = useState(requestedStep)
  const [errors, setErrors] = useState({})
  const [saveState, setSaveState] = useState('idle')
  const [message, setMessage] = useState('')
  const [lastSavedSignature, setLastSavedSignature] = useState('')
  const [assessmentTypes, setAssessmentTypes] = useState(ER_ASSESSMENT_TYPES)
  const [layoutUploadState, setLayoutUploadState] = useState('idle')
  const [showRemoveLayout, setShowRemoveLayout] = useState(false)
  const [hydrationState, setHydrationState] = useState('loading')
  const [hydrationMessage, setHydrationMessage] = useState('')
  const [hydrationAttempt, setHydrationAttempt] = useState(0)
  const [activeRequirementIndex, setActiveRequirementIndex] = useState(-1)
  const [activeRequirementDraft, setActiveRequirementDraft] = useState(null)
  const [activeRequirementDraftSignature, setActiveRequirementDraftSignature] = useState('')
  const [activeRequirementFocusField, setActiveRequirementFocusField] = useState('response')
  const [pendingRequirementCloseTarget, setPendingRequirementCloseTarget] = useState(null)
  const [showDiscardRequirementChanges, setShowDiscardRequirementChanges] = useState(false)
  const [requirementPhotoUploadActive, setRequirementPhotoUploadActive] = useState(false)
  const [pendingRequirementResponse, setPendingRequirementResponse] = useState('')
  const [showClearRequirementPhotos, setShowClearRequirementPhotos] = useState(false)
  const hydrationGenerationRef = useRef(0)
  const activeRequirementInitialMediaIdsRef = useRef([])
  const activeRequirementUploadedMediaIdsRef = useRef([])
  const seededAssessmentType = new URLSearchParams(location.search).get('type') || ''
  const initialContextRef = useRef({
    directSeed:
      reviewReturnRecord ||
      initialFormSeed ||
      (seededAssessmentType ? { assessmentType: seededAssessmentType } : null),
    fallbackSeed: editingDraftSeed || editingRecord || null,
    search: location.search || '',
    state: location.state,
    requestedStep,
  })
  const fileInputRef = useRef(null)
  const formRef = useRef(form)
  const saveLockRef = useRef(false)
  const draftIdRef = useRef('')
  const draftVersionRef = useRef(0)

  const type = getErAssessmentType(form.assessmentType, assessmentTypes)
  const stepIndex = validSteps.indexOf(activeStep)
  const isMobile = useReportIsMobile()
  const hasEscapeRouteId = (requirementId = '') =>
    String(requirementId).endsWith(ER_ASSEMBLY_AREA_FIELD_SUFFIX)
  const serializableSignature = JSON.stringify(
    toSerializableErAssessmentForm(form, assessmentTypes),
  )
  const dirty =
    hydrationState === 'ready' &&
    isErAssessmentDirty(form, assessmentTypes) &&
    serializableSignature !== lastSavedSignature

  const updateForm = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(formRef.current) : updater
    formRef.current = next
    setForm(next)
  }, [])
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])
  useEffect(() => resetReportViewport(), [activeStep])

  const requirementDraftSignature = useCallback((row) => {
    const safeRow = row || {}
    return JSON.stringify({
      response: String(safeRow.response || ''),
      remarks: String(safeRow.remarks || ''),
      assemblyArea: String(safeRow.assemblyArea || ''),
      photos: Array.isArray(safeRow.photos) ? safeRow.photos : [],
    })
  }, [])

  const clearRequirementDraftState = useCallback(() => {
    setActiveRequirementIndex(-1)
    setActiveRequirementDraft(null)
    setActiveRequirementDraftSignature('')
    setActiveRequirementFocusField('response')
    setPendingRequirementCloseTarget(null)
    setShowDiscardRequirementChanges(false)
    setRequirementPhotoUploadActive(false)
    setPendingRequirementResponse('')
    setShowClearRequirementPhotos(false)
    activeRequirementInitialMediaIdsRef.current = []
    activeRequirementUploadedMediaIdsRef.current = []
  }, [])

  const isActiveRequirementDraftDirty = Boolean(
    activeRequirementDraft &&
      activeRequirementDraftSignature !== requirementDraftSignature(activeRequirementDraft),
  )

  const focusRequirementSummary = useCallback((index) => {
    if (!Number.isInteger(index) || index < 0) return
    const summaryContent = document.querySelector(
      `[data-er-assessment-requirement-summary-index="${index}"]`,
    )
    const summary = summaryContent?.closest('summary') || summaryContent
    if (!summary || typeof summary.focus !== 'function') return
    summary.focus({ preventScroll: true })
  }, [])

  const openRequirementDraft = useCallback(
    (index, focusField = 'response', patch = {}) => {
      if (!Number.isInteger(index) || index < 0 || index >= form.responses.length) return
      const row = form.responses[index]
      if (!row) return
      activeRequirementInitialMediaIdsRef.current = Array.from(
        new Set(
          (Array.isArray(row.photos) ? row.photos : [])
            .map((photo) => String(photo?.mediaId || '').trim())
            .filter(Boolean),
        ),
      )
      activeRequirementUploadedMediaIdsRef.current = []
      const nextDraft = { ...row, photos: [...(row.photos || [])], ...(patch || {}) }
      setActiveRequirementIndex(index)
      setActiveRequirementDraft(nextDraft)
      setActiveRequirementDraftSignature(requirementDraftSignature(nextDraft))
      setActiveRequirementFocusField(focusField)
      setErrors((current) => ({
        ...current,
        [`response-${index}`]: undefined,
        [`remarks-${index}`]: undefined,
      }))
      setPendingRequirementCloseTarget(null)
    },
    [form.responses, requirementDraftSignature],
  )

  const applyRequirementClose = useCallback(() => {
    const next = pendingRequirementCloseTarget
    const fallbackFocusIndex = activeRequirementIndex
    clearRequirementDraftState()
    if (next && Number.isInteger(next.index)) {
      openRequirementDraft(next.index, next.focusField || 'response', next.patch || {})
      return
    }
    if (Number.isInteger(fallbackFocusIndex)) {
      focusRequirementSummary(fallbackFocusIndex)
    }
  }, [
    activeRequirementIndex,
    clearRequirementDraftState,
    focusRequirementSummary,
    openRequirementDraft,
    pendingRequirementCloseTarget,
  ])

  const requestRequirementCloseOrSwitch = useCallback(
    (nextIndex = null, focusField = 'response', patch = {}) => {
      const previousIndex = activeRequirementIndex
      if (isActiveRequirementDraftDirty) {
        setPendingRequirementCloseTarget({
          index: nextIndex,
          focusField,
          patch,
        })
        setShowDiscardRequirementChanges(true)
        return
      }
      clearRequirementDraftState()
      if (nextIndex === null) {
        focusRequirementSummary(previousIndex)
        return
      }
      openRequirementDraft(nextIndex, focusField, patch)
    },
    [
      activeRequirementIndex,
      clearRequirementDraftState,
      focusRequirementSummary,
      isActiveRequirementDraftDirty,
      openRequirementDraft,
    ],
  )

  const confirmRequirementDraftDiscard = useCallback(() => {
    const mediaIds = [...activeRequirementUploadedMediaIdsRef.current]
    if (mediaIds.length) {
      void Promise.all(mediaIds.map((mediaId) => deleteReportMedia(mediaId)))
    }
    setShowDiscardRequirementChanges(false)
    applyRequirementClose()
  }, [applyRequirementClose])

  useEffect(() => {
    if (activeRequirementIndex < 0 || !activeRequirementDraft) {
      return
    }
    const targetRootSelector = isMobile
      ? `.er-assessment-requirement__mobile-drawer [data-er-assessment-requirement-editor="${activeRequirementIndex}"]`
      : `[data-er-assessment-requirement-editor="${activeRequirementIndex}"]`
    const target = document.querySelector(targetRootSelector)
    if (!target) return
    const selector =
      activeRequirementFocusField === 'response'
        ? '[data-er-assessment-requirement-response-controls] button'
        : `textarea[data-er-assessment-requirement-remarks="${activeRequirementIndex}"]`
    window.setTimeout(() => {
      const control = target.querySelector(selector)
      control?.focus?.({ preventScroll: true })
    }, 60)
  }, [activeRequirementFocusField, activeRequirementIndex, activeRequirementDraft, isMobile])

  const navigateToStep = useCallback(
    (step, replace = false) => {
      const rawState = location.state || null
      const shouldCarrySeedState = step === 'setup'
      const nextState =
        !shouldCarrySeedState && rawState
          ? (() => {
              const { skipReportDraft, initialFormSeed, ...cleanState } = rawState
              return cleanState
            })()
          : rawState
      navigate(`${reportBasePath}/new/${step}${location.search || ''}`, {
        replace,
        state: nextState,
      })
      clearRequirementDraftState()
    },
    [clearRequirementDraftState, location.search, location.state, navigate, reportBasePath],
  )

  useEffect(() => {
    if (newSection === requestedStep) return
    navigateToStep(requestedStep, true)
  }, [navigateToStep, newSection, requestedStep])

  useEffect(() => {
    if (requestedStep !== activeStep) setActiveStep(requestedStep)
  }, [activeStep, requestedStep])

  useEffect(() => {
    if (activeStep !== 'requirements') clearRequirementDraftState()
  }, [activeStep, clearRequirementDraftState])

  useEffect(() => {
    if (activeRequirementIndex >= 0 && activeRequirementIndex >= form.responses.length) {
      clearRequirementDraftState()
    }
  }, [activeRequirementIndex, form.responses.length, clearRequirementDraftState])

  useEffect(() => {
    const generation = hydrationGenerationRef.current + 1
    hydrationGenerationRef.current = generation
    let cancelled = false
    setHydrationState('loading')
    setHydrationMessage('')

    const hydrate = async () => {
      const directSeed = initialContextRef.current.directSeed
      const isFreshSetupLaunch =
        /\/new\/setup\/?$/.test(location.pathname) && (skipDraftLoad || Boolean(directSeed))
      const authoritativeDirectSeed = reviewReturnRecord
      const templatePromise = fetchErAssessmentTemplate()
      const draftPromise =
        authoritativeDirectSeed || isFreshSetupLaunch || !user?.id
          ? Promise.resolve(null)
          : loadReportDraftRow(user.id, reportTypeSlug)
      const [templateResult, draftResult] = await Promise.allSettled([
        templatePromise,
        draftPromise,
      ])
      if (cancelled || hydrationGenerationRef.current !== generation) return

      if (draftResult.status === 'rejected') {
        setHydrationMessage(
          'Your saved assessment could not be restored. Retry before entering new information.',
        )
        setHydrationState('failed')
        return
      }

      const template = templateResult.status === 'fulfilled' ? templateResult.value : null
      const nextTypes = template ? normalizeErAssessmentTemplate(template) : ER_ASSESSMENT_TYPES
      const row = draftResult.value
      const source =
        authoritativeDirectSeed ||
        (isFreshSetupLaunch
          ? directSeed || initialContextRef.current.fallbackSeed
          : row?.payload || initialContextRef.current.fallbackSeed || directSeed) ||
        null
      const sourceSchemaVersion = source?.schemaVersion
      const sourceTemplateVersion = String(source?.templateVersion || '').trim()
      const incompatibleSchema =
        sourceSchemaVersion !== undefined &&
        sourceSchemaVersion !== null &&
        Number(sourceSchemaVersion) !== ER_ASSESSMENT_SCHEMA_VERSION
      const incompatibleTemplate =
        sourceTemplateVersion !== '' && sourceTemplateVersion !== ER_ASSESSMENT_TEMPLATE_VERSION
      if (incompatibleSchema || incompatibleTemplate) {
        setHydrationMessage(
          `This draft uses an unsupported ER Assessment template (${sourceTemplateVersion || `schema ${sourceSchemaVersion}`}). It was not changed. Contact an administrator to migrate it to ${ER_ASSESSMENT_TEMPLATE_VERSION}.`,
        )
        setHydrationState('blocked')
        return
      }

      const normalized = normalizeErAssessmentForm(
        source || createEmptyErAssessmentForm(),
        nextTypes,
      )
      const signature = JSON.stringify(toSerializableErAssessmentForm(normalized, nextTypes))
      setAssessmentTypes(nextTypes)
      setForm(normalized)
      formRef.current = normalized
      clearRequirementDraftState()
      draftIdRef.current = String(row?.draftId || '').trim()
      draftVersionRef.current = Number(row?.version || 0) || 0
      setLastSavedSignature(signature)
      setSaveState(row?.payload ? 'saved' : 'idle')
      setHydrationState('ready')

      const restoredStep = normalized.workflowStep || 'setup'
      if (row?.payload && restoredStep !== initialContextRef.current.requestedStep) {
        navigate(`${reportBasePath}/new/${restoredStep}${initialContextRef.current.search}`, {
          replace: true,
          state: initialContextRef.current.state,
        })
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [
    clearRequirementDraftState,
    hydrationAttempt,
    location.pathname,
    navigate,
    reportBasePath,
    reportTypeSlug,
    reviewReturnRecord,
    skipDraftLoad,
    user?.id,
  ])

  const setField = (field, value) => {
    updateForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage('')
  }

  const closeActiveRequirementEditor = useCallback(() => {
    requestRequirementCloseOrSwitch()
  }, [requestRequirementCloseOrSwitch])

  const updateRequirementDraft = useCallback(
    (patch = {}) => {
      if (!activeRequirementDraft || activeRequirementIndex < 0) return
      setActiveRequirementDraft((current) => {
        if (!current) return current
        const next = { ...current, ...(patch || {}) }
        setErrors((currentErrors) => {
          if (activeRequirementIndex < 0) return currentErrors
          return {
            ...currentErrors,
            [`response-${activeRequirementIndex}`]: undefined,
            [`remarks-${activeRequirementIndex}`]: undefined,
          }
        })
        return next
      })
    },
    [activeRequirementDraft, activeRequirementIndex],
  )

  const changeRequirementResponse = useCallback(
    (response) => {
      if (
        response !== 'No' &&
        activeRequirementDraft?.response === 'No' &&
        Array.isArray(activeRequirementDraft.photos) &&
        activeRequirementDraft.photos.length
      ) {
        setPendingRequirementResponse(response)
        setShowClearRequirementPhotos(true)
        return
      }
      updateRequirementDraft({ response })
    },
    [activeRequirementDraft, updateRequirementDraft],
  )

  const confirmClearRequirementPhotos = useCallback(() => {
    if (pendingRequirementResponse) {
      updateRequirementDraft({ response: pendingRequirementResponse, photos: [] })
    }
    setPendingRequirementResponse('')
    setShowClearRequirementPhotos(false)
  }, [pendingRequirementResponse, updateRequirementDraft])

  const updateRequirementPhotos = useCallback(
    (photos) => {
      const initialMediaIds = new Set(activeRequirementInitialMediaIdsRef.current)
      ;(Array.isArray(photos) ? photos : []).forEach((photo) => {
        const mediaId = String(photo?.mediaId || '').trim()
        if (
          mediaId &&
          !initialMediaIds.has(mediaId) &&
          !activeRequirementUploadedMediaIdsRef.current.includes(mediaId)
        ) {
          activeRequirementUploadedMediaIdsRef.current.push(mediaId)
        }
      })
      updateRequirementDraft({ photos: Array.isArray(photos) ? photos : [] })
    },
    [updateRequirementDraft],
  )

  const openRequirementFromValidationError = useCallback(
    (field = '') => {
      const raw = String(field || '')
      if (raw.startsWith('response-') || raw.startsWith('remarks-')) {
        const index = Number(raw.split('-').pop())
        if (Number.isInteger(index) && index >= 0) {
          if (activeRequirementIndex !== index) {
            requestRequirementCloseOrSwitch(
              index,
              raw.startsWith('response-') ? 'response' : 'remarks',
            )
          } else {
            setActiveRequirementFocusField(raw.startsWith('response-') ? 'response' : 'remarks')
          }
          return true
        }
      }
      return false
    },
    [activeRequirementIndex, requestRequirementCloseOrSwitch],
  )

  const focusField = (field) => {
    if (!field) return
    const target = document.querySelector(`[data-er-assessment-field="${field}"]`)
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => target?.querySelector('input, select, textarea, button')?.focus(), 80)
  }

  const saveDraft = useCallback(
    async ({ silentSuccess = false, step = activeStep } = {}) => {
      if (hydrationState !== 'ready') {
        setMessage('Wait for the saved assessment to finish restoring before continuing.')
        return false
      }
      if (saveLockRef.current) {
        setMessage('A draft save is still in progress. Wait for it to finish and retry.')
        return false
      }
      if (layoutUploadState === 'uploading') {
        setMessage('Wait for the rescue access layout upload to finish before continuing.')
        return false
      }
      saveLockRef.current = true
      setSaveState('saving')
      setMessage('')
      try {
        const snapshot = toSerializableErAssessmentForm(
          { ...formRef.current, workflowStep: step },
          assessmentTypes,
        )
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
        setLastSavedSignature(JSON.stringify(snapshot))
        const latestSignature = JSON.stringify(
          toSerializableErAssessmentForm(
            { ...formRef.current, workflowStep: step },
            assessmentTypes,
          ),
        )
        const changedDuringSave = latestSignature !== JSON.stringify(snapshot)
        setSaveState(changedDuringSave ? 'dirty' : 'saved')
        onDirtyChange?.(changedDuringSave)
        onDraftSaved?.()
        if (!silentSuccess) {
          pushToast?.('ER Assessment draft saved.', { title: 'Draft saved', color: 'success' })
        }
        if (changedDuringSave) {
          setMessage(
            'New changes were made while saving. Continue again to save the latest values.',
          )
          return false
        }
        return true
      } catch {
        setSaveState('failed')
        setMessage(
          'The draft could not be saved. Your changes remain in this form; use Retry save when ready.',
        )
        onDirtyChange?.(true)
        return false
      } finally {
        saveLockRef.current = false
      }
    },
    [
      activeStep,
      assessmentTypes,
      editingRecord,
      hydrationState,
      layoutUploadState,
      onDirtyChange,
      onDraftSaved,
      pushToast,
      reportTypeSlug,
      user?.id,
    ],
  )

  const saveActiveRequirementDraft = useCallback(async () => {
    if (!activeRequirementDraft || activeRequirementIndex < 0 || requirementPhotoUploadActive)
      return
    const nextIndex = activeRequirementIndex
    const snapshot = {
      ...activeRequirementDraft,
      photos: [...(activeRequirementDraft.photos || [])],
    }
    updateForm((current) => ({
      ...current,
      responses: current.responses.map((row, index) => (index === nextIndex ? snapshot : row)),
    }))
    const saved = await saveDraft({ silentSuccess: true, step: 'requirements' })
    if (!saved) return
    const retainedMediaIds = new Set(
      snapshot.photos.map((photo) => String(photo?.mediaId || '').trim()).filter(Boolean),
    )
    const abandonedMediaIds = activeRequirementUploadedMediaIdsRef.current.filter(
      (mediaId) => !retainedMediaIds.has(mediaId),
    )
    if (abandonedMediaIds.length) {
      void Promise.all(abandonedMediaIds.map((mediaId) => deleteReportMedia(mediaId)))
    }
    clearRequirementDraftState()
    focusRequirementSummary(nextIndex)
  }, [
    activeRequirementDraft,
    activeRequirementIndex,
    clearRequirementDraftState,
    focusRequirementSummary,
    requirementPhotoUploadActive,
    saveDraft,
    updateForm,
  ])

  const changeInlineRequirementResponse = useCallback(
    async (index, response) => {
      const current = formRef.current.responses[index]
      if (!current || current.response === response) return

      if (response === 'No') {
        requestRequirementCloseOrSwitch(index, 'remarks', { response })
        return
      }

      if (current.response === 'No' && Array.isArray(current.photos) && current.photos.length) {
        requestRequirementCloseOrSwitch(index, 'remarks')
        setPendingRequirementResponse(response)
        setShowClearRequirementPhotos(true)
        return
      }

      updateForm((formState) => ({
        ...formState,
        responses: formState.responses.map((row, rowIndex) =>
          rowIndex === index ? { ...row, response } : row,
        ),
      }))
      setErrors((currentErrors) => ({
        ...currentErrors,
        [`response-${index}`]: undefined,
        [`remarks-${index}`]: undefined,
      }))
      await saveDraft({ silentSuccess: true, step: 'requirements' })
    },
    [requestRequirementCloseOrSwitch, saveDraft, updateForm],
  )

  const goNext = async () => {
    const validation = validateErAssessmentStep(formRef.current, activeStep, assessmentTypes)
    setErrors(validation.errors)
    if (!validation.isValid) {
      const first = Object.keys(validation.errors)[0] || ''
      if (!openRequirementFromValidationError(first)) {
        focusField(first)
      }
      return
    }
    const next = validSteps[stepIndex + 1]
    if (!next) return
    setMessage('')
    const saved = await saveDraft({ silentSuccess: true, step: next })
    if (saved) navigateToStep(next)
  }

  const goBack = useCallback(async () => {
    const previous = validSteps[validSteps.indexOf(activeStep) - 1]
    if (!previous) return false
    const saved = await saveDraft({ silentSuccess: true, step: previous })
    if (saved) navigateToStep(previous)
    return saved
  }, [activeStep, navigateToStep, saveDraft, validSteps])

  const handleMobileBack = useCallback(() => {
    const previous = validSteps[validSteps.indexOf(activeStep) - 1]
    if (!previous) return false
    void goBack()
    return true
  }, [activeStep, goBack, validSteps])

  useEffect(() => {
    onRegisterMobileBackHandler?.(handleMobileBack)
    return () => onRegisterMobileBackHandler?.(null)
  }, [handleMobileBack, onRegisterMobileBackHandler])

  const requestReview = async () => {
    const validation = validateErAssessmentForm(formRef.current, assessmentTypes)
    setErrors(validation.errors)
    if (!validation.isValid) {
      const first = firstErAssessmentError(validation.errors)
      navigateToStep(first.stage)
      if (first.field && !openRequirementFromValidationError(first.field)) {
        window.setTimeout(() => {
          if (first.field) focusField(first.field)
        }, 100)
      }
      return
    }
    setMessage('')
    const saved = await saveDraft({ silentSuccess: true, step: 'signoff' })
    if (!saved) return
    const record = buildErAssessmentRecord({
      form: formRef.current,
      user,
      idPrefix: reportTypeIdPrefix,
      sequence: nextReportSequence,
      editingRecord,
      assessmentTypes,
    })
    onRequestReview?.(
      draftIdRef.current ? { ...record, sourceDraftId: draftIdRef.current } : record,
      'signoff',
    )
  }

  const readLayout = async (file) => {
    if (!file) return
    setLayoutUploadState('uploading')
    setErrors((current) => ({ ...current, rescueAccessLayout: undefined }))
    try {
      const uploaded = await uploadReportPhoto({
        file,
        module: 'er-assessment',
        source: 'upload',
        contextKey: `er-assessment:${user?.id || 'unknown'}`,
      })
      const previousMediaId = form.rescueAccessLayout?.mediaId
      setField('rescueAccessLayout', {
        ...uploaded,
        id: uploaded.mediaId,
        name: uploaded.fileName,
      })
      if (previousMediaId && previousMediaId !== uploaded.mediaId) {
        void deleteReportMedia(previousMediaId)
      }
      setLayoutUploadState('uploaded')
    } catch (error) {
      setLayoutUploadState('failed')
      setErrors((current) => ({
        ...current,
        rescueAccessLayout: error?.message || 'Unable to upload the rescue access layout.',
      }))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeLayout = () => {
    const mediaId = formRef.current.rescueAccessLayout?.mediaId
    setShowRemoveLayout(false)
    setField('rescueAccessLayout', null)
    setLayoutUploadState('idle')
    void deleteReportMedia(mediaId)
  }

  const commonActions = {
    isSaving: saveState === 'saving',
    feedback: message
      ? {
          kind: saveState === 'failed' ? 'error' : 'warning',
          message,
          ...(saveState === 'failed'
            ? { action: { label: 'Retry save', onAction: () => void saveDraft() } }
            : {}),
        }
      : null,
    saveDisabled: layoutUploadState === 'uploading' || requirementPhotoUploadActive,
    primaryDisabled: layoutUploadState === 'uploading' || requirementPhotoUploadActive,
    mobileLayout: 'stacked-primary-first',
    stackedMobileBehavior: 'compact-sticky',
    dockAtEnd: true,
  }

  const contextItems = [
    { label: ER_FIELD_LABELS.company, value: form.company },
    { label: ER_FIELD_LABELS.assessmentDate, value: form.assessmentDate },
    { label: ER_FIELD_LABELS.location, value: form.location },
    { label: ER_FIELD_LABELS.assessmentType, value: type?.label },
  ]

  if (hydrationState === 'loading') {
    return <div className="visually-hidden" data-testid="er-assessment-hydration-loading" />
  }

  if (hydrationState === 'failed') {
    return (
      <CAlert
        color="danger"
        className="d-grid gap-2 mb-0"
        data-testid="er-assessment-hydration-failed"
      >
        <div>{hydrationMessage}</div>
        <CButton
          type="button"
          color="danger"
          variant="outline"
          className="justify-self-start"
          onClick={() => setHydrationAttempt((value) => value + 1)}
        >
          Retry restore
        </CButton>
      </CAlert>
    )
  }

  if (hydrationState === 'blocked') {
    return (
      <CAlert color="warning" className="mb-0" data-testid="er-assessment-hydration-blocked">
        {hydrationMessage}
      </CAlert>
    )
  }

  return (
    <div className="er-assessment-form d-grid gap-3" data-testid="er-assessment-report-setup-ready">
      <ActionConfirmModal
        visible={showRemoveLayout}
        title="Remove rescue access layout"
        message="Remove this uploaded layout from the assessment?"
        confirmLabel="Remove"
        confirmColor="danger"
        onClose={() => setShowRemoveLayout(false)}
        onConfirm={removeLayout}
      />
      <ActionConfirmModal
        visible={showDiscardRequirementChanges}
        title="Discard requirement changes"
        message="Unsaved edits were made to this requirement. Discard and continue?"
        confirmLabel="Discard changes"
        confirmColor="danger"
        onClose={() => setShowDiscardRequirementChanges(false)}
        onConfirm={confirmRequirementDraftDiscard}
      />
      <ActionConfirmModal
        visible={showClearRequirementPhotos}
        title="Remove issue photos?"
        message="Changing this response removes the attached evidence from this requirement. The photos will no longer be included in this assessment."
        confirmLabel="Remove photos"
        confirmColor="danger"
        onClose={() => {
          setPendingRequirementResponse('')
          setShowClearRequirementPhotos(false)
        }}
        onConfirm={confirmClearRequirementPhotos}
      />
      {activeStep !== 'setup' ? (
        <WorkflowSummaryList
          title="Assessment context"
          titleClassName="vmecc-section-title"
          items={contextItems}
          variant="compact"
        />
      ) : null}

      {activeStep === 'setup' ? (
        <section className="er-assessment-setup d-grid gap-3" aria-labelledby="era-setup-title">
          <div>
            <h2 id="era-setup-title" className="h5 mb-1">
              Assessment details
            </h2>
          </div>
          <CRow className="g-3">
            <CCol xs={12} md={6} data-er-assessment-field="company">
              <CFormLabel htmlFor="era-company">{ER_FIELD_LABELS.company}</CFormLabel>
              <CFormInput
                id="era-company"
                value={form.company}
                invalid={Boolean(errors.company)}
                onChange={(e) => setField('company', e.target.value)}
              />
              <FieldError>{errors.company}</FieldError>
            </CCol>
            <CCol xs={12} md={6} data-er-assessment-field="assessmentDate">
              <CFormLabel htmlFor="era-date">{ER_FIELD_LABELS.assessmentDate}</CFormLabel>
              <CFormInput
                id="era-date"
                type="date"
                value={form.assessmentDate}
                invalid={Boolean(errors.assessmentDate)}
                onChange={(e) => setField('assessmentDate', e.target.value)}
              />
              <FieldError>{errors.assessmentDate}</FieldError>
            </CCol>
            <CCol xs={12} md={6} data-er-assessment-field="location">
              <CFormLabel htmlFor="era-location">{ER_FIELD_LABELS.location}</CFormLabel>
              <CFormInput
                id="era-location"
                value={form.location}
                invalid={Boolean(errors.location)}
                onChange={(e) => setField('location', e.target.value)}
              />
              <FieldError>{errors.location}</FieldError>
            </CCol>
            <CCol xs={12} md={6} data-er-assessment-field="assessmentType">
              <CFormLabel htmlFor="era-type">{ER_FIELD_LABELS.assessmentType}</CFormLabel>
              <CFormSelect
                id="era-type"
                value={form.assessmentType}
                invalid={Boolean(errors.assessmentType)}
                onChange={(e) => {
                  updateForm((current) =>
                    selectErAssessmentType(current, e.target.value, assessmentTypes),
                  )
                  setErrors({})
                }}
              >
                <option value="">Select work activity</option>
                {assessmentTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </CFormSelect>
              <FieldError>{errors.assessmentType}</FieldError>
            </CCol>
            <CCol xs={12} data-er-assessment-field="scopeOfWork">
              <CFormLabel htmlFor="era-scope">{ER_FIELD_LABELS.scopeOfWork}</CFormLabel>
              <CFormTextarea
                id="era-scope"
                rows={3}
                value={form.scopeOfWork}
                invalid={Boolean(errors.scopeOfWork)}
                placeholder="e.g., Installing cable trays at roof level using scaffold and MEWP"
                onChange={(e) => setField('scopeOfWork', e.target.value)}
              />
              <FieldError>{errors.scopeOfWork}</FieldError>
            </CCol>
          </CRow>
          {type ? (
            <CAlert color="warning" className="mb-0">
              <strong>Credible worst-case scenario:</strong> {type.worstCase}
            </CAlert>
          ) : null}
        </section>
      ) : null}

      {activeStep === 'requirements' ? (
        <section className="d-grid gap-3" aria-labelledby="era-requirements-title">
          <div>
            <h2 id="era-requirements-title" className="vmecc-section-title mb-0">
              Emergency response readiness
            </h2>
          </div>
          <div className="er-assessment-requirement-list d-grid gap-2">
            {form.responses.map((row, index) => {
              const isActiveDraft = activeRequirementIndex === index && activeRequirementDraft
              const draft = isActiveDraft ? activeRequirementDraft : row
              const response = String(draft.response || '')
              const notesSummary = String(draft.remarks || '').trim()
              const escapeRouteSummary =
                hasEscapeRouteId(row?.requirementId) && String(draft.assemblyArea || '').trim()
              const isNo = response === 'No'
              const requiredRemarks = isNo
              const rowHasError =
                Boolean(errors[`response-${index}`]) || Boolean(errors[`remarks-${index}`])

              return (
                <CCard
                  key={row.requirement}
                  className={`er-assessment-requirement er-assessment-requirement--compact ${
                    rowHasError ? 'er-assessment-requirement--error' : ''
                  }`}
                  role="group"
                  aria-label={`Requirement ${index + 1}: ${row.requirement}`}
                >
                  <CCardBody className="er-assessment-requirement__body d-grid gap-2">
                    <div
                      className="er-assessment-requirement-summary"
                      data-er-assessment-requirement-summary-index={index}
                      tabIndex={-1}
                    >
                      <div className="er-assessment-requirement-summary__header">
                        <span className="er-assessment-requirement__number">{index + 1}</span>
                        <div className="er-assessment-requirement-summary__title">
                          {row.requirement}
                        </div>
                      </div>
                      <div className="er-assessment-requirement-summary__content d-grid gap-2">
                        <div className="er-assessment-requirement-summary__response">
                          <WorkflowStatusChoice
                            ariaLabel={`Requirement ${index + 1} response`}
                            value={response}
                            options={ER_RESPONSE_OPTIONS}
                            invalid={Boolean(errors[`response-${index}`])}
                            onChange={(nextResponse) =>
                              void changeInlineRequirementResponse(index, nextResponse)
                            }
                          />
                        </div>
                        <div className="er-assessment-requirement-summary__meta">
                          <CButton
                            type="button"
                            color="link"
                            className="er-assessment-requirement-summary__remarks-action"
                            aria-label={`Add optional remarks for requirement ${index + 1}`}
                            onClick={() => requestRequirementCloseOrSwitch(index, 'remarks')}
                          >
                            + Remarks (optional)
                          </CButton>
                          {rowHasError ? (
                            <span className="text-danger small">Needs review</span>
                          ) : null}
                        </div>
                        {notesSummary ? (
                          <div className="small text-body-secondary er-assessment-requirement-summary__note">
                            {notesSummary}
                          </div>
                        ) : null}
                        {escapeRouteSummary ? (
                          <div className="small text-body-secondary er-assessment-requirement-summary__note">
                            AA: {escapeRouteSummary}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <FieldError>{errors[`response-${index}`]}</FieldError>
                    {!isMobile && isActiveDraft ? (
                      <div
                        className="er-assessment-requirement-editor d-grid gap-3"
                        data-er-assessment-requirement-editor={index}
                        data-er-assessment-field={`response-${index}`}
                      >
                        <div data-er-assessment-field={`remarks-${index}`}>
                          <CFormLabel htmlFor={`era-remarks-${index}`}>
                            {requiredRemarks ? ER_RESPONSE_FIELD_LABEL : 'Remarks'}{' '}
                            {requiredRemarks ? '(required)' : '(optional)'}
                          </CFormLabel>
                          <CFormTextarea
                            id={`era-remarks-${index}`}
                            rows={3}
                            value={draft.remarks}
                            placeholder={
                              row.requirement === 'Escape Routes to AA'
                                ? 'Add any route notes.'
                                : ''
                            }
                            invalid={Boolean(errors[`remarks-${index}`])}
                            data-er-assessment-requirement-remarks={index}
                            onChange={(e) => updateRequirementDraft({ remarks: e.target.value })}
                          />
                          <FieldError>{errors[`remarks-${index}`]}</FieldError>
                        </div>
                        {hasEscapeRouteId(row.requirementId) ? (
                          <div data-er-assessment-field={`assemblyArea-${index}`}>
                            <CFormLabel htmlFor={`era-assembly-area-${index}`}>
                              {ER_FIELD_LABELS.assemblyArea}
                            </CFormLabel>
                            <CFormInput
                              id={`era-assembly-area-${index}`}
                              placeholder="e.g., North Muster Point beside Gate 2"
                              value={draft.assemblyArea}
                              onChange={(e) =>
                                updateRequirementDraft({ assemblyArea: e.target.value })
                              }
                            />
                          </div>
                        ) : null}
                        {draft.response === 'No' ? (
                          <ReportPhotoSection
                            moduleKey="er-assessment"
                            title="Supporting evidence"
                            showHeading={false}
                            emptyMessage="No supporting photos added."
                            captureLabel="Take photo"
                            uploadLabel="Upload photo"
                            photos={draft.photos || []}
                            contextKey={`er-assessment:${user?.id || 'unknown'}:${draftIdRef.current || 'new'}:${draft.requirementId}`}
                            deleteRemovedMedia={false}
                            onChange={updateRequirementPhotos}
                            onProcessingChange={setRequirementPhotoUploadActive}
                            pushToast={pushToast}
                          />
                        ) : null}
                        <div className="er-assessment-requirement-editor__actions d-flex gap-2 justify-content-end">
                          <CButton
                            type="button"
                            color="light"
                            variant="outline"
                            onClick={() => requestRequirementCloseOrSwitch(null)}
                          >
                            Cancel
                          </CButton>
                          <CButton
                            type="button"
                            color="primary"
                            disabled={requirementPhotoUploadActive}
                            onClick={() => void saveActiveRequirementDraft()}
                          >
                            Save
                          </CButton>
                        </div>
                      </div>
                    ) : null}
                  </CCardBody>
                </CCard>
              )
            })}
          </div>
          <MobileBottomDrawer
            visible={Boolean(isMobile && activeRequirementDraft)}
            title={activeRequirementDraft?.response === 'No' ? 'Add issue details' : 'Add remarks'}
            onClose={closeActiveRequirementEditor}
            className="er-assessment-requirement__mobile-drawer"
            bodyClassName="d-grid gap-3"
          >
            {activeRequirementIndex >= 0 && activeRequirementDraft ? (
              <>
                <div
                  className="er-assessment-requirement-editor d-grid gap-3"
                  data-er-assessment-requirement-editor={activeRequirementIndex}
                  data-er-assessment-field={`response-${activeRequirementIndex}`}
                >
                  <div data-er-assessment-field={`remarks-${activeRequirementIndex}`}>
                    <CFormLabel htmlFor={`era-mobile-remarks-${activeRequirementIndex}`}>
                      {activeRequirementDraft.response === 'No'
                        ? ER_RESPONSE_FIELD_LABEL
                        : 'Remarks'}{' '}
                      {activeRequirementDraft.response === 'No' ? '(required)' : '(optional)'}
                    </CFormLabel>
                    <CFormTextarea
                      id={`era-mobile-remarks-${activeRequirementIndex}`}
                      rows={4}
                      value={activeRequirementDraft.remarks}
                      placeholder={
                        form.responses[activeRequirementIndex]?.requirement ===
                        'Escape Routes to AA'
                          ? 'Add any route notes.'
                          : ''
                      }
                      invalid={Boolean(errors[`remarks-${activeRequirementIndex}`])}
                      data-er-assessment-requirement-remarks={activeRequirementIndex}
                      onChange={(e) => updateRequirementDraft({ remarks: e.target.value })}
                    />
                    <FieldError>{errors[`remarks-${activeRequirementIndex}`]}</FieldError>
                  </div>
                  {form.responses[activeRequirementIndex]?.requirementId?.endsWith(
                    ER_ASSEMBLY_AREA_FIELD_SUFFIX,
                  ) ? (
                    <div data-er-assessment-field={`assemblyArea-${activeRequirementIndex}`}>
                      <CFormLabel htmlFor={`era-mobile-assembly-area-${activeRequirementIndex}`}>
                        {ER_FIELD_LABELS.assemblyArea}
                      </CFormLabel>
                      <CFormInput
                        id={`era-mobile-assembly-area-${activeRequirementIndex}`}
                        placeholder="e.g., North Muster Point beside Gate 2"
                        value={activeRequirementDraft.assemblyArea}
                        onChange={(e) => updateRequirementDraft({ assemblyArea: e.target.value })}
                      />
                    </div>
                  ) : null}
                  {activeRequirementDraft.response === 'No' ? (
                    <ReportPhotoSection
                      moduleKey="er-assessment"
                      title="Supporting evidence"
                      showHeading={false}
                      emptyMessage="No supporting photos added."
                      captureLabel="Take photo"
                      uploadLabel="Upload photo"
                      photos={activeRequirementDraft.photos || []}
                      contextKey={`er-assessment:${user?.id || 'unknown'}:${draftIdRef.current || 'new'}:${activeRequirementDraft.requirementId}`}
                      deleteRemovedMedia={false}
                      onChange={updateRequirementPhotos}
                      onProcessingChange={setRequirementPhotoUploadActive}
                      pushToast={pushToast}
                    />
                  ) : null}
                  <div className="er-assessment-requirement-editor__actions d-flex gap-2 justify-content-end">
                    <CButton
                      type="button"
                      color="light"
                      variant="outline"
                      onClick={closeActiveRequirementEditor}
                    >
                      Cancel
                    </CButton>
                    <CButton
                      type="button"
                      color="primary"
                      disabled={requirementPhotoUploadActive}
                      onClick={() => void saveActiveRequirementDraft()}
                    >
                      Save
                    </CButton>
                  </div>
                </div>
              </>
            ) : null}
          </MobileBottomDrawer>
        </section>
      ) : null}

      {activeStep === 'rescue' ? (
        <CCard className="er-assessment-section">
          <CCardBody className="d-grid gap-4">
            <div>
              <h3 className="h5 mb-1">Rescue planning</h3>
              <p className="text-body-secondary mb-0">
                Describe the response and attach a clear rescue-access layout.
              </p>
            </div>
            <div data-er-assessment-field="rescuePlan">
              <CFormLabel htmlFor="era-rescue-plan">Rescue plan</CFormLabel>
              <CFormTextarea
                id="era-rescue-plan"
                rows={6}
                value={form.rescuePlan}
                invalid={Boolean(errors.rescuePlan)}
                onChange={(e) => setField('rescuePlan', e.target.value)}
                placeholder="Describe alarm, rescue method, casualty handling, communication, evacuation, and medical support."
              />
              <FieldError>{errors.rescuePlan}</FieldError>
            </div>
            <div data-er-assessment-field="rescueAccessLayout">
              <WorkflowAttachmentField
                id="era-rescue-access-layout"
                label="Rescue access layout"
                required
                accept="image/*"
                disabled={layoutUploadState === 'uploading'}
                inputRef={fileInputRef}
                onFileSelect={(file) => void readLayout(file)}
                hasAttachment={Boolean(form.rescueAccessLayout?.url)}
                addLabel="Attach or capture layout"
                replaceLabel="Replace layout"
                removeLabel="Remove layout"
                onRemove={() => setShowRemoveLayout(true)}
                error={errors.rescueAccessLayout}
                guidance="Use a clear drawing or site image showing access and the casualty route."
                statusLabel={form.rescueAccessLayout?.url ? 'Attached' : ''}
                statusDetail={
                  form.rescueAccessLayout?.url ? 'Rescue access layout ready for review.' : ''
                }
                statusTone={form.rescueAccessLayout?.url ? 'success' : 'muted'}
              />
              {form.rescueAccessLayout?.url ? (
                <div className="er-assessment-layout-preview">
                  <img src={form.rescueAccessLayout.url} alt="Rescue access layout preview" />
                </div>
              ) : null}
            </div>
          </CCardBody>
        </CCard>
      ) : null}

      {activeStep === 'equipment' ? (
        <CCard className="er-assessment-section">
          <CCardBody className="d-grid gap-3">
            <div>
              <h3 className="h5 mb-1">Rescue equipment</h3>
              <p className="text-body-secondary mb-0">
                List the equipment available at the worksite (maximum 10 items).
              </p>
            </div>
            <div className="d-grid gap-2" data-er-assessment-field="rescueEquipment">
              {form.rescueEquipment.map((item, index) => (
                <div key={index} className="d-flex gap-2 align-items-center">
                  <CFormInput
                    aria-label={`Rescue equipment item ${index + 1}`}
                    value={item}
                    onChange={(e) => {
                      const value = e.target.value
                      updateForm((current) => ({
                        ...current,
                        rescueEquipment: current.rescueEquipment.map((row, rowIndex) =>
                          rowIndex === index ? value : row,
                        ),
                      }))
                      setErrors((current) => ({ ...current, rescueEquipment: undefined }))
                    }}
                    placeholder={`Equipment item ${index + 1}`}
                  />
                  <CButton
                    type="button"
                    color="danger"
                    variant="ghost"
                    aria-label={`Remove equipment item ${index + 1}`}
                    disabled={form.rescueEquipment.length === 1}
                    onClick={() =>
                      updateForm((current) => ({
                        ...current,
                        rescueEquipment: current.rescueEquipment.filter(
                          (_, rowIndex) => rowIndex !== index,
                        ),
                      }))
                    }
                  >
                    <Trash2 size={18} />
                  </CButton>
                </div>
              ))}
            </div>
            <FieldError>{errors.rescueEquipment}</FieldError>
            {form.rescueEquipment.length < 10 ? (
              <CButton
                type="button"
                color="secondary"
                variant="outline"
                className="align-self-start"
                onClick={() =>
                  updateForm((current) => ({
                    ...current,
                    rescueEquipment: [...current.rescueEquipment, ''],
                  }))
                }
              >
                <Plus size={16} className="me-1" />
                Add equipment
              </CButton>
            ) : null}
          </CCardBody>
        </CCard>
      ) : null}

      {activeStep === 'signoff' ? (
        <section className="d-grid gap-3">
          <div>
            <h3 className="h5 mb-1">Assessment sign-off</h3>
            <p className="text-body-secondary mb-0">
              Both parties confirm the emergency response arrangements are accurately recorded.
            </p>
          </div>
          <CRow className="g-3">
            {[
              ['inspectedBy', 'Inspected by'],
              ['jobLeader', 'Job Leader'],
            ].map(([key, label]) => (
              <CCol xs={12} lg={6} key={key}>
                <CCard className="h-100 er-assessment-signoff">
                  <CCardBody className="d-grid gap-3">
                    <h4 className="h6 mb-0">{label}</h4>
                    {['name', 'company', 'signature'].map((field) => {
                      const fieldKey = `${key}.${field}`
                      return (
                        <div key={field} data-er-assessment-field={fieldKey}>
                          <CFormLabel htmlFor={`era-${key}-${field}`}>
                            {field === 'signature'
                              ? 'Signature / signed name'
                              : field[0].toUpperCase() + field.slice(1)}
                          </CFormLabel>
                          <CFormInput
                            id={`era-${key}-${field}`}
                            value={form[key][field]}
                            invalid={Boolean(errors[fieldKey])}
                            onChange={(e) => {
                              const value = e.target.value
                              updateForm((current) => ({
                                ...current,
                                [key]: { ...current[key], [field]: value },
                              }))
                              setErrors((current) => ({ ...current, [fieldKey]: undefined }))
                            }}
                          />
                          <FieldError>{errors[fieldKey]}</FieldError>
                        </div>
                      )
                    })}
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
          </CRow>
        </section>
      ) : null}

      <WorkflowStageActions
        {...commonActions}
        className="er-assessment-stage-actions"
        mobileBehavior="compact-sticky"
        onPrimary={() => void (activeStep === 'signoff' ? requestReview() : goNext())}
        primaryLabel={activeStep === 'signoff' ? 'Review Assessment' : 'Continue'}
        primaryTestId={activeStep === 'signoff' ? 'er-assessment-review-action' : undefined}
        ariaLabel="ER Assessment stage actions"
      />
    </div>
  )
}

export default ErAssessmentForm
