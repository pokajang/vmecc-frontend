import React from 'react'
import {
  CBadge,
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
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'

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
  getRowBadgeLabel,
  warningNotice = '',
  testId = '',
  mobileDrawer = false,
}) => {
  const shouldShowIconPicker = showIconPicker || iconOptions.length > 0
  const hasIconPicker = shouldShowIconPicker && typeof onChangeIcon === 'function'
  const iconPickerUnavailable = showIconPicker && hasIconPicker && iconOptions.length === 0
  const isMobileDrawerViewport = useMediaQuery('(max-width: 575.98px)')
  const useDrawer = mobileDrawer && isMobileDrawerViewport
  const title = editMode || editingKey ? editTitle : addTitle

  const body = (
    <>
      {editMode ? (
        <div className="type-manager-modal__edit-list d-grid gap-2">
          {options.length === 0 ? (
            <div className="rounded-3 border bg-light-subtle px-3 py-3 text-body-secondary">
              No items available to edit.
            </div>
          ) : null}
          {options.map((row) => {
            const RowIcon = row.icon
            const canEdit = row.canEdit !== false
            const canDelete = row.canDelete !== false
            const rowBadgeLabel = getRowBadgeLabel?.(row) || ''
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
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <div>{row.title}</div>
                      {rowBadgeLabel ? (
                        <CBadge color="warning" shape="rounded-pill">
                          {rowBadgeLabel}
                        </CBadge>
                      ) : null}
                    </div>
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
          {warningNotice ? (
            <div className="small rounded border border-warning-subtle bg-warning-subtle text-body px-3 py-2">
              {warningNotice}
            </div>
          ) : null}
          <div>
            <CFormLabel htmlFor="type-manager-name" className="text-muted">
              {nameLabel}
            </CFormLabel>
            <CFormInput
              id="type-manager-name"
              maxLength={40}
              value={nameValue}
              invalid={Boolean(error)}
              aria-describedby={
                error ? 'type-manager-name-error' : nameHint ? 'type-manager-name-hint' : undefined
              }
              placeholder={namePlaceholder}
              onChange={(event) => onChangeName(event.target.value)}
            />
            {nameHint ? (
              <div id="type-manager-name-hint" className="small text-muted mt-1">
                {nameHint}
              </div>
            ) : null}
          </div>
          {showDescriptionField ? (
            <div>
              <CFormLabel htmlFor="type-manager-description" className="text-muted">
                {descriptionLabel}
              </CFormLabel>
              <CFormTextarea
                id="type-manager-description"
                rows={2}
                maxLength={90}
                value={descriptionValue}
                placeholder={descriptionPlaceholder}
                onChange={(event) => onChangeDescription(event.target.value)}
              />
            </div>
          ) : null}
          {error ? (
            <div id="type-manager-name-error" className="invalid-feedback d-block">
              {error}
            </div>
          ) : null}
          {hasIconPicker ? (
            <fieldset className="border-0 p-0 m-0">
              <legend className="form-label text-muted">Choose icon</legend>
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
            </fieldset>
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
    </>
  )

  const footer = editMode ? (
    <>
      <CButton
        type="button"
        color="secondary"
        variant="outline"
        onClick={() => onSetEditMode(false)}
      >
        Back
      </CButton>
      <CButton type="button" color="secondary" variant="outline" onClick={onClose}>
        Close
      </CButton>
    </>
  ) : (
    <>
      <CButton type="button" color="light" onClick={onClose}>
        Cancel
      </CButton>
      <CButton type="button" color="primary" disabled={iconPickerUnavailable} onClick={onSave}>
        {editingKey ? updateLabel : saveLabel}
      </CButton>
    </>
  )

  if (useDrawer) {
    return (
      <MobileBottomDrawer visible={visible} title={title} onClose={onClose}>
        <div className="type-manager-modal__body d-grid gap-3">
          {body}
          <div className="mobile-bottom-drawer__footer d-flex justify-content-end gap-2">
            {footer}
          </div>
        </div>
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal
      visible={visible}
      alignment="center"
      onClose={onClose}
      scrollable
      className="type-manager-modal"
      {...(testId ? { 'data-testid': testId } : {})}
    >
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody className="type-manager-modal__body d-grid gap-3">{body}</CModalBody>
      <CModalFooter>{footer}</CModalFooter>
    </CModal>
  )
}

export default TypeManagerModal
