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
    onRequestIssuePhotoUpload={handlers.onRequestFrtIssuePhotoUpload}
    onRemovePhoto={handlers.onRemovePhoto}
    onChangePhotoDescription={handlers.onChangePhotoDescription}
    onApplyPhotoCaption={handlers.onApplyPhotoCaption}
    selectedTruckOption={handlers.selectedTruckOption}
    onEditTruck={handlers.onEditTruck}
    onDeleteTruck={handlers.onDeleteTruck}
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
