import React from 'react'
import { CAlert, CButton, CFormInput } from '@coreui/react'
import { Plus, Trash2 } from 'lucide-react'
import ReportPhotoSection from '../shared/emergency-report/ReportPhotoSection'
import { DRILL_FIELD_LIMITS } from './constants'
import DrillStageActions from './DrillStageActions'

const LISTS = [
  { key: 'strengths', label: 'Strengths', placeholder: 'What worked well?' },
  {
    key: 'resourcesMobilised',
    label: 'Resources, equipment and consumables mobilised',
    placeholder: 'Resource or equipment used',
  },
  {
    key: 'improvementOpportunities',
    label: 'Improvement opportunities',
    placeholder: 'What should be improved?',
  },
]

const DrillPostAnalysisStep = ({
  form,
  setForm,
  fieldErrors,
  pushToast,
  onBack,
  onSaveDraft,
  onRequestReview,
  saveLabel,
  draftStatus,
  blockerMessage,
  isSaving,
  photoProcessing,
  onPhotoProcessingChange,
}) => {
  const analysis = form.postIncidentAnalysis || {}
  const updateAnalysis = (patch) =>
    setForm((prev) => ({
      ...prev,
      postIncidentAnalysis: { ...(prev.postIncidentAnalysis || {}), ...patch },
    }))

  const updateRow = (key, index, value) => {
    const rows = Array.isArray(analysis[key]) ? [...analysis[key]] : []
    rows[index] = value
    updateAnalysis({ [key]: rows })
  }

  return (
    <div className="d-grid gap-4">
      <section
        data-drill-field="postIncidentAnalysis"
        aria-invalid={Boolean(fieldErrors?.postIncidentAnalysis) || undefined}
      >
        {fieldErrors?.postIncidentAnalysis ? (
          <CAlert color="danger" className="mb-0">
            {fieldErrors.postIncidentAnalysis}
          </CAlert>
        ) : null}
        {LISTS.map((section) => {
          const rows = Array.isArray(analysis[section.key]) ? analysis[section.key] : ['']
          return (
            <section key={section.key} className="d-grid gap-2" aria-labelledby={section.key}>
              <div className="d-flex justify-content-between align-items-center gap-2">
                <div id={section.key} className="fw-semibold">
                  {section.label}
                  <span className="ms-2 small text-body-secondary fw-normal">
                    {rows.length}/{DRILL_FIELD_LIMITS.analysisRows}
                  </span>
                </div>
                <CButton
                  type="button"
                  color="light"
                  size="sm"
                  disabled={rows.length >= DRILL_FIELD_LIMITS.analysisRows}
                  onClick={() => updateAnalysis({ [section.key]: [...rows, ''] })}
                >
                  <Plus size={14} className="me-1" /> Add
                </CButton>
              </div>
              {rows.map((row, index) => (
                <div key={`${section.key}-${index}`} className="d-flex gap-2">
                  <CFormInput
                    aria-label={`${section.label} entry ${index + 1}`}
                    maxLength={DRILL_FIELD_LIMITS.listItem}
                    value={row || ''}
                    placeholder={section.placeholder}
                    onChange={(event) => updateRow(section.key, index, event.target.value)}
                  />
                  <CButton
                    type="button"
                    color="light"
                    aria-label={`Remove ${section.label} entry ${index + 1}`}
                    disabled={rows.length <= 1}
                    onClick={() =>
                      updateAnalysis({
                        [section.key]: rows.filter((_, rowIndex) => rowIndex !== index),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </CButton>
                </div>
              ))}
            </section>
          )
        })}

        <ReportPhotoSection
          moduleKey="drill"
          title="Exercise photographs"
          photos={analysis.photos}
          onChange={(photos) => updateAnalysis({ photos })}
          pushToast={pushToast}
          onBeforeCameraOpen={() => onSaveDraft({ silentSuccess: true })}
          allowCapture={false}
          onProcessingChange={onPhotoProcessingChange}
          emptyMessage="No photos."
          descriptionMaxLength={DRILL_FIELD_LIMITS.listItem}
        />
      </section>

      <DrillStageActions
        onBack={onBack}
        onSaveDraft={onSaveDraft}
        onContinue={onRequestReview}
        saveLabel={saveLabel}
        continueLabel="Review & Submit"
        statusMessage={draftStatus}
        blockerMessage={
          photoProcessing
            ? 'Wait for the current photo upload to finish or leave this stage to cancel it.'
            : blockerMessage
        }
        isSaving={isSaving}
      />
    </div>
  )
}

export default DrillPostAnalysisStep
