import React from 'react'
import { CAlert } from '@coreui/react'
import { ReportMobileActionGroup } from '../components/ReportWorkflowUi'
import {
  PostIncidentAnalysisSection,
  DetailsStepActions,
  IncidentSummaryPanel,
} from './erco-form-components'
import useReportIsMobile from '../hooks/useReportIsMobile'
import { REPORT_ACTION_LABELS } from '../reportActionLabels'

const ErcoPostAnalysisStep = ({
  form,
  fieldErrors,
  setForm,
  pushToast,
  onBack,
  onClear,
  showIncidentSummary = true,
  showActions = true,
  isSaving = false,
  primaryLabel = REPORT_ACTION_LABELS.SUBMIT_REPORT,
  photoProcessing = false,
  onPhotoProcessingChange,
}) => {
  const isMobile = useReportIsMobile()

  return (
    <div className="mb-3 d-grid gap-4">
      {showIncidentSummary ? <IncidentSummaryPanel form={form} /> : null}

      {fieldErrors.postIncidentStrengths ? (
        <CAlert color="danger" className="mb-0">
          {fieldErrors.postIncidentStrengths}
        </CAlert>
      ) : null}

      <PostIncidentAnalysisSection
        value={form.postIncidentAnalysis}
        onChange={(next) =>
          setForm((prev) => ({
            ...prev,
            postIncidentAnalysis:
              typeof next === 'function' ? next(prev.postIncidentAnalysis) : next,
          }))
        }
        pushToast={pushToast}
        allowCapture={false}
        fieldErrors={fieldErrors}
        onPhotoProcessingChange={onPhotoProcessingChange}
      />

      {showActions ? (
        isMobile ? (
          <ReportMobileActionGroup
            primaryLabel={primaryLabel}
            primaryType="submit"
            primaryDisabled={photoProcessing}
            isSaving={isSaving}
          />
        ) : (
          <DetailsStepActions
            onBack={onBack}
            onClear={onClear}
            primaryLabel={primaryLabel}
            primaryDisabled={photoProcessing}
            isSaving={isSaving}
          />
        )
      ) : null}
    </div>
  )
}

export default ErcoPostAnalysisStep
