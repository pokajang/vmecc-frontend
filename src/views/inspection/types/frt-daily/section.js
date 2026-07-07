import React from 'react'
import { FrtDailyInspectionChecks } from './frtDailyInspectionChecks'

export const FrtDailyEditSection = ({
  mainLocation,
  mainLocationLabel,
  form,
  summary,
  fieldErrors = {},
  validationState = null,
  draftStatus = '',
  handlers = {},
}) => (
  <FrtDailyInspectionChecks
    mainLocation={mainLocation}
    mainLocationLabel={mainLocationLabel}
    summary={summary}
    form={form}
    onUpdateSessionMeta={handlers.onUpdateSessionMeta}
    onUpdateCheck={handlers.onUpdateCheck}
    onResetCheck={handlers.onResetCheck}
    onMarkRowOk={handlers.onMarkRowOk}
    onMarkAllOk={handlers.onMarkAllOk}
    onRequestIssuePhotoUpload={handlers.onRequestFrtIssuePhotoUpload}
    onRemovePhoto={handlers.onRemovePhoto}
    onChangePhotoDescription={handlers.onChangePhotoDescription}
    onApplyPhotoCaption={handlers.onApplyPhotoCaption}
    selectedTruckOption={handlers.selectedTruckOption}
    onEditTruck={handlers.onEditTruck}
    onDeleteTruck={handlers.onDeleteTruck}
    onSaveFrtRowDraft={handlers.onSaveFrtRowDraft}
    onAddItem={handlers.onAddFrtItem}
    onDeleteItem={handlers.onDeleteFrtItem}
    fieldErrors={fieldErrors}
    validationState={validationState}
    draftStatus={draftStatus}
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
