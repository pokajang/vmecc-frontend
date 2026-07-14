import React, { useCallback, useState } from 'react'
import {
  CAlert,
  CButton,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
} from '@coreui/react'
import { CheckCircle2, X } from 'lucide-react'

import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'
import useInspectionUnsavedChangesGuard from 'src/views/inspection/state/useInspectionUnsavedChangesGuard'
import {
  createFireExtinguisherBatch,
  getFireExtinguisherBatchDuplicateConflict,
} from 'src/views/inspection/inspectionFireExtinguisherApi'
import FireExtinguisherBatchCreateForm from './FireExtinguisherBatchCreateForm'

const DISCARD_MESSAGE = 'Discard the unsaved fire extinguisher details?'

const FireExtinguisherCreateDrawer = ({ visible, onClose, onCreated }) => {
  const useMobileDrawer = useMediaQuery('(max-width: 767.98px)')
  const [isDirty, setIsDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdRows, setCreatedRows] = useState([])
  const [retainedLocation, setRetainedLocation] = useState({})
  const [formKey, setFormKey] = useState(0)
  const [successMessage, setSuccessMessage] = useState('')

  useInspectionUnsavedChangesGuard(useCallback(() => visible && isDirty, [isDirty, visible]))

  const requestClose = useCallback(
    (options = {}) => {
      if (isSubmitting) return
      if (isDirty && !options.discard && !window.confirm(DISCARD_MESSAGE)) return
      onClose?.({ replace: createdRows.length > 0, successMessage })
    },
    [createdRows.length, isDirty, isSubmitting, onClose, successMessage],
  )

  const save = useCallback(
    async (payload) => {
      try {
        const result = await createFireExtinguisherBatch(payload)
        const created = result.data || []
        const message =
          onCreated?.(created) ||
          `${created.length} fire ${created.length === 1 ? 'extinguisher was' : 'extinguishers were'} added to the catalogue.`
        setIsDirty(false)
        setCreatedRows(created)
        setRetainedLocation({
          zone: payload.zone,
          zoneId: payload.zoneId,
          mainLocation: payload.mainLocation,
          mainLocationId: payload.mainLocationId,
          subLocation: payload.subLocation,
          subLocationId: payload.subLocationId,
        })
        setSuccessMessage(message)
      } catch (error) {
        const duplicateConflict = getFireExtinguisherBatchDuplicateConflict(error)
        if (duplicateConflict) error.duplicateConflict = duplicateConflict
        throw error
      }
    },
    [onCreated],
  )

  if (!visible) return null

  const startAnotherBatch = () => {
    setCreatedRows([])
    setSuccessMessage('')
    setFormKey((current) => current + 1)
  }

  const content = createdRows.length ? (
    <div className="d-grid gap-4">
      <CAlert color="success" className="mb-0 d-flex gap-2 align-items-start">
        <CheckCircle2 size={20} className="flex-shrink-0 mt-1" />
        <div>
          <div className="fw-semibold">{successMessage}</div>
          <div className="small mt-1">
            {[retainedLocation.zone, retainedLocation.mainLocation, retainedLocation.subLocation]
              .filter(Boolean)
              .join(' > ')}
          </div>
        </div>
      </CAlert>
      <div className="d-grid gap-2">
        {createdRows.map((row, index) => (
          <div key={row.catalogId || row.id || index} className="border rounded-3 px-3 py-2">
            <span className="fw-semibold">
              {row.idLocNo || row.barcodeNo || `Extinguisher ${index + 1}`}
            </span>
            {row.idLocNo && row.barcodeNo ? (
              <span className="small text-body-secondary ms-2">{row.barcodeNo}</span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="d-flex flex-wrap gap-2 justify-content-end">
        <CButton type="button" color="secondary" variant="outline" onClick={requestClose}>
          Done
        </CButton>
        <CButton type="button" color="primary" onClick={startAnotherBatch}>
          Add more extinguishers
        </CButton>
      </div>
    </div>
  ) : (
    <FireExtinguisherBatchCreateForm
      key={formKey}
      initialLocation={retainedLocation}
      onSave={save}
      onCancel={requestClose}
      onDirtyChange={setIsDirty}
      onSubmittingChange={setIsSubmitting}
    />
  )

  if (useMobileDrawer) {
    return (
      <MobileBottomDrawer
        visible
        title="Add Fire Extinguisher"
        onClose={requestClose}
        closeDisabled={isSubmitting}
        bodyClassName="d-grid gap-3"
      >
        {content}
      </MobileBottomDrawer>
    )
  }

  return (
    <COffcanvas
      visible
      placement="end"
      backdrop
      scroll
      onHide={requestClose}
      className="inspection-detail-drawer fire-extinguisher-create-drawer"
      aria-label="Add Fire Extinguisher"
    >
      <COffcanvasHeader className="inspection-detail-drawer__header">
        <COffcanvasTitle>Add Fire Extinguisher</COffcanvasTitle>
        <CButton
          type="button"
          color="link"
          className="inspection-detail-drawer__close ms-auto p-1 text-body-secondary"
          aria-label="Close Add Fire Extinguisher"
          disabled={isSubmitting}
          onClick={requestClose}
        >
          <X size={18} />
        </CButton>
      </COffcanvasHeader>
      <COffcanvasBody className="inspection-detail-drawer__body">{content}</COffcanvasBody>
    </COffcanvas>
  )
}

export default FireExtinguisherCreateDrawer
