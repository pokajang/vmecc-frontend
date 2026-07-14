import React, { useEffect, useRef, useState } from 'react'
import { CButton, CCard, CFormLabel, CFormTextarea } from '@coreui/react'
import { Sparkles } from 'lucide-react'
import FormActionGroup from 'src/components/FormActionGroup'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import RowActions from 'src/components/RowActions'
import useMediaQuery from 'src/hooks/useMediaQuery'
import { safeAiHelperError } from 'src/components/ai-helper/constants'
import { streamAiHelperMessage } from 'src/services/api/aiHelperApi'
import {
  createInspectionIssue,
  normalizeInspectionIssueDrafts,
} from 'src/views/inspection/types/inspectionIssues'
import {
  buildInspectionFindingAiContext,
  buildInspectionFindingFieldTranslatePrompt,
  parseTranslatedFindingField,
} from '../inspectionFindingAiAssist'
import { getInspectionReviewReadiness } from '../inspectionReviewReadiness'
import { buildInspectionValidationStatusMessage } from '../inspectionValidationFeedback'
import {
  getFireExtinguisherRowValidation,
  isFireExtinguisherSessionCompletedRow,
} from '../../types/fire-extinguisher/helpers'
import { neutralizeCompletionPresentation } from '../../types/continuationHelpers'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../inspectionReportEvidenceCopy'
import {
  CONTINUATION_SCAN_LABEL,
  PARTIAL_STATE_PROMPTS,
  getContinuationLabel,
} from '../../inspectionFormUiTokens'
import { FormFieldError, InspectionGeneralEvidenceCard } from './InspectionFormDisplaySections'
import InspectionLocationOptionPicker from './InspectionLocationOptionPicker'

const AI_BUTTON_STYLE = {
  backgroundColor: 'rgba(0, 126, 122, 0.14)',
  borderColor: 'rgba(0, 126, 122, 0.32)',
  color: 'rgba(0, 126, 122, 0.95)',
}

const REVIEW_ACTION_LABEL = 'Continue to Review'
const REVIEW_UPDATE_ACTION_LABEL = 'Continue to Review Updates'

const AI_TRANSLATE_FIELDS = ['description', 'actionRequired']

const createAiFieldState = () => ({
  stage: 'idle',
  suggestion: '',
  error: '',
})

const createAiFieldStates = () =>
  AI_TRANSLATE_FIELDS.reduce(
    (states, field) => ({
      ...states,
      [field]: createAiFieldState(),
    }),
    {},
  )

const isFireExtinguisherLocationComplete = (summary = null) => {
  const visibleChecks = Array.isArray(summary?.visibleChecks) ? summary.visibleChecks : []
  if (visibleChecks.length === 0) return false

  if (
    Number(summary?.totalCount || 0) > 0 &&
    Number(summary?.completedCount || 0) >= Number(summary?.totalCount || 0)
  ) {
    return true
  }

  return visibleChecks.every(
    (row) =>
      isFireExtinguisherSessionCompletedRow(row) ||
      getFireExtinguisherRowValidation(row).isComplete,
  )
}

const normalizeContinuationLocationKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const getContinuationOptionValue = (option = {}) =>
  String(option?.value || option?.title || '').trim()

const toContinuationLabel = (value = 'location') =>
  String(value || 'location')
    .trim()
    .toLowerCase()

const toTitleLabel = (value = 'location') =>
  toContinuationLabel(value).replace(/\b\w/g, (character) => character.toUpperCase())

const isCompletedContinuationOption = (option = {}) => option?.progress?.isDone === true

const getRecommendedContinuationOptions = (options = [], currentLocation = '', limit = 2) => {
  const normalizedOptions = (Array.isArray(options) ? options : []).filter((option) =>
    getContinuationOptionValue(option),
  )
  const currentKey = normalizeContinuationLocationKey(currentLocation)
  const currentIndex = normalizedOptions.findIndex(
    (option) => normalizeContinuationLocationKey(getContinuationOptionValue(option)) === currentKey,
  )
  const orderedOptions =
    currentIndex >= 0
      ? normalizedOptions.slice(currentIndex + 1).concat(normalizedOptions.slice(0, currentIndex))
      : normalizedOptions
  const seen = new Set()

  return orderedOptions
    .filter((option) => {
      const optionKey = normalizeContinuationLocationKey(getContinuationOptionValue(option))
      if (!optionKey || optionKey === currentKey || seen.has(optionKey)) return false
      seen.add(optionKey)
      return !isCompletedContinuationOption(option)
    })
    .slice(0, limit)
}

const getIncompleteContinuationOptionCount = (options = [], currentLocation = '') => {
  const currentKey = normalizeContinuationLocationKey(currentLocation)
  const seen = new Set()

  return (Array.isArray(options) ? options : []).filter((option) => {
    const optionKey = normalizeContinuationLocationKey(getContinuationOptionValue(option))
    if (!optionKey || optionKey === currentKey || seen.has(optionKey)) return false
    seen.add(optionKey)
    return !isCompletedContinuationOption(option)
  }).length
}

const InspectionInlineActionGroup = ({ children, className = '', statusMessage = '' }) => (
  <div
    className={`inspection-form-inline-actions inspection-form-inline-actions--left d-grid gap-2 ${className}`.trim()}
  >
    <div
      className="inspection-form-inline-actions-row d-flex flex-wrap justify-content-start gap-2"
      role="group"
      aria-label="Form actions"
    >
      {children}
    </div>
    {statusMessage ? (
      <div
        className="inspection-form-inline-actions-row-status text-body-secondary"
        title={statusMessage}
      >
        {statusMessage}
      </div>
    ) : null}
    <div className="inspection-form-inline-actions-spacer d-md-none" />
  </div>
)

const InspectionFormActions = ({
  alignLeft = false,
  className = '',
  draftStatus,
  draftSyncState,
  readiness = null,
  leadingAction = null,
  isMobileSticky = false,
  isUpdateMode = false,
  onRequestReview,
  onRetryDraftSync,
  sectionLabel = '',
  submissionMode = 'review',
  validationStatusMessage,
  wrapperClassName = '',
}) => {
  const syncStatus = String(draftSyncState?.status || '').trim()
  const syncFailed = syncStatus === 'failed'
  const reviewLabel =
    submissionMode === 'direct'
      ? isUpdateMode
        ? 'Update Report'
        : 'Submit Report'
      : isUpdateMode
        ? REVIEW_UPDATE_ACTION_LABEL
        : REVIEW_ACTION_LABEL
  const statusClassName = `inspection-draft-status small ${
    validationStatusMessage ? 'text-warning-emphasis' : 'text-body-secondary'
  } ${alignLeft ? '' : 'me-sm-auto'} align-self-sm-center`.trim()
  if (isMobileSticky) {
    const mobileActionButtons = (
      <>
        {leadingAction}
        {syncFailed ? (
          <CButton
            color="warning"
            variant="outline"
            className="inspection-form-sticky-draft-btn"
            onClick={() => onRetryDraftSync?.()}
          >
            Retry Sync
          </CButton>
        ) : null}
        <CButton
          color="primary"
          className="inspection-form-sticky-review-btn"
          disabled={readiness?.isReadyToReview === false}
          title={readiness?.blockers?.[0]?.message || undefined}
          onClick={onRequestReview}
        >
          {reviewLabel}
        </CButton>
      </>
    )

    return (
      <div className={`d-grid gap-2 ${wrapperClassName}`.trim()}>
        {sectionLabel ? (
          <div className="small fw-semibold text-body-secondary">{sectionLabel}</div>
        ) : null}
        {alignLeft ? (
          <InspectionInlineActionGroup
            className={className}
            statusMessage={validationStatusMessage}
          >
            {mobileActionButtons}
          </InspectionInlineActionGroup>
        ) : (
          <FormActionGroup
            actionsAlign="end"
            className={className}
            mobileVariant="compact-sticky"
            spacerClassName="inspection-form-inline-actions-spacer d-md-none"
            statusMessage={validationStatusMessage}
          >
            {mobileActionButtons}
          </FormActionGroup>
        )}
      </div>
    )
  }

  return (
    <div className={`d-grid gap-2 ${wrapperClassName}`.trim()}>
      {sectionLabel ? (
        <div className="small fw-semibold text-body-secondary">{sectionLabel}</div>
      ) : null}
      <div
        className={[
          'inspection-form-actions',
          alignLeft ? 'inspection-form-actions--left' : '',
          'd-flex flex-column flex-sm-row',
          alignLeft ? 'justify-content-start' : 'justify-content-end',
          'gap-2',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {validationStatusMessage ? (
          <div className={statusClassName} role="alert">
            {validationStatusMessage}
          </div>
        ) : draftStatus ? (
          <div className={statusClassName} aria-live="polite">
            {draftStatus}
          </div>
        ) : null}
        {leadingAction}
        {syncFailed ? (
          <CButton color="warning" variant="outline" onClick={() => onRetryDraftSync?.()}>
            Retry Sync
          </CButton>
        ) : null}
        <CButton
          color="primary"
          disabled={readiness?.isReadyToReview === false}
          title={readiness?.blockers?.[0]?.message || undefined}
          onClick={onRequestReview}
        >
          {reviewLabel}
        </CButton>
      </div>
    </div>
  )
}

const InspectionNextLocationCard = ({ continueAction = null, onContinueToLocation }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isOpeningDrawer, setIsOpeningDrawer] = useState(false)
  const continueOptions = Array.isArray(continueAction?.options) ? continueAction.options : []
  const currentLocation = String(continueAction?.currentValue || continueAction?.value || '').trim()
  const label = toContinuationLabel(continueAction?.label || 'location')
  const labelTitle = toTitleLabel(label)
  const continuationLabel = getContinuationLabel(label)
  const continuationSuffix = continuationLabel
    .replace(/^next\s+/i, '')
    .replace(/^Next\s+/i, '')
    .trim()
  const parentLabel = String(
    continueAction?.parentLabel || continueAction?.mainLocation || '',
  ).trim()
  const recommendedOptions = getRecommendedContinuationOptions(continueOptions, currentLocation, 6)
  const incompleteOptionCount = getIncompleteContinuationOptionCount(
    continueOptions,
    currentLocation,
  )
  const canContinue =
    continueOptions.length > 1 &&
    recommendedOptions.length > 0 &&
    typeof onContinueToLocation === 'function'
  const showMore = incompleteOptionCount > recommendedOptions.length

  if (!canContinue) return null

  const openDrawer = async () => {
    if (isOpeningDrawer) return
    setIsOpeningDrawer(true)
    try {
      await continueAction?.onBeforeOpen?.()
    } finally {
      setIsOpeningDrawer(false)
      setDrawerOpen(true)
    }
  }

  const selectLocation = (_value, option) => {
    const nextValue = String(option?.value || _value || '').trim()
    if (!nextValue || nextValue.toLowerCase() === currentLocation.toLowerCase()) {
      setDrawerOpen(false)
      return
    }
    onContinueToLocation(option || nextValue)
    setDrawerOpen(false)
  }

  return (
    <div className="inspection-next-location-card rounded-3 border bg-light-subtle p-3 d-grid gap-2">
      <div className="small fw-semibold text-body-secondary">Next {continuationSuffix}</div>
      <div className="inspection-next-location-options d-flex flex-wrap gap-2">
        {recommendedOptions.map((option) => {
          const value = getContinuationOptionValue(option)
          const title = String(option?.title || value).trim()

          return (
            <CButton
              key={value}
              type="button"
              color="primary"
              variant="outline"
              className="inspection-next-location-btn"
              onClick={() => onContinueToLocation(option)}
            >
              {title}
            </CButton>
          )
        })}
        {showMore ? (
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            className="inspection-next-location-btn"
            disabled={isOpeningDrawer}
            onClick={openDrawer}
          >
            More
          </CButton>
        ) : null}
      </div>
      <MobileBottomDrawer
        visible={drawerOpen}
        title={parentLabel ? `Continue in ${parentLabel}` : `Continue to ${label}`}
        bodyClassName="inspection-equipment-detail-drawer-shell"
        onClose={() => setDrawerOpen(false)}
      >
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid gap-3">
          <InspectionLocationOptionPicker
            options={continueOptions}
            visibleOptions={continueOptions}
            value={currentLocation}
            onChange={selectLocation}
            sectionLabel={labelTitle}
            searchPlaceholder={`Search ${label}...`}
            searchAriaLabel={`Search continuation ${label}`}
            clearSearchAriaLabel={`Clear continuation ${label} search`}
            emptySearchMessage={`No ${label}s match this search.`}
            showAllOptions
            showDescription={false}
            columns={{ xs: 12, md: 6 }}
            testIdPrefix="inspection-continue-location"
          />
        </div>
      </MobileBottomDrawer>
    </div>
  )
}

const InspectionFormDraftOnlyActions = ({
  alignLeft = false,
  className = '',
  disabledReviewMessage = '',
  draftStatus,
  draftSyncState,
  getLatestForm,
  leadingAction = null,
  isMobileSticky = false,
  isUpdateMode = false,
  onRetryDraftSync,
  onSaveDraft,
  sectionLabel = '',
  statusMessage = '',
  wrapperClassName = '',
}) => {
  const syncFailed = String(draftSyncState?.status || '').trim() === 'failed'
  const saveLabel = isUpdateMode ? 'Save Update Draft' : 'Save Draft'
  const reviewLabel = isUpdateMode ? REVIEW_UPDATE_ACTION_LABEL : REVIEW_ACTION_LABEL
  const showDisabledReview = Boolean(disabledReviewMessage)
  const statusClassName = `inspection-draft-status small text-body-secondary ${
    alignLeft ? '' : 'me-sm-auto'
  } align-self-sm-center`.trim()
  if (isMobileSticky) {
    const mobileActionButtons = (
      <>
        {leadingAction}
        <CButton
          color="secondary"
          variant="outline"
          className="inspection-form-sticky-draft-btn"
          onClick={() => onSaveDraft?.(getLatestForm())}
        >
          {saveLabel}
        </CButton>
        {showDisabledReview ? (
          <CButton
            color="primary"
            className="inspection-form-sticky-review-btn"
            disabled
            title={disabledReviewMessage}
          >
            {reviewLabel}
          </CButton>
        ) : null}
        {syncFailed ? (
          <CButton
            color="warning"
            variant="outline"
            className="inspection-form-sticky-draft-btn"
            onClick={() => onRetryDraftSync?.()}
          >
            Retry Sync
          </CButton>
        ) : null}
      </>
    )

    return (
      <div className={`d-grid gap-2 ${wrapperClassName}`.trim()}>
        {sectionLabel ? (
          <div className="small fw-semibold text-body-secondary">{sectionLabel}</div>
        ) : null}
        {alignLeft ? (
          <InspectionInlineActionGroup
            className={className}
            statusMessage={disabledReviewMessage || statusMessage}
          >
            {mobileActionButtons}
          </InspectionInlineActionGroup>
        ) : (
          <FormActionGroup
            actionsAlign="end"
            className={className}
            mobileVariant="compact-sticky"
            spacerClassName="inspection-form-inline-actions-spacer d-md-none"
            statusMessage={disabledReviewMessage || statusMessage}
          >
            {mobileActionButtons}
          </FormActionGroup>
        )}
      </div>
    )
  }

  return (
    <div className={`d-grid gap-2 ${wrapperClassName}`.trim()}>
      {sectionLabel ? (
        <div className="small fw-semibold text-body-secondary">{sectionLabel}</div>
      ) : null}
      <div
        className={[
          'inspection-form-actions',
          alignLeft ? 'inspection-form-actions--left' : '',
          'd-flex flex-column flex-sm-row',
          alignLeft ? 'justify-content-start' : 'justify-content-end',
          'gap-2',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className={statusClassName} aria-live="polite">
          {disabledReviewMessage ||
            statusMessage ||
            draftStatus ||
            'This inspection type can be saved as draft only.'}
        </div>
        {leadingAction}
        <CButton color="secondary" variant="outline" onClick={() => onSaveDraft?.(getLatestForm())}>
          {saveLabel}
        </CButton>
        {showDisabledReview ? (
          <CButton color="primary" disabled title={disabledReviewMessage}>
            {reviewLabel}
          </CButton>
        ) : null}
        {syncFailed ? (
          <CButton color="warning" variant="outline" onClick={() => onRetryDraftSync?.()}>
            Retry Sync
          </CButton>
        ) : null}
      </div>
    </div>
  )
}

const InspectionScanAnotherFireExtinguisherAction = ({ onScanAnother }) => {
  if (typeof onScanAnother !== 'function') return null

  return (
    <CButton type="button" color="primary" variant="outline" onClick={onScanAnother}>
      {CONTINUATION_SCAN_LABEL}
    </CButton>
  )
}

const InspectionFormPhotoEvidence = ({
  fieldErrors,
  form,
  isGeneralInspectionForm,
  isStructuredInspectionForm,
  onChangePhotoDescription,
  onChangeReportRemarks,
  onRemovePhoto,
  onSavePhotos,
  onTakePhoto,
  onUploadPhoto,
  photosRef,
}) => (
  <InspectionGeneralEvidenceCard
    cardRef={photosRef}
    title={INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle}
    photos={form.photos}
    remarks={form.reportRemarks}
    fieldError={fieldErrors.photos}
    compactOnMobile={isStructuredInspectionForm || isGeneralInspectionForm}
    stageDrawerPhotos={isStructuredInspectionForm || isGeneralInspectionForm}
    compactActionLabel={INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel}
    drawerDescription={INSPECTION_REPORT_EVIDENCE_COPY.helperText}
    emptyMessage={INSPECTION_REPORT_EVIDENCE_COPY.emptyPhotosMessage}
    remarksLabel={INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel}
    remarksPlaceholder={INSPECTION_REPORT_EVIDENCE_COPY.remarksPlaceholder}
    onTakePhoto={onTakePhoto}
    onUploadPhoto={onUploadPhoto}
    onRemovePhoto={onRemovePhoto}
    onChangePhotoDescription={onChangePhotoDescription}
    onChangeRemarks={onChangeReportRemarks}
    onSavePhotos={onSavePhotos}
  />
)

const InspectionFindingsSection = ({
  form,
  fieldError = '',
  getLatestForm,
  onSaveInspectionFindingDraft,
  onSaveDraft,
  requestInspectionIssuePhotoUpload,
  updateForm,
  uploadInputRef,
  cameraInputRef,
}) => {
  const issues = normalizeInspectionIssueDrafts(form.inspectionIssues)
  const [editor, setEditor] = useState(null)
  const [editorError, setEditorError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [savingAction, setSavingAction] = useState('')
  const [aiFieldStates, setAiFieldStates] = useState(createAiFieldStates)
  const aiTranslateAbortRefs = useRef({})

  useEffect(
    () => () => {
      Object.values(aiTranslateAbortRefs.current).forEach((abortController) =>
        abortController?.abort?.(),
      )
    },
    [],
  )

  const buildNextFormWithIssues = (nextIssues) => ({
    ...(getLatestForm?.() || form),
    inspectionIssues: nextIssues,
  })
  const hasSharedFindingDraftSave = typeof onSaveInspectionFindingDraft === 'function'

  const getFindingLocationContext = () => {
    const currentForm = getLatestForm?.() || form
    return {
      zone: String(currentForm.zone || '').trim(),
      mainLocation: String(currentForm.mainLocation || currentForm.location || '').trim(),
      subLocation: String(currentForm.subLocation || currentForm.selectedLocation || '').trim(),
      location: String(currentForm.location || currentForm.selectedLocation || '').trim(),
    }
  }

  const applyFindingLocationContext = (issue = {}) => {
    const context = getFindingLocationContext()
    return {
      ...issue,
      zone: String(issue.zone || context.zone || '').trim(),
      mainLocation: String(
        issue.mainLocation || issue.main_location || context.mainLocation || '',
      ).trim(),
      subLocation: String(
        issue.subLocation || issue.sub_location || context.subLocation || '',
      ).trim(),
      location: String(issue.location || context.location || context.subLocation || '').trim(),
    }
  }

  const getEditorFieldText = (field) => String(editor?.issue?.[field] || '')

  const hasEditorFieldTextForAi = (field) => Boolean(getEditorFieldText(field).trim())

  const resetAiFieldState = (field) => {
    aiTranslateAbortRefs.current[field]?.abort?.()
    aiTranslateAbortRefs.current[field] = null
    setAiFieldStates((current) => ({
      ...current,
      [field]: createAiFieldState(),
    }))
  }

  const resetAllAiFieldStates = () => {
    Object.values(aiTranslateAbortRefs.current).forEach((abortController) =>
      abortController?.abort?.(),
    )
    aiTranslateAbortRefs.current = {}
    setAiFieldStates(createAiFieldStates())
  }

  const buildEditorAiPayload = (field) => ({
    inspectionType: form.inspectionType,
    zone: form.zone,
    mainLocation: form.mainLocation,
    subLocation: form.subLocation || form.location,
    field,
    sourceText: getEditorFieldText(field),
  })

  const saveIssuesDraft = (nextIssues) => {
    const nextForm = buildNextFormWithIssues(nextIssues)
    if (hasSharedFindingDraftSave) {
      const result = onSaveInspectionFindingDraft(nextIssues)
      if (result === false) return null
      return nextForm
    }
    return Promise.resolve(onSaveDraft?.(nextForm)).then((result) =>
      result === false ? null : nextForm,
    )
  }

  const startCreate = () => {
    setEditor({
      mode: 'create',
      issue: applyFindingLocationContext(createInspectionIssue()),
    })
    setEditorError('')
    setDeleteError('')
    resetAllAiFieldStates()
  }
  const startEdit = (issue) => {
    setEditor({
      mode: 'edit',
      issue: {
        ...issue,
        photos: Array.isArray(issue.photos) ? issue.photos : [],
      },
    })
    setEditorError('')
    setDeleteError('')
    resetAllAiFieldStates()
  }
  const updateEditorIssue = (patch) => {
    setEditor((current) =>
      current
        ? {
            ...current,
            issue: {
              ...current.issue,
              ...patch,
              updatedAt: new Date().toISOString(),
            },
          }
        : current,
    )
  }
  const saveEditor = async () => {
    if (!editor || savingAction) return
    const description = String(editor.issue.description || '').trim()
    if (!description) {
      setEditorError('Describe the finding before saving.')
      return
    }
    const nextIssue = {
      ...applyFindingLocationContext(editor.issue),
      description,
      actionRequired: String(editor.issue.actionRequired || '').trim(),
      photos: Array.isArray(editor.issue.photos) ? editor.issue.photos : [],
      updatedAt: new Date().toISOString(),
    }
    const latestIssues = normalizeInspectionIssueDrafts(
      (getLatestForm?.() || form).inspectionIssues,
    )
    const nextIssues =
      editor.mode === 'edit'
        ? latestIssues.map((issue) =>
            String(issue.id) === String(nextIssue.id) ? nextIssue : issue,
          )
        : [...latestIssues, nextIssue]

    setEditorError('')
    setDeleteError('')
    if (hasSharedFindingDraftSave) {
      const nextForm = saveIssuesDraft(nextIssues)
      if (!nextForm) {
        setEditorError('Unable to save finding. Please try again.')
        return
      }
      updateForm(nextForm)
      resetAllAiFieldStates()
      setEditor(null)
      return
    }

    setSavingAction('editor')
    try {
      const nextForm = await saveIssuesDraft(nextIssues)
      if (!nextForm) {
        setEditorError('Unable to save finding. Please try again.')
        return
      }
      updateForm(nextForm)
      setEditor(null)
      setEditorError('')
    } catch {
      setEditorError('Unable to save finding. Please try again.')
    } finally {
      setSavingAction('')
    }
  }
  const cancelEditor = () => {
    if (savingAction === 'editor') return
    resetAllAiFieldStates()
    setEditor(null)
    setEditorError('')
  }
  const removeIssue = async (issueId) => {
    if (savingAction) return
    const latestIssues = normalizeInspectionIssueDrafts(
      (getLatestForm?.() || form).inspectionIssues,
    )
    const nextIssues = latestIssues.filter((issue) => String(issue.id) !== String(issueId))
    setDeleteError('')
    if (hasSharedFindingDraftSave) {
      const nextForm = saveIssuesDraft(nextIssues)
      if (!nextForm) {
        setDeleteError('Unable to delete finding. Please try again.')
        return
      }
      updateForm(nextForm)
      return
    }

    setSavingAction(`delete:${issueId}`)
    try {
      const nextForm = await saveIssuesDraft(nextIssues)
      if (!nextForm) {
        setDeleteError('Unable to delete finding. Please try again.')
        return
      }
      updateForm(nextForm)
    } catch {
      setDeleteError('Unable to delete finding. Please try again.')
    } finally {
      setSavingAction('')
    }
  }
  const removeEditorPhoto = (photoId) => {
    updateEditorIssue({
      photos: (editor?.issue?.photos || []).filter(
        (photo) => String(photo?.id || '') !== String(photoId || ''),
      ),
    })
  }
  const updateEditorPhotoDescription = (photoId, description) => {
    updateEditorIssue({
      photos: (editor?.issue?.photos || []).map((photo) =>
        String(photo?.id || '') === String(photoId || '') ? { ...photo, description } : photo,
      ),
    })
  }
  const addEditorPhotos = (nextPhotos = []) => {
    setEditor((current) =>
      current
        ? {
            ...current,
            issue: {
              ...current.issue,
              photos: [
                ...(Array.isArray(current.issue.photos) ? current.issue.photos : []),
                ...nextPhotos,
              ],
              updatedAt: new Date().toISOString(),
            },
          }
        : current,
    )
  }

  const runAiTranslateField = async (field) => {
    if (!editor || aiFieldStates[field]?.stage === 'loading' || !hasEditorFieldTextForAi(field)) {
      return
    }
    resetAiFieldState(field)
    setAiFieldStates((current) => ({
      ...current,
      [field]: {
        stage: 'loading',
        suggestion: '',
        error: '',
      },
    }))

    const abortController = new AbortController()
    aiTranslateAbortRefs.current[field] = abortController
    let streamedText = ''
    let doneText = ''
    let streamError = null

    try {
      const payload = buildEditorAiPayload(field)
      await streamAiHelperMessage(
        {
          thread_id: null,
          new_thread: true,
          conversation_purpose: 'embedded_helper',
          message: buildInspectionFindingFieldTranslatePrompt(payload),
          page_context: buildInspectionFindingAiContext(payload),
          response_language: 'en',
        },
        {
          onDelta: (eventPayload) => {
            streamedText += String(eventPayload?.text || '')
          },
          onDone: (eventPayload) => {
            doneText = String(eventPayload?.message?.content || '')
          },
          onError: (eventPayload) => {
            streamError = new Error(
              eventPayload?.message || 'Unable to translate finding right now. Please try again.',
            )
          },
        },
        { signal: abortController.signal },
      )

      if (abortController.signal.aborted) return
      if (streamError) throw streamError

      const suggestion = parseTranslatedFindingField(doneText || streamedText)
      if (!suggestion) {
        throw new Error('Unable to translate finding right now. Please try again.')
      }

      setAiFieldStates((current) => ({
        ...current,
        [field]: {
          stage: 'preview',
          suggestion,
          error: '',
        },
      }))
    } catch (error) {
      if (abortController.signal.aborted) return
      setAiFieldStates((current) => ({
        ...current,
        [field]: {
          stage: 'error',
          suggestion: '',
          error: safeAiHelperError(
            error,
            'Unable to translate finding right now. Please try again.',
          ),
        },
      }))
    } finally {
      if (aiTranslateAbortRefs.current[field] === abortController) {
        aiTranslateAbortRefs.current[field] = null
      }
    }
  }

  const acceptAiFieldSuggestion = (field) => {
    const suggestion = aiFieldStates[field]?.suggestion || ''
    if (!suggestion) return
    updateEditorIssue({
      [field]: suggestion,
    })
    resetAiFieldState(field)
  }

  const handleEditorFieldChange = (field, value) => {
    updateEditorIssue({ [field]: value })
    if (field === 'description' && editorError) setEditorError('')
    if (aiFieldStates[field]?.stage !== 'idle') {
      resetAiFieldState(field)
    }
  }

  const renderAiFieldPanel = (field) => {
    const fieldState = aiFieldStates[field] || createAiFieldState()

    if (fieldState.stage === 'idle') return null

    if (fieldState.stage === 'loading') {
      return (
        <div
          className="rounded-3 border bg-light-subtle p-3 small text-body-secondary"
          data-testid={`ai-translate-${field}-panel`}
        >
          Translating...
        </div>
      )
    }

    if (fieldState.stage === 'error') {
      return (
        <div
          className="rounded-3 border border-danger-subtle bg-danger-subtle p-3 d-grid gap-2"
          data-testid={`ai-translate-${field}-panel`}
        >
          <div className="small text-danger-emphasis">
            {fieldState.error || 'Unable to translate finding right now. Please try again.'}
          </div>
          <div className="d-flex flex-wrap justify-content-end gap-2">
            <CButton type="button" color="light" size="sm" onClick={() => resetAiFieldState(field)}>
              Cancel
            </CButton>
            <CButton
              type="button"
              color="danger"
              size="sm"
              onClick={() => runAiTranslateField(field)}
            >
              Retry
            </CButton>
          </div>
        </div>
      )
    }

    return (
      <div
        className="rounded-3 border bg-light-subtle p-3 d-grid gap-2"
        data-testid={`ai-translate-${field}-panel`}
      >
        <div className="small fw-semibold text-body-secondary">AI suggested English</div>
        <div className="small text-body" style={{ whiteSpace: 'pre-wrap' }}>
          {fieldState.suggestion}
        </div>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <CButton type="button" color="light" size="sm" onClick={() => resetAiFieldState(field)}>
            Cancel
          </CButton>
          <CButton
            type="button"
            color="light"
            size="sm"
            style={AI_BUTTON_STYLE}
            onClick={() => runAiTranslateField(field)}
          >
            Retry
          </CButton>
          <CButton
            type="button"
            color="success"
            size="sm"
            onClick={() => acceptAiFieldSuggestion(field)}
          >
            Accept
          </CButton>
        </div>
      </div>
    )
  }

  const renderAiTranslateButton = (field) => (
    <CButton
      type="button"
      color="light"
      size="sm"
      className="inspection-compact-action-btn d-inline-flex align-items-center gap-2"
      style={AI_BUTTON_STYLE}
      disabled={!hasEditorFieldTextForAi(field) || aiFieldStates[field]?.stage === 'loading'}
      onClick={() => runAiTranslateField(field)}
    >
      <Sparkles size={14} />
      AI translate
    </CButton>
  )

  const renderEditorFields = () => {
    if (!editor) return null

    return (
      <div className="inspection-finding-editor d-grid gap-3">
        <div className="rounded-3 border bg-light-subtle p-3 d-grid gap-2">
          <div className="small text-body-secondary">
            You can write in Bahasa Melayu, English, or mixed language. AI will prepare English text
            for your review before it is used.
          </div>
        </div>
        <div className="d-grid gap-2">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <CFormLabel className="mb-0">Describe finding</CFormLabel>
            {renderAiTranslateButton('description')}
          </div>
          <CFormTextarea
            aria-label="Describe finding"
            rows={3}
            placeholder="Describe what you found, where it is, and what was observed."
            value={editor.issue.description}
            onChange={(event) => handleEditorFieldChange('description', event.target.value)}
          />
          {renderAiFieldPanel('description')}
        </div>
        <div className="d-grid gap-2">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <CFormLabel className="mb-0">Action required (optional)</CFormLabel>
            {renderAiTranslateButton('actionRequired')}
          </div>
          <CFormTextarea
            aria-label="Finding action required"
            rows={2}
            placeholder="Recommended action, follow-up, or control."
            value={editor.issue.actionRequired}
            onChange={(event) => handleEditorFieldChange('actionRequired', event.target.value)}
          />
          {renderAiFieldPanel('actionRequired')}
        </div>
        <InspectionGeneralEvidenceCard
          title="Finding Photos"
          photos={editor.issue.photos}
          compactOnMobile
          compactActionLabel="Add finding photos"
          drawerDescription="Optional. Attach photos that belong to this finding only."
          emptyMessage="No finding photos added."
          onTakePhoto={(options) =>
            requestInspectionIssuePhotoUpload?.(
              {
                ...editor.issue,
                label: 'Finding',
                onAddPhotos: options?.onAddPhotos || addEditorPhotos,
              },
              cameraInputRef,
              ...(options ? [options] : []),
            )
          }
          onUploadPhoto={(options) =>
            requestInspectionIssuePhotoUpload?.(
              {
                ...editor.issue,
                label: 'Finding',
                onAddPhotos: options?.onAddPhotos || addEditorPhotos,
              },
              uploadInputRef,
              ...(options ? [options] : []),
            )
          }
          onRemovePhoto={removeEditorPhoto}
          onChangePhotoDescription={updateEditorPhotoDescription}
          onSavePhotos={(nextPhotos) =>
            updateEditorIssue({
              photos: Array.isArray(nextPhotos) ? nextPhotos : [],
            })
          }
        />
        {editorError ? <FormFieldError>{editorError}</FormFieldError> : null}
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <CButton
            type="button"
            color="secondary"
            variant="outline"
            disabled={savingAction === 'editor'}
            onClick={cancelEditor}
          >
            Cancel
          </CButton>
          <CButton
            type="button"
            color="primary"
            disabled={savingAction === 'editor'}
            onClick={saveEditor}
          >
            {savingAction === 'editor' ? 'Saving...' : 'Save'}
          </CButton>
        </div>
      </div>
    )
  }

  return (
    <div className="inspection-form-section d-grid gap-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <CFormLabel className="fw-semibold text-muted mb-0">Findings</CFormLabel>
          </div>
          <div className="small text-body-secondary">
            Record one finding at a time. Add photos if needed.
          </div>
        </div>
        <CreateActionButton
          label="Add finding"
          className="inspection-compact-action-btn"
          disabled={Boolean(editor) || Boolean(savingAction)}
          onClick={startCreate}
        />
      </div>

      {deleteError ? <FormFieldError>{deleteError}</FormFieldError> : null}

      {issues.length === 0 ? (
        <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
          No findings added.
        </div>
      ) : (
        <div className="d-grid gap-3">
          {issues.map((issue, index) => {
            const label = `Finding ${index + 1}`
            const description = String(issue.description || '').trim()
            const actionRequired = String(issue.actionRequired || '').trim()
            const photoCount = Array.isArray(issue.photos) ? issue.photos.length : 0
            const metadata = [
              photoCount ? `${photoCount} photo${photoCount === 1 ? '' : 's'}` : '',
            ].filter(Boolean)
            const hasError =
              fieldError && fieldError.issueId && String(fieldError.issueId) === String(issue.id)
            return (
              <CCard className="inspection-finding-card" key={issue.id}>
                <div className="inspection-finding-card__content d-flex align-items-start justify-content-between gap-2">
                  <div className="min-w-0 flex-grow-1">
                    <div
                      className="inspection-finding-card__description fw-semibold"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.35,
                      }}
                    >
                      {index + 1}. {description || 'No description yet'}
                    </div>
                    {actionRequired ? (
                      <div className="inspection-finding-card__action mt-1">
                        Action: {actionRequired}
                      </div>
                    ) : null}
                    {metadata.length > 0 ? (
                      <div className="inspection-finding-card__meta mt-1">
                        {metadata.join(' | ')}
                      </div>
                    ) : null}
                    <FormFieldError>
                      {hasError ? `${label} needs a description.` : ''}
                    </FormFieldError>
                  </div>
                  <RowActions
                    toggleAriaLabel={`${label} actions`}
                    items={[
                      {
                        key: 'edit',
                        label: 'Edit',
                        disabled: Boolean(savingAction),
                        onClick: () => startEdit(issue),
                      },
                      {
                        key: 'delete',
                        label: savingAction === `delete:${issue.id}` ? 'Deleting...' : 'Delete',
                        className: 'text-danger',
                        disabled: Boolean(savingAction),
                        onClick: () => removeIssue(issue.id),
                      },
                    ]}
                  />
                </div>
              </CCard>
            )
          })}
        </div>
      )}

      <MobileBottomDrawer
        visible={Boolean(editor)}
        title={editor?.mode === 'edit' ? 'Edit finding' : 'Add finding'}
        bodyClassName="inspection-equipment-detail-drawer-shell"
        onClose={cancelEditor}
      >
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
          {renderEditorFields()}
        </div>
      </MobileBottomDrawer>
    </div>
  )
}

const getFrtGeneralRemarks = (form = {}) => {
  const dailyRemarks = String(form.frtDailyRemarks || '')
  const oneOffRemarks = String(form.frtOneOffRemarks || '')
  const dailyRemarksText = dailyRemarks.trim()
  const oneOffRemarksText = oneOffRemarks.trim()
  if (dailyRemarksText && oneOffRemarksText && dailyRemarksText !== oneOffRemarksText) {
    return [dailyRemarksText, oneOffRemarksText].join('\n')
  }
  return dailyRemarks || oneOffRemarks
}

const FrtGeneralRemarksField = ({ form, updateForm, useMobileDrawer }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const remarks = getFrtGeneralRemarks(form)
  const updateRemarks = (nextValue) => {
    updateForm({
      ...form,
      frtDailyRemarks: String(nextValue || ''),
      frtOneOffRemarks: '',
    })
  }

  if (useMobileDrawer) {
    return (
      <>
        <div className="inspection-general-evidence-mobile-compact d-grid gap-2">
          <CreateActionButton
            label={`${String(remarks || '').trim() ? 'Edit' : 'Add'} optional remarks`}
            className="inspection-compact-action-btn justify-self-start"
            onClick={() => setDrawerOpen(true)}
          />
        </div>
        <MobileBottomDrawer
          visible={drawerOpen}
          title="Remarks"
          bodyClassName="inspection-equipment-detail-drawer-shell"
          onClose={() => setDrawerOpen(false)}
        >
          <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
            <CFormTextarea
              rows={5}
              label="Remarks"
              aria-label="Fire truck readiness remarks"
              value={remarks}
              placeholder="Optional general fire truck readiness remarks"
              onChange={(event) => updateRemarks(event.target.value)}
            />
            <CButton
              type="button"
              color="primary"
              size="sm"
              className="inspection-compact-action-btn inspection-frt-remarks-drawer__done"
              onClick={() => setDrawerOpen(false)}
            >
              Done
            </CButton>
          </div>
        </MobileBottomDrawer>
      </>
    )
  }

  return (
    <div className="inspection-form-section d-grid gap-1">
      <CFormLabel
        htmlFor="fire-truck-readiness-remarks"
        className="small fw-semibold text-muted mb-1"
      >
        Remarks
      </CFormLabel>
      <CFormTextarea
        id="fire-truck-readiness-remarks"
        rows={3}
        value={remarks}
        placeholder="Optional general fire truck readiness remarks"
        onChange={(event) => updateRemarks(event.target.value)}
      />
    </div>
  )
}

const InspectionFormBodySections = ({
  currentStructuredSummary,
  draftStatus,
  draftSyncState,
  readiness = null,
  fieldErrors,
  fireExtinguisherScan = null,
  form,
  getLatestForm,
  isFireExtinguisherCatalogInspectionForm,
  isLoadingEquipmentRows,
  isLoadingFireExtinguisherRows,
  isLoadingScbaCatalogSections,
  isFireTruckCatalogInspectionForm,
  isFullInspectionForm,
  isStructuredInspectionForm,
  isUpdateMode = false,
  location,
  mainLocation,
  onRequestReview,
  onRetryDraftSync,
  onSaveDraft,
  photosRef,
  removePhoto,
  requestInspectionIssuePhotoUpload,
  requestRootPhotoUpload,
  selectedFireTruckPlate,
  selectedTypeDefinition,
  showComingSoonNotice,
  structuredDisplayForm,
  structuredSectionHandlers,
  structuredSectionRef,
  StructuredEditSection,
  updateForm,
  updatePhotoDescription,
  uploadInputRef,
  cameraInputRef,
  validationState,
  validationStatusMessage,
  zone,
}) => {
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const isLoadingStructuredRows = isFireExtinguisherCatalogInspectionForm
    ? isLoadingFireExtinguisherRows
    : selectedTypeDefinition?.supportsEquipmentCatalog
      ? isLoadingEquipmentRows
      : selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
        ? isLoadingScbaCatalogSections
        : false
  const hasFireExtinguisherLocationSelection =
    !isFireExtinguisherCatalogInspectionForm ||
    (String(zone || '').trim() && String(form.subLocation || '').trim())
  const hasFireTruckCompartmentSelection =
    !isFireTruckCatalogInspectionForm || String(form.subLocation || '').trim()
  const hasStructuredLocationSelection =
    hasFireExtinguisherLocationSelection && hasFireTruckCompartmentSelection
  const fireExtinguisherEntryMode = String(form.fireExtinguisherEntryMode || '').trim()
  const subLocationOptions = Array.isArray(location?.subLocationOptions)
    ? location.subLocationOptions
    : []
  const usesZoneLocationFlow = Boolean(selectedTypeDefinition?.usesZoneLocationFlow)
  const usesCurrentTypePayloadVersion =
    Number(selectedTypeDefinition?.payloadVersion || 0) > 0 &&
    Number(form.hsePayloadVersion || 0) === Number(selectedTypeDefinition?.payloadVersion || 0)
  const ownsRootEvidence =
    selectedTypeDefinition?.ownsRootEvidence === true && usesCurrentTypePayloadVersion
  const supportsGenericFindings =
    selectedTypeDefinition?.supportsGenericFindings === true ||
    (selectedTypeDefinition?.key === 'health-safety-environment-inspection' &&
      !usesCurrentTypePayloadVersion)
  const hasLegacySelectedLocation = Boolean(String(form.selectedLocation || '').trim())
  const requiresZoneLocationCompletion =
    usesZoneLocationFlow &&
    (isFullInspectionForm || selectedTypeDefinition?.key === 'health-safety-environment-inspection')
  const hasCompletedZoneLocationSelection =
    !requiresZoneLocationCompletion ||
    hasLegacySelectedLocation ||
    (String(zone || '').trim() &&
      String(mainLocation || '').trim() &&
      (subLocationOptions.length === 0 || String(form.subLocation || '').trim()))
  const shouldPromptForZoneLocationCompletion =
    requiresZoneLocationCompletion &&
    String(zone || '').trim() &&
    String(mainLocation || '').trim() &&
    subLocationOptions.length > 0 &&
    !String(form.subLocation || '').trim()
  const shouldPromptForFireExtinguisherLocation =
    isStructuredInspectionForm &&
    isFireExtinguisherCatalogInspectionForm &&
    String(zone || '').trim() &&
    String(mainLocation || '').trim() &&
    !String(form.subLocation || '').trim()
  const shouldPromptForFireTruckCompartment =
    isStructuredInspectionForm &&
    isFireTruckCatalogInspectionForm &&
    String(mainLocation || '').trim() &&
    !String(form.subLocation || '').trim()
  const scopeContinuation =
    structuredSectionHandlers?.scopeContinuation ||
    structuredSectionHandlers?.locationContinuation ||
    structuredSectionHandlers?.fireExtinguisherLocationContinuation ||
    null
  const locationContinueOptions = (
    Array.isArray(scopeContinuation?.options)
      ? scopeContinuation.options
      : Array.isArray(scopeContinuation?.locationOptions)
        ? scopeContinuation.locationOptions
        : subLocationOptions
  ).map(neutralizeCompletionPresentation)
  const currentScopeValue = String(
    scopeContinuation?.currentValue ||
      scopeContinuation?.value ||
      (scopeContinuation?.scope === 'mainLocation' ? mainLocation : form.subLocation) ||
      '',
  ).trim()
  const isContinuationOptionComplete = (option) => option?.progress?.isDone === true
  const isCurrentFireExtinguisherLocationComplete =
    isFireExtinguisherLocationComplete(currentStructuredSummary)
  const isCurrentLocationComplete = isFireExtinguisherCatalogInspectionForm
    ? isCurrentFireExtinguisherLocationComplete
    : (() => {
        const currentOption = locationContinueOptions.find(
          (option) =>
            String(option?.value || '')
              .trim()
              .toLowerCase() === currentScopeValue.toLowerCase(),
        )
        return Boolean(currentOption && isContinuationOptionComplete(currentOption))
      })()
  const canContinueNextLocation =
    (isStructuredInspectionForm || isFullInspectionForm) &&
    locationContinueOptions.length > 1 &&
    currentScopeValue &&
    isCurrentLocationComplete &&
    (isFireExtinguisherCatalogInspectionForm ? fireExtinguisherEntryMode !== 'scan' : true)
  const continueAction = canContinueNextLocation
    ? {
        ...scopeContinuation,
        currentValue: currentScopeValue,
        mainLocation,
        options: locationContinueOptions,
        value: currentScopeValue,
      }
    : null
  const canScanAnotherFireExtinguisher =
    isStructuredInspectionForm &&
    isFireExtinguisherCatalogInspectionForm &&
    fireExtinguisherEntryMode === 'scan' &&
    String(form.fireExtinguisherFocusedAssetKey || '').trim() &&
    isCurrentFireExtinguisherLocationComplete &&
    typeof fireExtinguisherScan?.onOpenScanner === 'function'
  const showBlockedReviewAction =
    selectedTypeDefinition?.key === 'er-aux-equipment-inspection' ||
    selectedTypeDefinition?.inspectionType === 'ER Aux Equipment Inspection'
  const renderActions = (className = '', isMobileSticky = false, wrapperClassName = '') => (
    <InspectionFormActions
      alignLeft={Boolean(nextStepAction)}
      className={className}
      draftStatus={draftStatus}
      draftSyncState={draftSyncState}
      readiness={readiness}
      leadingAction={nextStepAction}
      isMobileSticky={isMobileSticky}
      isUpdateMode={isUpdateMode}
      onRequestReview={onRequestReview}
      onRetryDraftSync={onRetryDraftSync}
      sectionLabel={nextStepAction ? "What's Next" : ''}
      submissionMode={
        selectedTypeDefinition?.submissionMode === 'direct' &&
        Number(form.hsePayloadVersion || 0) === Number(selectedTypeDefinition?.payloadVersion || 0)
          ? 'direct'
          : 'review'
      }
      validationStatusMessage={validationStatusMessage}
      wrapperClassName={wrapperClassName}
    />
  )

  const renderNextLocationCard = () =>
    continueAction ? (
      <InspectionNextLocationCard
        continueAction={continueAction}
        onContinueToLocation={
          structuredSectionHandlers?.onSelectNextScope ||
          structuredSectionHandlers?.onSelectNextLocation ||
          structuredSectionHandlers?.onSelectNextFireExtinguisherLocation
        }
      />
    ) : null

  const renderScanAnotherFireExtinguisherAction = () =>
    canScanAnotherFireExtinguisher ? (
      <InspectionScanAnotherFireExtinguisherAction
        onScanAnother={fireExtinguisherScan?.onOpenScanner}
      />
    ) : null

  const renderDraftOnlyActions = (
    className = '',
    isMobileSticky = false,
    statusMessage = '',
    disabledReviewMessage = '',
    wrapperClassName = '',
  ) => (
    <InspectionFormDraftOnlyActions
      alignLeft={Boolean(nextStepAction)}
      className={className}
      disabledReviewMessage={disabledReviewMessage}
      draftStatus={draftStatus}
      draftSyncState={draftSyncState}
      getLatestForm={getLatestForm}
      leadingAction={nextStepAction}
      isMobileSticky={isMobileSticky}
      isUpdateMode={isUpdateMode}
      onRetryDraftSync={onRetryDraftSync}
      onSaveDraft={onSaveDraft}
      sectionLabel={nextStepAction ? "What's Next" : ''}
      statusMessage={statusMessage}
      wrapperClassName={wrapperClassName}
    />
  )
  const hasPrimaryActions =
    (isFullInspectionForm && hasCompletedZoneLocationSelection) ||
    (isStructuredInspectionForm &&
      mainLocation &&
      hasStructuredLocationSelection &&
      hasCompletedZoneLocationSelection &&
      StructuredEditSection)
  const reviewReadiness = getInspectionReviewReadiness({
    form,
    hasInspectionBody: hasPrimaryActions,
    selectedTypeDefinition,
    showComingSoonNotice,
  })
  const blockedReviewMessage = !reviewReadiness.canReview
    ? buildInspectionValidationStatusMessage(reviewReadiness.validationState) ||
      'Cannot continue to review: complete the required inspection items.'
    : ''
  const nextStepAction = renderScanAnotherFireExtinguisherAction()
  const renderReviewOrDraftActions = (desktopClassName, mobileClassName) =>
    reviewReadiness.canReview ? (
      <>
        {renderActions('', false, desktopClassName)}
        {renderActions(mobileClassName, true, 'd-md-none')}
      </>
    ) : (
      <>
        {renderDraftOnlyActions(
          '',
          false,
          blockedReviewMessage,
          showBlockedReviewAction ? blockedReviewMessage : '',
          desktopClassName,
        )}
        {renderDraftOnlyActions(
          mobileClassName,
          true,
          blockedReviewMessage,
          showBlockedReviewAction ? blockedReviewMessage : '',
          'd-md-none',
        )}
      </>
    )

  const renderPhotoEvidence = () => (
    <InspectionFormPhotoEvidence
      fieldErrors={fieldErrors}
      form={form}
      isGeneralInspectionForm={isFullInspectionForm}
      isStructuredInspectionForm={isStructuredInspectionForm}
      onChangePhotoDescription={updatePhotoDescription}
      onChangeReportRemarks={(nextRemarks) =>
        updateForm({
          ...(typeof getLatestForm === 'function' ? getLatestForm() : form),
          reportRemarks: nextRemarks,
        })
      }
      onRemovePhoto={removePhoto}
      onSavePhotos={(nextPhotos) =>
        updateForm({
          ...(typeof getLatestForm === 'function' ? getLatestForm() : form),
          photos: Array.isArray(nextPhotos) ? nextPhotos : [],
        })
      }
      onTakePhoto={(options) => requestRootPhotoUpload(cameraInputRef, '', options)}
      onUploadPhoto={(options) => requestRootPhotoUpload(uploadInputRef, '', options)}
      photosRef={photosRef}
    />
  )

  const renderFindings = () => (
    <InspectionFindingsSection
      form={form}
      fieldError={validationState?.inspectionIssues?.firstTarget || null}
      getLatestForm={getLatestForm}
      onSaveInspectionFindingDraft={structuredSectionHandlers?.onSaveInspectionFindingDraft}
      onSaveDraft={onSaveDraft}
      requestInspectionIssuePhotoUpload={requestInspectionIssuePhotoUpload}
      updateForm={updateForm}
      uploadInputRef={uploadInputRef}
      cameraInputRef={cameraInputRef}
    />
  )

  return (
    <>
      {isFullInspectionForm && hasCompletedZoneLocationSelection ? (
        <>
          {renderFindings()}

          {renderPhotoEvidence()}
          {renderNextLocationCard()}

          {renderReviewOrDraftActions('d-none d-md-grid', 'inspection-form-inline-actions')}
        </>
      ) : null}

      {isStructuredInspectionForm &&
      mainLocation &&
      hasStructuredLocationSelection &&
      hasCompletedZoneLocationSelection &&
      StructuredEditSection ? (
        <>
          <div
            className="inspection-form-section inspection-form-body-start d-grid gap-3"
            ref={structuredSectionRef}
          >
            <StructuredEditSection
              mainLocation={mainLocation}
              mainLocationLabel={
                isFireTruckCatalogInspectionForm
                  ? selectedFireTruckPlate
                  : isFireExtinguisherCatalogInspectionForm
                    ? [zone ? `Zone ${zone}` : '', location.selectedMainLocationTitle]
                        .filter(Boolean)
                        .join(' > ')
                    : location.selectedMainLocationTitle
              }
              form={structuredDisplayForm}
              summary={currentStructuredSummary}
              fieldErrors={fieldErrors}
              validationState={validationState}
              isLoadingRows={isLoadingStructuredRows}
              handlers={{
                ...structuredSectionHandlers,
                ...(ownsRootEvidence
                  ? {
                      onRemoveGeneralPhoto: removePhoto,
                      onChangeGeneralPhotoDescription: updatePhotoDescription,
                      onSaveGeneralPhotos: (nextPhotos) =>
                        updateForm({
                          ...(typeof getLatestForm === 'function' ? getLatestForm() : form),
                          photos: Array.isArray(nextPhotos) ? nextPhotos : [],
                        }),
                    }
                  : {}),
              }}
              selectedTypeDefinition={selectedTypeDefinition}
              draftStatus={draftStatus}
            />
          </div>

          {isFireTruckCatalogInspectionForm ? (
            <FrtGeneralRemarksField
              form={form}
              updateForm={updateForm}
              useMobileDrawer={useMobileDrawer}
            />
          ) : null}

          {supportsGenericFindings ? renderFindings() : null}

          {!ownsRootEvidence ? renderPhotoEvidence() : null}

          {renderNextLocationCard()}

          {renderReviewOrDraftActions('d-none d-md-grid', 'inspection-form-inline-actions')}
        </>
      ) : null}

      {shouldPromptForZoneLocationCompletion ? (
        <div className="inspection-form-section inspection-form-body-start">
          <div className="inspection-fire-extinguisher-location-prompt rounded-3 border bg-light-subtle p-3 text-body-secondary">
            {PARTIAL_STATE_PROMPTS.locationFlow}
          </div>
        </div>
      ) : null}

      {shouldPromptForFireTruckCompartment ? (
        <div className="inspection-form-section inspection-form-body-start">
          <div className="inspection-fire-extinguisher-location-prompt rounded-3 border bg-light-subtle p-3 text-body-secondary">
            {PARTIAL_STATE_PROMPTS.fireTruckFlow}
          </div>
        </div>
      ) : null}

      {shouldPromptForFireExtinguisherLocation ? (
        <div className="inspection-form-section inspection-form-body-start">
          <div className="inspection-fire-extinguisher-location-prompt rounded-3 border bg-light-subtle p-3 text-body-secondary">
            {PARTIAL_STATE_PROMPTS.fireExtinguisherFlow}
          </div>
        </div>
      ) : null}

      {showComingSoonNotice ? (
        <>
          <div className="rounded-3 border bg-light-subtle p-3 text-body-secondary">
            Actual field coming soon
          </div>
          {renderDraftOnlyActions('', false, '', '', 'd-none d-md-grid')}
          {renderDraftOnlyActions('inspection-form-inline-actions', true, '', '', 'd-md-none')}
        </>
      ) : null}
    </>
  )
}

export default InspectionFormBodySections
