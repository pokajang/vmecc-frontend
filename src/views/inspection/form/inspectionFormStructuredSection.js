export const buildStructuredSectionRef = ({
  erAuxChecksRef,
  fieldRefKey,
  fireExtinguisherChecksRef,
  frtChecksRef,
  highAngleChecksRef,
  hseObservationRef,
  hydraulicChecksRef,
  scbaChecksRef,
}) =>
  fieldRefKey === 'hydraulicChecks'
    ? hydraulicChecksRef
    : fieldRefKey === 'fireExtinguisherChecks'
      ? fireExtinguisherChecksRef
      : fieldRefKey === 'frtChecks'
        ? frtChecksRef
        : fieldRefKey === 'highAngleChecks'
          ? highAngleChecksRef
          : fieldRefKey === 'scbaChecks'
            ? scbaChecksRef
            : fieldRefKey === 'hseObservation'
              ? hseObservationRef
              : erAuxChecksRef

export const buildStructuredSectionHandlers = ({
  applyErAuxPhotoCaption,
  applyFireExtinguisherPhotoCaption,
  applyFrtPhotoCaption,
  applyHighAnglePhotoCaption,
  applyHydraulicPhotoCaption,
  applyScbaPhotoCaption,
  checksField,
  fireExtinguisherLocationContinuation,
  locationContinuation,
  scopeContinuation,
  fieldRefKey,
  markAllErAuxOk,
  markAllFrtOk,
  markAllHighAngleGood,
  markAllHydraulicOk,
  markAllScbaOk,
  markErAuxEquipmentOk,
  markFrtRowOk,
  markHighAngleRowOk,
  markHydraulicEquipmentOk,
  markScbaRowOk,
  openAddEquipmentModal,
  openAddScbaItemModal,
  openAddScbaSectionModal,
  openEditScbaItemModal,
  openEditScbaSectionModal,
  removeErAuxPhoto,
  removeFireExtinguisherPhoto,
  removeFrtPhoto,
  removeHighAnglePhoto,
  removeHydraulicPhoto,
  removeScbaPhoto,
  requestArchiveScbaItem,
  requestArchiveScbaSection,
  requestErAuxDefectPhotoUpload,
  requestErAuxPhotoUpload,
  requestFireExtinguisherDefectPhotoUpload,
  requestFireExtinguisherPhotoUpload,
  requestFrtIssuePhotoUpload,
  requestHighAngleIssuePhotoUpload,
  requestHydraulicDefectPhotoUpload,
  requestHydraulicPhotoUpload,
  requestRemoveScbaItem,
  requestRemoveScbaSection,
  requestRootPhotoUpload,
  saveFireExtinguisherRowDraft,
  saveFrtRowDraft,
  saveHseObservationDraft,
  saveInspectionFindingDraft,
  saveStructuredGroupedRowDraft,
  saveStructuredRowDraft,
  selectNextScope,
  selectNextLocation,
  selectNextFireExtinguisherLocation,
  deleteFrtItem,
  resetErAuxCheck,
  resetFireExtinguisherCheck,
  resetFrtCheck,
  resetHighAngleCheck,
  resetHydraulicCheck,
  resetScbaGroupedCheck,
  requestScbaIssuePhotoUpload,
  requestScbaPhotoUpload,
  restoreScbaItem,
  restoreScbaSection,
  selectedFireTruckOption,
  getEquipmentBackendId,
  getEquipmentRowId,
  setEquipmentDeleteTarget,
  setFireExtinguisherDeleteTarget,
  setFireTruckDeleteTarget,
  openEditEquipmentModal,
  startEditFireTruck,
  updateErAuxCheck,
  updateErAuxPhotoDescription,
  updateErAuxSessionMeta,
  updateFireExtinguisher,
  updateFireExtinguisherCheck,
  updateFireExtinguisherPhotoDescription,
  updateFireExtinguisherSessionMeta,
  updateFrtCheck,
  updateFrtPhotoDescription,
  updateFrtSessionMeta,
  updateHighAngleCheck,
  updateHighAnglePhotoDescription,
  updateHighAngleSessionMeta,
  updateHseField,
  updateHseSessionMeta,
  updateHydraulicCheck,
  updateHydraulicPhotoDescription,
  updateScbaGroupedCheck,
  updateScbaPhotoDescription,
  updateScbaSessionMeta,
  addFireExtinguisher,
  addFrtItem,
  addHighAngleCompartment,
  addHighAngleItem,
  deleteHighAngleCompartment,
  deleteHighAngleItem,
  updateHighAngleCompartment,
  updateHighAngleItem,
  toggleHseObservationSelection,
  uploadInputRef,
  cameraInputRef,
}) => ({
  onUpdateCheck:
    checksField === 'erAuxChecks'
      ? updateErAuxCheck
      : checksField === 'hydraulicChecks'
        ? updateHydraulicCheck
        : checksField === 'fireExtinguisherChecks'
          ? updateFireExtinguisherCheck
          : fieldRefKey === 'frtChecks'
            ? updateFrtCheck
            : checksField === 'highAngleChecks'
              ? updateHighAngleCheck
              : undefined,
  onUpdateGroupedCheck: fieldRefKey === 'scbaChecks' ? updateScbaGroupedCheck : undefined,
  onSaveRowDraft:
    checksField === 'erAuxChecks' ||
    checksField === 'hydraulicChecks' ||
    checksField === 'highAngleChecks'
      ? (row, patch) => saveStructuredRowDraft?.(row, patch, { source: checksField })
      : checksField === 'fireExtinguisherChecks'
        ? saveFireExtinguisherRowDraft
        : fieldRefKey === 'frtChecks'
          ? saveFrtRowDraft
          : undefined,
  onSaveGroupedRowDraft: fieldRefKey === 'scbaChecks' ? saveStructuredGroupedRowDraft : undefined,
  onResetCheck:
    checksField === 'erAuxChecks'
      ? resetErAuxCheck
      : checksField === 'hydraulicChecks'
        ? resetHydraulicCheck
        : checksField === 'fireExtinguisherChecks'
          ? resetFireExtinguisherCheck
          : fieldRefKey === 'frtChecks'
            ? resetFrtCheck
            : checksField === 'highAngleChecks'
              ? resetHighAngleCheck
              : undefined,
  onResetGroupedCheck: fieldRefKey === 'scbaChecks' ? resetScbaGroupedCheck : undefined,
  onUpdateSessionMeta:
    checksField === 'erAuxChecks'
      ? updateErAuxSessionMeta
      : fieldRefKey === 'frtChecks'
        ? updateFrtSessionMeta
        : checksField === 'highAngleChecks'
          ? updateHighAngleSessionMeta
          : checksField === 'fireExtinguisherChecks'
            ? updateFireExtinguisherSessionMeta
            : fieldRefKey === 'scbaChecks'
              ? updateScbaSessionMeta
              : fieldRefKey === 'hseObservation'
                ? updateHseSessionMeta
                : undefined,
  onUpdateHseField: fieldRefKey === 'hseObservation' ? updateHseField : undefined,
  onSaveHseObservationDraft: fieldRefKey === 'hseObservation' ? saveHseObservationDraft : undefined,
  onSaveInspectionFindingDraft: saveInspectionFindingDraft,
  onToggleHseSelection:
    fieldRefKey === 'hseObservation' ? toggleHseObservationSelection : undefined,
  onTakeGeneralPhoto:
    fieldRefKey === 'hseObservation'
      ? (caption) => requestRootPhotoUpload(cameraInputRef, caption)
      : undefined,
  onUploadGeneralPhoto:
    fieldRefKey === 'hseObservation'
      ? (caption) => requestRootPhotoUpload(uploadInputRef, caption)
      : undefined,
  onMarkEquipmentOk:
    checksField === 'erAuxChecks'
      ? markErAuxEquipmentOk
      : checksField === 'hydraulicChecks'
        ? markHydraulicEquipmentOk
        : undefined,
  onMarkRowOk:
    fieldRefKey === 'frtChecks'
      ? markFrtRowOk
      : checksField === 'highAngleChecks'
        ? markHighAngleRowOk
        : fieldRefKey === 'scbaChecks'
          ? markScbaRowOk
          : undefined,
  onMarkAllOk:
    checksField === 'erAuxChecks'
      ? markAllErAuxOk
      : checksField === 'hydraulicChecks'
        ? markAllHydraulicOk
        : fieldRefKey === 'frtChecks'
          ? markAllFrtOk
          : checksField === 'highAngleChecks'
            ? markAllHighAngleGood
            : fieldRefKey === 'scbaChecks'
              ? markAllScbaOk
              : undefined,
  onRequestPhotoUpload:
    checksField === 'erAuxChecks'
      ? requestErAuxPhotoUpload
      : checksField === 'hydraulicChecks'
        ? requestHydraulicPhotoUpload
        : checksField === 'fireExtinguisherChecks'
          ? requestFireExtinguisherPhotoUpload
          : fieldRefKey === 'scbaChecks'
            ? requestScbaPhotoUpload
            : undefined,
  onRequestDefectPhotoUpload:
    checksField === 'erAuxChecks'
      ? requestErAuxDefectPhotoUpload
      : checksField === 'hydraulicChecks'
        ? requestHydraulicDefectPhotoUpload
        : checksField === 'fireExtinguisherChecks'
          ? requestFireExtinguisherDefectPhotoUpload
          : undefined,
  onRequestFrtIssuePhotoUpload:
    fieldRefKey === 'frtChecks' ? requestFrtIssuePhotoUpload : undefined,
  onRequestHighAngleIssuePhotoUpload:
    checksField === 'highAngleChecks' ? requestHighAngleIssuePhotoUpload : undefined,
  onRequestScbaIssuePhotoUpload:
    fieldRefKey === 'scbaChecks' ? requestScbaIssuePhotoUpload : undefined,
  onRemovePhoto:
    checksField === 'erAuxChecks'
      ? removeErAuxPhoto
      : checksField === 'hydraulicChecks'
        ? removeHydraulicPhoto
        : checksField === 'fireExtinguisherChecks'
          ? removeFireExtinguisherPhoto
          : fieldRefKey === 'frtChecks'
            ? removeFrtPhoto
            : checksField === 'highAngleChecks'
              ? removeHighAnglePhoto
              : fieldRefKey === 'scbaChecks'
                ? removeScbaPhoto
                : undefined,
  onChangePhotoDescription:
    checksField === 'erAuxChecks'
      ? updateErAuxPhotoDescription
      : checksField === 'hydraulicChecks'
        ? updateHydraulicPhotoDescription
        : checksField === 'fireExtinguisherChecks'
          ? updateFireExtinguisherPhotoDescription
          : fieldRefKey === 'frtChecks'
            ? updateFrtPhotoDescription
            : checksField === 'highAngleChecks'
              ? updateHighAnglePhotoDescription
              : fieldRefKey === 'scbaChecks'
                ? updateScbaPhotoDescription
                : undefined,
  onApplyPhotoCaption:
    checksField === 'erAuxChecks'
      ? applyErAuxPhotoCaption
      : checksField === 'hydraulicChecks'
        ? applyHydraulicPhotoCaption
        : checksField === 'fireExtinguisherChecks'
          ? applyFireExtinguisherPhotoCaption
          : fieldRefKey === 'frtChecks'
            ? applyFrtPhotoCaption
            : checksField === 'highAngleChecks'
              ? applyHighAnglePhotoCaption
              : fieldRefKey === 'scbaChecks'
                ? applyScbaPhotoCaption
                : undefined,
  onAddExtinguisher: addFireExtinguisher,
  onUpdateExtinguisher: updateFireExtinguisher,
  onSaveFireExtinguisherRowDraft:
    checksField === 'fireExtinguisherChecks' ? saveFireExtinguisherRowDraft : undefined,
  onSelectNextScope: selectNextScope || selectNextLocation,
  onSelectNextLocation: selectNextLocation,
  scopeContinuation: scopeContinuation || locationContinuation || null,
  locationContinuation: scopeContinuation || locationContinuation || null,
  onSelectNextFireExtinguisherLocation:
    checksField === 'fireExtinguisherChecks' ? selectNextFireExtinguisherLocation : undefined,
  fireExtinguisherLocationContinuation:
    checksField === 'fireExtinguisherChecks' ? fireExtinguisherLocationContinuation : null,
  onSaveFrtRowDraft: fieldRefKey === 'frtChecks' ? saveFrtRowDraft : undefined,
  onAddFrtItem: fieldRefKey === 'frtChecks' ? addFrtItem : undefined,
  onDeleteFrtItem: fieldRefKey === 'frtChecks' ? deleteFrtItem : undefined,
  onAddHighAngleCompartment:
    checksField === 'highAngleChecks' ? addHighAngleCompartment : undefined,
  onUpdateHighAngleCompartment:
    checksField === 'highAngleChecks' ? updateHighAngleCompartment : undefined,
  onDeleteHighAngleCompartment:
    checksField === 'highAngleChecks' ? deleteHighAngleCompartment : undefined,
  onAddHighAngleItem: checksField === 'highAngleChecks' ? addHighAngleItem : undefined,
  onUpdateHighAngleItem: checksField === 'highAngleChecks' ? updateHighAngleItem : undefined,
  onDeleteHighAngleItem: checksField === 'highAngleChecks' ? deleteHighAngleItem : undefined,
  onDeleteExtinguisher: (row) =>
    setFireExtinguisherDeleteTarget({
      label: row?.idLocNo || row?.barcodeNo || row?.feType || 'shared extinguisher',
      row,
    }),
  onAddEquipment: openAddEquipmentModal,
  onAddScbaSection: fieldRefKey === 'scbaChecks' ? openAddScbaSectionModal : undefined,
  onEditScbaSection: fieldRefKey === 'scbaChecks' ? openEditScbaSectionModal : undefined,
  onDeleteScbaSection: fieldRefKey === 'scbaChecks' ? requestRemoveScbaSection : undefined,
  onArchiveScbaSection: fieldRefKey === 'scbaChecks' ? requestArchiveScbaSection : undefined,
  onRestoreScbaSection: fieldRefKey === 'scbaChecks' ? restoreScbaSection : undefined,
  onAddScbaItem: fieldRefKey === 'scbaChecks' ? openAddScbaItemModal : undefined,
  onEditScbaItem: fieldRefKey === 'scbaChecks' ? openEditScbaItemModal : undefined,
  onDeleteScbaItem: fieldRefKey === 'scbaChecks' ? requestRemoveScbaItem : undefined,
  onArchiveScbaItem: fieldRefKey === 'scbaChecks' ? requestArchiveScbaItem : undefined,
  onRestoreScbaItem: fieldRefKey === 'scbaChecks' ? restoreScbaItem : undefined,
  onEditEquipment: openEditEquipmentModal,
  onDeleteEquipment: (row) =>
    setEquipmentDeleteTarget({
      value: getEquipmentBackendId(row) || getEquipmentRowId(row),
      label: row?.equipment,
      row,
    }),
  selectedTruckOption: fieldRefKey === 'frtChecks' ? selectedFireTruckOption : null,
  onEditTruck: fieldRefKey === 'frtChecks' ? startEditFireTruck : undefined,
  onDeleteTruck:
    fieldRefKey === 'frtChecks'
      ? (truck) =>
          setFireTruckDeleteTarget({
            value: truck?.truckId || truck?.id,
            label: truck?.plateNo || truck?.value || truck?.title,
            truck,
          })
      : undefined,
})
