import React from 'react'
import { ScbaInspectionChecks } from 'src/views/inspection/components/InspectionFormDisplaySections'

export const ScbaEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  handlers = {},
}) => (
  <ScbaInspectionChecks
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    form={form}
    summary={summary}
    inspectedBy={form.scbaInspectedBy}
    inspectionDate={form.scbaInspectionDate}
    onUpdateSessionMeta={handlers.onUpdateSessionMeta}
    onUpdateGroupedCheck={handlers.onUpdateGroupedCheck}
    onMarkRowOk={handlers.onMarkRowOk}
    onMarkAllOk={handlers.onMarkAllOk}
    fieldError={fieldErrors.scbaChecks}
    remarksError={fieldErrors.scbaRemarks}
    sessionError={fieldErrors.scbaSession}
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
      inspectedBy={form.scbaInspectedBy}
      inspectionDate={form.scbaInspectionDate}
    />
  </div>
)
