import React from 'react'
import {
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import { Pencil, Trash2 } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionCard from 'src/components/IconOptionCard'

const ICON_BUTTON_CLASS = 'p-1 d-inline-flex align-items-center bg-transparent border-0 shadow-none'

const TypeManagerModal = ({
  visible,
  onClose,
  editMode,
  onSetEditMode,
  editTitle,
  addTitle,
  options,
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
  showRowIcon = true,
}) => {
  return (
    <CModal visible={visible} alignment="center" onClose={onClose} fullscreen="sm" scrollable>
      <CModalHeader>
        <CModalTitle>{editMode ? editTitle : addTitle}</CModalTitle>
      </CModalHeader>
      <CModalBody className="d-grid gap-3">
        {editMode ? (
          <div className="d-grid gap-2">
            {options.map((row) => {
              const RowIcon = row.icon
              return (
                <div
                  key={row.value}
                  className="d-flex justify-content-between align-items-start gap-2 border rounded px-2 py-2"
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
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <CButton
                      type="button"
                      size="sm"
                      color="link"
                      className={`text-primary ${ICON_BUTTON_CLASS}`}
                      onClick={() => onStartEdit(row)}
                    >
                      <Pencil size={14} />
                    </CButton>
                    <CButton
                      type="button"
                      size="sm"
                      color="link"
                      className={`text-danger ${ICON_BUTTON_CLASS}`}
                      onClick={() =>
                        onRequestDelete({
                          value: row.value,
                          label: row.title || row.value,
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </CButton>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
            <div>
              <CFormLabel>{nameLabel}</CFormLabel>
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
                <CFormLabel>{descriptionLabel}</CFormLabel>
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
            {iconOptions.length > 0 ? (
              <div>
                <CFormLabel>Icon</CFormLabel>
                <CRow className="g-2">
                  {iconOptions.map((option) => (
                    <CCol key={option.key} xs={4} sm={3}>
                      <IconOptionCard
                        title={option.label}
                        icon={option.icon}
                        selected={iconValue === option.key}
                        variant="compact"
                        showDescription={false}
                        iconSize={16}
                        iconContainerSize={32}
                        titleClassName="small fw-semibold text-center"
                        bodyClassName="d-flex flex-column align-items-center gap-2 text-center"
                        paddingClassName="p-2"
                        onSelect={() => onChangeIcon?.(option.key)}
                      />
                    </CCol>
                  ))}
                </CRow>
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
            <CButton color="primary" onClick={onSave}>
              {editingKey ? updateLabel : saveLabel}
            </CButton>
          </>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default TypeManagerModal
