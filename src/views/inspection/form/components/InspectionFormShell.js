import React from 'react'
import { CAlert, CButton } from '@coreui/react'
import { Upload } from 'lucide-react'
import { formatCameraDiagnosticsLines } from 'src/utils/cameraDiagnostics'
import InspectionFormBodySections from './InspectionFormBodySections'
import InspectionCameraCapture from './InspectionCameraCapture'
import InspectionFormManagerModals from './InspectionFormManagerModals'
import InspectionFormModals from './InspectionFormModals'
import InspectionFormSetupSections from './InspectionFormSetupSections'

const getLocationEntityLabel = (location) =>
  location.isEditingZone
    ? 'Zone'
    : location.isEditingMainArea
      ? 'Main Area'
      : location.isEditingLocation
        ? 'Location'
        : location.isEditingSubLocation
          ? 'Sub-location'
          : 'Main Location'

const InspectionFormShell = ({
  catalogManagers,
  checkActions,
  draftStatus,
  onRetryDraftSync,
  fieldErrors,
  fireExtinguisherAreaRows,
  isLoadingEquipmentRows,
  isLoadingFireExtinguisherAreaRows,
  isLoadingFireExtinguisherRows,
  isLoadingScbaCatalogSections,
  fireTruckOptions,
  form,
  getLatestForm,
  incident,
  incidentDeleteTarget,
  isEditingType,
  location,
  locationDeleteTarget,
  onSaveDraft,
  isUpdateMode = false,
  photoRuntime,
  refs,
  reviewRequest,
  scbaRuntime,
  selectedFireTruckPlate,
  selectedTypeIcon,
  setIncidentDeleteTarget,
  setIsEditingType,
  setLocationDeleteTarget,
  setup,
  structured,
  validationState,
}) => {
  const {
    cameraInputRef,
    cameraCaptureVisible,
    closeInAppCamera,
    handleInAppCameraCapture,
    isPhotoProcessing,
    photoUploadProgress,
    handlePhotoSelect,
    cameraUploadFallback,
    clearCameraUploadFallback,
    requestUploadFromCameraFallback,
    removePhoto,
    requestInspectionIssuePhotoUpload,
    requestRootPhotoUpload,
    updatePhotoDescription,
    uploadInputRef,
  } = photoRuntime

  return (
    <>
      <InspectionFormModals
        {...catalogManagers}
        {...scbaRuntime}
        incident={incident}
        incidentDeleteTarget={incidentDeleteTarget}
        location={location}
        locationDeleteTarget={locationDeleteTarget}
        setIncidentDeleteTarget={setIncidentDeleteTarget}
        setLocationDeleteTarget={setLocationDeleteTarget}
      />
      <InspectionCameraCapture
        visible={cameraCaptureVisible}
        onCapture={handleInAppCameraCapture}
        onClose={closeInAppCamera}
        onUploadPhoto={() => requestUploadFromCameraFallback?.()}
      />
      {isPhotoProcessing ? (
        <div className="small text-body-secondary mb-2" role="status">
          {photoUploadProgress?.retrying ? 'Retrying photo upload' : 'Uploading photo'}{' '}
          {Number(photoUploadProgress?.percent || 0)}%
        </div>
      ) : null}

      <InspectionFormManagerModals
        {...catalogManagers}
        incident={incident}
        location={location}
        locationEntityLabel={getLocationEntityLabel(location)}
        setIncidentDeleteTarget={setIncidentDeleteTarget}
        setLocationDeleteTarget={setLocationDeleteTarget}
      />

      {cameraUploadFallback ? (
        <CAlert
          color="warning"
          className="mx-3 mx-md-4 mt-3"
          dismissible
          onClose={() => clearCameraUploadFallback?.()}
        >
          <div className="d-flex flex-column gap-2">
            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2">
              <div className="small">{cameraUploadFallback.message}</div>
              <div className="d-flex align-items-center gap-2">
                <CButton
                  type="button"
                  color="warning"
                  size="sm"
                  onClick={() => {
                    clearCameraUploadFallback?.()
                    requestUploadFromCameraFallback?.()
                  }}
                >
                  <Upload size={14} className="me-1" />
                  Upload photo
                </CButton>
              </div>
            </div>
            {cameraUploadFallback.diagnostics ? (
              <details className="small">
                <summary>Camera diagnostics</summary>
                <div className="mt-2 d-grid gap-1">
                  {formatCameraDiagnosticsLines(cameraUploadFallback.diagnostics).map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </CAlert>
      ) : null}

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="d-none"
        onChange={handlePhotoSelect}
        disabled={isPhotoProcessing}
      />
      <div className="inspection-form-sections inspection-form-edit-sections d-grid">
        <div className="inspection-form-setup-sections d-grid gap-4">
          <InspectionFormSetupSections
            fieldErrors={fieldErrors}
            fireExtinguisherAreaRows={fireExtinguisherAreaRows}
            fireTruckOptions={fireTruckOptions}
            form={form}
            incident={incident}
            inspectedAtRef={refs.inspectedAtRef}
            inspectionTypeRef={refs.inspectionTypeRef}
            isEditingType={isEditingType}
            isFireExtinguisherCatalogInspectionForm={setup.isFireExtinguisherCatalogInspectionForm}
            usesZoneLocationFlow={setup.usesZoneLocationFlow}
            isLoadingFireExtinguisherAreaRows={isLoadingFireExtinguisherAreaRows}
            isLoadingFireExtinguisherRows={isLoadingFireExtinguisherRows}
            isFireTruckCatalogInspectionForm={setup.isFireTruckCatalogInspectionForm}
            location={location}
            fireExtinguisherScan={setup.fireExtinguisherScan}
            mainLocation={setup.mainLocation}
            openAddFireTruckModal={catalogManagers.openAddFireTruckModal}
            setFireTruckDeleteTarget={catalogManagers.setFireTruckDeleteTarget}
            startEditFireTruck={catalogManagers.startEditFireTruck}
            selectedFireTruckPlate={selectedFireTruckPlate}
            selectedLocationRef={refs.selectedLocationRef}
            selectedType={setup.selectedType}
            selectedTypeDefinition={setup.selectedTypeDefinition}
            selectedTypeIcon={selectedTypeIcon}
            selectedTypeOption={setup.selectedTypeOption}
            setIsEditingType={setIsEditingType}
            selectFireTruck={setup.selectFireTruck}
            subLocation={setup.subLocation}
            supportsCustomLocations={setup.supportsCustomLocations}
            supportsSubLocations={setup.supportsSubLocations}
            updateForm={setup.updateForm}
            updateInspectionType={setup.updateInspectionType}
            updateInspectedAt={setup.updateInspectedAt}
            resetInspectionTypeSelection={setup.resetInspectionTypeSelection}
            resetInspectedAt={setup.resetInspectedAt}
            resetPrimaryLocation={setup.resetPrimaryLocation}
            resetMainArea={setup.resetMainArea}
            resetSubLocation={setup.resetSubLocation}
            showFireTruckModal={catalogManagers.showFireTruckModal}
            zone={setup.zone}
          />
        </div>

        <div className="inspection-form-body-sections inspection-form-setup-body-gap d-grid gap-4">
          <InspectionFormBodySections
            appendDescription={checkActions.appendDescription}
            cameraInputRef={cameraInputRef}
            checklistChips={structured.checklistChips}
            currentStructuredSummary={structured.currentStructuredSummary}
            descriptionRef={refs.descriptionRef}
            draftStatus={draftStatus}
            draftSyncState={structured.draftSyncState}
            fieldErrors={fieldErrors}
            fireExtinguisherScan={setup.fireExtinguisherScan}
            form={form}
            getLatestForm={getLatestForm}
            isFireExtinguisherCatalogInspectionForm={setup.isFireExtinguisherCatalogInspectionForm}
            isLoadingEquipmentRows={isLoadingEquipmentRows}
            isFireTruckCatalogInspectionForm={setup.isFireTruckCatalogInspectionForm}
            isLoadingFireExtinguisherRows={isLoadingFireExtinguisherRows}
            isLoadingScbaCatalogSections={isLoadingScbaCatalogSections}
            isFullInspectionForm={structured.isFullInspectionForm}
            isStructuredInspectionForm={structured.isStructuredInspectionForm}
            isUpdateMode={isUpdateMode}
            location={location}
            mainLocation={setup.mainLocation}
            onRequestReview={reviewRequest.requestReview}
            onRetryDraftSync={onRetryDraftSync}
            onSaveDraft={onSaveDraft}
            photosRef={refs.photosRef}
            removePhoto={removePhoto}
            requestInspectionIssuePhotoUpload={requestInspectionIssuePhotoUpload}
            requestRootPhotoUpload={requestRootPhotoUpload}
            selectedFireTruckPlate={selectedFireTruckPlate}
            selectedType={setup.selectedType}
            selectedTypeDefinition={setup.selectedTypeDefinition}
            showComingSoonNotice={structured.showComingSoonNotice}
            structuredDisplayForm={structured.structuredDisplayForm}
            structuredSectionHandlers={structured.structuredSectionHandlers}
            structuredSectionRef={structured.structuredSectionRef}
            StructuredEditSection={structured.StructuredEditSection}
            toggleChecklistChip={checkActions.toggleChecklistChip}
            updateForm={setup.updateForm}
            updatePhotoDescription={updatePhotoDescription}
            uploadInputRef={uploadInputRef}
            validationState={validationState}
            validationStatusMessage={reviewRequest.validationStatusMessage}
            zone={setup.zone}
          />
        </div>
      </div>
    </>
  )
}

export default InspectionFormShell
