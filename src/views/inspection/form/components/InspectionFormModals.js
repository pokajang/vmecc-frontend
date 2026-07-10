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
import MobileBottomDrawer from 'src/components/MobileBottomDrawer'
import useMediaQuery from 'src/hooks/useMediaQuery'
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'
import { FormFieldError } from './InspectionFormDisplaySections'

const InspectionFormConfirmModals = ({
  deleteEquipment,
  deleteFireExtinguisher,
  deleteFireTruck,
  equipmentDeleteTarget,
  fireExtinguisherDeleteTarget,
  fireTruckDeleteTarget,
  incident,
  incidentDeleteTarget,
  isDeletingEquipment,
  location,
  locationDeleteTarget,
  removeScbaItemFromInspection,
  removeScbaSectionFromInspection,
  scbaArchiveTarget,
  scbaRemoveTarget,
  archiveScbaCatalogTarget,
  setEquipmentDeleteTarget,
  setFireExtinguisherDeleteTarget,
  setFireTruckDeleteTarget,
  setIncidentDeleteTarget,
  setLocationDeleteTarget,
  setScbaArchiveTarget,
  setScbaRemoveTarget,
}) => (
  <>
    <ActionConfirmModal
      visible={Boolean(locationDeleteTarget)}
      title="Delete Location"
      message={
        locationDeleteTarget?.row?.custom
          ? locationDeleteTarget?.label
            ? `Delete "${locationDeleteTarget.label}"?`
            : 'Delete this location?'
          : locationDeleteTarget?.isSubLocation
            ? 'Delete this shared sub-location? This will remove it from all future inspections. Past inspection records will not be changed.'
            : 'Delete this shared location? This will remove it and its sub-locations from all future inspections. Past inspection records will not be changed.'
      }
      confirmLabel="Delete"
      confirmColor="danger"
      mobileDrawer
      onClose={() => setLocationDeleteTarget(null)}
      onConfirm={() => {
        if (locationDeleteTarget?.value) location.removeType(locationDeleteTarget.value)
        setLocationDeleteTarget(null)
      }}
    />
    <ActionConfirmModal
      visible={Boolean(fireExtinguisherDeleteTarget)}
      title="Delete Extinguisher"
      message={
        fireExtinguisherDeleteTarget?.row?.equipmentSource === 'seed'
          ? 'Delete this shared extinguisher? This will remove it from all future inspections. Past inspection records will not be changed.'
          : fireExtinguisherDeleteTarget?.label
            ? `Delete "${fireExtinguisherDeleteTarget.label}"?`
            : 'Delete this extinguisher?'
      }
      confirmLabel="Delete"
      confirmColor="danger"
      mobileDrawer
      onClose={() => setFireExtinguisherDeleteTarget(null)}
      onConfirm={() => {
        const targetRow = fireExtinguisherDeleteTarget?.row
        setFireExtinguisherDeleteTarget(null)
        if (targetRow) deleteFireExtinguisher(targetRow)
      }}
    />
    <ActionConfirmModal
      visible={Boolean(incidentDeleteTarget)}
      title="Delete Type"
      message={
        incidentDeleteTarget?.label
          ? `Delete "${incidentDeleteTarget.label}"? This cannot be undone.`
          : 'Delete this type?'
      }
      confirmLabel="Delete"
      confirmColor="danger"
      mobileDrawer
      onClose={() => setIncidentDeleteTarget(null)}
      onConfirm={() => {
        if (incidentDeleteTarget?.value) incident.removeType(incidentDeleteTarget.value)
        setIncidentDeleteTarget(null)
      }}
    />
    <ActionConfirmModal
      visible={Boolean(equipmentDeleteTarget)}
      title="Delete Equipment"
      message={
        equipmentDeleteTarget?.label
          ? `Delete "${equipmentDeleteTarget.label}"? Existing entries for this equipment in the current form will be removed.`
          : 'Delete this equipment?'
      }
      confirmLabel={isDeletingEquipment ? 'Deleting...' : 'Delete'}
      confirmColor="danger"
      confirmDisabled={isDeletingEquipment}
      cancelDisabled={isDeletingEquipment}
      mobileDrawer
      onClose={() => {
        if (!isDeletingEquipment) setEquipmentDeleteTarget(null)
      }}
      onConfirm={() => deleteEquipment(equipmentDeleteTarget?.row)}
    />
    <ActionConfirmModal
      visible={Boolean(fireTruckDeleteTarget)}
      title="Delete Truck"
      message={
        fireTruckDeleteTarget?.label
          ? `Delete truck "${fireTruckDeleteTarget.label}"? If it is selected, the current FRT readiness form will need another truck before review.`
          : 'Delete this truck?'
      }
      confirmLabel="Delete"
      confirmColor="danger"
      mobileDrawer
      onClose={() => setFireTruckDeleteTarget(null)}
      onConfirm={() => deleteFireTruck(fireTruckDeleteTarget?.truck)}
    />
    <ActionConfirmModal
      visible={Boolean(scbaRemoveTarget)}
      title="Remove SCBA Item"
      message={scbaRemoveTarget?.message || 'Remove this from this inspection?'}
      confirmLabel="Remove"
      confirmColor="danger"
      mobileDrawer
      onClose={() => setScbaRemoveTarget(null)}
      onConfirm={() => {
        if (scbaRemoveTarget?.type === 'section') {
          removeScbaSectionFromInspection(scbaRemoveTarget.section)
        } else if (scbaRemoveTarget?.type === 'item') {
          removeScbaItemFromInspection(scbaRemoveTarget.sectionKey, scbaRemoveTarget.row)
        }
        setScbaRemoveTarget(null)
      }}
    />
    <ActionConfirmModal
      visible={Boolean(scbaArchiveTarget)}
      title="Archive SCBA Catalog"
      message={
        scbaArchiveTarget?.message ||
        'Archive this for future inspections? Previous reports are unchanged.'
      }
      confirmLabel="Archive"
      confirmColor="danger"
      mobileDrawer
      onClose={() => setScbaArchiveTarget(null)}
      onConfirm={archiveScbaCatalogTarget}
    />
  </>
)

const ScbaCatalogModals = ({
  closeScbaItemModal,
  closeScbaSectionModal,
  isSavingScbaCatalog,
  saveScbaItemModal,
  saveScbaSectionModal,
  scbaItemModal,
  scbaSectionModal,
  setScbaItemModal,
  setScbaSectionModal,
}) => {
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const sectionTitle = scbaSectionModal.mode === 'edit' ? 'Edit SCBA section' : 'Add SCBA section'
  const itemTitle = scbaItemModal.mode === 'edit' ? 'Edit SCBA item' : 'Add SCBA item'
  const sectionBody = (
    <div className="d-grid gap-3">
      <div>
        <CFormLabel htmlFor="scba-section-title">Section title</CFormLabel>
        <CFormInput
          id="scba-section-title"
          value={scbaSectionModal.title}
          placeholder="e.g. Regulator"
          onChange={(event) =>
            setScbaSectionModal((current) => ({
              ...current,
              title: event.target.value,
              error: '',
            }))
          }
        />
      </div>
      <div>
        <CFormLabel htmlFor="scba-section-short-label">Short label</CFormLabel>
        <CFormInput
          id="scba-section-short-label"
          value={scbaSectionModal.shortLabel}
          placeholder="Optional"
          onChange={(event) =>
            setScbaSectionModal((current) => ({
              ...current,
              shortLabel: event.target.value,
              error: '',
            }))
          }
        />
      </div>
      <div>
        <CFormLabel htmlFor="scba-section-checks">Inspection checks for each item</CFormLabel>
        <CFormTextarea
          id="scba-section-checks"
          rows={4}
          value={scbaSectionModal.checksText}
          placeholder={'One check per line\ne.g. Physical Condition\nLeak Test'}
          onChange={(event) =>
            setScbaSectionModal((current) => ({
              ...current,
              checksText: event.target.value,
              error: '',
            }))
          }
        />
        <div className="small text-body-secondary mt-1">
          These checks appear inside every item added to this section.
        </div>
      </div>
      <FormFieldError>{scbaSectionModal.error}</FormFieldError>
    </div>
  )
  const sectionFooter = (
    <>
      <CButton color="secondary" variant="outline" onClick={closeScbaSectionModal}>
        Cancel
      </CButton>
      <CButton color="primary" onClick={saveScbaSectionModal} disabled={isSavingScbaCatalog}>
        {isSavingScbaCatalog
          ? 'Saving...'
          : scbaSectionModal.mode === 'edit'
            ? 'Update section'
            : 'Add section'}
      </CButton>
    </>
  )
  const itemBody = (
    <div className="d-grid gap-3">
      <div>
        <CFormLabel htmlFor="scba-item-brand">Brand</CFormLabel>
        <CFormInput
          id="scba-item-brand"
          value={scbaItemModal.brand}
          placeholder="e.g. MSA"
          onChange={(event) =>
            setScbaItemModal((current) => ({
              ...current,
              brand: event.target.value,
              error: '',
            }))
          }
        />
      </div>
      <div>
        <CFormLabel htmlFor="scba-item-serial">Serial no.</CFormLabel>
        <CFormInput
          id="scba-item-serial"
          value={scbaItemModal.serialNo}
          placeholder="e.g. MSA 04"
          onChange={(event) =>
            setScbaItemModal((current) => ({
              ...current,
              serialNo: event.target.value,
              error: '',
            }))
          }
        />
      </div>
      {scbaItemModal.sectionKey === 'cylinder' ? (
        <div className="row g-3">
          <div className="col-12 col-sm-6">
            <CFormLabel htmlFor="scba-item-size">Size</CFormLabel>
            <CFormInput
              id="scba-item-size"
              value={scbaItemModal.size}
              placeholder="e.g. 6.8"
              onChange={(event) =>
                setScbaItemModal((current) => ({
                  ...current,
                  size: event.target.value,
                  error: '',
                }))
              }
            />
          </div>
          <div className="col-12 col-sm-6">
            <CFormLabel htmlFor="scba-item-cylinder-type">Cylinder type</CFormLabel>
            <CFormInput
              id="scba-item-cylinder-type"
              value={scbaItemModal.cylinderType}
              placeholder="e.g. Composite"
              onChange={(event) =>
                setScbaItemModal((current) => ({
                  ...current,
                  cylinderType: event.target.value,
                  error: '',
                }))
              }
            />
          </div>
        </div>
      ) : null}
      <div>
        <CFormLabel htmlFor="scba-item-details">Details</CFormLabel>
        <CFormTextarea
          id="scba-item-details"
          rows={2}
          value={scbaItemModal.equipmentDescription}
          placeholder="Optional"
          onChange={(event) =>
            setScbaItemModal((current) => ({
              ...current,
              equipmentDescription: event.target.value,
              error: '',
            }))
          }
        />
      </div>
      <FormFieldError>{scbaItemModal.error}</FormFieldError>
    </div>
  )
  const itemFooter = (
    <>
      <CButton color="secondary" variant="outline" onClick={closeScbaItemModal}>
        Cancel
      </CButton>
      <CButton color="primary" onClick={saveScbaItemModal} disabled={isSavingScbaCatalog}>
        {isSavingScbaCatalog
          ? 'Saving...'
          : scbaItemModal.mode === 'edit'
            ? 'Update item'
            : 'Add item'}
      </CButton>
    </>
  )

  return (
    <>
      {useMobileDrawer ? (
        <MobileBottomDrawer
          visible={scbaSectionModal.visible}
          title={sectionTitle}
          onClose={closeScbaSectionModal}
        >
          {sectionBody}
          <div className="mobile-bottom-drawer__footer d-flex justify-content-end gap-2">
            {sectionFooter}
          </div>
        </MobileBottomDrawer>
      ) : (
        <CModal visible={scbaSectionModal.visible} onClose={closeScbaSectionModal}>
          <CModalHeader>
            <CModalTitle>{sectionTitle}</CModalTitle>
          </CModalHeader>
          <CModalBody>{sectionBody}</CModalBody>
          <CModalFooter>{sectionFooter}</CModalFooter>
        </CModal>
      )}

      {useMobileDrawer ? (
        <MobileBottomDrawer
          visible={scbaItemModal.visible}
          title={itemTitle}
          onClose={closeScbaItemModal}
        >
          {itemBody}
          <div className="mobile-bottom-drawer__footer d-flex justify-content-end gap-2">
            {itemFooter}
          </div>
        </MobileBottomDrawer>
      ) : (
        <CModal visible={scbaItemModal.visible} onClose={closeScbaItemModal}>
          <CModalHeader>
            <CModalTitle>{itemTitle}</CModalTitle>
          </CModalHeader>
          <CModalBody>{itemBody}</CModalBody>
          <CModalFooter>{itemFooter}</CModalFooter>
        </CModal>
      )}
    </>
  )
}

const InspectionFormModals = (props) => (
  <>
    <InspectionFormConfirmModals {...props} />
    <ScbaCatalogModals {...props} />
  </>
)

export default InspectionFormModals
