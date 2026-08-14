import React from 'react'
import AppButton from './AppButton'
import { Pencil } from 'lucide-react'
import ButtonLoader from './ButtonLoader'

const EditControls = ({
  editMode,
  loading,
  onEdit,
  onSave,
  onCancel,
  editLabel = 'Edit',
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  className = '',
}) => {
  return (
    <div className={`d-flex align-items-center gap-2 ${className}`}>
      {editMode ? (
        <>
          <AppButton
            size="sm"
            intent="primary"
            presentation="ghost"
            className="edit-controls__action text-primary px-2 py-1 border-0 bg-transparent shadow-none"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? <ButtonLoader label="Saving..." /> : saveLabel}
          </AppButton>
          <AppButton
            size="sm"
            intent="primary"
            presentation="ghost"
            className="edit-controls__action text-primary px-2 py-1 border-0 bg-transparent shadow-none"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </AppButton>
        </>
      ) : (
        <AppButton
          size="sm"
          intent="primary"
          presentation="ghost"
          className="edit-controls__action icon-label-action text-primary px-2 py-1 border-0 bg-transparent shadow-none"
          onClick={onEdit}
        >
          <Pencil size={13} aria-hidden="true" />
          {editLabel}
        </AppButton>
      )}
    </div>
  )
}

export default EditControls
