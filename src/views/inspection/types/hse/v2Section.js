import React from 'react'
import { CBadge, CFormTextarea } from '@coreui/react'
import {
  FormFieldError,
  InspectionGeneralEvidenceCard,
} from '../../form/components/InspectionFormDisplaySections'
import { HSE_SELECTION_OPTIONS, normalizeHseFormFields } from './helpers'

const observationFieldFor = (selection) =>
  selection === 'unsafeAct' ? 'hseUnsafeActDetails' : 'hseUnsafeConditionDetails'

export const HseEditSection = (props) => {
  const { form = {}, fieldErrors = {}, handlers = {}, validationState = {} } = props
  const normalized = normalizeHseFormFields(form, { preserveWhitespace: true })
  const selection = normalized.hseSelections[0] || ''
  const selectionLabel =
    HSE_SELECTION_OPTIONS.find((option) => option.value === selection)?.label || ''
  const descriptionField = observationFieldFor(selection)
  const missingDetailKey = validationState?.hse?.firstTarget?.detailKey || ''

  return (
    <div className="d-grid gap-4">
      <div className="d-grid gap-2" data-hse-field="hseSelection">
        <div id="hse-observation-type-label" className="fw-semibold">
          What did you observe?
        </div>
        <div
          className="inspection-hse-choice-grid"
          role="radiogroup"
          aria-labelledby="hse-observation-type-label"
          aria-describedby={fieldErrors.hseSelection ? 'hse-observation-type-error' : undefined}
          aria-invalid={fieldErrors.hseSelection || undefined}
        >
          {HSE_SELECTION_OPTIONS.map((option) => {
            const selected = selection === option.value
            const inputId = `hse-observation-${option.value}`
            return (
              <div key={option.value}>
                <input
                  id={inputId}
                  className="btn-check inspection-hse-choice-input"
                  type="radio"
                  name="hseObservationType"
                  value={option.value}
                  checked={selected}
                  onChange={() => handlers.onToggleHseSelection?.(option.value)}
                />
                <label
                  htmlFor={inputId}
                  className={`btn vmecc-choice-button inspection-hse-choice-btn w-100 h-100 rounded-3 text-start ${
                    selected ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                >
                  <div className="fw-semibold">{option.label}</div>
                  <div className="inspection-hse-choice-btn__description small">
                    {option.description}
                  </div>
                </label>
              </div>
            )
          })}
        </div>
        <FormFieldError id="hse-observation-type-error">
          {fieldErrors.hseSelection ? 'Select Unsafe Act or Unsafe Condition.' : ''}
        </FormFieldError>
      </div>

      {selection ? (
        <div className="d-grid gap-2" data-hse-field={descriptionField}>
          <CFormTextarea
            aria-label="Observation description"
            aria-invalid={
              (fieldErrors.hseDetails && missingDetailKey === descriptionField) || undefined
            }
            aria-describedby={
              fieldErrors.hseDetails && missingDetailKey === descriptionField
                ? 'hse-observation-description-error'
                : undefined
            }
            label="Describe the observation"
            rows={4}
            placeholder="Describe what you observed, who or what was involved, and where it happened."
            value={normalized[descriptionField]}
            onChange={(event) => handlers.onUpdateHseField?.(descriptionField, event.target.value)}
          />
          <FormFieldError id="hse-observation-description-error">
            {fieldErrors.hseDetails && missingDetailKey === descriptionField
              ? 'Describe the selected observation.'
              : ''}
          </FormFieldError>
        </div>
      ) : null}

      <InspectionGeneralEvidenceCard
        title="Observation photo"
        photos={Array.isArray(form.photos) ? form.photos : []}
        presentation="inline"
        fieldError={
          fieldErrors.photos ||
          (fieldErrors.hseDetails && missingDetailKey === 'hsePhotoEvidence'
            ? 'Attach at least one observation photo.'
            : '')
        }
        compactOnMobile
        compactActionLabel="Add observation photo"
        drawerDescription="Attach at least one clear photo of the unsafe act or condition."
        emptyMessage="No observation photo attached."
        remarksLabel=""
        onTakePhoto={(options) => handlers.onTakeGeneralPhoto?.(selectionLabel, options)}
        onUploadPhoto={(options) => handlers.onUploadGeneralPhoto?.(selectionLabel, options)}
        onRemovePhoto={handlers.onRemoveGeneralPhoto}
        onChangePhotoDescription={handlers.onChangeGeneralPhotoDescription}
        onSavePhotos={handlers.onSaveGeneralPhotos}
      />

      <CFormTextarea
        aria-label="Immediate corrective action"
        label="Immediate corrective action (optional)"
        rows={3}
        placeholder="Describe any action taken immediately to reduce or remove the risk."
        value={normalized.hseImmediateAction}
        onChange={(event) => handlers.onUpdateHseField?.('hseImmediateAction', event.target.value)}
      />
    </div>
  )
}

const ReadOnlyValue = ({ label, value }) => {
  if (!String(value || '').trim()) return null
  return (
    <div>
      <div className="small text-muted">{label}</div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  )
}

export const HseReadOnlySection = ({ form = {} }) => {
  const normalized = normalizeHseFormFields(form)
  const selection = normalized.hseSelections[0] || ''
  const option = HSE_SELECTION_OPTIONS.find((candidate) => candidate.value === selection)
  const descriptionField = observationFieldFor(selection)

  return (
    <div className="inspection-form-section d-grid gap-3">
      <div>
        <div className="small text-muted mb-2">Observation type</div>
        {option ? (
          <CBadge color="primary">{option.label}</CBadge>
        ) : (
          <span className="text-body-secondary">No HSE observation selected.</span>
        )}
      </div>
      <ReadOnlyValue label="Description" value={normalized[descriptionField]} />
      <ReadOnlyValue label="Immediate corrective action" value={normalized.hseImmediateAction} />
      <InspectionGeneralEvidenceCard
        readOnly
        presentation="inline"
        title="Observation photo"
        photos={Array.isArray(form.photos) ? form.photos : []}
        emptyMessage="No observation photo attached."
      />
    </div>
  )
}

export default HseEditSection
