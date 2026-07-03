import React from 'react'
import { HighAngleInspectionChecks } from 'src/views/inspection/components/InspectionFormDisplaySections'

export const HighAngleEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  handlers = {},
}) => (
  <HighAngleInspectionChecks
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    summary={summary}
    onUpdateCheck={handlers.onUpdateCheck}
    onMarkRowOk={handlers.onMarkRowOk}
    onMarkAllOk={handlers.onMarkAllOk}
    onRequestIssuePhotoUpload={handlers.onRequestHighAngleIssuePhotoUpload}
    onRemovePhoto={handlers.onRemovePhoto}
    onChangePhotoDescription={handlers.onChangePhotoDescription}
    onApplyPhotoCaption={handlers.onApplyPhotoCaption}
    fieldError={fieldErrors.highAngleChecks}
    remarksError={fieldErrors.highAngleRemarks}
  />
)

export const HighAngleReadOnlySection = ({ mainLocation, mainLocationLabel, form, summary }) => (
  <div className="inspection-form-section d-grid gap-3">
    <HighAngleInspectionChecks
      readOnly
      mainLocation={mainLocation}
      mainLocationLabel={mainLocationLabel}
      summary={summary}
    />
  </div>
)
