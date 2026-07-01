import React from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { Pencil, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'

const ICON_BUTTON_CLASS = 'p-1 d-inline-flex align-items-center bg-transparent border-0 shadow-none'

const TypeManagerModal = ({
  visible,
  onClose,
  editMode,
  onSetEditMode,
  editTitle,
  addTitle,
  options = [],
  onStartEdit,
  onRequestDelete,
  nameLabel,
  nameValue,
  onChangeName,
  namePlaceholder,
  descriptionLabel,
  descriptionValue,
  onChangeDescription,
  descriptionPlaceholder,
  error,
  editingKey,
  editingLabel,
  editButtonLabel,
  onSave,
  saveLabel,
  updateLabel,
  showDescriptionField = true,
  nameHint = '',
  iconOptions = [],
  iconValue = '',
  onChangeIcon,
  showIconPicker = false,
  showRowIcon = true,
  tourId = '',
}) => {
  const shouldShowIconPicker = showIconPicker || iconOptions.length > 0
  const hasIconPicker = shouldShowIconPicker && typeof onChangeIcon === 'function'
  const iconPickerUnavailable = showIconPicker && hasIconPicker && iconOptions.length === 0

  return (
    <CModal
      visible={visible}
      alignment="center"
      onClose={onClose}
      scrollable
      className="type-manager-modal"
      {...(tourId ? { 'data-tour-id': tourId } : {})}
    >
      <CModalHeader>
        <CModalTitle>{editMode || editingKey ? editTitle : addTitle}</CModalTitle>
      </CModalHeader>
      <CModalBody className="type-manager-modal__body d-grid gap-3">
        {editMode ? (
          <div className="type-manager-modal__edit-list d-grid gap-2">
            {options.map((row) => {
              const RowIcon = row.icon
              const canEdit = row.canEdit !== false
              const canDelete = row.canDelete !== false
              return (
                <div
                  key={row.value}
                  className="type-manager-modal__edit-row d-flex justify-content-between align-items-start gap-2 border rounded px-2 py-2"
                >
                  <div className="d-flex align-items-start gap-2" style={{ minWidth: 0 }}>
                    {showRowIcon && RowIcon ? (
                      <span
                        className="rounded-circle bg-light text-primary d-inline-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                        style={{ width: 28, height: 28 }}
                      >
                        <RowIcon size={14} />
                      </span>
                    ) : null}
                    <div style={{ minWidth: 0 }}>
                      <div>{row.title}</div>
                      {row.description ? <div className="text-muted">{row.description}</div> : null}
                      {row.readOnlyReason ? (
                        <div className="text-muted small">{row.readOnlyReason}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    {canEdit ? (
                      <CButton
                        type="button"
                        size="sm"
                        color="link"
                        className={`text-primary ${ICON_BUTTON_CLASS}`}
                        aria-label={`Edit ${row.title || row.value}`}
                        title={`Edit ${row.title || row.value}`}
                        onClick={() => onStartEdit(row)}
                      >
                        <Pencil size={14} />
                      </CButton>
                    ) : null}
                    {canDelete ? (
                      <CButton
                        type="button"
                        size="sm"
                        color="link"
                        className={`text-danger ${ICON_BUTTON_CLASS}`}
                        aria-label={`Delete ${row.title || row.value}`}
                        title={`Delete ${row.title || row.value}`}
                        onClick={() =>
                          onRequestDelete({
                            value: row.value,
                            label: row.title || row.value,
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </CButton>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <div>
              <CFormLabel className="text-muted">{nameLabel}</CFormLabel>
              <CFormInput
                maxLength={40}
                value={nameValue}
                invalid={Boolean(error)}
                placeholder={namePlaceholder}
                onChange={(event) => onChangeName(event.target.value)}
              />
              {nameHint ? <div className="small text-muted mt-1">{nameHint}</div> : null}
            </div>
            {showDescriptionField ? (
              <div>
                <CFormLabel className="text-muted">{descriptionLabel}</CFormLabel>
                <CFormTextarea
                  rows={2}
                  maxLength={90}
                  value={descriptionValue}
                  placeholder={descriptionPlaceholder}
                  onChange={(event) => onChangeDescription(event.target.value)}
                />
              </div>
            ) : null}
            {error ? <div className="small text-danger">{error}</div> : null}
            {hasIconPicker ? (
              <div>
                <CFormLabel className="text-muted">Choose Icon</CFormLabel>
                {iconOptions.length > 0 ? (
                  <div className="type-manager-modal__icon-grid">
                    {iconOptions.map((option) => {
                      const Icon = option.icon
                      const selected = iconValue === option.key
                      return (
                        <button
                          key={option.key}
                          type="button"
                          className={`type-manager-modal__icon-choice ${
                            selected ? 'type-manager-modal__icon-choice--selected' : ''
                          }`.trim()}
                          aria-label={`Use ${option.label} icon`}
                          aria-pressed={selected}
                          title={option.label}
                          onClick={() => onChangeIcon(option.key)}
                        >
                          {Icon ? <Icon size={17} /> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="small text-muted">No unused icons available.</div>
                )}
              </div>
            ) : null}
            {editingKey ? (
              <div className="small text-primary">
                {editingLabel}: <strong>{nameValue || editingKey}</strong>
              </div>
            ) : null}
            <div className="pt-1">
              <CreateActionButton
                label={editButtonLabel}
                onClick={() => onSetEditMode(true)}
                size="sm"
              />
            </div>
          </>
        )}
      </CModalBody>
      <CModalFooter>
        {editMode ? (
          <>
            <CButton color="light" onClick={() => onSetEditMode(false)}>
              Back
            </CButton>
            <CButton color="light" onClick={onClose}>
              Close
            </CButton>
          </>
        ) : (
          <>
            <CButton color="light" onClick={onClose}>
              Cancel
            </CButton>
            <CButton color="primary" disabled={iconPickerUnavailable} onClick={onSave}>
              {editingKey ? updateLabel : saveLabel}
            </CButton>
          </>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default TypeManagerModal
