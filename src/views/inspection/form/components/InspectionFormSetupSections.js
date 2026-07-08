import React, { useEffect, useRef, useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CFormInput } from '@coreui/react'
import { MoreVertical, Plus } from 'lucide-react'
import CreateActionButton from 'src/components/CreateActionButton'
import IconOptionGrid from 'src/components/IconOptionGrid'
import { ACTIVE_CARD_STYLE, TOGGLE_CARD_PROPS } from 'src/views/inspection/typeOptionUtils'
import { INCIDENT_TYPE_TOGGLE_VALUE } from 'src/views/inspection/useIncidentTypeManager'
import { LOCATION_TOGGLE_VALUE } from 'src/views/inspection/useLocationTypeManager'
import InspectionLocationOptionPicker from './InspectionLocationOptionPicker'
import { FormFieldError, InspectionSelectedTypeCard } from './InspectionFormDisplaySections'
import { isCompactInspectionViewport } from './InspectionDisplayShared'
import {
  applyFireExtinguisherAreaCompletionProgress,
  applyFireExtinguisherLocationProgress,
  applyFireExtinguisherZoneCompletionProgress,
} from '../fireExtinguisherProgressSelectors'
import FireExtinguisherScanner from '../../types/fire-extinguisher/FireExtinguisherScanner'
import {
  InspectionMobileCollapsedSelectorRow,
  InspectionMobileSetupDrawer,
  InspectionMobileSelectorButtonGrid,
} from './InspectionSetupSelectorControls'

const MOBILE_SETUP_DRAWERS = {
  type: 'type',
  fireExtinguisherEntryMode: 'fireExtinguisherEntryMode',
  inspectedAt: 'inspectedAt',
  primaryLocation: 'primaryLocation',
  mainArea: 'mainArea',
  subLocation: 'subLocation',
  fireTruckCompartment: 'fireTruckCompartment',
}

const FIRE_EXTINGUISHER_ENTRY_MODES = [
  { value: 'area', title: 'By Area' },
  { value: 'scan', title: 'Scan QR / Barcode' },
]

const DESKTOP_SETUP_OPTION_COLUMNS = { xs: 6, md: 4, xl: 3 }

const locationCardProps = (option, isSelected) => {
  if (option?.value === LOCATION_TOGGLE_VALUE) return TOGGLE_CARD_PROPS
  return {
    icon: null,
    fallbackIcon: null,
    bodyClassName: 'gap-0',
    paddingClassName: 'p-3',
    style: isSelected ? ACTIVE_CARD_STYLE : undefined,
  }
}

const findOptionTitle = (options = [], value, fallback = '') => {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return String(fallback || '').trim()

  const matched = (Array.isArray(options) ? options : []).find(
    (option) => String(option?.value || '').trim() === normalizedValue,
  )
  return String(matched?.title || matched?.label || fallback || normalizedValue).trim()
}

const findOption = (options = [], value) => {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return null
  return (
    (Array.isArray(options) ? options : []).find(
      (option) =>
        String(option?.value || option?.plateNo || '')
          .trim()
          .toUpperCase() === normalizedValue.toUpperCase(),
    ) || null
  )
}

const getTruckId = (truck = {}) =>
  String(truck?.truckId || truck?.truck_id || truck?.id || '').trim()

const getTruckPlate = (truck = {}) =>
  String(truck?.plateNo || truck?.plate_no || truck?.value || truck?.title || '').trim()

const buildSelectedTruckDetails = ({
  fireTruckOptions = [],
  selectedFireTruckPlate = '',
  form = {},
}) => {
  const selectedOption = findOption(fireTruckOptions, selectedFireTruckPlate)
  const reference = form?.frtTruckReference || form?.frt_truck_reference || {}
  const plateNo =
    getTruckPlate(selectedOption) ||
    getTruckPlate(reference) ||
    String(selectedFireTruckPlate || form?.frtTruckPlateNo || '').trim()
  if (!plateNo) return null

  return {
    ...(selectedOption || {}),
    ...(reference || {}),
    truckId:
      getTruckId(selectedOption) || getTruckId(reference) || String(form?.frtTruckId || '').trim(),
    id:
      getTruckId(selectedOption) || getTruckId(reference) || String(form?.frtTruckId || '').trim(),
    plateNo,
    value: plateNo,
    title: plateNo,
    name: String(
      selectedOption?.name || reference?.name || selectedOption?.description || '',
    ).trim(),
    roadTaxExpiry: String(
      selectedOption?.roadTaxExpiry ||
        reference?.roadTaxExpiry ||
        selectedOption?.road_tax_expiry ||
        '',
    ).trim(),
    insuranceExpiry: String(
      selectedOption?.insuranceExpiry ||
        reference?.insuranceExpiry ||
        selectedOption?.insurance_expiry ||
        '',
    ).trim(),
    puspakomExpiry: String(
      selectedOption?.puspakomExpiry ||
        reference?.puspakomExpiry ||
        selectedOption?.puspakom_expiry ||
        '',
    ).trim(),
  }
}

const FireTruckDetailsCard = ({ truck, onEdit, onDelete }) => {
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef(null)
  const plateNo = truck ? getTruckPlate(truck) : ''
  const canDelete = Boolean(truck && getTruckId(truck))
  const closeAndRun = (callback) => {
    setActionsOpen(false)
    callback?.()
  }

  useEffect(() => {
    if (!actionsOpen) return undefined

    const handlePointerDown = (event) => {
      if (actionsRef.current?.contains(event.target)) return
      setActionsOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActionsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [actionsOpen])

  if (!truck) return null

  return (
    <CCard className="inspection-hydraulic-card inspection-check-card">
      <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="fw-semibold text-muted">Truck Details</div>
        <div ref={actionsRef} className="inspection-fire-truck-actions">
          <CButton
            type="button"
            color="link"
            size="sm"
            className="inspection-fire-truck-actions__toggle border-0 shadow-none text-muted d-inline-flex align-items-center justify-content-center rounded"
            aria-label={`Truck actions for ${plateNo || 'selected truck'}`}
            aria-expanded={actionsOpen}
            onClick={(event) => {
              event.stopPropagation()
              setActionsOpen((current) => !current)
            }}
          >
            <MoreVertical size={16} />
          </CButton>
          {actionsOpen ? (
            <div
              className="inspection-fire-truck-actions__menu bg-body border rounded-3 shadow"
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" className="dropdown-item" onClick={() => closeAndRun(onEdit)}>
                Edit Truck
              </button>
              {canDelete ? (
                <button
                  type="button"
                  className="dropdown-item text-danger"
                  onClick={() => closeAndRun(onDelete)}
                >
                  Delete Truck
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </CCardHeader>
      <CCardBody className="inspection-hydraulic-card-body">
        <div className="row g-3">
          {[
            ['Plate No.', plateNo],
            ['Truck', truck.name],
            ['Road Tax Expiry', truck.roadTaxExpiry],
            ['Insurance Expiry', truck.insuranceExpiry],
            ['Puspakom Expiry', truck.puspakomExpiry],
          ].map(([label, value]) => (
            <div key={label} className="col-6">
              <div className="small text-body-secondary">{label}</div>
              <div className="fw-semibold text-break">{value || '--'}</div>
            </div>
          ))}
        </div>
      </CCardBody>
    </CCard>
  )
}

const FireExtinguisherScanRegistrationCard = ({
  draft,
  error,
  onCancel,
  onRegister,
  status,
  updateDraft,
}) => {
  if (!draft) return null

  const fields = [
    ['barcodeNo', 'S/N / QR / Barcode', 'text'],
    ['zone', 'Zone', 'text'],
    ['mainLocation', 'Main Area', 'text'],
    ['subLocation', 'Location', 'text'],
    ['feType', 'FE Type', 'text'],
    ['certificationValidity', 'Certification Validity', 'date'],
    ['idLocNo', 'ID Loc. No. (optional)', 'text'],
  ]

  return (
    <CCard className="inspection-hydraulic-card inspection-check-card border-primary">
      <CCardHeader className="inspection-hydraulic-card-header">
        <div className="fw-semibold text-muted">Register New Fire Extinguisher</div>
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        <div className="row g-2">
          {fields.map(([field, label, type]) => (
            <div className="col-12 col-md-4" key={field}>
              <CFormInput
                size="sm"
                type={type}
                label={label}
                value={String(draft?.[field] || '')}
                onChange={(event) => updateDraft?.(field, event.target.value)}
              />
            </div>
          ))}
        </div>
        {status ? <div className="small text-body-secondary">{status}</div> : null}
        <FormFieldError>{error || ''}</FormFieldError>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <CButton color="secondary" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </CButton>
          <CButton color="primary" size="sm" onClick={onRegister}>
            Register and Inspect
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

const buildFireExtinguisherDuplicateLabel = (row = {}) =>
  [row.zone ? `Zone ${row.zone}` : '', row.mainLocation, row.subLocation]
    .filter(Boolean)
    .join(' > ')

const buildFireExtinguisherDuplicateMeta = (row = {}) =>
  [row.idLocNo, row.feType, row.certificationValidity].filter(Boolean).join(' | ')

const isFireExtinguisherDuplicateConflictError = (error = '') =>
  /multiple active extinguishers use this locator|resolve the catalog duplicate/i.test(
    String(error || ''),
  )

const FireExtinguisherDuplicateConflictCard = ({
  duplicateRows = [],
  locator,
  onEditDuplicate,
  onScanAnother,
  onSwitchToArea,
  status,
}) => {
  const rows = Array.isArray(duplicateRows) ? duplicateRows : []
  if (rows.length === 0) return null

  return (
    <CCard className="inspection-hydraulic-card inspection-check-card border-danger">
      <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div className="fw-semibold text-danger">Duplicate locator found</div>
        <div className="d-flex flex-wrap gap-2">
          <CButton color="secondary" variant="outline" size="sm" onClick={onSwitchToArea}>
            Switch to area mode
          </CButton>
          <CreateActionButton
            label="Scan another"
            className="inspection-compact-action-btn"
            onClick={onScanAnother}
          />
        </div>
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        {locator ? (
          <div>
            <div className="small text-body-secondary">S/N / QR / Barcode</div>
            <div className="fw-semibold text-break">{locator}</div>
          </div>
        ) : null}
        <div className="text-body-secondary">
          This QR / barcode matches {rows.length} active catalog items. Resolve the duplicate before
          inspection so future scans stay unambiguous.
        </div>
        <div className="d-grid gap-2">
          {rows.map((row) => (
            <div
              key={String(row.id || row.catalogId || row.barcodeNo)}
              className="rounded-3 border p-3 d-grid gap-2"
            >
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <div className="fw-semibold text-break">
                  {row.idLocNo || row.barcodeNo || 'Fire extinguisher'}
                </div>
                {row.canEdit !== false ? (
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    onClick={() => onEditDuplicate?.(row)}
                  >
                    Edit catalog
                  </CButton>
                ) : null}
              </div>
              <div className="small text-body-secondary text-break">
                {buildFireExtinguisherDuplicateLabel(row) || 'Location unavailable'}
              </div>
              <div className="small text-body-secondary text-break">
                {buildFireExtinguisherDuplicateMeta(row) || 'Catalog details unavailable'}
              </div>
            </div>
          ))}
        </div>
        {status ? <div className="small text-body-secondary">{status}</div> : null}
      </CCardBody>
    </CCard>
  )
}

const FireExtinguisherDuplicateEditCard = ({
  draft,
  error,
  onCancel,
  onSave,
  status,
  updateDraft,
}) => {
  if (!draft) return null

  const fields = [
    ['barcodeNo', 'S/N / QR / Barcode', 'text'],
    ['zone', 'Zone', 'text'],
    ['mainLocation', 'Main Area', 'text'],
    ['subLocation', 'Location', 'text'],
    ['feType', 'FE Type', 'text'],
    ['certificationValidity', 'Certification Validity', 'date'],
    ['idLocNo', 'ID Loc. No. (optional)', 'text'],
  ]

  return (
    <CCard className="inspection-hydraulic-card inspection-check-card border-warning">
      <CCardHeader className="inspection-hydraulic-card-header">
        <div className="fw-semibold text-muted">Edit Duplicate Fire Extinguisher</div>
      </CCardHeader>
      <CCardBody className="d-grid gap-3">
        <div className="row g-2">
          {fields.map(([field, label, type]) => (
            <div className="col-12 col-md-4" key={field}>
              <CFormInput
                size="sm"
                type={type}
                label={label}
                value={String(draft?.[field] || '')}
                onChange={(event) => updateDraft?.(field, event.target.value)}
              />
            </div>
          ))}
        </div>
        {status ? <div className="small text-body-secondary">{status}</div> : null}
        <FormFieldError>{error || ''}</FormFieldError>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <CButton color="secondary" variant="outline" size="sm" onClick={onCancel}>
            Back to duplicates
          </CButton>
          <CButton color="primary" size="sm" onClick={onSave}>
            Save and retry scan
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

const normalizeCountKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const InspectionFormSetupSections = ({
  fieldErrors,
  fireExtinguisherAreaRows = [],
  fireExtinguisherScan = null,
  fireExtinguisherSessionProgress = null,
  fireTruckOptions,
  form,
  incident,
  inspectedAtRef,
  inspectionTypeRef,
  isEditingType,
  isFireExtinguisherCatalogInspectionForm,
  usesZoneLocationFlow = false,
  isLoadingFireExtinguisherAreaRows = false,
  isFireTruckCatalogInspectionForm,
  location,
  mainLocation,
  openAddFireTruckModal,
  setFireTruckDeleteTarget,
  startEditFireTruck,
  selectedFireTruckPlate,
  selectedLocationRef,
  selectedType,
  selectedTypeDefinition,
  selectedTypeIcon,
  selectedTypeOption,
  setIsEditingType,
  selectFireTruck,
  subLocation,
  supportsCustomLocations,
  supportsSubLocations,
  updateForm,
  updateInspectionType,
  updateInspectedAt,
  resetInspectionTypeSelection,
  resetInspectedAt: resetInspectedAtSelection,
  resetPrimaryLocation: resetPrimaryLocationSelection,
  resetMainArea: resetMainAreaSelection,
  resetSubLocation: resetSubLocationSelection,
  showFireTruckModal = false,
  zone,
}) => {
  const hasZoneLocationFlow = usesZoneLocationFlow || isFireExtinguisherCatalogInspectionForm
  const fireExtinguisherEntryMode = String(form.fireExtinguisherEntryMode || '').trim()
  const hasExistingFireExtinguisherAreaSelection =
    isFireExtinguisherCatalogInspectionForm &&
    !fireExtinguisherEntryMode &&
    [
      zone,
      form.zone,
      form.zoneId,
      mainLocation,
      form.mainLocation,
      form.mainLocationId,
      subLocation,
      form.subLocation,
      form.subLocationId,
      form.selectedLocation,
    ].some((value) => String(value || '').trim() !== '')
  const isFireExtinguisherScanMode =
    isFireExtinguisherCatalogInspectionForm && fireExtinguisherEntryMode === 'scan'
  const isFireExtinguisherAreaMode =
    !isFireExtinguisherCatalogInspectionForm ||
    fireExtinguisherEntryMode === 'area' ||
    hasExistingFireExtinguisherAreaSelection
  const hasFireExtinguisherEntryMode =
    !isFireExtinguisherCatalogInspectionForm ||
    fireExtinguisherEntryMode === 'area' ||
    fireExtinguisherEntryMode === 'scan' ||
    hasExistingFireExtinguisherAreaSelection
  const hasLoadedFireExtinguisherScanTarget =
    isFireExtinguisherScanMode && String(form.fireExtinguisherFocusedAssetKey || '').trim() !== ''
  const fireExtinguisherScanStatusText = String(fireExtinguisherScan?.status || '').trim()
  const isFireExtinguisherScanLookupLoading =
    isFireExtinguisherScanMode && /looking up/i.test(fireExtinguisherScanStatusText)
  const shouldShowInspectionDateTime =
    !isFireExtinguisherCatalogInspectionForm ||
    isFireExtinguisherAreaMode ||
    hasLoadedFireExtinguisherScanTarget ||
    isFireExtinguisherScanLookupLoading
  const shouldShowLocationSetup =
    !isFireExtinguisherCatalogInspectionForm ||
    isFireExtinguisherAreaMode ||
    hasLoadedFireExtinguisherScanTarget
  const shouldShowFireExtinguisherScanLocationSummary =
    hasLoadedFireExtinguisherScanTarget || isFireExtinguisherScanLookupLoading
  const shouldShowLocationPickers =
    shouldShowLocationSetup && !shouldShowFireExtinguisherScanLocationSummary
  const shouldShowFireExtinguisherScanPanel =
    isFireExtinguisherScanMode &&
    (Boolean(fireExtinguisherScan?.registrationDraft) ||
      Boolean(fireExtinguisherScan?.duplicateEditDraft) ||
      (Array.isArray(fireExtinguisherScan?.duplicateRows) &&
        fireExtinguisherScan.duplicateRows.length > 0) ||
      (!isFireExtinguisherScanLookupLoading && fireExtinguisherScanStatusText !== '') ||
      String(fireExtinguisherScan?.error || '').trim() !== '')
  const fireExtinguisherDisplayEntryMode =
    fireExtinguisherEntryMode || (hasExistingFireExtinguisherAreaSelection ? 'area' : '')
  const selectedFireExtinguisherEntryModeOption =
    FIRE_EXTINGUISHER_ENTRY_MODES.find(
      (option) => option.value === fireExtinguisherDisplayEntryMode,
    ) || null
  const isFireTruckCompartmentFlow =
    isFireTruckCatalogInspectionForm && selectedTypeDefinition?.usesCompartmentSelection === true
  const isCompactViewport = isCompactInspectionViewport()
  const setupOptionVariant = isCompactViewport ? 'compact' : 'standard'
  const [activeMobileSetupDrawer, setActiveMobileSetupDrawer] = useState('')
  const [returnMobileSetupDrawer, setReturnMobileSetupDrawer] = useState('')
  const [fireTruckCompartmentName, setFireTruckCompartmentName] = useState('')
  const [fireTruckCompartmentError, setFireTruckCompartmentError] = useState('')
  const [isEditingFireExtinguisherEntryMode, setIsEditingFireExtinguisherEntryMode] =
    useState(false)
  const closeMobileSetupDrawer = () => {
    setActiveMobileSetupDrawer('')
    setReturnMobileSetupDrawer('')
  }
  const mobileSetupChildDrawerVisible = Boolean(
    incident.showAddTypeModal || location.showAddLocationModal || showFireTruckModal,
  )

  useEffect(() => {
    if (!isCompactViewport || !returnMobileSetupDrawer || mobileSetupChildDrawerVisible) return
    const timer = window.setTimeout(() => {
      setActiveMobileSetupDrawer(returnMobileSetupDrawer)
      setReturnMobileSetupDrawer('')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [isCompactViewport, mobileSetupChildDrawerVisible, returnMobileSetupDrawer])

  const selectedTypeLabel =
    selectedTypeDefinition?.title || selectedTypeOption?.title || selectedType
  const primaryLocationValue = isFireTruckCatalogInspectionForm
    ? selectedFireTruckPlate
    : hasZoneLocationFlow
      ? location.selectedZoneValue || zone
      : mainLocation
  const selectedPrimaryLocationLabel = isFireTruckCatalogInspectionForm
    ? findOptionTitle(fireTruckOptions, selectedFireTruckPlate, selectedFireTruckPlate)
    : hasZoneLocationFlow
      ? location.selectedZoneTitle ||
        findOptionTitle(location.zoneOptions, primaryLocationValue, primaryLocationValue)
      : location.selectedMainLocationTitle ||
        findOptionTitle(location.mainLocationOptions, mainLocation, mainLocation)
  const selectedMainAreaLabel =
    location.selectedMainLocationTitle ||
    findOptionTitle(location.areaOptions, mainLocation, mainLocation)
  const fireTruckCompartmentOptions = isFireTruckCompartmentFlow
    ? selectedTypeDefinition?.getCompartmentOptions?.(form) || []
    : []
  const selectedFireTruckDetails = isFireTruckCatalogInspectionForm
    ? buildSelectedTruckDetails({ fireTruckOptions, selectedFireTruckPlate, form })
    : null
  const selectedSubLocationLabel = isFireTruckCompartmentFlow
    ? findOptionTitle(fireTruckCompartmentOptions, subLocation, subLocation)
    : location.selectedSubLocationTitle ||
      findOptionTitle(location.subLocationOptions, subLocation, subLocation)
  const scannedFireExtinguisherLocator = String(form.fireExtinguisherScannedLocator || '').trim()
  const scannedFireExtinguisherLocationSummary = [
    zone ? `Zone ${zone}` : '',
    selectedMainAreaLabel || mainLocation,
    selectedSubLocationLabel || subLocation,
  ]
    .filter(Boolean)
    .join(' > ')
  const hasSelectedPrimaryLocation = String(selectedPrimaryLocationLabel || '').trim() !== ''
  const primaryCollapsedLabel = isFireTruckCatalogInspectionForm
    ? 'Truck'
    : hasZoneLocationFlow
      ? 'Zone'
      : selectedTypeDefinition?.mainLocationLabel || 'Main Location'
  const mainAreaCollapsedLabel = 'Main Area'
  const subLocationCollapsedLabel = isFireTruckCompartmentFlow
    ? selectedTypeDefinition?.subLocationLabel || 'Compartment'
    : hasZoneLocationFlow
      ? 'Location'
      : 'Sub-location'

  const handleTypeChange = (nextValue) => {
    if (nextValue === INCIDENT_TYPE_TOGGLE_VALUE) {
      incident.setShowAllIncidentTypes((prev) => !prev)
      return
    }

    incident.setShowAllIncidentTypes(false)
    updateInspectionType(String(nextValue || '').trim())
    setIsEditingType(false)
    closeMobileSetupDrawer()
  }

  const isTypeExpanded = !isCompactViewport ? isEditingType : !selectedType
  const isMobileTypeCollapsed = Boolean(isCompactViewport && selectedType && !isTypeExpanded)
  const isDesktopTypeCollapsed = Boolean(!isCompactViewport && selectedType && !isEditingType)
  const isPrimaryLocationCollapsed = Boolean(
    isCompactViewport && String(primaryLocationValue || '').trim() && hasSelectedPrimaryLocation,
  )
  const isMainAreaCollapsed = Boolean(
    isCompactViewport &&
      String(mainLocation || '').trim() &&
      String(selectedMainAreaLabel || '').trim(),
  )
  const isSubLocationCollapsed = Boolean(
    isCompactViewport &&
      String(subLocation || '').trim() &&
      String(selectedSubLocationLabel || '').trim(),
  )
  const hasInspectedAt = String(form.inspectedAt || '').trim() !== ''
  const primaryLocationOptions = isFireTruckCatalogInspectionForm
    ? fireTruckOptions
    : isFireExtinguisherCatalogInspectionForm
      ? applyFireExtinguisherZoneCompletionProgress({
          options: location.zoneOptions,
          completedLocations: fireExtinguisherSessionProgress?.completedLocations,
          locationProgress: fireExtinguisherSessionProgress?.locationProgress,
        })
      : hasZoneLocationFlow
        ? location.zoneOptions
        : location.mainLocationOptions
  const visiblePrimaryLocationOptions = isFireTruckCatalogInspectionForm
    ? fireTruckOptions
    : isFireExtinguisherCatalogInspectionForm
      ? applyFireExtinguisherZoneCompletionProgress({
          options: location.visibleZoneOptions,
          completedLocations: fireExtinguisherSessionProgress?.completedLocations,
          locationProgress: fireExtinguisherSessionProgress?.locationProgress,
        })
      : hasZoneLocationFlow
        ? location.visibleZoneOptions
        : location.visibleMainLocationOptions
  const primaryLocationSearchPlaceholder = hasZoneLocationFlow
    ? 'Search zone...'
    : selectedTypeDefinition?.mainLocationSearchPlaceholder || 'Search main location...'
  const primaryLocationSearchAriaLabel = isFireTruckCatalogInspectionForm
    ? 'Search truck plate'
    : hasZoneLocationFlow
      ? 'Search inspection zone'
      : 'Search main location'
  const primaryLocationClearSearchAriaLabel = isFireTruckCatalogInspectionForm
    ? 'Clear truck search'
    : hasZoneLocationFlow
      ? 'Clear zone search'
      : 'Clear main location search'
  const primaryLocationToggleValue = isFireTruckCatalogInspectionForm ? '' : LOCATION_TOGGLE_VALUE
  const primaryLocationAddLabel = isFireTruckCatalogInspectionForm
    ? 'Add Truck'
    : hasZoneLocationFlow
      ? 'Add zone'
      : 'Add main location'
  const primaryLocationAddAction = isFireTruckCatalogInspectionForm
    ? openAddFireTruckModal
    : supportsCustomLocations
      ? hasZoneLocationFlow
        ? location.openAddZoneModal
        : location.openAddMainLocationModal
      : null
  const subLocationPickerSearchPlaceholder = isFireTruckCompartmentFlow
    ? 'Search compartment...'
    : hasZoneLocationFlow
      ? 'Search location...'
      : 'Search sub-location...'
  const subLocationPickerSearchAriaLabel = isFireTruckCompartmentFlow
    ? 'Search fire truck compartment'
    : hasZoneLocationFlow
      ? 'Search inspection location'
      : 'Search sub-location'
  const subLocationPickerClearSearchAriaLabel = isFireTruckCompartmentFlow
    ? 'Clear compartment search'
    : hasZoneLocationFlow
      ? 'Clear location search'
      : 'Clear sub-location search'
  const areaOptionsWithProgress = isFireExtinguisherCatalogInspectionForm
    ? applyFireExtinguisherAreaCompletionProgress({
        options: location.areaOptions,
        completedLocations: fireExtinguisherSessionProgress?.completedLocations,
        extinguisherRows: fireExtinguisherAreaRows,
        locationProgress: fireExtinguisherSessionProgress?.locationProgress,
        sessionResults: fireExtinguisherSessionProgress?.results,
        zone,
      })
    : location.areaOptions
  const visibleAreaOptionsWithProgress = isFireExtinguisherCatalogInspectionForm
    ? applyFireExtinguisherAreaCompletionProgress({
        options: location.visibleAreaOptions,
        completedLocations: fireExtinguisherSessionProgress?.completedLocations,
        extinguisherRows: fireExtinguisherAreaRows,
        locationProgress: fireExtinguisherSessionProgress?.locationProgress,
        sessionResults: fireExtinguisherSessionProgress?.results,
        zone,
      })
    : location.visibleAreaOptions
  const selectedMainAreaProgressOption = isFireExtinguisherCatalogInspectionForm
    ? areaOptionsWithProgress.find(
        (option) =>
          normalizeCountKey(option?.value || option?.title) === normalizeCountKey(mainLocation),
      )
    : null
  const selectedMainAreaProgressLabel = String(
    selectedMainAreaProgressOption?.metaLabel || '',
  ).trim()
  const shouldShowFireExtinguisherAreaProgress = !hasLoadedFireExtinguisherScanTarget
  const subLocationOptionsWithCounts = isFireTruckCompartmentFlow
    ? fireTruckCompartmentOptions
    : isFireExtinguisherCatalogInspectionForm
      ? applyFireExtinguisherLocationProgress({
          options: location.subLocationOptions,
          completedLocations: fireExtinguisherSessionProgress?.completedLocations,
          extinguisherRows: fireExtinguisherAreaRows,
          isLoading: isLoadingFireExtinguisherAreaRows,
          locationProgress: fireExtinguisherSessionProgress?.locationProgress,
          level: 'subLocation',
          sessionResults: fireExtinguisherSessionProgress?.results,
          zone,
          mainLocation,
        })
      : location.subLocationOptions
  const visibleSubLocationOptionsWithCounts = isFireTruckCompartmentFlow
    ? fireTruckCompartmentOptions
    : isFireExtinguisherCatalogInspectionForm
      ? applyFireExtinguisherLocationProgress({
          options: location.visibleSubLocationOptions,
          completedLocations: fireExtinguisherSessionProgress?.completedLocations,
          extinguisherRows: fireExtinguisherAreaRows,
          isLoading: isLoadingFireExtinguisherAreaRows,
          locationProgress: fireExtinguisherSessionProgress?.locationProgress,
          level: 'subLocation',
          sessionResults: fireExtinguisherSessionProgress?.results,
          zone,
          mainLocation,
        })
      : location.visibleSubLocationOptions
  const selectedSubLocationProgressOption = isFireExtinguisherCatalogInspectionForm
    ? subLocationOptionsWithCounts.find(
        (option) =>
          normalizeCountKey(option?.value || option?.title) === normalizeCountKey(subLocation),
      )
    : null
  const selectedSubLocationProgressLabel = String(
    selectedSubLocationProgressOption?.metaLabel || '',
  ).trim()
  const desktopTypeOptions = isCompactViewport ? incident.visibleTypeOptions : incident.typeOptions
  const desktopPrimaryLocationVisibleOptions = isCompactViewport
    ? visiblePrimaryLocationOptions
    : primaryLocationOptions
  const desktopMainAreaVisibleOptions = isCompactViewport
    ? visibleAreaOptionsWithProgress
    : areaOptionsWithProgress
  const desktopSubLocationVisibleOptions = isCompactViewport
    ? visibleSubLocationOptionsWithCounts
    : subLocationOptionsWithCounts

  const openMobileSetupChildDrawer = (returnDrawer, onOpen) => {
    if (typeof onOpen !== 'function') return
    if (isCompactViewport && returnDrawer) {
      setReturnMobileSetupDrawer(returnDrawer)
      setActiveMobileSetupDrawer('')
    }
    onOpen()
  }

  const renderDrawerHeaderAction = (label, onClick, returnDrawer = activeMobileSetupDrawer) =>
    typeof onClick === 'function' ? (
      <CreateActionButton
        label={label}
        className="inspection-compact-action-btn"
        onClick={() => openMobileSetupChildDrawer(returnDrawer, onClick)}
      />
    ) : null

  const handlePrimaryLocationChange = (nextValue) => {
    if (isFireTruckCatalogInspectionForm) {
      const truck = fireTruckOptions.find(
        (option) => String(option.value || '') === String(nextValue || ''),
      )
      selectFireTruck(truck)
      if (String(nextValue || '').trim()) {
        closeMobileSetupDrawer()
      }
      return
    }
    if (nextValue === LOCATION_TOGGLE_VALUE) {
      if (hasZoneLocationFlow) {
        location.setShowAllZoneTypes((prev) => !prev)
      } else {
        location.setShowAllMainLocationTypes((prev) => !prev)
      }
      return
    }
    if (hasZoneLocationFlow) {
      location.setZone(nextValue)
      closeMobileSetupDrawer()
      return
    }
    location.setMainLocation(nextValue)
    closeMobileSetupDrawer()
  }

  const handleMainAreaChange = (nextValue) => {
    if (nextValue === LOCATION_TOGGLE_VALUE) {
      location.setShowAllMainLocationTypes((prev) => !prev)
      return
    }
    location.setMainLocation(nextValue)
    closeMobileSetupDrawer()
  }

  const handleSubLocationChange = (nextValue) => {
    if (isFireTruckCompartmentFlow) {
      updateForm({
        ...form,
        subLocation: String(nextValue || '').trim(),
        subLocationId: '',
      })
      closeMobileSetupDrawer()
      return
    }
    if (nextValue === LOCATION_TOGGLE_VALUE) {
      location.setShowAllSubLocationTypes((prev) => !prev)
      return
    }
    location.setSubLocation(nextValue)
    closeMobileSetupDrawer()
  }

  const saveFireTruckCompartment = () => {
    const compartment = String(fireTruckCompartmentName || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase()
    if (!compartment) {
      setFireTruckCompartmentError('Compartment name is required.')
      return
    }

    const existing = subLocationOptionsWithCounts.find(
      (option) =>
        String(option.value || '')
          .trim()
          .toUpperCase() === compartment,
    )
    const currentCustomCompartments = Array.isArray(form.frtCustomCompartments)
      ? form.frtCustomCompartments
      : []

    updateForm({
      ...form,
      subLocation: existing?.value || compartment,
      subLocationId: '',
      frtCustomCompartments: existing
        ? currentCustomCompartments
        : [...currentCustomCompartments, compartment],
    })
    setFireTruckCompartmentName('')
    setFireTruckCompartmentError('')
    closeMobileSetupDrawer()
  }

  const openFireTruckCompartmentDrawer = () => {
    setFireTruckCompartmentName('')
    setFireTruckCompartmentError('')
    setReturnMobileSetupDrawer(activeMobileSetupDrawer || MOBILE_SETUP_DRAWERS.subLocation)
    setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.fireTruckCompartment)
  }

  const resetTypeSelection = () => {
    if (typeof resetInspectionTypeSelection === 'function') {
      resetInspectionTypeSelection()
    } else {
      updateInspectionType('')
    }
    setIsEditingType(false)
    closeMobileSetupDrawer()
  }

  const resetInspectedAt = () => {
    if (typeof resetInspectedAtSelection === 'function') {
      resetInspectedAtSelection()
    } else {
      updateInspectedAt('')
    }
    closeMobileSetupDrawer()
  }

  const resetPrimaryLocation = () => {
    if (typeof resetPrimaryLocationSelection === 'function') {
      resetPrimaryLocationSelection()
      closeMobileSetupDrawer()
      return
    }
    if (isFireTruckCatalogInspectionForm) {
      updateForm({
        ...form,
        mainLocation: '',
        selectedLocation: '',
        zone: '',
        zoneId: '',
        subLocation: '',
        mainLocationId: '',
        subLocationId: '',
        frtTruckId: '',
        frtTruckPlateNo: '',
        frtTruckReference: null,
      })
    } else if (hasZoneLocationFlow) {
      location.setZone('')
    } else {
      location.setMainLocation('')
    }
    closeMobileSetupDrawer()
  }

  const resetMainArea = () => {
    if (typeof resetMainAreaSelection === 'function') {
      resetMainAreaSelection()
      closeMobileSetupDrawer()
      return
    }
    location.setMainLocation('')
    closeMobileSetupDrawer()
  }

  const resetSubLocation = () => {
    if (typeof resetSubLocationSelection === 'function') {
      resetSubLocationSelection()
      closeMobileSetupDrawer()
      return
    }
    if (isFireTruckCompartmentFlow) {
      updateForm({
        ...form,
        subLocation: '',
        subLocationId: '',
      })
      closeMobileSetupDrawer()
      return
    }
    location.setSubLocation('')
    closeMobileSetupDrawer()
  }

  const editSelectedFireTruck = () => {
    if (!selectedFireTruckDetails) return
    openMobileSetupChildDrawer(MOBILE_SETUP_DRAWERS.primaryLocation, () =>
      startEditFireTruck?.(selectedFireTruckDetails),
    )
  }

  const deleteSelectedFireTruck = () => {
    if (!selectedFireTruckDetails) return
    setFireTruckDeleteTarget?.({
      truck: selectedFireTruckDetails,
      label: getTruckPlate(selectedFireTruckDetails),
    })
  }

  const handleFireExtinguisherEntryModeChange = (mode) => {
    fireExtinguisherScan?.onChangeMode?.(mode)
    setIsEditingFireExtinguisherEntryMode(false)
  }

  const resetFireExtinguisherEntryMode = () => {
    fireExtinguisherScan?.onChangeMode?.('')
    setIsEditingFireExtinguisherEntryMode(false)
  }

  const editFireExtinguisherEntryMode = () => {
    if (isCompactViewport) {
      setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.fireExtinguisherEntryMode)
      return
    }
    setIsEditingFireExtinguisherEntryMode(true)
  }

  const renderFireExtinguisherScanPanel = () => {
    if (!shouldShowFireExtinguisherScanPanel) return null

    if (fireExtinguisherScan?.registrationDraft) {
      return (
        <FireExtinguisherScanRegistrationCard
          draft={fireExtinguisherScan.registrationDraft}
          error={fireExtinguisherScan.error}
          status={fireExtinguisherScan.status}
          updateDraft={fireExtinguisherScan.updateRegistrationDraft}
          onRegister={fireExtinguisherScan.onRegister}
          onCancel={() => fireExtinguisherScan.onChangeMode?.('area')}
        />
      )
    }

    if (fireExtinguisherScan?.duplicateEditDraft) {
      return (
        <FireExtinguisherDuplicateEditCard
          draft={fireExtinguisherScan.duplicateEditDraft}
          error={fireExtinguisherScan.error}
          status={fireExtinguisherScan.status}
          updateDraft={fireExtinguisherScan.onChangeDuplicateEditDraft}
          onSave={fireExtinguisherScan.onSaveDuplicateEdit}
          onCancel={fireExtinguisherScan.onCancelDuplicateEdit}
        />
      )
    }

    if (
      Array.isArray(fireExtinguisherScan?.duplicateRows) &&
      fireExtinguisherScan.duplicateRows.length > 0
    ) {
      return (
        <FireExtinguisherDuplicateConflictCard
          duplicateRows={fireExtinguisherScan.duplicateRows}
          error={fireExtinguisherScan.error}
          locator={String(form.fireExtinguisherScannedLocator || '').trim()}
          status={fireExtinguisherScan.status}
          onEditDuplicate={fireExtinguisherScan.onEditDuplicate}
          onScanAnother={fireExtinguisherScan.onOpenScanner}
          onSwitchToArea={() => fireExtinguisherScan.onChangeMode?.('area')}
        />
      )
    }

    const locator = String(form.fireExtinguisherScannedLocator || '').trim()
    const locationSummary = [zone ? `Zone ${zone}` : '', mainLocation, subLocation]
      .filter(Boolean)
      .join(' > ')

    return (
      <CCard className="inspection-hydraulic-card inspection-check-card">
        <CCardHeader className="inspection-hydraulic-card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="fw-semibold text-muted">Scanned Fire Extinguisher</div>
          <CreateActionButton
            label="Scan another"
            className="inspection-compact-action-btn"
            onClick={fireExtinguisherScan?.onOpenScanner}
          />
        </CCardHeader>
        <CCardBody className="d-grid gap-2">
          {locator ? (
            <div>
              <div className="small text-body-secondary">S/N / QR / Barcode</div>
              <div className="fw-semibold text-break">{locator}</div>
            </div>
          ) : (
            <div className="text-body-secondary">Scan a QR code or barcode to load an FE.</div>
          )}
          {locationSummary ? (
            <div>
              <div className="small text-body-secondary">Loaded location</div>
              <div className="fw-semibold text-break">{locationSummary}</div>
            </div>
          ) : null}
          {fireExtinguisherScan?.status ? (
            <div className="small text-body-secondary">{fireExtinguisherScan.status}</div>
          ) : null}
          <FormFieldError>{fireExtinguisherScan?.error || ''}</FormFieldError>
        </CCardBody>
      </CCard>
    )
  }

  const showFireExtinguisherEntryModeChooser =
    !selectedFireExtinguisherEntryModeOption || isEditingFireExtinguisherEntryMode

  return (
    <>
      <div className="inspection-form-section d-grid gap-3" ref={inspectionTypeRef}>
        {isMobileTypeCollapsed || isDesktopTypeCollapsed ? (
          <>
            {!isCompactViewport ? (
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div className="fw-semibold text-muted">Type</div>
                <CreateActionButton
                  label="Edit"
                  className="inspection-compact-action-btn d-none d-md-inline-flex"
                  showIcon={false}
                  onClick={() => setIsEditingType(true)}
                />
              </div>
            ) : null}
            {isCompactViewport ? (
              <InspectionMobileCollapsedSelectorRow
                label="Type"
                value={selectedTypeLabel}
                resetLabel="Reset type"
                onReset={resetTypeSelection}
                onEdit={() => setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.type)}
              />
            ) : null}
            {!isCompactViewport ? (
              <InspectionSelectedTypeCard
                inspectionType={selectedTypeLabel}
                icon={selectedTypeIcon}
                onEdit={() => setIsEditingType(true)}
              />
            ) : null}
          </>
        ) : (
          <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="fw-semibold text-muted">Choose Type</div>
              <div className="d-flex align-items-center gap-2">
                <CreateActionButton
                  label="Add type"
                  className="inspection-compact-action-btn"
                  onClick={incident.openAddModal}
                />
                {selectedType ? (
                  <CreateActionButton
                    label="Done"
                    className="inspection-compact-action-btn"
                    showIcon={false}
                    onClick={() => setIsEditingType(false)}
                  />
                ) : null}
              </div>
            </div>
            {isCompactViewport ? (
              <InspectionMobileSelectorButtonGrid
                options={incident.visibleTypeOptions}
                value={selectedType}
                onChange={handleTypeChange}
                columns={{ xs: 12, md: 3 }}
              />
            ) : (
              <IconOptionGrid
                options={desktopTypeOptions}
                value={selectedType}
                onChange={handleTypeChange}
                variant={setupOptionVariant}
                showDescription
                columns={DESKTOP_SETUP_OPTION_COLUMNS}
                cardProps={(option, isSelected) => {
                  if (option?.value === INCIDENT_TYPE_TOGGLE_VALUE) return TOGGLE_CARD_PROPS
                  return isSelected ? { style: ACTIVE_CARD_STYLE } : {}
                }}
              />
            )}
          </>
        )}
        <FormFieldError>
          {fieldErrors.inspectionType ? 'Choose an inspection type.' : ''}
        </FormFieldError>
      </div>

      {selectedType ? (
        <>
          {isFireExtinguisherCatalogInspectionForm ? (
            <div className="inspection-form-section d-grid gap-3">
              {showFireExtinguisherEntryModeChooser ? (
                <>
                  <div className="fw-semibold text-muted">Choose Inspection Mode</div>
                  <div className="row g-2">
                    {FIRE_EXTINGUISHER_ENTRY_MODES.map((option) => {
                      const active = fireExtinguisherDisplayEntryMode === option.value
                      return (
                        <div className="col-6" key={option.value}>
                          <button
                            type="button"
                            className={`inspection-location-option-card inspection-fire-extinguisher-mode-card w-100 h-100 text-center rounded-3 border bg-body p-3 ${
                              active
                                ? 'inspection-fire-extinguisher-mode-card--active border-primary shadow-sm'
                                : 'inspection-fire-extinguisher-mode-card--idle'
                            }`}
                            aria-pressed={active}
                            style={active ? ACTIVE_CARD_STYLE : undefined}
                            onClick={() => handleFireExtinguisherEntryModeChange(option.value)}
                          >
                            <span className="d-block fw-semibold">{option.title}</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <InspectionMobileCollapsedSelectorRow
                  label="Inspection mode"
                  value={selectedFireExtinguisherEntryModeOption.title}
                  editLabel="Edit inspection mode"
                  resetLabel="Reset inspection mode"
                  extraAction={
                    isFireExtinguisherScanMode &&
                    typeof fireExtinguisherScan?.onOpenScanner === 'function' ? (
                      <CButton
                        type="button"
                        color="primary"
                        variant="ghost"
                        size="sm"
                        className="inspection-mobile-selector-chip__reset p-1 border-0 shadow-none"
                        aria-label="Scan another FE"
                        title="Scan another FE"
                        onClick={fireExtinguisherScan.onOpenScanner}
                      >
                        <Plus size={18} />
                      </CButton>
                    ) : null
                  }
                  onEdit={editFireExtinguisherEntryMode}
                  onReset={resetFireExtinguisherEntryMode}
                />
              )}
            </div>
          ) : null}

          {hasFireExtinguisherEntryMode && shouldShowInspectionDateTime ? (
            <div className="inspection-form-section d-grid gap-3" ref={inspectedAtRef}>
              <div className="d-none d-md-block fw-semibold text-muted">
                Date and time of inspection
              </div>
              {hasInspectedAt ? (
                <div className="d-md-none">
                  <InspectionMobileCollapsedSelectorRow
                    label="Date and time"
                    value={String(form.inspectedAt || '')}
                    editLabel="Edit date and time"
                    resetLabel="Reset date and time"
                    onReset={resetInspectedAt}
                    onEdit={() => setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.inspectedAt)}
                  />
                </div>
              ) : (
                <div className="inspection-mobile-datetime-card rounded-3 border border-primary bg-primary bg-opacity-10 d-md-none">
                  <label
                    className="inspection-mobile-datetime-label small text-muted"
                    htmlFor="inspection-mobile-inspected-at"
                  >
                    Date and time
                  </label>
                  <CFormInput
                    id="inspection-mobile-inspected-at"
                    className="inspection-mobile-datetime-input"
                    type="datetime-local"
                    aria-label="Date and time of inspection"
                    value={String(form.inspectedAt || '')}
                    onChange={(event) => updateInspectedAt(event.target.value)}
                  />
                </div>
              )}
              <div className="row g-3 d-none d-md-flex">
                <div className="col-12 col-md-6">
                  <CFormInput
                    type="datetime-local"
                    aria-label="Date and time of inspection"
                    value={String(form.inspectedAt || '')}
                    onChange={(event) => updateInspectedAt(event.target.value)}
                  />
                </div>
              </div>
              <FormFieldError>
                {fieldErrors.inspectedAt ? 'Enter the inspection date and time.' : ''}
              </FormFieldError>
            </div>
          ) : null}

          {shouldShowFireExtinguisherScanPanel ? (
            <div className="inspection-form-section d-grid gap-3" ref={selectedLocationRef}>
              {renderFireExtinguisherScanPanel()}
            </div>
          ) : null}

          {shouldShowFireExtinguisherScanLocationSummary ? (
            <div className="inspection-form-section d-grid gap-3" ref={selectedLocationRef}>
              <InspectionMobileCollapsedSelectorRow
                label="Location"
                value={
                  isFireExtinguisherScanLookupLoading
                    ? `Checking ${scannedFireExtinguisherLocator || 'fire extinguisher'}...`
                    : `Unit ${scannedFireExtinguisherLocator || 'FE'} is located at ${
                        scannedFireExtinguisherLocationSummary || 'selected location'
                      }.`
                }
                className={`inspection-fire-extinguisher-scan-location-summary${
                  isFireExtinguisherScanLookupLoading
                    ? ' inspection-fire-extinguisher-scan-location-summary--loading'
                    : ''
                }`}
              />
            </div>
          ) : null}

          {shouldShowLocationPickers ? (
            <div className="inspection-form-section d-grid gap-3" ref={selectedLocationRef}>
              {!isPrimaryLocationCollapsed ? (
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="fw-semibold text-muted">
                    {hasZoneLocationFlow
                      ? 'Choose Zone'
                      : selectedTypeDefinition?.mainLocationLabel || 'Choose Main Location'}
                  </div>
                  {isFireTruckCatalogInspectionForm ? (
                    <CreateActionButton
                      label={primaryLocationAddLabel}
                      className="inspection-compact-action-btn"
                      onClick={primaryLocationAddAction}
                    />
                  ) : supportsCustomLocations ? (
                    <CreateActionButton
                      label={primaryLocationAddLabel}
                      className="inspection-compact-action-btn"
                      onClick={primaryLocationAddAction}
                    />
                  ) : null}
                </div>
              ) : null}
              <InspectionLocationOptionPicker
                options={primaryLocationOptions}
                visibleOptions={desktopPrimaryLocationVisibleOptions}
                value={primaryLocationValue}
                sectionLabel={primaryCollapsedLabel}
                selectedLabel={selectedPrimaryLocationLabel}
                isCompactViewport={isCompactViewport}
                isExpanded={!isPrimaryLocationCollapsed}
                onRequestEdit={() =>
                  setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.primaryLocation)
                }
                onRequestReset={resetPrimaryLocation}
                onChange={handlePrimaryLocationChange}
                variant={setupOptionVariant}
                showDescription
                columns={DESKTOP_SETUP_OPTION_COLUMNS}
                searchPlaceholder={primaryLocationSearchPlaceholder}
                searchAriaLabel={primaryLocationSearchAriaLabel}
                clearSearchAriaLabel={primaryLocationClearSearchAriaLabel}
                toggleValue={primaryLocationToggleValue}
                cardProps={locationCardProps}
              />
              <FormFieldError>
                {fieldErrors.selectedLocation
                  ? selectedTypeDefinition?.mainLocationErrorLabel ||
                    'Choose a main inspection location.'
                  : ''}
              </FormFieldError>
            </div>
          ) : null}

          {shouldShowLocationPickers && hasZoneLocationFlow && zone ? (
            <div className="inspection-form-section d-grid gap-3">
              {!isMainAreaCollapsed ? (
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="fw-semibold text-muted">Choose Main Area</div>
                  {supportsCustomLocations ? (
                    <CreateActionButton
                      label={`Add main area (${areaOptionsWithProgress.length})`}
                      className="inspection-compact-action-btn"
                      onClick={location.openAddMainLocationModal}
                    />
                  ) : null}
                </div>
              ) : null}
              <InspectionLocationOptionPicker
                options={areaOptionsWithProgress}
                visibleOptions={desktopMainAreaVisibleOptions}
                value={mainLocation}
                sectionLabel={mainAreaCollapsedLabel}
                selectedLabel={selectedMainAreaLabel}
                selectedMetaIconKey={
                  shouldShowFireExtinguisherAreaProgress
                    ? selectedMainAreaProgressOption?.metaIconKey
                    : ''
                }
                selectedMetaLabel={
                  shouldShowFireExtinguisherAreaProgress ? selectedMainAreaProgressLabel : ''
                }
                selectedMetaTone={
                  shouldShowFireExtinguisherAreaProgress
                    ? selectedMainAreaProgressOption?.metaTone
                    : ''
                }
                isCompactViewport={isCompactViewport}
                isExpanded={!isMainAreaCollapsed}
                onRequestEdit={() => setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.mainArea)}
                onRequestReset={resetMainArea}
                onChange={handleMainAreaChange}
                variant={setupOptionVariant}
                showDescription
                columns={DESKTOP_SETUP_OPTION_COLUMNS}
                searchPlaceholder="Search main area..."
                searchAriaLabel="Search main area"
                clearSearchAriaLabel="Clear main area search"
                toggleValue={LOCATION_TOGGLE_VALUE}
                cardProps={locationCardProps}
              />
            </div>
          ) : null}

          {shouldShowLocationPickers &&
          mainLocation &&
          supportsSubLocations &&
          (subLocationOptionsWithCounts.length > 0 || subLocation) ? (
            <div className="inspection-form-section d-grid gap-3">
              {!isSubLocationCollapsed ? (
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="fw-semibold text-muted">
                    {isFireTruckCompartmentFlow
                      ? 'Choose Compartment'
                      : hasZoneLocationFlow
                        ? 'Choose Location'
                        : 'Choose Sub-location'}
                  </div>
                  {supportsCustomLocations &&
                  !isFireTruckCompartmentFlow &&
                  subLocationOptionsWithCounts.length > 0 ? (
                    <CreateActionButton
                      label={
                        hasZoneLocationFlow
                          ? `Add location (${subLocationOptionsWithCounts.length})`
                          : `Add sub-location (${subLocationOptionsWithCounts.length})`
                      }
                      className="inspection-compact-action-btn"
                      onClick={location.openAddSubLocationModal}
                    />
                  ) : isFireTruckCompartmentFlow ? (
                    <CreateActionButton
                      label={`Add compartment (${subLocationOptionsWithCounts.length})`}
                      className="inspection-compact-action-btn"
                      onClick={openFireTruckCompartmentDrawer}
                    />
                  ) : null}
                </div>
              ) : null}
              {subLocationOptionsWithCounts.length > 0 ? (
                <InspectionLocationOptionPicker
                  options={subLocationOptionsWithCounts}
                  visibleOptions={desktopSubLocationVisibleOptions}
                  value={subLocation}
                  sectionLabel={subLocationCollapsedLabel}
                  selectedLabel={selectedSubLocationLabel}
                  selectedMetaIconKey={
                    shouldShowFireExtinguisherAreaProgress
                      ? selectedSubLocationProgressOption?.metaIconKey
                      : ''
                  }
                  selectedMetaLabel={
                    shouldShowFireExtinguisherAreaProgress ? selectedSubLocationProgressLabel : ''
                  }
                  selectedMetaTone={
                    shouldShowFireExtinguisherAreaProgress
                      ? selectedSubLocationProgressOption?.metaTone
                      : ''
                  }
                  isCompactViewport={isCompactViewport}
                  isExpanded={!isSubLocationCollapsed}
                  onRequestEdit={() => setActiveMobileSetupDrawer(MOBILE_SETUP_DRAWERS.subLocation)}
                  onRequestReset={resetSubLocation}
                  onChange={handleSubLocationChange}
                  variant={setupOptionVariant}
                  showDescription
                  columns={DESKTOP_SETUP_OPTION_COLUMNS}
                  searchPlaceholder={subLocationPickerSearchPlaceholder}
                  searchAriaLabel={subLocationPickerSearchAriaLabel}
                  clearSearchAriaLabel={subLocationPickerClearSearchAriaLabel}
                  toggleValue={LOCATION_TOGGLE_VALUE}
                  cardProps={locationCardProps}
                />
              ) : null}
              <FormFieldError>
                {fieldErrors.frtCompartment
                  ? selectedTypeDefinition?.subLocationErrorLabel || 'Choose a compartment.'
                  : ''}
              </FormFieldError>
            </div>
          ) : null}

          <InspectionMobileSetupDrawer
            visible={activeMobileSetupDrawer === MOBILE_SETUP_DRAWERS.type}
            title="Change Type"
            headerAction={renderDrawerHeaderAction(
              'Add type',
              incident.openAddModal,
              MOBILE_SETUP_DRAWERS.type,
            )}
            onClose={closeMobileSetupDrawer}
          >
            <div className="d-grid gap-3">
              <InspectionMobileSelectorButtonGrid
                options={incident.typeOptions}
                value={selectedType}
                onChange={handleTypeChange}
                columns={{ xs: 12, md: 3 }}
              />
            </div>
          </InspectionMobileSetupDrawer>

          <InspectionMobileSetupDrawer
            visible={activeMobileSetupDrawer === MOBILE_SETUP_DRAWERS.inspectedAt}
            title="Change Date and time"
            onClose={closeMobileSetupDrawer}
          >
            <div className="d-grid gap-3">
              <label
                className="inspection-mobile-setup-drawer__field-label small text-muted"
                htmlFor="inspection-mobile-inspected-at-drawer"
              >
                Date and time
              </label>
              <CFormInput
                id="inspection-mobile-inspected-at-drawer"
                type="datetime-local"
                aria-label="Date and time of inspection"
                value={String(form.inspectedAt || '')}
                onChange={(event) => updateInspectedAt(event.target.value)}
              />
              <CButton
                type="button"
                color="primary"
                className="inspection-mobile-setup-drawer__done"
                onClick={closeMobileSetupDrawer}
              >
                Done
              </CButton>
            </div>
          </InspectionMobileSetupDrawer>

          <InspectionMobileSetupDrawer
            visible={activeMobileSetupDrawer === MOBILE_SETUP_DRAWERS.fireExtinguisherEntryMode}
            title="Change Inspection Mode"
            onClose={closeMobileSetupDrawer}
          >
            <div className="d-grid gap-3">
              <div className="row g-2">
                {FIRE_EXTINGUISHER_ENTRY_MODES.map((option) => {
                  const active = fireExtinguisherDisplayEntryMode === option.value
                  return (
                    <div className="col-6" key={option.value}>
                      <button
                        type="button"
                        className={`inspection-location-option-card inspection-fire-extinguisher-mode-card w-100 h-100 text-center rounded-3 border bg-body p-3 ${
                          active
                            ? 'inspection-fire-extinguisher-mode-card--active border-primary shadow-sm'
                            : 'inspection-fire-extinguisher-mode-card--idle'
                        }`}
                        aria-pressed={active}
                        style={active ? ACTIVE_CARD_STYLE : undefined}
                        onClick={() => {
                          handleFireExtinguisherEntryModeChange(option.value)
                          closeMobileSetupDrawer()
                        }}
                      >
                        <span className="d-block fw-semibold">{option.title}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </InspectionMobileSetupDrawer>

          <InspectionMobileSetupDrawer
            visible={activeMobileSetupDrawer === MOBILE_SETUP_DRAWERS.primaryLocation}
            title={`Change ${primaryCollapsedLabel}`}
            headerAction={renderDrawerHeaderAction(
              primaryLocationAddLabel,
              primaryLocationAddAction,
              MOBILE_SETUP_DRAWERS.primaryLocation,
            )}
            onClose={closeMobileSetupDrawer}
          >
            <div className="d-grid gap-3">
              <InspectionLocationOptionPicker
                options={primaryLocationOptions}
                visibleOptions={primaryLocationOptions}
                value={primaryLocationValue}
                sectionLabel={primaryCollapsedLabel}
                selectedLabel={selectedPrimaryLocationLabel}
                isCompactViewport
                isExpanded
                showAllOptions
                onChange={handlePrimaryLocationChange}
                variant="compact"
                showDescription
                columns={{ xs: 6, md: 3 }}
                searchPlaceholder={primaryLocationSearchPlaceholder}
                searchAriaLabel={primaryLocationSearchAriaLabel}
                clearSearchAriaLabel={primaryLocationClearSearchAriaLabel}
                toggleValue={primaryLocationToggleValue}
                cardProps={locationCardProps}
              />
              {isFireTruckCatalogInspectionForm ? (
                <FireTruckDetailsCard
                  truck={selectedFireTruckDetails}
                  onEdit={editSelectedFireTruck}
                  onDelete={deleteSelectedFireTruck}
                />
              ) : null}
            </div>
          </InspectionMobileSetupDrawer>

          <InspectionMobileSetupDrawer
            visible={activeMobileSetupDrawer === MOBILE_SETUP_DRAWERS.mainArea}
            title="Change Main Area"
            headerAction={
              supportsCustomLocations
                ? renderDrawerHeaderAction(
                    `Add main area (${areaOptionsWithProgress.length})`,
                    location.openAddMainLocationModal,
                    MOBILE_SETUP_DRAWERS.mainArea,
                  )
                : null
            }
            onClose={closeMobileSetupDrawer}
          >
            <div className="d-grid gap-3">
              <InspectionLocationOptionPicker
                options={areaOptionsWithProgress}
                visibleOptions={areaOptionsWithProgress}
                value={mainLocation}
                sectionLabel={mainAreaCollapsedLabel}
                selectedLabel={selectedMainAreaLabel}
                isCompactViewport
                isExpanded
                showAllOptions
                onChange={handleMainAreaChange}
                variant="compact"
                showDescription
                columns={{ xs: 6, md: 3 }}
                searchPlaceholder="Search main area..."
                searchAriaLabel="Search main area"
                clearSearchAriaLabel="Clear main area search"
                toggleValue={LOCATION_TOGGLE_VALUE}
                cardProps={locationCardProps}
              />
            </div>
          </InspectionMobileSetupDrawer>

          <InspectionMobileSetupDrawer
            visible={activeMobileSetupDrawer === MOBILE_SETUP_DRAWERS.subLocation}
            title={`Change ${subLocationCollapsedLabel}`}
            headerAction={
              isFireTruckCompartmentFlow
                ? renderDrawerHeaderAction(
                    `Add compartment (${subLocationOptionsWithCounts.length})`,
                    openFireTruckCompartmentDrawer,
                    MOBILE_SETUP_DRAWERS.subLocation,
                  )
                : supportsCustomLocations && subLocationOptionsWithCounts.length > 0
                  ? renderDrawerHeaderAction(
                      hasZoneLocationFlow
                        ? `Add location (${subLocationOptionsWithCounts.length})`
                        : `Add sub-location (${subLocationOptionsWithCounts.length})`,
                      location.openAddSubLocationModal,
                      MOBILE_SETUP_DRAWERS.subLocation,
                    )
                  : null
            }
            onClose={closeMobileSetupDrawer}
          >
            <div className="d-grid gap-3">
              <InspectionLocationOptionPicker
                options={subLocationOptionsWithCounts}
                visibleOptions={subLocationOptionsWithCounts}
                value={subLocation}
                sectionLabel={subLocationCollapsedLabel}
                selectedLabel={selectedSubLocationLabel}
                isCompactViewport
                isExpanded
                showAllOptions
                onChange={handleSubLocationChange}
                variant="compact"
                showDescription
                columns={{ xs: 6, md: 3 }}
                searchPlaceholder={subLocationPickerSearchPlaceholder}
                searchAriaLabel={subLocationPickerSearchAriaLabel}
                clearSearchAriaLabel={subLocationPickerClearSearchAriaLabel}
                toggleValue={LOCATION_TOGGLE_VALUE}
                cardProps={locationCardProps}
              />
            </div>
          </InspectionMobileSetupDrawer>

          <InspectionMobileSetupDrawer
            visible={activeMobileSetupDrawer === MOBILE_SETUP_DRAWERS.fireTruckCompartment}
            title="Add Compartment"
            onClose={() => {
              setFireTruckCompartmentName('')
              setFireTruckCompartmentError('')
              setActiveMobileSetupDrawer(
                returnMobileSetupDrawer || MOBILE_SETUP_DRAWERS.subLocation,
              )
              setReturnMobileSetupDrawer('')
            }}
          >
            <div className="d-grid gap-3">
              <div>
                <label
                  className="inspection-mobile-setup-drawer__field-label small text-muted"
                  htmlFor="inspection-mobile-frt-compartment"
                >
                  Compartment name
                </label>
                <CFormInput
                  id="inspection-mobile-frt-compartment"
                  value={fireTruckCompartmentName}
                  placeholder="e.g. LOCKER 03"
                  onChange={(event) => {
                    setFireTruckCompartmentName(event.target.value)
                    if (fireTruckCompartmentError) setFireTruckCompartmentError('')
                  }}
                />
              </div>
              <FormFieldError>{fireTruckCompartmentError}</FormFieldError>
              <div className="mobile-bottom-drawer__footer d-flex align-items-center justify-content-end gap-2">
                <CButton
                  type="button"
                  color="secondary"
                  variant="outline"
                  onClick={() => {
                    setFireTruckCompartmentName('')
                    setFireTruckCompartmentError('')
                    setActiveMobileSetupDrawer(
                      returnMobileSetupDrawer || MOBILE_SETUP_DRAWERS.subLocation,
                    )
                    setReturnMobileSetupDrawer('')
                  }}
                >
                  Cancel
                </CButton>
                <CButton type="button" color="primary" onClick={saveFireTruckCompartment}>
                  Add
                </CButton>
              </div>
            </div>
          </InspectionMobileSetupDrawer>
        </>
      ) : null}

      <FireExtinguisherScanner
        isChecking={Boolean(fireExtinguisherScan?.isLookupLoading)}
        visible={Boolean(fireExtinguisherScan?.isScannerOpen)}
        onClose={fireExtinguisherScan?.onCloseScanner}
        onScan={fireExtinguisherScan?.onScan}
      />
    </>
  )
}

export default InspectionFormSetupSections
