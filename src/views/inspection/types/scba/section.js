import React from 'react'
import { ScbaInspectionChecks } from 'src/views/inspection/form/components/InspectionFormDisplaySections'

export const ScbaEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  isLoadingRows = false,
  handlers = {},
}) => (
  <ScbaInspectionChecks
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    form={form}
    summary={summary}
    onUpdateGroupedCheck={handlers.onUpdateGroupedCheck}
    onSaveGroupedRowDraft={handlers.onSaveGroupedRowDraft}
    onResetGroupedCheck={handlers.onResetGroupedCheck}
    onMarkRowOk={handlers.onMarkRowOk}
    onMarkGroupOk={handlers.onMarkGroupOk}
    onAddSection={handlers.onAddScbaSection}
    onEditSection={handlers.onEditScbaSection}
    onDeleteSection={handlers.onDeleteScbaSection}
    onArchiveSection={handlers.onArchiveScbaSection}
    onRestoreSection={handlers.onRestoreScbaSection}
    onAddItem={handlers.onAddScbaItem}
    onEditItem={handlers.onEditScbaItem}
    onDeleteItem={handlers.onDeleteScbaItem}
    onArchiveItem={handlers.onArchiveScbaItem}
    onRestoreItem={handlers.onRestoreScbaItem}
    onRequestPhotoUpload={handlers.onRequestPhotoUpload}
    onRequestIssuePhotoUpload={handlers.onRequestScbaIssuePhotoUpload}
    onRemovePhoto={handlers.onRemovePhoto}
    onChangePhotoDescription={handlers.onChangePhotoDescription}
    onApplyPhotoCaption={handlers.onApplyPhotoCaption}
    fieldError={fieldErrors.scbaChecks}
    remarksError={fieldErrors.scbaRemarks}
    isLoadingRows={isLoadingRows}
  />
)

export const ScbaReadOnlySection = ({ mainLocation, mainLocationLabel, form, summary }) => (
  <div className="inspection-form-section d-grid gap-3">
    <ScbaInspectionChecks
      readOnly
      mainLocation={mainLocation}
      mainLocationLabel={mainLocationLabel}
      form={form}
      summary={summary}
    />
  </div>
)
