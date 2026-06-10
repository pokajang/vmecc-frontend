import React from 'react'
import { CButton } from '@coreui/react'
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
          <CButton
            size="sm"
            className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? <ButtonLoader label="Saving..." /> : saveLabel}
          </CButton>
          <CButton
            size="sm"
            className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </CButton>
        </>
      ) : (
        <CButton
          size="sm"
          className="text-primary px-2 py-1 border-0 bg-transparent shadow-none"
          onClick={onEdit}
        >
          <Pencil size={13} className="me-1 align-text-bottom" />
          {editLabel}
        </CButton>
      )}
    </div>
  )
}

export default EditControls
