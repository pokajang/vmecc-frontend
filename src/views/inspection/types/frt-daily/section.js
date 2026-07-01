import React from 'react'
import { FrtDailyInspectionChecks } from 'src/views/inspection/components/InspectionFormDisplaySections'

export const FrtDailyEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  handlers = {},
}) => (
  <FrtDailyInspectionChecks
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    summary={summary}
    form={form}
    onUpdateSessionMeta={handlers.onUpdateSessionMeta}
    onUpdateCheck={handlers.onUpdateCheck}
    onMarkRowOk={handlers.onMarkRowOk}
    onMarkAllOk={handlers.onMarkAllOk}
    fieldErrors={fieldErrors}
  />
)

export const FrtDailyReadOnlySection = ({ mainLocation, mainLocationLabel, form, summary }) => (
  <div className="inspection-form-section d-grid gap-3">
    <FrtDailyInspectionChecks
      readOnly
      mainLocation={mainLocation}
      mainLocationLabel={mainLocationLabel}
      summary={summary}
      form={form}
    />
  </div>
)
