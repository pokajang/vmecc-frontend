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
    inspectedBy={form.highAngleInspectedBy}
    inspectionDate={form.highAngleInspectionDate}
    onUpdateSessionMeta={handlers.onUpdateSessionMeta}
    onUpdateCheck={handlers.onUpdateCheck}
    onMarkRowOk={handlers.onMarkRowOk}
    onMarkAllOk={handlers.onMarkAllOk}
    fieldError={fieldErrors.highAngleChecks}
    remarksError={fieldErrors.highAngleRemarks}
    sessionError={fieldErrors.highAngleSession}
  />
)

export const HighAngleReadOnlySection = ({ mainLocation, mainLocationLabel, form, summary }) => (
  <div className="inspection-form-section d-grid gap-3">
    <HighAngleInspectionChecks
      readOnly
      mainLocation={mainLocation}
      mainLocationLabel={mainLocationLabel}
      summary={summary}
      inspectedBy={form.highAngleInspectedBy}
      inspectionDate={form.highAngleInspectionDate}
    />
  </div>
)
