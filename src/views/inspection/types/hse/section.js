import React from 'react'
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
import CreateActionButton from 'src/components/CreateActionButton'
import { FormFieldError } from 'src/views/inspection/components/InspectionFormDisplaySections'
import {
  HSE_DETAIL_FIELDS,
  HSE_FINDING_SELECTIONS,
  HSE_SELECTION_OPTIONS,
  HSE_SEVERITY_OPTIONS,
  normalizeHseFormFields,
} from './helpers'

const text = (value) => String(value || '').trim()

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

export const HseEditSection = ({
  form,
  fieldErrors = {},
  validationState = null,
  handlers = {},
}) => {
  const normalized = normalizeHseFormFields(form)
  const selectedFindings = normalized.hseSelections.filter((selection) =>
    HSE_FINDING_SELECTIONS.includes(selection),
  )
  const hasFindings = selectedFindings.length > 0
  const areaSatisfactory = normalized.hseSelections.includes('areaSatisfactory')
  const hseFieldErrors = validationState?.hse?.missingFields || {}

  return (
    <CCard className="inspection-hydraulic-card inspection-check-card">
      <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="fw-semibold text-muted">HSE Observation</div>
      </CCardHeader>
      <CCardBody className="inspection-hydraulic-card-body d-grid gap-4">
        <HseSelectionButtons
          selections={normalized.hseSelections}
          onToggleHseSelection={handlers.onToggleHseSelection}
        />
        <FormFieldError>
          {fieldErrors.hseSelection ? 'Select Area Satisfactory or at least one HSE finding.' : ''}
        </FormFieldError>

        {areaSatisfactory ? (
          <div className="d-grid gap-2" data-hse-field="hseAreaConditionRemarks">
            <CFormTextarea
              label="Area Condition Remarks"
              rows={4}
              placeholder="Record the current safe/satisfactory condition of this area."
              value={normalized.hseAreaConditionRemarks}
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
                    color={normalized.hseSeverity === severity ? 'primary' : 'light'}
                    variant={normalized.hseSeverity === severity ? undefined : 'outline'}
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
              const option = HSE_SELECTION_OPTIONS.find(
                (candidate) => candidate.value === selection,
              )
              return (
                <div key={selection} className="d-grid gap-2" data-hse-field={field.key}>
                  <CFormTextarea
                    label={field.label}
                    rows={4}
                    placeholder={field.placeholder}
                    value={normalized[field.key]}
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
                  label="Immediate Action (Optional)"
                  rows={3}
                  value={normalized.hseImmediateAction}
                  placeholder="Immediate control or action taken at site."
                  onChange={(event) =>
                    handlers.onUpdateHseField?.('hseImmediateAction', event.target.value)
                  }
                />
              </CCol>
              <CCol xs={12} md={6}>
                <CFormTextarea
                  label="Corrective Action (Optional)"
                  rows={3}
                  value={normalized.hseCorrectiveAction}
                  placeholder="Recommended follow-up action."
                  onChange={(event) =>
                    handlers.onUpdateHseField?.('hseCorrectiveAction', event.target.value)
                  }
                />
              </CCol>
              <CCol xs={12} md={6}>
                <CFormInput
                  label="Responsible Person (Optional)"
                  value={normalized.hseResponsiblePerson}
                  onChange={(event) =>
                    handlers.onUpdateHseField?.('hseResponsiblePerson', event.target.value)
                  }
                />
              </CCol>
              <CCol xs={12} md={6}>
                <CFormInput
                  type="date"
                  label="Target Date (Optional)"
                  value={normalized.hseTargetDate}
                  onChange={(event) =>
                    handlers.onUpdateHseField?.('hseTargetDate', event.target.value)
                  }
                />
              </CCol>
            </CRow>
          </div>
        ) : null}

        <CFormTextarea
          label="General HSE Remarks (Optional)"
          rows={3}
          value={normalized.hseRemarks}
          onChange={(event) => handlers.onUpdateHseField?.('hseRemarks', event.target.value)}
        />

        <FormFieldError>
          {fieldErrors.hseDetails
            ? 'Complete the required remarks/details, severity, and evidence for the selected HSE outcome.'
            : ''}
        </FormFieldError>
      </CCardBody>
    </CCard>
  )
}

export const HseReadOnlySection = ({ form }) => {
  const normalized = normalizeHseFormFields(form)
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
          <div className="fw-semibold text-muted">HSE Observation</div>
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
        </CCardBody>
      </CCard>
    </div>
  )
}
