import React from 'react'
import { HydraulicEquipmentChecks } from 'src/views/inspection/components/InspectionFormDisplaySections'

export const HydraulicEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  handlers = {},
}) => (
  <HydraulicEquipmentChecks
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    checks={form.hydraulicChecks}
    summary={summary}
    onUpdateCheck={handlers.onUpdateCheck}
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
    fieldError={fieldErrors.hydraulicChecks}
    remarksError={fieldErrors.hydraulicRemarks}
  />
)

export const HydraulicReadOnlySection = ({ mainLocation, mainLocationLabel, form, summary }) => (
  <div className="inspection-form-section d-grid gap-3">
    <HydraulicEquipmentChecks
      readOnly
      mainLocation={mainLocation}
      mainLocationLabel={mainLocationLabel}
      checks={form.hydraulicChecks}
      summary={summary}
    />
  </div>
)
