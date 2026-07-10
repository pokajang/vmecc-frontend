import React from 'react'
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
import TypeManagerModal from 'src/components/report-workflow/TypeManagerModal'
import useMediaQuery from 'src/hooks/useMediaQuery'
import { FormFieldError } from './InspectionFormDisplaySections'

const InspectionFormManagerModals = ({
  closeEquipmentModal,
  closeFireTruckModal,
  editingEquipmentId,
  editingFireTruckId,
  editingLocalEquipmentId,
  equipmentEditMode,
  equipmentError,
  equipmentModalOptions,
  fireTruckError,
  incident,
  location,
  locationEntityLabel,
  newEquipmentDescription,
  newEquipmentName,
  newTruckInsuranceExpiry,
  newTruckName,
  newTruckPlateNo,
  newTruckPuspakomExpiry,
  newTruckRoadTaxExpiry,
  saveEquipment,
  saveFireTruck,
  setEditingEquipmentMode,
  setEquipmentDeleteTarget,
  setEquipmentError,
  setIncidentDeleteTarget,
  setLocationDeleteTarget,
  setNewEquipmentDescription,
  setNewEquipmentName,
  setNewTruckInsuranceExpiry,
  setNewTruckName,
  setNewTruckPlateNo,
  setNewTruckPuspakomExpiry,
  setNewTruckRoadTaxExpiry,
  setFireTruckError,
  showEquipmentModal,
  showFireTruckModal,
  startEditEquipment,
}) => {
  const useMobileDrawer = useMediaQuery('(max-width: 575.98px)')
  const fireTruckTitle = editingFireTruckId ? 'Edit truck' : 'Add truck'
  const fireTruckBody = (
    <div className="inspection-fire-truck-form-grid">
      <div className="inspection-fire-truck-form-field">
        <CFormLabel htmlFor="fire-truck-plate" className="small fw-semibold text-muted">
          Plate number
        </CFormLabel>
        <CFormInput
          id="fire-truck-plate"
          value={newTruckPlateNo}
          placeholder="e.g. AJG9555"
          onChange={(event) => {
            setNewTruckPlateNo(event.target.value.toUpperCase())
            if (fireTruckError) setFireTruckError('')
          }}
        />
      </div>
      <div className="inspection-fire-truck-form-field">
        <CFormLabel htmlFor="fire-truck-name" className="small fw-semibold text-muted">
          Truck name
        </CFormLabel>
        <CFormInput
          id="fire-truck-name"
          value={newTruckName}
          placeholder="e.g. Fire Truck"
          onChange={(event) => setNewTruckName(event.target.value)}
        />
      </div>
      <div className="inspection-fire-truck-form-field">
        <CFormLabel htmlFor="fire-truck-road-tax-expiry" className="small fw-semibold text-muted">
          Road tax expiry
        </CFormLabel>
        <CFormInput
          id="fire-truck-road-tax-expiry"
          type="date"
          value={newTruckRoadTaxExpiry}
          onChange={(event) => setNewTruckRoadTaxExpiry(event.target.value)}
        />
      </div>
      <div className="inspection-fire-truck-form-field">
        <CFormLabel htmlFor="fire-truck-insurance-expiry" className="small fw-semibold text-muted">
          Insurance expiry
        </CFormLabel>
        <CFormInput
          id="fire-truck-insurance-expiry"
          type="date"
          value={newTruckInsuranceExpiry}
          onChange={(event) => setNewTruckInsuranceExpiry(event.target.value)}
        />
      </div>
      <div className="inspection-fire-truck-form-field">
        <CFormLabel htmlFor="fire-truck-puspakom-expiry" className="small fw-semibold text-muted">
          Puspakom expiry
        </CFormLabel>
        <CFormInput
          id="fire-truck-puspakom-expiry"
          type="date"
          value={newTruckPuspakomExpiry}
          onChange={(event) => setNewTruckPuspakomExpiry(event.target.value)}
        />
      </div>
      <FormFieldError className="inspection-fire-truck-form-error">{fireTruckError}</FormFieldError>
    </div>
  )
  const fireTruckFooter = (
    <>
      <CButton color="secondary" variant="outline" onClick={closeFireTruckModal}>
        Cancel
      </CButton>
      <CButton color="primary" onClick={saveFireTruck}>
        {editingFireTruckId ? 'Update truck' : 'Save truck'}
      </CButton>
    </>
  )

  return (
    <>
      <TypeManagerModal
        visible={location.showAddLocationModal}
        onClose={location.closeAddModal}
        mobileDrawer
        editMode={location.locationEditMode}
        onSetEditMode={location.setLocationEditMode}
        editTitle={`Edit ${locationEntityLabel}s`}
        addTitle={`Add ${locationEntityLabel}`}
        options={location.editLocationOptions}
        onStartEdit={location.startEditType}
        onRequestDelete={({ value, label }) => {
          const row = location.editLocationOptions.find(
            (option) => String(option.value || '').trim() === String(value || '').trim(),
          )
          setLocationDeleteTarget({
            value,
            label,
            row,
            isSubLocation: location.isEditingSubLocation,
          })
        }}
        nameLabel={`${locationEntityLabel} Name`}
        nameValue={location.newLocationName}
        onChangeName={(nextValue) => {
          location.setNewLocationName(nextValue)
          if (location.addLocationError) location.setAddLocationError('')
        }}
        namePlaceholder={
          location.isEditingZone
            ? 'e.g. 1'
            : location.isEditingMainArea
              ? 'e.g. Manjung Hub'
              : location.isEditingLocation || location.isEditingSubLocation
                ? 'e.g. Reception'
                : 'e.g. Manjung Hub'
        }
        descriptionLabel={`${locationEntityLabel} details (optional)`}
        descriptionValue={location.newLocationDescription}
        onChangeDescription={location.setNewLocationDescription}
        descriptionPlaceholder="Subtext shown below location name."
        error={location.addLocationError}
        editingKey={location.editingLocationKey}
        editingLabel={`Editing ${locationEntityLabel.toLowerCase()}`}
        editButtonLabel={`Edit ${locationEntityLabel}s`}
        onSave={location.saveType}
        saveLabel={`Save ${locationEntityLabel}`}
        updateLabel={
          location.editingLocationRow && !location.editingLocationRow.custom
            ? 'Save global change'
            : `Update ${locationEntityLabel}`
        }
        showRowIcon={false}
        getRowBadgeLabel={(row) => (row?.custom ? '' : 'Shared')}
        warningNotice={
          location.editingLocationRow && !location.editingLocationRow.custom
            ? 'This item is shared across inspections. Changes will affect future inspections.'
            : ''
        }
        iconOptions={[]}
        iconValue={location.newLocationIconKey}
        onChangeIcon={location.setNewLocationIconKey}
      />

      <TypeManagerModal
        visible={incident.showAddTypeModal}
        onClose={incident.closeAddModal}
        mobileDrawer
        editMode={incident.incidentEditMode}
        onSetEditMode={incident.setIncidentEditMode}
        editTitle="Edit Inspection Types"
        addTitle="Add Inspection Type"
        options={incident.typeOptions}
        onStartEdit={incident.startEditType}
        onRequestDelete={({ value, label }) => setIncidentDeleteTarget({ value, label })}
        nameLabel="Inspection Type Name"
        nameValue={incident.newTypeName}
        onChangeName={(nextValue) => {
          incident.setNewTypeName(nextValue)
          if (incident.addTypeError) incident.setAddTypeError('')
        }}
        namePlaceholder="e.g. Pump House"
        descriptionLabel="Inspection type details (optional)"
        descriptionValue={incident.newTypeDescription}
        onChangeDescription={incident.setNewTypeDescription}
        descriptionPlaceholder="Subtext shown below type name."
        error={incident.addTypeError}
        editingKey={incident.editingIncidentTypeKey}
        editingLabel="Editing type"
        editButtonLabel="Edit Types"
        onSave={incident.saveType}
        saveLabel="Save Type"
        updateLabel="Update Type"
        iconOptions={incident.iconOptions}
        iconValue={incident.newTypeIconKey}
        onChangeIcon={incident.setNewTypeIconKey}
        showIconPicker
      />

      <TypeManagerModal
        visible={showEquipmentModal}
        onClose={closeEquipmentModal}
        mobileDrawer
        editMode={equipmentEditMode}
        onSetEditMode={setEditingEquipmentMode}
        editTitle="Edit Equipment"
        addTitle="Add Equipment"
        options={equipmentModalOptions}
        onStartEdit={startEditEquipment}
        onRequestDelete={({ value, label }) => {
          const row = equipmentModalOptions.find(
            (option) => String(option.value || '') === String(value || ''),
          )
          setEquipmentDeleteTarget({ value, label, row })
        }}
        nameLabel="Equipment Name"
        nameValue={newEquipmentName}
        onChangeName={(nextValue) => {
          setNewEquipmentName(nextValue)
          if (equipmentError) setEquipmentError('')
        }}
        namePlaceholder="e.g. Hydraulic Ram Extension"
        descriptionLabel="Equipment details (optional)"
        descriptionValue={newEquipmentDescription}
        onChangeDescription={setNewEquipmentDescription}
        descriptionPlaceholder="Subtext shown below equipment name."
        error={equipmentError}
        editingKey={editingEquipmentId || editingLocalEquipmentId}
        editingLabel="Editing equipment"
        editButtonLabel="Edit Equipment"
        onSave={saveEquipment}
        saveLabel="Save Equipment"
        updateLabel="Update Equipment"
        showRowIcon={false}
        iconOptions={[]}
      />

      {useMobileDrawer ? (
        <MobileBottomDrawer
          visible={showFireTruckModal}
          title={fireTruckTitle}
          onClose={closeFireTruckModal}
        >
          {fireTruckBody}
          <div className="mobile-bottom-drawer__footer d-flex justify-content-end gap-2">
            {fireTruckFooter}
          </div>
        </MobileBottomDrawer>
      ) : (
        <CModal visible={showFireTruckModal} onClose={closeFireTruckModal} alignment="center">
          <CModalHeader>
            <CModalTitle>{fireTruckTitle}</CModalTitle>
          </CModalHeader>
          <CModalBody>{fireTruckBody}</CModalBody>
          <CModalFooter>{fireTruckFooter}</CModalFooter>
        </CModal>
      )}
    </>
  )
}

export default InspectionFormManagerModals
