import React, { useState } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import { Pencil } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'
import { dedupePhotos } from 'src/views/inspection/inspectionSharedUtils'
import { FormFieldError } from 'src/views/inspection/form/components/InspectionFormDisplaySections'
import { normalizeInspectionIssues } from 'src/views/inspection/types/inspectionIssues'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import {
  HSE_DETAIL_FIELDS,
  HSE_FINDING_SELECTIONS,
  HSE_SELECTION_OPTIONS,
  HSE_SEVERITY_OPTIONS,
  normalizeHseFormFields,
  toggleHseSelection,
} from './helpers'

const text = (value) => String(value || '').trim()

const getPhotoSignature = (photos = []) =>
  JSON.stringify(
    dedupePhotos(photos).map((photo) => ({
      id: String(photo?.id || ''),
      fileName: String(photo?.fileName || ''),
      url: String(photo?.url || ''),
      description: String(photo?.description || ''),
    })),
  )

const HSE_EDITABLE_TEXT_FIELDS = [
  ['hseAreaConditionRemarks', 'hse_area_condition_remarks'],
  ['hseUnsafeActDetails', 'hse_unsafe_act_details'],
  ['hseUnsafeConditionDetails', 'hse_unsafe_condition_details'],
  ['hseEnvironmentalDetails', 'hse_environmental_details'],
  ['hseImmediateAction', 'hse_immediate_action'],
  ['hseCorrectiveAction', 'hse_corrective_action'],
  ['hseResponsiblePerson', 'hse_responsible_person'],
  ['hseTargetDate', 'hse_target_date'],
  ['hseRemarks', 'hse_remarks'],
]

const getEditableHseFormFields = (form, normalized) =>
  HSE_EDITABLE_TEXT_FIELDS.reduce(
    (next, [camelKey, snakeKey]) => ({
      ...next,
      [camelKey]: String(form?.[camelKey] ?? form?.[snakeKey] ?? ''),
    }),
    { ...normalized },
  )

const getHseDraftSignature = (fields = {}, photos = []) =>
  JSON.stringify({
    ...fields,
    hseSelections: [...(Array.isArray(fields.hseSelections) ? fields.hseSelections : [])].sort(),
    photos: getPhotoSignature(photos),
  })

const DetailBlock = ({ label, value }) => {
  if (!text(value)) return null
  return (
    <div>
      <div className="small text-muted">{label}</div>
      <div className="rounded-3 border bg-light-subtle p-3" style={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </div>
    </div>
  )
}

const HseSelectionButtons = ({ selections = [], readOnly = false, onToggleHseSelection }) => (
  <div className="d-grid gap-2">
    <div className="small fw-semibold text-muted">Outcome</div>
    <div className="row g-2">
      {HSE_SELECTION_OPTIONS.map((option) => {
        const selected = selections.includes(option.value)
        return (
          <div className="col-12 col-md-6" key={option.value}>
            <CButton
              type="button"
              color={selected ? 'primary' : 'light'}
              variant={selected ? undefined : 'outline'}
              className="inspection-hse-choice-btn w-100 text-start h-100 rounded-3"
              disabled={readOnly}
              onClick={() => onToggleHseSelection?.(option.value)}
            >
              <div className="fw-semibold">{option.label}</div>
              <div className="small opacity-75">{option.description}</div>
            </CButton>
          </div>
        )
      })}
    </div>
  </div>
)

const HseInlineEvidenceActions = ({ handlers = {}, caption = '' }) => {
  if (!handlers.onTakeGeneralPhoto && !handlers.onUploadGeneralPhoto) return null
  return (
    <div className="d-flex flex-wrap gap-2">
      {handlers.onTakeGeneralPhoto ? (
        <CreateActionButton
          label="Take HSE photo"
          className="inspection-compact-action-btn"
          showIcon={false}
          onClick={() => handlers.onTakeGeneralPhoto?.(caption)}
        />
      ) : null}
      {handlers.onUploadGeneralPhoto ? (
        <CreateActionButton
          label="Upload HSE photo"
          className="inspection-compact-action-btn"
          showIcon={false}
          onClick={() => handlers.onUploadGeneralPhoto?.(caption)}
        />
      ) : null}
    </div>
  )
}

const getHseSelectedOutcomeLabel = (normalized) => {
  const selectedLabels = HSE_SELECTION_OPTIONS.filter((option) =>
    normalized.hseSelections.includes(option.value),
  ).map((option) => option.label)

  if (selectedLabels.length === 0) return 'No outcome selected'
  if (normalized.hseSeverity && selectedLabels.length > 0) {
    return `${selectedLabels.join(', ')} - ${normalized.hseSeverity}`
  }
  return selectedLabels.join(', ')
}

const HseMobileObservationCard = ({ label, onEdit }) => (
  <button
    type="button"
    className="mobile-setup-summary hse-mobile-observation-card text-start"
    aria-label={`Edit HSE observation: ${label}`}
    onClick={onEdit}
  >
    <span className="mobile-setup-summary__label">Observation</span>
    <span className="mobile-setup-summary__value">
      <span className="mobile-setup-summary__value-text">{label}</span>
    </span>
    <span
      className="mobile-setup-summary__action mobile-setup-summary__edit text-primary"
      aria-hidden="true"
    >
      <Pencil size={17} aria-hidden="true" />
    </span>
  </button>
)

const HseEditContent = ({
  values,
  selectedFindings,
  hasFindings,
  areaSatisfactory,
  fieldErrors = {},
  hseFieldErrors = {},
  handlers = {},
}) => (
  <>
    <HseSelectionButtons
      selections={values.hseSelections}
      onToggleHseSelection={handlers.onToggleHseSelection}
    />
    <FormFieldError>
      {fieldErrors.hseSelection ? 'Select Area Satisfactory or at least one HSE finding.' : ''}
    </FormFieldError>

    {areaSatisfactory ? (
      <div className="d-grid gap-2" data-hse-field="hseAreaConditionRemarks">
        <CFormTextarea
          aria-label="Area condition remarks"
          label="Area Condition Remarks"
          rows={4}
          placeholder="Record the current safe/satisfactory condition of this area."
          value={values.hseAreaConditionRemarks}
          onChange={(event) =>
            handlers.onUpdateHseField?.('hseAreaConditionRemarks', event.target.value)
          }
        />
        <FormFieldError>
          {hseFieldErrors.hseAreaConditionRemarks ? 'Area condition remarks are required.' : ''}
        </FormFieldError>
        <HseInlineEvidenceActions handlers={handlers} caption="Area Satisfactory" />
      </div>
    ) : null}

    {hasFindings ? (
      <div className="d-grid gap-3">
        <div data-hse-field="hseSeverity">
          <div className="fw-semibold mb-2">Severity</div>
          <div className="d-flex flex-wrap gap-2">
            {HSE_SEVERITY_OPTIONS.map((severity) => (
              <CButton
                type="button"
                key={severity}
                color={values.hseSeverity === severity ? 'primary' : 'light'}
                variant={values.hseSeverity === severity ? undefined : 'outline'}
                size="sm"
                onClick={() => handlers.onUpdateHseField?.('hseSeverity', severity)}
              >
                {severity}
              </CButton>
            ))}
          </div>
          <FormFieldError>
            {hseFieldErrors.hseSeverity ? 'Severity is required for HSE findings.' : ''}
          </FormFieldError>
        </div>

        {selectedFindings.map((selection) => {
          const field = HSE_DETAIL_FIELDS[selection]
          const option = HSE_SELECTION_OPTIONS.find((candidate) => candidate.value === selection)
          return (
            <div key={selection} className="d-grid gap-2" data-hse-field={field.key}>
              <CFormTextarea
                aria-label={field.label}
                label={field.label}
                rows={4}
                placeholder={field.placeholder}
                value={values[field.key]}
                onChange={(event) => handlers.onUpdateHseField?.(field.key, event.target.value)}
              />
              <FormFieldError>
                {hseFieldErrors[field.key] ? `${field.label} is required.` : ''}
              </FormFieldError>
              <HseInlineEvidenceActions
                handlers={handlers}
                caption={option?.label || field.label}
              />
            </div>
          )
        })}

        <FormFieldError>
          {hseFieldErrors.hsePhotoEvidence
            ? 'Add at least one evidence photo for the selected HSE finding.'
            : ''}
        </FormFieldError>

        <CRow className="g-3">
          <CCol xs={12} md={6}>
            <CFormTextarea
              aria-label="Immediate action (optional)"
              label="Immediate action (optional)"
              rows={3}
              value={values.hseImmediateAction}
              placeholder="Immediate control or action taken at site."
              onChange={(event) =>
                handlers.onUpdateHseField?.('hseImmediateAction', event.target.value)
              }
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormTextarea
              aria-label="Corrective action (optional)"
              label="Corrective action (optional)"
              rows={3}
              value={values.hseCorrectiveAction}
              placeholder="Recommended follow-up action."
              onChange={(event) =>
                handlers.onUpdateHseField?.('hseCorrectiveAction', event.target.value)
              }
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormInput
              aria-label="Responsible person (optional)"
              label="Responsible person (optional)"
              value={values.hseResponsiblePerson}
              onChange={(event) =>
                handlers.onUpdateHseField?.('hseResponsiblePerson', event.target.value)
              }
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormInput
              aria-label="Target date (optional)"
              type="date"
              label="Target date (optional)"
              value={values.hseTargetDate}
              onChange={(event) => handlers.onUpdateHseField?.('hseTargetDate', event.target.value)}
            />
          </CCol>
        </CRow>
      </div>
    ) : null}

    <CFormTextarea
      aria-label="General HSE remarks (optional)"
      label="General HSE remarks (optional)"
      rows={3}
      value={values.hseRemarks}
      onChange={(event) => handlers.onUpdateHseField?.('hseRemarks', event.target.value)}
    />

    <FormFieldError>
      {fieldErrors.hseDetails
        ? 'Complete the required remarks/details, severity, and evidence for the selected HSE outcome.'
        : ''}
    </FormFieldError>
  </>
)

export const HseEditSection = ({
  form,
  fieldErrors = {},
  validationState = null,
  handlers = {},
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileDraftFields, setMobileDraftFields] = useState(null)
  const [mobileDraftPhotos, setMobileDraftPhotos] = useState([])
  const [showDiscardChanges, setShowDiscardChanges] = useState(false)
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const normalized = normalizeHseFormFields(form)
  const editableForm = getEditableHseFormFields(form, normalized)
  const savedPhotos = Array.isArray(form?.photos) ? form.photos : []
  const selectedFindings = normalized.hseSelections.filter((selection) =>
    HSE_FINDING_SELECTIONS.includes(selection),
  )
  const hasFindings = selectedFindings.length > 0
  const areaSatisfactory = normalized.hseSelections.includes('areaSatisfactory')
  const hseFieldErrors = validationState?.hse?.missingFields || {}
  const hasSelection = normalized.hseSelections.length > 0
  const outcomeLabel = getHseSelectedOutcomeLabel(normalized)
  const mobilePhotoDirty = getPhotoSignature(mobileDraftPhotos) !== getPhotoSignature(savedPhotos)
  const mobileDraftDirty =
    drawerOpen &&
    getHseDraftSignature(mobileDraftFields || {}, mobileDraftPhotos) !==
      getHseDraftSignature(editableForm, savedPhotos)
  const mobileDraftPhotoCount = dedupePhotos(mobileDraftPhotos).length
  const savedPhotoCount = dedupePhotos(savedPhotos).length
  const openMobileDrawer = () => {
    setMobileDraftFields({ ...editableForm })
    setMobileDraftPhotos(savedPhotos)
    setDrawerOpen(true)
  }
  const closeMobileDrawer = () => {
    setDrawerOpen(false)
    setMobileDraftFields(null)
    setMobileDraftPhotos([])
  }
  const requestCloseMobileDrawer = () => {
    if (mobileDraftDirty) {
      setShowDiscardChanges(true)
      return
    }
    closeMobileDrawer()
  }
  const patchMobileDraftField = (field, value) => {
    setMobileDraftFields((current) =>
      current
        ? {
            ...current,
            [field]: String(value || ''),
          }
        : current,
    )
  }
  const toggleMobileDraftSelection = (selection) => {
    setMobileDraftFields((current) => {
      if (!current) return current
      const nextSelections = toggleHseSelection(current.hseSelections, selection)
      return {
        ...current,
        hseSelections: nextSelections,
        ...(selection === 'areaSatisfactory'
          ? {
              hseUnsafeActDetails: '',
              hseUnsafeConditionDetails: '',
              hseEnvironmentalDetails: '',
              hseSeverity: '',
              hseImmediateAction: '',
              hseCorrectiveAction: '',
              hseResponsiblePerson: '',
              hseTargetDate: '',
            }
          : { hseAreaConditionRemarks: '' }),
      }
    })
  }
  const addMobileDraftPhotos = (nextPhotos = []) => {
    const additions = Array.isArray(nextPhotos) ? nextPhotos.filter(Boolean) : []
    if (additions.length === 0) return
    setMobileDraftPhotos((currentPhotos) => dedupePhotos([...currentPhotos, ...additions]))
  }
  const getMobileDraftPhotoUploadOptions = () => ({
    rootPhotos: mobileDraftPhotos,
    onAddPhotos: addMobileDraftPhotos,
  })
  const saveMobileDraft = () => {
    if (!mobileDraftFields) return
    const result = handlers.onSaveHseObservationDraft?.({
      ...mobileDraftFields,
      photos: dedupePhotos(mobileDraftPhotos),
    })
    if (result === false) return
    closeMobileDrawer()
  }
  const content = (
    <HseEditContent
      values={editableForm}
      selectedFindings={selectedFindings}
      hasFindings={hasFindings}
      areaSatisfactory={areaSatisfactory}
      fieldErrors={fieldErrors}
      hseFieldErrors={hseFieldErrors}
      handlers={handlers}
    />
  )

  if (useMobileDrawer && hasSelection) {
    const mobileValues = mobileDraftFields || editableForm
    const mobileSelectedFindings = mobileValues.hseSelections.filter((selection) =>
      HSE_FINDING_SELECTIONS.includes(selection),
    )
    const mobileAreaSatisfactory = mobileValues.hseSelections.includes('areaSatisfactory')
    return (
      <div className="d-grid gap-2">
        <HseMobileObservationCard label={outcomeLabel} onEdit={openMobileDrawer} />
        <FormFieldError>
          {fieldErrors.hseSelection ? 'Select Area Satisfactory or at least one HSE finding.' : ''}
        </FormFieldError>
        <FormFieldError>
          {fieldErrors.hseDetails ? 'Complete the HSE observation details before review.' : ''}
        </FormFieldError>
        <MobileBottomDrawer
          visible={drawerOpen}
          title="HSE Observation"
          bodyClassName="inspection-equipment-detail-drawer-shell"
          onClose={requestCloseMobileDrawer}
        >
          {drawerOpen ? (
            <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
              <HseEditContent
                values={mobileValues}
                selectedFindings={mobileSelectedFindings}
                hasFindings={mobileSelectedFindings.length > 0}
                areaSatisfactory={mobileAreaSatisfactory}
                fieldErrors={fieldErrors}
                hseFieldErrors={hseFieldErrors}
                handlers={{
                  ...handlers,
                  onToggleHseSelection: toggleMobileDraftSelection,
                  onUpdateHseField: patchMobileDraftField,
                  onTakeGeneralPhoto: (caption) =>
                    handlers.onTakeGeneralPhoto?.(caption, getMobileDraftPhotoUploadOptions()),
                  onUploadGeneralPhoto: (caption) =>
                    handlers.onUploadGeneralPhoto?.(caption, getMobileDraftPhotoUploadOptions()),
                }}
              />
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="small text-body-secondary" aria-live="polite">
                  {mobileDraftDirty
                    ? mobilePhotoDirty
                      ? `${mobileDraftPhotoCount} HSE photo${mobileDraftPhotoCount === 1 ? '' : 's'} ready to save`
                      : 'Unsaved changes'
                    : `${savedPhotoCount} HSE photo${savedPhotoCount === 1 ? '' : 's'} attached`}
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    onClick={requestCloseMobileDrawer}
                  >
                    Cancel
                  </CButton>
                  <CButton type="button" color="primary" onClick={saveMobileDraft}>
                    Save
                  </CButton>
                </div>
              </div>
            </div>
          ) : null}
        </MobileBottomDrawer>
        <ActionConfirmModal
          visible={showDiscardChanges}
          title="Discard changes?"
          message="Your HSE observation changes have not been saved."
          confirmLabel="Discard"
          confirmColor="danger"
          cancelLabel="Keep editing"
          mobileDrawer
          onClose={() => setShowDiscardChanges(false)}
          onConfirm={() => {
            setShowDiscardChanges(false)
            closeMobileDrawer()
          }}
        />
      </div>
    )
  }

  return (
    <CCard className="inspection-hydraulic-card inspection-check-card">
      <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="fw-semibold text-muted">HSE Observation</div>
        </div>
      </CCardHeader>
      <CCardBody className="inspection-hydraulic-card-body d-grid gap-4">{content}</CCardBody>
    </CCard>
  )
}

export const HseReadOnlySection = ({ form }) => {
  const normalized = normalizeHseFormFields(form)
  const findings = normalizeInspectionIssues(form?.inspectionIssues || form?.issues)
  const selectedOptions = HSE_SELECTION_OPTIONS.filter((option) =>
    normalized.hseSelections.includes(option.value),
  )
  const selectedFindings = normalized.hseSelections.filter((selection) =>
    HSE_FINDING_SELECTIONS.includes(selection),
  )
  const hasFindings = selectedFindings.length > 0
  return (
    <div className="inspection-form-section d-grid gap-3">
      <CCard className="inspection-hydraulic-card inspection-check-card">
        <CCardHeader className="inspection-hydraulic-card-header">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="fw-semibold text-muted">HSE Observation</div>
          </div>
        </CCardHeader>
        <CCardBody className="inspection-hydraulic-card-body d-grid gap-4">
          <div>
            <div className="small text-muted mb-2">Selected Outcome</div>
            <div className="d-flex flex-wrap gap-2">
              {selectedOptions.length > 0 ? (
                selectedOptions.map((option) => (
                  <CBadge color="primary" key={option.value}>
                    {option.label}
                  </CBadge>
                ))
              ) : (
                <span className="text-body-secondary">No HSE outcome selected.</span>
              )}
            </div>
          </div>

          <DetailBlock label="Area Condition Remarks" value={normalized.hseAreaConditionRemarks} />

          {hasFindings ? (
            <>
              <div>
                <div className="small text-muted">Severity</div>
                <div className="fw-semibold">{normalized.hseSeverity || '--'}</div>
              </div>
              {selectedFindings.map((selection) => {
                const field = HSE_DETAIL_FIELDS[selection]
                return (
                  <DetailBlock key={selection} label={field.label} value={normalized[field.key]} />
                )
              })}
              <DetailBlock label="Immediate Action" value={normalized.hseImmediateAction} />
              <DetailBlock label="Corrective Action" value={normalized.hseCorrectiveAction} />
              <DetailBlock label="Responsible Person" value={normalized.hseResponsiblePerson} />
              <DetailBlock label="Target Date" value={normalized.hseTargetDate} />
            </>
          ) : null}

          <DetailBlock label="General HSE Remarks" value={normalized.hseRemarks} />
          {findings.length > 0 ? (
            <div className="d-grid gap-3">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="fw-semibold text-muted">Findings</div>
              </div>
              {findings.map((issue, index) => (
                <div className="inspection-finding-card" key={issue.id}>
                  <div className="inspection-finding-card__content d-grid gap-2">
                    {text(issue.description) ? (
                      <div className="fw-semibold" style={{ whiteSpace: 'pre-wrap' }}>
                        {index + 1}. {issue.description}
                      </div>
                    ) : null}
                    {text(issue.actionRequired) ? (
                      <div>
                        <div className="small text-muted">Action required</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{issue.actionRequired}</div>
                      </div>
                    ) : null}
                    {issue.photos.length > 0 ? (
                      <div className="small text-body-secondary">
                        {issue.photos.length} finding photo
                        {issue.photos.length === 1 ? '' : 's'} attached
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CCardBody>
      </CCard>
    </div>
  )
}
