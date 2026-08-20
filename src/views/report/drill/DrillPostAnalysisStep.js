import React from 'react'
import { CAlert } from '@coreui/react'
import DisclosureCard from 'src/components/DisclosureCard'
import RepeatableTextList from 'src/components/report-workflow/RepeatableTextList'
import ReportPhotoSection from '../shared/emergency-report/ReportPhotoSection'
import { DRILL_FIELD_LIMITS } from './constants'
import DrillContextSummary from './DrillContextSummary'
import DrillStageActions from './DrillStageActions'
import { REPORT_ACTION_LABELS } from '../reportActionLabels'

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
        data-invalid={Boolean(fieldErrors?.postIncidentAnalysis) || undefined}
      >
        {fieldErrors?.postIncidentAnalysis ? (
          <CAlert color="danger" className="mb-0">
            {fieldErrors.postIncidentAnalysis}
          </CAlert>
        ) : null}
        {LISTS.map((section) => {
          const rows = Array.isArray(analysis[section.key]) ? analysis[section.key] : ['']
          return (
            <DisclosureCard
              key={section.key}
              defaultOpen={section.key === 'strengths'}
              summary={
                <div className="d-flex align-items-center justify-content-between gap-2">
                  <span className="fw-semibold">{section.label}</span>
                  <span className="small text-body-secondary">
                    {rows.filter((row) => String(row || '').trim()).length} added
                  </span>
                </div>
              }
            >
              <RepeatableTextList
                id={section.key}
                label={section.label}
                showHeading={false}
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
            </DisclosureCard>
          )
        })}

        <DisclosureCard
          summary={
            <div className="d-flex align-items-center justify-content-between gap-2">
              <span className="fw-semibold">Exercise photographs</span>
              <span className="small text-body-secondary">
                {(Array.isArray(analysis.photos) ? analysis.photos : []).length} added
              </span>
            </div>
          }
        >
          <ReportPhotoSection
            moduleKey="drill"
            title="Exercise photographs"
            showHeading={false}
            photos={analysis.photos}
            onChange={(photos) => updateAnalysis({ photos })}
            pushToast={pushToast}
            onBeforeCameraOpen={() => onSaveDraft({ silentSuccess: true })}
            allowCapture={false}
            onProcessingChange={onPhotoProcessingChange}
            emptyMessage=""
            descriptionMaxLength={DRILL_FIELD_LIMITS.listItem}
          />
        </DisclosureCard>
      </section>

      <DrillStageActions
        onBack={onBack}
        onContinue={onRequestReview}
        continueLabel={REPORT_ACTION_LABELS.REVIEW_AND_SUBMIT}
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
