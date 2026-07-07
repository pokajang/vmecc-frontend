import React from 'react'
import { ErAuxEquipmentChecks } from 'src/views/inspection/form/components/InspectionFormDisplaySections'

export const ErAuxEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  isLoadingRows = false,
  handlers = {},
}) => (
  <ErAuxEquipmentChecks
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    checks={form.erAuxChecks}
    summary={summary}
    onUpdateCheck={handlers.onUpdateCheck}
    onSaveRowDraft={handlers.onSaveRowDraft}
    onResetCheck={handlers.onResetCheck}
    onMarkEquipmentOk={handlers.onMarkEquipmentOk}
    onMarkAllOk={handlers.onMarkAllOk}
    onRequestPhotoUpload={handlers.onRequestPhotoUpload}
    onRequestDefectPhotoUpload={handlers.onRequestDefectPhotoUpload}
    onRemovePhoto={handlers.onRemovePhoto}
    onChangePhotoDescription={handlers.onChangePhotoDescription}
    onApplyPhotoCaption={handlers.onApplyPhotoCaption}
    onAddEquipment={handlers.onAddEquipment}
    onEditEquipment={handlers.onEditEquipment}
    onDeleteEquipment={handlers.onDeleteEquipment}
    fieldError={fieldErrors.erAuxChecks}
    remarksError={fieldErrors.erAuxRemarks}
    isLoadingRows={isLoadingRows}
  />
)

export const ErAuxReadOnlySection = ({ mainLocation, mainLocationLabel, form, summary }) => (
  <div className="inspection-form-section d-grid gap-3">
    <ErAuxEquipmentChecks
      readOnly
      mainLocation={mainLocation}
      mainLocationLabel={mainLocationLabel}
      checks={form.erAuxChecks}
      summary={summary}
    />
  </div>
)
