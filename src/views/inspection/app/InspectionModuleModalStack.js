import React from 'react'
import InspectionWorkflowActionModal from 'src/views/inspection/ui/InspectionWorkflowActionModal'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import InspectionConfirmModals from './InspectionConfirmModals'
import InspectionContinuationModal from './InspectionContinuationModal'
import InspectionQueueConflictModal from './InspectionQueueConflictModal'
import {
  REPORT_WORKFLOW_DECLARATION_LABEL,
  copyTextToClipboard,
  formatSelectedChecklistLabels,
} from './inspectionModuleUtils'

const InspectionModuleModalStack = ({
  showDiscard,
  setShowDiscard,
  setPendingAction,
  setIsFormDirty,
  pendingAction,
  showDraftChoice,
  openSavedDraft,
  startBlankReport,
  deleteTarget,
  setDeleteTarget,
  confirmDeleteRecord,
  queuedDeleteTarget,
  setQueuedDeleteTarget,
  deleteQueuedSubmission,
  homeTypeDeleteTarget,
  setHomeTypeDeleteTarget,
  homeIncident,
  continuationPrompt,
  continueToInspectionLocation,
  clearContinuationState,
  queueConflictTarget,
  setQueueConflictTarget,
  conflictFields,
  pushToast,
  keepServerConflict,
  saveQueuedAsDraft,
  retryConflictWithLatest,
  workflowActionState,
  workflowRemarks,
  handleWorkflowRemarksChange,
  workflowDeclarationChecked,
  handleWorkflowDeclarationChange,
  workflowDeclarationError,
  workflowRejectError,
  isActionBusy,
  renderStatusBadge,
  formatDateTime,
  closeWorkflowActionModal,
  submitWorkflowAction,
}) => (
  <>
    <InspectionConfirmModals
      showDiscard={showDiscard}
      onCloseDiscard={() => {
        setShowDiscard(false)
        setPendingAction(null)
      }}
      onConfirmDiscard={() => {
        setShowDiscard(false)
        setIsFormDirty(false)
        const action = pendingAction
        setPendingAction(null)
        action?.()
      }}
      showDraftChoice={showDraftChoice}
      onCloseDraftChoice={openSavedDraft}
      onConfirmDraftChoice={startBlankReport}
      deleteTarget={deleteTarget}
      onCloseDeleteTarget={() => setDeleteTarget(null)}
      onConfirmDeleteTarget={confirmDeleteRecord}
      queuedDeleteTarget={queuedDeleteTarget}
      onCloseQueuedDeleteTarget={() => setQueuedDeleteTarget(null)}
      onConfirmQueuedDeleteTarget={() => {
        const target = queuedDeleteTarget
        setQueuedDeleteTarget(null)
        if (target) deleteQueuedSubmission(target)
      }}
      homeTypeDeleteTarget={homeTypeDeleteTarget}
      onCloseHomeTypeDeleteTarget={() => setHomeTypeDeleteTarget(null)}
      onConfirmHomeTypeDeleteTarget={() => {
        if (homeTypeDeleteTarget?.value) homeIncident.removeType(homeTypeDeleteTarget.value)
        setHomeTypeDeleteTarget(null)
      }}
    />
    <InspectionContinuationModal
      prompt={continuationPrompt}
      onSelectLocation={continueToInspectionLocation}
      onDismiss={clearContinuationState}
    />
    <InspectionQueueConflictModal
      target={queueConflictTarget}
      fields={conflictFields}
      onClose={() => setQueueConflictTarget(null)}
      onCopyLocalNotes={async (target) => {
        try {
          const localNotes = [
            target?.description || '',
            formatSelectedChecklistLabels(target)
              .split('\n')
              .filter((line) => line && line !== '--')
              .join('\n'),
          ]
            .filter(Boolean)
            .join('\n')
          await copyTextToClipboard(localNotes)
          pushToast('Local notes copied.', { title: 'Copied', color: 'success' })
        } catch {
          pushToast('Unable to copy local notes.', { title: 'Copy failed', color: 'danger' })
        }
      }}
      onKeepServer={keepServerConflict}
      onSaveLocalAsDraft={saveQueuedAsDraft}
      onRetryWithLatest={retryConflictWithLatest}
    />
    <TypeManagerModal
      visible={homeIncident.showAddTypeModal}
      onClose={homeIncident.closeAddModal}
      editMode={homeIncident.incidentEditMode}
      onSetEditMode={homeIncident.setIncidentEditMode}
      editTitle="Edit Inspection Types"
      addTitle="Add Inspection Type"
      options={homeIncident.typeOptions}
      onStartEdit={homeIncident.startEditType}
      onRequestDelete={({ value, label }) => setHomeTypeDeleteTarget({ value, label })}
      nameLabel="Inspection Type Name"
      nameValue={homeIncident.newTypeName}
      onChangeName={(nextValue) => {
        homeIncident.setNewTypeName(nextValue)
        if (homeIncident.addTypeError) homeIncident.setAddTypeError('')
      }}
      namePlaceholder="e.g. Pump House"
      descriptionLabel="Inspection type details (optional)"
      descriptionValue={homeIncident.newTypeDescription}
      onChangeDescription={homeIncident.setNewTypeDescription}
      descriptionPlaceholder="Subtext shown below type name."
      error={homeIncident.addTypeError}
      editingKey={homeIncident.editingIncidentTypeKey}
      editingLabel="Editing type"
      editButtonLabel="Edit Types"
      onSave={homeIncident.saveType}
      saveLabel="Save Type"
      updateLabel="Update Type"
      iconOptions={homeIncident.iconOptions}
      iconValue={homeIncident.newTypeIconKey}
      onChangeIcon={homeIncident.setNewTypeIconKey}
      showIconPicker
      mobileDrawer
    />
    <InspectionWorkflowActionModal
      visible={workflowActionState.visible}
      actionType={workflowActionState.actionType}
      record={workflowActionState.record}
      remarks={workflowRemarks}
      onRemarksChange={handleWorkflowRemarksChange}
      declarationChecked={workflowDeclarationChecked}
      onDeclarationChange={handleWorkflowDeclarationChange}
      declarationLabel={REPORT_WORKFLOW_DECLARATION_LABEL}
      declarationError={workflowDeclarationError}
      rejectError={workflowRejectError}
      actionDisabled={isActionBusy}
      renderStatusBadge={renderStatusBadge}
      formatDateTime={formatDateTime}
      onClose={closeWorkflowActionModal}
      onSubmit={submitWorkflowAction}
    />
  </>
)

export default InspectionModuleModalStack
