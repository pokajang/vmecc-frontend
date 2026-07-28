import React from 'react'
import { CBadge, CButton, CCard, CCardBody, CFormTextarea } from '@coreui/react'
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
    <CCard className="inspection-check-card">
      <CCardBody className="d-grid gap-4">
        <div className="d-grid gap-2" data-hse-field="hseSelection">
          <div className="fw-semibold">What did you observe?</div>
          <div className="row g-2">
            {HSE_SELECTION_OPTIONS.map((option) => {
              const selected = selection === option.value
              return (
                <div className="col-12 col-md-6" key={option.value}>
                  <CButton
                    type="button"
                    color={selected ? 'primary' : 'light'}
                    variant={selected ? undefined : 'outline'}
                    className="w-100 h-100 rounded-3 text-start"
                    onClick={() => handlers.onToggleHseSelection?.(option.value)}
                  >
                    <div className="fw-semibold">{option.label}</div>
                    <div className="small opacity-75">{option.description}</div>
                  </CButton>
                </div>
              )
            })}
          </div>
          <FormFieldError>
            {fieldErrors.hseSelection ? 'Select Unsafe Act or Unsafe Condition.' : ''}
          </FormFieldError>
        </div>

        {selection ? (
          <div className="d-grid gap-2" data-hse-field={descriptionField}>
            <CFormTextarea
              aria-label="Observation description"
              label="Describe the observation"
              rows={4}
              placeholder="Describe what you observed, who or what was involved, and where it happened."
              value={normalized[descriptionField]}
              onChange={(event) =>
                handlers.onUpdateHseField?.(descriptionField, event.target.value)
              }
            />
            <FormFieldError>
              {fieldErrors.hseDetails && missingDetailKey === descriptionField
                ? 'Describe the selected observation.'
                : ''}
            </FormFieldError>
          </div>
        ) : null}

        <InspectionGeneralEvidenceCard
          title="Observation photo"
          photos={Array.isArray(form.photos) ? form.photos : []}
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
          onChange={(event) =>
            handlers.onUpdateHseField?.('hseImmediateAction', event.target.value)
          }
        />
      </CCardBody>
    </CCard>
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
    <div className="inspection-form-section">
      <CCard className="inspection-check-card">
        <CCardBody className="d-grid gap-3">
          <div>
            <div className="small text-muted mb-2">Observation type</div>
            {option ? (
              <CBadge color="primary">{option.label}</CBadge>
            ) : (
              <span className="text-body-secondary">No HSE observation selected.</span>
            )}
          </div>
          <ReadOnlyValue label="Description" value={normalized[descriptionField]} />
          <ReadOnlyValue
            label="Immediate corrective action"
            value={normalized.hseImmediateAction}
          />
        </CCardBody>
      </CCard>
    </div>
  )
}

export default HseEditSection
