import React from 'react'
import { ErAuxEquipmentChecks } from 'src/views/inspection/components/InspectionFormDisplaySections'

export const ErAuxEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  handlers = {},
}) => (
  <ErAuxEquipmentChecks
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    checks={form.erAuxChecks}
    summary={summary}
    inspectedBy={form.erAuxInspectedBy}
    inspectionDate={form.erAuxInspectionDate}
    onUpdateCheck={handlers.onUpdateCheck}
    onUpdateSessionMeta={handlers.onUpdateSessionMeta}
    onMarkEquipmentOk={handlers.onMarkEquipmentOk}
    onMarkAllOk={handlers.onMarkAllOk}
    onAddEquipment={handlers.onAddEquipment}
    onEditEquipment={handlers.onEditEquipment}
    onDeleteEquipment={handlers.onDeleteEquipment}
    fieldError={fieldErrors.erAuxChecks}
    remarksError={fieldErrors.erAuxRemarks}
    sessionError={fieldErrors.erAuxSession}
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
      inspectedBy={form.erAuxInspectedBy}
      inspectionDate={form.erAuxInspectionDate}
    />
  </div>
)
