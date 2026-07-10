import React, { useState } from 'react'
import {
  CButton,
  CFormInput,
  CFormLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'

const text = (value) => String(value || '').trim()

const buildInitialDraft = ({ mode, record, mainLocation, compartment }) => {
  if (mode === 'item') {
    return {
      equipment: record?.equipment || '',
      quantity: record?.quantity || '',
    }
  }
  return {
    location: record?.location || compartment?.location || '',
    subLocation: record?.subLocation || compartment?.subLocation || '',
    mainLocation: record?.mainLocation || compartment?.mainLocation || mainLocation || '',
  }
}

const HighAngleCustomRecordModal = ({
  visible = false,
  mode = 'compartment',
  record = null,
  mainLocation = '',
  compartment = null,
  useDrawer = false,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState(() =>
    buildInitialDraft({ mode, record, mainLocation, compartment }),
  )
  const [error, setError] = useState('')

  const isItem = mode === 'item'
  const title = isItem
    ? record
      ? 'Edit Item'
      : 'Add Item'
    : record
      ? 'Edit Compartment'
      : 'Add Compartment'

  const submit = () => {
    if (isItem && !text(draft.equipment)) {
      setError('Equipment name is required.')
      return
    }
    if (!isItem && !text(draft.location) && !text(draft.subLocation)) {
      setError('Compartment name is required.')
      return
    }
    onSave?.(draft)
  }

  const formBody = (
    <div className="d-grid gap-3">
      {isItem ? (
        <>
          <div>
            <CFormLabel
              htmlFor="high-angle-equipment-name"
              className="small fw-semibold text-muted"
            >
              Equipment name
            </CFormLabel>
            <CFormInput
              id="high-angle-equipment-name"
              value={draft.equipment}
              placeholder="e.g. Rescue Pulley"
              onChange={(event) => {
                setDraft((current) => ({ ...current, equipment: event.target.value }))
                setError('')
              }}
            />
          </div>
          <div>
            <CFormLabel
              htmlFor="high-angle-equipment-quantity"
              className="small fw-semibold text-muted"
            >
              Quantity
            </CFormLabel>
            <CFormInput
              id="high-angle-equipment-quantity"
              value={draft.quantity}
              placeholder="e.g. 1"
              onChange={(event) =>
                setDraft((current) => ({ ...current, quantity: event.target.value }))
              }
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <CFormLabel htmlFor="high-angle-area" className="small fw-semibold text-muted">
              Organizer / area
            </CFormLabel>
            <CFormInput
              id="high-angle-area"
              value={draft.location}
              placeholder="e.g. Heavy Duty Organizer Bag"
              onChange={(event) => {
                setDraft((current) => ({ ...current, location: event.target.value }))
                setError('')
              }}
            />
          </div>
          <div>
            <CFormLabel htmlFor="high-angle-compartment" className="small fw-semibold text-muted">
              Compartment
            </CFormLabel>
            <CFormInput
              id="high-angle-compartment"
              value={draft.subLocation}
              placeholder="e.g. Main Compartment"
              onChange={(event) => {
                setDraft((current) => ({ ...current, subLocation: event.target.value }))
                setError('')
              }}
            />
          </div>
        </>
      )}
      {error ? <div className="small text-danger">{error}</div> : null}
    </div>
  )

  const actions = (
    <>
      <CButton type="button" color="secondary" variant="outline" onClick={onClose}>
        Cancel
      </CButton>
      <CButton type="button" color="primary" onClick={submit}>
        Save
      </CButton>
    </>
  )

  const drawerFooter = (
    <div className="inspection-fire-extinguisher-drawer-footer mobile-bottom-drawer__footer d-flex align-items-center justify-content-end gap-2">
      {actions}
    </div>
  )

  if (useDrawer) {
    return (
      <MobileBottomDrawer
        visible={visible}
        title={title}
        bodyClassName="inspection-equipment-detail-drawer-shell"
        onClose={onClose}
      >
        <div className="inspection-mobile-detail-drawer-body inspection-equipment-detail-drawer-body d-grid">
          {formBody}
        </div>
        {drawerFooter}
      </MobileBottomDrawer>
    )
  }

  return (
    <CModal visible={visible} alignment="center" onClose={onClose}>
      <CModalHeader>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>{formBody}</CModalBody>
      <CModalFooter>{actions}</CModalFooter>
    </CModal>
  )
}

export default HighAngleCustomRecordModal
