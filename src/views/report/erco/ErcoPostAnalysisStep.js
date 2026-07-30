import React from 'react'
import { CAlert } from '@coreui/react'
import { ReportMobileActionGroup } from '../components/ReportWorkflowUi'
import {
  PostIncidentAnalysisSection,
  DetailsStepActions,
  IncidentSummaryPanel,
} from './erco-form-components'
import useIsMobile from './erco-form-components/useIsMobile'

const ErcoPostAnalysisStep = ({
  form,
  fieldErrors,
  setForm,
  pushToast,
  onBack,
  onClear,
  onSaveDraft,
  showIncidentSummary = true,
  showActions = true,
  saveLabel = 'Save Draft',
  primaryLabel = 'Submit Report',
  draftStatus = '',
  photoProcessing = false,
  onPhotoProcessingChange,
}) => {
  const isMobile = useIsMobile()

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
            onSaveDraft={onSaveDraft}
            saveLabel={saveLabel}
            primaryLabel={primaryLabel}
            primaryType="submit"
            saveDisabled={photoProcessing}
            primaryDisabled={photoProcessing}
            statusMessage={photoProcessing ? 'Uploading incident photo…' : draftStatus}
          />
        ) : (
          <DetailsStepActions
            onBack={onBack}
            onClear={onClear}
            onSaveDraft={onSaveDraft}
            saveLabel={saveLabel}
            primaryLabel={primaryLabel}
            saveDisabled={photoProcessing}
            primaryDisabled={photoProcessing}
            statusMessage={photoProcessing ? 'Uploading incident photo…' : draftStatus}
          />
        )
      ) : null}
    </div>
  )
}

export default ErcoPostAnalysisStep
