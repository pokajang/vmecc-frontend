import React from 'react'
import { HighAngleInspectionChecks } from 'src/views/inspection/form/components/InspectionFormDisplaySections'

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
    onSaveRowDraft={handlers.onSaveRowDraft}
    onResetCheck={handlers.onResetCheck}
    onMarkRowOk={handlers.onMarkRowOk}
    onMarkAllOk={handlers.onMarkAllOk}
    onAddCompartment={handlers.onAddHighAngleCompartment}
    onUpdateCompartment={handlers.onUpdateHighAngleCompartment}
    onDeleteCompartment={handlers.onDeleteHighAngleCompartment}
    onAddItem={handlers.onAddHighAngleItem}
    onUpdateItem={handlers.onUpdateHighAngleItem}
    onDeleteItem={handlers.onDeleteHighAngleItem}
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
