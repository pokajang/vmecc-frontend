import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  loadCustomLocationTypes,
  saveCustomLocationTypes,
} from '../domain/storage/customLocationTypesStorage'
import { getInspectionTypeDefinition } from '../app/inspectionTypeRegistry'
import { getInspectionLocationDefaults } from '../form/inspectionLocationDefaults'
import { saveCachedInspectionLocationCatalog } from '../domain/api/inspectionLocationApi'
import {
  buildPinnedVisibleOptions,
  getTypeIconOptions,
  pickLeastUsedTypeIconKey,
  resolveTypeIconKey,
} from '../domain/utils/typeOptionUtils'
import {
  FIRE_EXTINGUISHER_TYPE,
  FIRE_PARENT_SEPARATOR,
  getOptionId,
  LOCATION_DRAFT_MAIN,
  LOCATION_DRAFT_SUB,
  LOCATION_DRAFT_ZONE,
  LOCATION_TOGGLE_VALUE,
  LOCATION_VISIBLE_LIMIT,
  mergeFallbackLocationChildren,
  mergeChildLocations,
  mergeMainLocations,
  mergeSubLocations,
  sameFireZoneKey,
  sameKey,
  SUB_LOCATION_VISIBLE_LIMIT,
  withFireZoneDisplay,
  withInspectionLocationDisplayLabels,
} from './locationTypeManagerHelpers'
import { removeLocationTypeAction, saveLocationTypeAction } from './locationTypeManagerActions'
import useInspectionLocationCatalog from './useInspectionLocationCatalog'

export {
  LOCATION_TOGGLE_VALUE,
  LOCATION_VISIBLE_LIMIT,
  SUB_LOCATION_VISIBLE_LIMIT,
} from './locationTypeManagerHelpers'

const useLocationTypeManager = ({
  userId,
  inspectionType = '',
  zone = '',
  mainLocation = '',
  subLocation = '',
  selectedLocations = [],
  updateSetupField,
  pushToast,
}) => {
  const selectedTypeDefinition = getInspectionTypeDefinition(inspectionType)
  const isFireExtinguisherLocationFlow =
    sameKey(inspectionType, FIRE_EXTINGUISHER_TYPE) ||
    selectedTypeDefinition?.usesZoneLocationFlow === true
  const selectedZone = String(zone || '').trim()
  const fallbackMainLocation =
    String(mainLocation || '').trim() || String(selectedLocations?.[0] || '').trim()
  const [showAllMainLocationTypes, setShowAllMainLocationTypes] = useState(false)
  const [showAllSubLocationTypes, setShowAllSubLocationTypes] = useState(false)
  const [showAllZoneTypes, setShowAllZoneTypes] = useState(false)
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [locationEditMode, setLocationEditMode] = useState(false)
  const [customLocationTypes, setCustomLocationTypes] = useState([])
  const [locationDraftKind, setLocationDraftKind] = useState(LOCATION_DRAFT_MAIN)
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationDescription, setNewLocationDescription] = useState('')
  const [newLocationIconKey, setNewLocationIconKey] = useState('')
  const [editingLocationKey, setEditingLocationKey] = useState('')
  const [editingLocationParentKey, setEditingLocationParentKey] = useState('')
  const [addLocationError, setAddLocationError] = useState('')

  useEffect(() => {
    setCustomLocationTypes(loadCustomLocationTypes(userId))
  }, [userId])

  const { backendMainLocations, setBackendMainLocations, catalogSource } =
    useInspectionLocationCatalog({
      userId,
      inspectionType,
      isFireExtinguisherLocationFlow,
      customLocationTypes,
      setCustomLocationTypes,
    })

  const iconOptions = useMemo(() => getTypeIconOptions('location'), [])
  const fallbackMainLocations = useMemo(
    () => getInspectionLocationDefaults(inspectionType),
    [inspectionType],
  )
  const seededMainLocations = useMemo(() => {
    const sourceRows =
      backendMainLocations.length > 0
        ? isFireExtinguisherLocationFlow
          ? mergeFallbackLocationChildren(backendMainLocations, fallbackMainLocations)
          : backendMainLocations
        : fallbackMainLocations
    return withInspectionLocationDisplayLabels(sourceRows, inspectionType)
  }, [backendMainLocations, fallbackMainLocations, inspectionType, isFireExtinguisherLocationFlow])
  const customRowsForMerge = useMemo(
    () => (catalogSource === 'api' ? [] : customLocationTypes),
    [catalogSource, customLocationTypes],
  )
  const mainLocationOptions = useMemo(() => {
    const mergedRows = mergeMainLocations(seededMainLocations, customRowsForMerge)
    return isFireExtinguisherLocationFlow ? withFireZoneDisplay(mergedRows) : mergedRows
  }, [customRowsForMerge, isFireExtinguisherLocationFlow, seededMainLocations])
  const zoneOptions = useMemo(() => {
    if (!isFireExtinguisherLocationFlow) return mainLocationOptions
    return mainLocationOptions.map((row) => {
      const areaCount = mergeChildLocations(
        row,
        String(row?.value || '').trim(),
        customRowsForMerge,
        LOCATION_DRAFT_MAIN,
      ).length
      return {
        ...row,
        metaLabel: `${areaCount} area${areaCount === 1 ? '' : 's'}`,
      }
    })
  }, [customRowsForMerge, isFireExtinguisherLocationFlow, mainLocationOptions])
  const selectedZoneRow = useMemo(
    () =>
      isFireExtinguisherLocationFlow
        ? zoneOptions.find((row) => sameFireZoneKey(row.value, selectedZone)) || null
        : null,
    [isFireExtinguisherLocationFlow, selectedZone, zoneOptions],
  )
  const selectedZoneValue = String(selectedZoneRow?.value || selectedZone || '').trim()
  const areaOptions = useMemo(() => {
    if (!isFireExtinguisherLocationFlow) return mainLocationOptions
    return mergeChildLocations(
      selectedZoneRow,
      selectedZoneValue,
      customRowsForMerge,
      LOCATION_DRAFT_MAIN,
    ).map((row) => {
      const locationParentValue = [selectedZoneValue, row.value]
        .filter(Boolean)
        .join(FIRE_PARENT_SEPARATOR)
      const locationCount = mergeSubLocations(row, locationParentValue, customRowsForMerge).length
      return {
        ...row,
        metaLabel: `${locationCount} location${locationCount === 1 ? '' : 's'}`,
      }
    })
  }, [
    customRowsForMerge,
    isFireExtinguisherLocationFlow,
    mainLocationOptions,
    selectedZoneRow,
    selectedZoneValue,
  ])
  const selectedMainLocationRow = useMemo(
    () =>
      (isFireExtinguisherLocationFlow ? areaOptions : mainLocationOptions).find((row) =>
        sameKey(row.value, fallbackMainLocation),
      ) || null,
    [areaOptions, fallbackMainLocation, isFireExtinguisherLocationFlow, mainLocationOptions],
  )
  const selectedMainLocationTitle = String(
    selectedMainLocationRow?.title || fallbackMainLocation || '',
  ).trim()
  const fireLocationParentValue = [selectedZoneValue, fallbackMainLocation]
    .filter(Boolean)
    .join(FIRE_PARENT_SEPARATOR)
  const subLocationOptions = useMemo(
    () =>
      mergeSubLocations(
        selectedMainLocationRow,
        isFireExtinguisherLocationFlow ? fireLocationParentValue : fallbackMainLocation,
        customRowsForMerge,
      ),
    [
      customRowsForMerge,
      fallbackMainLocation,
      fireLocationParentValue,
      isFireExtinguisherLocationFlow,
      selectedMainLocationRow,
    ],
  )

  const visibleMainLocationOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: isFireExtinguisherLocationFlow ? areaOptions : mainLocationOptions,
        selected: fallbackMainLocation,
        visibleLimit: LOCATION_VISIBLE_LIMIT,
        showAll: showAllMainLocationTypes,
        toggleOption: {
          value: LOCATION_TOGGLE_VALUE,
          title: showAllMainLocationTypes ? 'Show less' : 'Show more',
          description: '',
          icon: showAllMainLocationTypes ? ChevronUp : ChevronDown,
        },
      }),
    [
      areaOptions,
      fallbackMainLocation,
      isFireExtinguisherLocationFlow,
      mainLocationOptions,
      showAllMainLocationTypes,
    ],
  )

  const visibleZoneOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: zoneOptions,
        selected: selectedZoneValue,
        visibleLimit: LOCATION_VISIBLE_LIMIT,
        showAll: showAllZoneTypes,
        toggleOption: {
          value: LOCATION_TOGGLE_VALUE,
          title: showAllZoneTypes ? 'Show less' : 'Show more',
          description: '',
          icon: showAllZoneTypes ? ChevronUp : ChevronDown,
        },
      }),
    [selectedZoneValue, showAllZoneTypes, zoneOptions],
  )

  const visibleSubLocationOptions = useMemo(
    () =>
      buildPinnedVisibleOptions({
        options: subLocationOptions,
        selected: subLocation,
        visibleLimit: SUB_LOCATION_VISIBLE_LIMIT,
        showAll: showAllSubLocationTypes,
        toggleOption: {
          value: LOCATION_TOGGLE_VALUE,
          title: showAllSubLocationTypes ? 'Show less' : 'Show more',
          description: '',
          icon: showAllSubLocationTypes ? ChevronUp : ChevronDown,
        },
      }),
    [showAllSubLocationTypes, subLocation, subLocationOptions],
  )

  const editLocationOptions =
    isFireExtinguisherLocationFlow && locationDraftKind === LOCATION_DRAFT_ZONE
      ? zoneOptions
      : locationDraftKind === LOCATION_DRAFT_SUB
        ? subLocationOptions
        : isFireExtinguisherLocationFlow
          ? areaOptions
          : mainLocationOptions
  const editingLocationRow = useMemo(() => {
    const editKey = String(editingLocationKey || '').trim()
    if (!editKey) return null
    return editLocationOptions.find((row) => sameKey(row.value, editKey)) || null
  }, [editLocationOptions, editingLocationKey])

  const resetDraft = () => {
    setNewLocationName('')
    setNewLocationDescription('')
    setNewLocationIconKey('')
    setEditingLocationKey('')
    setEditingLocationParentKey('')
  }

  const openAddLocationModal = (kind = LOCATION_DRAFT_MAIN) => {
    setLocationDraftKind(kind === LOCATION_DRAFT_SUB ? LOCATION_DRAFT_SUB : LOCATION_DRAFT_MAIN)
    setAddLocationError('')
    resetDraft()
    setNewLocationIconKey(pickLeastUsedTypeIconKey('location', customLocationTypes))
    setLocationEditMode(false)
    setShowAddLocationModal(true)
  }

  const openAddMainLocationModal = () => openAddLocationModal(LOCATION_DRAFT_MAIN)
  const openAddSubLocationModal = () => openAddLocationModal(LOCATION_DRAFT_SUB)
  const openAddZoneModal = () => openAddLocationModal(LOCATION_DRAFT_ZONE)

  const closeAddModal = () => {
    setShowAddLocationModal(false)
    setLocationEditMode(false)
    resetDraft()
    setAddLocationError('')
  }

  const selectMainLocation = (value, nextSubLocation = '', ids = {}) => {
    setShowAllMainLocationTypes(false)
    const selectedRow = (isFireExtinguisherLocationFlow ? areaOptions : mainLocationOptions).find(
      (row) => sameKey(row.value, value),
    )
    const mainLocationId = String(ids.mainLocationId || getOptionId(selectedRow) || '').trim()
    updateSetupField?.('locationSelection', {
      ...(isFireExtinguisherLocationFlow
        ? {
            zone: selectedZoneValue,
            zoneId: String(getOptionId(selectedZoneRow) || '').trim(),
          }
        : {}),
      mainLocation: String(value || '').trim(),
      subLocation: String(nextSubLocation || '').trim(),
      ...(mainLocationId ? { mainLocationId } : {}),
      ...(ids.subLocationId ? { subLocationId: String(ids.subLocationId) } : {}),
    })
  }

  const setMainLocation = (value) => {
    selectMainLocation(value)
  }

  const setZone = (value) => {
    setShowAllZoneTypes(false)
    const selectedRow = mainLocationOptions.find((row) => sameFireZoneKey(row.value, value))
    updateSetupField?.('locationSelection', {
      zone: String(selectedRow?.value || value || '').trim(),
      zoneId: String(getOptionId(selectedRow) || '').trim(),
      mainLocation: '',
      subLocation: '',
      mainLocationId: '',
      subLocationId: '',
    })
  }

  const setSubLocation = (value) => {
    setShowAllSubLocationTypes(false)
    const nextValue = String(value || '').trim()
    const selectedRow = subLocationOptions.find((row) => sameKey(row.value, nextValue))
    const nextSubLocation = sameKey(nextValue, subLocation) ? '' : nextValue
    const subLocationId = nextSubLocation ? String(getOptionId(selectedRow) || '').trim() : ''
    updateSetupField?.('locationSelection', {
      ...(isFireExtinguisherLocationFlow
        ? {
            zone: selectedZoneValue,
            zoneId: String(getOptionId(selectedZoneRow) || '').trim(),
          }
        : {}),
      mainLocation: fallbackMainLocation,
      subLocation: nextSubLocation,
      ...(subLocationId ? { subLocationId } : {}),
    })
  }

  const selectSubLocation = (value, nextSubLocationId = '') => {
    setShowAllSubLocationTypes(false)
    const selectedRow = subLocationOptions.find((row) => sameKey(row.value, value))
    const subLocationId = String(nextSubLocationId || getOptionId(selectedRow) || '').trim()
    updateSetupField?.('locationSelection', {
      ...(isFireExtinguisherLocationFlow
        ? {
            zone: selectedZoneValue,
            zoneId: String(getOptionId(selectedZoneRow) || '').trim(),
          }
        : {}),
      mainLocation: fallbackMainLocation,
      subLocation: String(value || '').trim(),
      ...(subLocationId ? { subLocationId } : {}),
    })
  }

  const saveType = async () => {
    return saveLocationTypeAction({
      newLocationName,
      newLocationDescription,
      editingLocationKey,
      locationDraftKind,
      editingLocationParentKey,
      fireLocationParentValue,
      fallbackMainLocation,
      isFireExtinguisherLocationFlow,
      selectedZoneValue,
      setAddLocationError,
      mainLocationOptions,
      subLocationOptions,
      areaOptions,
      editLocationOptions,
      selectedMainLocationRow,
      selectedZoneRow,
      catalogSource,
      inspectionType,
      newLocationIconKey,
      backendMainLocations,
      setBackendMainLocations,
      saveCachedInspectionLocationCatalog,
      selectSubLocation,
      setZone,
      selectMainLocation,
      sameKey,
      subLocation,
      pushToast,
      resetDraft,
      setLocationEditMode,
      closeAddModal,
      customLocationTypes,
      setCustomLocationTypes,
      saveCustomLocationTypes,
      userId,
    })
  }

  const startEditType = (row) => {
    const value = String(row?.value || '').trim()
    if (!value) return
    const rawKind = String(row?.kind || locationDraftKind)
    const kind = [LOCATION_DRAFT_ZONE, LOCATION_DRAFT_MAIN, LOCATION_DRAFT_SUB].includes(rawKind)
      ? rawKind
      : LOCATION_DRAFT_MAIN
    setLocationDraftKind(kind)
    setNewLocationName(String(row?.title || value).trim())
    setNewLocationDescription(String(row?.description || '').trim())
    setNewLocationIconKey(kind !== LOCATION_DRAFT_SUB ? resolveTypeIconKey(row, 'location') : '')
    setEditingLocationKey(value.toLowerCase())
    setEditingLocationParentKey(String(row?.parentValue || fallbackMainLocation || '').trim())
    setAddLocationError('')
    setLocationEditMode(false)
  }

  const removeType = (value) => {
    return removeLocationTypeAction({
      value,
      locationDraftKind,
      isFireExtinguisherLocationFlow,
      fireLocationParentValue,
      fallbackMainLocation,
      selectedZoneValue,
      editLocationOptions,
      catalogSource,
      inspectionType,
      backendMainLocations,
      setBackendMainLocations,
      saveCachedInspectionLocationCatalog,
      subLocation,
      updateSetupField,
      pushToast,
      customLocationTypes,
      setCustomLocationTypes,
      saveCustomLocationTypes,
      userId,
      setAddLocationError,
    })
  }

  const resetSystemOverride = (value) => {
    const key = String(value || '').trim()
    if (!key) return
    const nextRows = customLocationTypes.filter(
      (row) =>
        !(
          String(row.kind || LOCATION_DRAFT_MAIN) === locationDraftKind &&
          sameKey(row.value, key) &&
          sameKey(
            row.parentValue || '',
            locationDraftKind === LOCATION_DRAFT_SUB ? fallbackMainLocation : '',
          )
        ),
    )
    setCustomLocationTypes(nextRows)
    saveCustomLocationTypes(userId, nextRows)
    pushToast?.('Location reset to default.', { title: 'Reset complete', color: 'info' })
  }

  return {
    showAllLocationTypes: showAllMainLocationTypes,
    setShowAllLocationTypes: setShowAllMainLocationTypes,
    showAllMainLocationTypes,
    setShowAllMainLocationTypes,
    showAllSubLocationTypes,
    setShowAllSubLocationTypes,
    showAllZoneTypes,
    setShowAllZoneTypes,
    showAddLocationModal,
    locationEditMode,
    setLocationEditMode,
    locationDraftKind,
    isEditingSubLocation: locationDraftKind === LOCATION_DRAFT_SUB,
    isEditingZone: locationDraftKind === LOCATION_DRAFT_ZONE,
    isEditingMainArea: isFireExtinguisherLocationFlow && locationDraftKind === LOCATION_DRAFT_MAIN,
    isEditingLocation: isFireExtinguisherLocationFlow && locationDraftKind === LOCATION_DRAFT_SUB,
    typeOptions: mainLocationOptions,
    visibleTypeOptions: visibleMainLocationOptions,
    mainLocationOptions,
    visibleMainLocationOptions,
    zoneOptions,
    visibleZoneOptions,
    areaOptions,
    visibleAreaOptions: visibleMainLocationOptions,
    locationOptions: subLocationOptions,
    visibleLocationOptions: visibleSubLocationOptions,
    selectedMainLocationTitle,
    selectedZoneValue,
    selectedZoneTitle: String(selectedZoneRow?.title || selectedZone || '').trim(),
    subLocationOptions,
    visibleSubLocationOptions,
    editLocationOptions,
    systemTypeSet: new Set(),
    systemOverrideSet: new Set(),
    openAddModal: openAddMainLocationModal,
    openAddZoneModal,
    openAddMainLocationModal,
    openAddSubLocationModal,
    closeAddModal,
    saveType,
    startEditType,
    removeType,
    resetSystemOverride,
    setMainLocation,
    setSubLocation,
    setZone,
    newLocationName,
    setNewLocationName,
    newLocationDescription,
    setNewLocationDescription,
    newLocationIconKey,
    setNewLocationIconKey,
    iconOptions,
    editingLocationRow,
    editingLocationKey,
    editingSystemType: false,
    addLocationError,
    setAddLocationError,
  }
}

export default useLocationTypeManager
