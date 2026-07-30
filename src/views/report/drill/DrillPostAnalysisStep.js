import React from 'react'
import { CAlert } from '@coreui/react'
import RepeatableTextList from 'src/components/report-workflow/RepeatableTextList'
import ReportPhotoSection from '../shared/emergency-report/ReportPhotoSection'
import { DRILL_FIELD_LIMITS } from './constants'
import DrillContextSummary from './DrillContextSummary'
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
      <DrillContextSummary form={form} includeTitle />

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
            <RepeatableTextList
              key={section.key}
              id={section.key}
              label={section.label}
              rows={rows}
              maxRows={DRILL_FIELD_LIMITS.analysisRows}
              maxLength={DRILL_FIELD_LIMITS.listItem}
              placeholder={section.placeholder}
              onAdd={() => updateAnalysis({ [section.key]: [...rows, ''] })}
              onChange={(index, value) => updateRow(section.key, index, value)}
              onRemove={(index) =>
                updateAnalysis({
                  [section.key]: rows.filter((_, rowIndex) => rowIndex !== index),
                })
              }
            />
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
          emptyMessage=""
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
