import React from 'react'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'

const InspectionConfirmModals = ({
  showDiscard,
  onCloseDiscard,
  onConfirmDiscard,
  showDraftChoice,
  onCloseDraftChoice,
  onConfirmDraftChoice,
  deleteTarget,
  onCloseDeleteTarget,
  onConfirmDeleteTarget,
  queuedDeleteTarget,
  onCloseQueuedDeleteTarget,
  onConfirmQueuedDeleteTarget,
  homeTypeDeleteTarget,
  onCloseHomeTypeDeleteTarget,
  onConfirmHomeTypeDeleteTarget,
}) => (
  <>
    <ActionConfirmModal
      visible={showDiscard}
      title="Discard unsaved changes?"
      message="You have unsaved changes. Continue and discard them?"
      confirmLabel="Discard"
      confirmColor="danger"
      mobileDrawer
      onClose={onCloseDiscard}
      onConfirm={onConfirmDiscard}
    />
    <ActionConfirmModal
      visible={showDraftChoice}
      title="Resume Draft"
      message="A saved draft exists. Continue editing it or start blank and discard that draft?"
      confirmLabel="Start Blank"
      confirmColor="danger"
      mobileDrawer
      onClose={onCloseDraftChoice}
      onConfirm={onConfirmDraftChoice}
    />
    <ActionConfirmModal
      visible={Boolean(deleteTarget)}
      title={deleteTarget?.recordKind === 'draft' ? 'Delete Draft' : 'Delete Report'}
      message={
        deleteTarget?.recordKind === 'draft'
          ? 'Delete this saved draft? This cannot be undone.'
          : `Delete ${deleteTarget?.displayId || 'this report'}? This cannot be undone.`
      }
      confirmLabel="Delete"
      confirmColor="danger"
      mobileDrawer
      onClose={onCloseDeleteTarget}
      onConfirm={onConfirmDeleteTarget}
    />
    <ActionConfirmModal
      visible={Boolean(queuedDeleteTarget)}
      title="Delete Queued Inspection"
      message="Delete this queued inspection from this device? The backend will not be called."
      confirmLabel="Delete queued"
      confirmColor="danger"
      mobileDrawer
      onClose={onCloseQueuedDeleteTarget}
      onConfirm={onConfirmQueuedDeleteTarget}
    />
    <ActionConfirmModal
      visible={Boolean(homeTypeDeleteTarget)}
      title="Delete Type"
      message={
        homeTypeDeleteTarget?.label
          ? `Delete "${homeTypeDeleteTarget.label}"? This cannot be undone.`
          : 'Delete this type?'
      }
      confirmLabel="Delete"
      confirmColor="danger"
      mobileDrawer
      onClose={onCloseHomeTypeDeleteTarget}
      onConfirm={onConfirmHomeTypeDeleteTarget}
    />
  </>
)

export default InspectionConfirmModals
