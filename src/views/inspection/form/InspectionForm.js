import React, { useEffect, useMemo, useRef, useState } from 'react'
import useIncidentTypeManager from 'src/views/inspection/useIncidentTypeManager'
import useLocationTypeManager from 'src/views/inspection/useLocationTypeManager'
import { resolveTypeIcon } from 'src/views/inspection/typeOptionUtils'
import { uid } from 'src/views/inspection/inspectionSharedUtils'
import InspectionFormShell from 'src/views/inspection/form/components/InspectionFormShell'
import { getInspectionTypeDefinition } from '../app/inspectionTypeRegistry'
import {
  applySessionInspector,
  appendInspectionText,
  getInspectionFormValidationState,
  getInspectionChecklistChips,
  getInspectionFormMissingFields,
  getDefaultInspectionDateTime,
  FIRE_EXTINGUISHER_CHECK_FIELDS,
  FIRE_EXTINGUISHER_INSPECTION_TYPE,
  HIGH_ANGLE_CONDITION_FIELD,
  HYDRAULIC_CHECK_FIELDS,
  defaultInspectionForm,
  getScbaFieldEvidenceKeys,
  normalizeScbaCustomSections,
  isGeneralInspectionType,
  normalizeInspectionForm,
  formatInspectionLocation,
} from './inspectionFormHelpers'
import {
  buildFireExtinguisherCheckRow,
  buildFrtDailyCheckRow,
  buildFrtOneOffCheckRow,
  buildErAuxCheckRow,
  buildHighAngleCheckRow,
  buildHydraulicCheckRow,
  buildScbaCheckRow,
} from './inspectionCheckBuilders'
import { normalizeFireTruckCatalogRows } from 'src/views/inspection/inspectionFireTruckApi'
import {
  createFireExtinguisherOption,
  lookupFireExtinguisherByLocator,
  normalizeFireExtinguisherCatalogRows,
  updateFireExtinguisherOption,
} from 'src/views/inspection/inspectionFireExtinguisherApi'
import { getFireExtinguisherCanonicalAssetKey } from '../types/fire-extinguisher/identity'
import { extractFireExtinguisherLocator } from '../types/fire-extinguisher/locator'
import { getFireExtinguisherRowValidation } from '../types/fire-extinguisher/helpers'
import {
  defaultFrtTruckOption,
  normalizeFrtTruckOption,
  resolveSelectedFrtTruckPlate,
} from '../types/frt-daily/helpers'
import useInspectionCatalogManagers from './useInspectionCatalogManagers'
import useInspectionCatalogRows from './useInspectionCatalogRows'
import useInspectionCheckActions from './useInspectionCheckActions'
import useInspectionFormPhotos from './useInspectionFormPhotos'
import useInspectionHighAngleCatalogActions from './useInspectionHighAngleCatalogActions'
import useInspectionReviewRequest from './useInspectionReviewRequest'
import useInspectionScbaRuntime from './useInspectionScbaRuntime'
import useInspectionStructuredHandlers from './useInspectionStructuredHandlers'
import { buildEquipmentManagerOptions } from './inspectionEquipmentManagerOptions'
import useFireExtinguisherInspectionRuntime from './hooks/useFireExtinguisherInspectionRuntime'
import { buildFireExtinguisherResetPatch } from './inspectionResetActions'
import ActionConfirmModal from 'src/views/shared/ActionConfirmModal'

const INSPECTION_TIMESTAMP_FIELDS = [
  'inspectedAt',
  'inspected_at',
  'inspectionDateTime',
  'inspection_date_time',
  'erAuxInspectionDate',
  'er_aux_inspection_date',
  'fireExtinguisherInspectionDate',
  'fire_extinguisher_inspection_date',
  'frtInspectionDate',
  'frt_inspection_date',
  'highAngleInspectionDate',
  'high_angle_inspection_date',
  'scbaInspectionDate',
  'scba_inspection_date',
  'hseInspectionDate',
  'hse_inspection_date',
]

const SETUP_RESET_INSPECTION_DATE_FIELDS = [
  'inspectedAt',
  'inspectionDateTime',
  'erAuxInspectionDate',
  'fireExtinguisherInspectionDate',
  'frtInspectionDate',
  'highAngleInspectionDate',
  'scbaInspectionDate',
  'hseInspectionDate',
]

const hasInspectionTimestampField = (value = {}) =>
  INSPECTION_TIMESTAMP_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(value, field))

const normalizeLocationOptionKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const getLocationOptionId = (option = {}) =>
  String(option?.id || option?.locationId || option?.location_id || '').trim()

const incrementMapCount = (map, key, increment = 1) => {
  if (!key) return
  map.set(key, (map.get(key) || 0) + increment)
}

const completedFireExtinguisherLocationKeys = ({
  areaRows,
  completedLocations = [],
  currentLocation,
  currentSummary,
  sessionResults,
}) => {
  const expectedByLocation = new Map()
  const completedByLocation = new Map()
  const seenCompletedAssets = new Set()

  ;(Array.isArray(areaRows) ? areaRows : []).forEach((row) => {
    const locationKey = normalizeLocationOptionKey(row?.subLocation || row?.sub_location)
    if (!locationKey) return
    incrementMapCount(expectedByLocation, locationKey)
  })
  ;(Array.isArray(completedLocations) ? completedLocations : []).forEach((row) => {
    if (
      String(row?.status || '')
        .trim()
        .toLowerCase() !== 'completed'
    ) {
      return
    }
    const locationKey = normalizeLocationOptionKey(row?.subLocation || row?.sub_location)
    if (locationKey) {
      expectedByLocation.set(locationKey, Math.max(expectedByLocation.get(locationKey) || 0, 1))
      completedByLocation.set(locationKey, Number.MAX_SAFE_INTEGER)
    }
  })
  ;(Array.isArray(sessionResults) ? sessionResults : []).forEach((row) => {
    if (
      String(row?.status || '')
        .trim()
        .toLowerCase() !== 'completed'
    ) {
      return
    }
    const locationKey = normalizeLocationOptionKey(row?.subLocation || row?.sub_location)
    if (!locationKey) return
    const assetKey = String(
      row?.canonicalAssetKey ||
        row?.canonical_asset_key ||
        (row?.catalogId || row?.fireExtinguisherId
          ? `catalog:${row.catalogId || row.fireExtinguisherId}`
          : ''),
    ).trim()
    const uniqueKey = `${locationKey}:${assetKey || row?.id || completedByLocation.size}`
    if (seenCompletedAssets.has(uniqueKey)) return
    seenCompletedAssets.add(uniqueKey)
    expectedByLocation.set(locationKey, Math.max(expectedByLocation.get(locationKey) || 0, 1))
    incrementMapCount(completedByLocation, locationKey)
  })

  const currentLocationKey = normalizeLocationOptionKey(currentLocation)
  const currentTotal = Number(currentSummary?.totalCount || 0)
  if (
    currentLocationKey &&
    currentTotal > 0 &&
    Number(currentSummary?.completedCount || 0) >= currentTotal
  ) {
    expectedByLocation.set(
      currentLocationKey,
      Math.max(expectedByLocation.get(currentLocationKey) || 0, currentTotal),
    )
    completedByLocation.set(
      currentLocationKey,
      Math.max(completedByLocation.get(currentLocationKey) || 0, currentTotal),
    )
  }

  const completedKeys = new Set()
  expectedByLocation.forEach((expectedCount, locationKey) => {
    if (expectedCount > 0 && (completedByLocation.get(locationKey) || 0) >= expectedCount) {
      completedKeys.add(locationKey)
    }
  })

  return completedKeys
}

const getFireExtinguisherLocationContinuation = ({
  areaRows = [],
  completedLocations = [],
  enabled,
  mainLocation,
  currentSummary = null,
  sessionResults = [],
  subLocation,
  subLocationOptions,
}) => {
  if (!enabled || !mainLocation || !subLocation) return null
  const options = Array.isArray(subLocationOptions) ? subLocationOptions : []
  if (options.length === 0) return null

  const currentKey = normalizeLocationOptionKey(subLocation)
  const currentIndex = options.findIndex(
    (option) => normalizeLocationOptionKey(option?.value || option?.title) === currentKey,
  )
  const nextOption =
    currentIndex >= 0
      ? options
          .slice(currentIndex + 1)
          .find((option) => String(option?.value || option?.title || '').trim())
      : null
  const nextLocation = String(nextOption?.value || nextOption?.title || '').trim()
  const nextLocationLabel = String(nextOption?.title || nextLocation).trim()
  const completedLocationKeys = completedFireExtinguisherLocationKeys({
    areaRows,
    completedLocations,
    currentLocation: subLocation,
    currentSummary,
    sessionResults,
  })

  return {
    currentLocation: subLocation,
    locationOptions: options
      .map((option) => {
        const value = String(option?.value || option?.title || '').trim()
        if (!value) return null
        const completed = completedLocationKeys.has(normalizeLocationOptionKey(value))
        return {
          ...option,
          value,
          title: String(option?.title || value).trim(),
          subLocationId: getLocationOptionId(option),
          ...(completed
            ? {
                metaIconKey: 'check',
                metaLabel: 'Completed',
                metaTone: 'success',
              }
            : {}),
        }
      })
      .filter(Boolean),
    mainLocation,
    nextLocation,
    nextLocationLabel,
    nextLocationOption: nextOption
      ? {
          value: nextLocation,
          title: nextLocationLabel,
          subLocationId: getLocationOptionId(nextOption),
        }
      : null,
    remainingLocationCount: currentIndex >= 0 ? Math.max(options.length - currentIndex - 1, 0) : 0,
  }
}

const buildInspectionLocationContinuation = ({
  currentLocation = '',
  currentValue = '',
  enabled,
  label = 'location',
  locationOptions = [],
  mainLocation = '',
  onBeforeOpen,
  options = null,
  parentLabel = '',
  scope = 'subLocation',
}) => {
  if (!enabled) return null
  const current = String(currentValue || currentLocation || '').trim()
  const normalizedOptions = (
    Array.isArray(options || locationOptions) ? options || locationOptions : []
  )
    .map((option) => {
      const value = String(option?.value || option?.title || '').trim()
      if (!value) return null

      return {
        ...option,
        value,
        title: String(option?.title || value).trim(),
      }
    })
    .filter(Boolean)

  if (normalizedOptions.length === 0) return null

  const currentKey = normalizeLocationOptionKey(current)
  const currentIndex = normalizedOptions.findIndex(
    (option) => normalizeLocationOptionKey(option?.value || option?.title) === currentKey,
  )
  const nextOption =
    currentIndex >= 0
      ? normalizedOptions.slice(currentIndex + 1).find((option) => option?.value)
      : null
  const nextLocation = String(nextOption?.value || '').trim()
  const nextLocationLabel = String(nextOption?.title || nextLocation).trim()

  return {
    currentLocation: current,
    currentValue: current,
    label,
    locationOptions: normalizedOptions,
    mainLocation,
    options: normalizedOptions,
    parentLabel,
    scope,
    value: current,
    nextLocation,
    nextLocationLabel,
    nextLocationOption: nextOption
      ? {
          ...nextOption,
          value: nextLocation,
          title: nextLocationLabel || nextLocation,
        }
      : null,
    remainingLocationCount:
      currentIndex >= 0
        ? Math.max(normalizedOptions.length - currentIndex - 1, 0)
        : normalizedOptions.length,
    ...(onBeforeOpen ? { onBeforeOpen } : {}),
  }
}

const buildEffectiveInspectionForm = ({
  catalogRowsField,
  equipmentRows,
  equipmentRowsField,
  fireExtinguisherRows,
  form,
}) => {
  if (catalogRowsField) {
    return {
      ...form,
      [catalogRowsField]: fireExtinguisherRows,
    }
  }

  if (equipmentRowsField) {
    return {
      ...form,
      [equipmentRowsField]: equipmentRows,
    }
  }

  return form
}

const buildResetInspectionFormForType = (inspectionType) => {
  const nextType = String(inspectionType || '').trim()
  const nextDefinition = getInspectionTypeDefinition(nextType)

  return normalizeInspectionForm({
    ...(nextDefinition?.initialFormState || {}),
    inspectionType: nextType,
    inspectedAt: getDefaultInspectionDateTime(),
    selectedLocation: '',
    zone: '',
    zoneId: '',
    mainLocation: '',
    subLocation: '',
    mainLocationId: '',
    subLocationId: '',
    description: '',
    photos: [],
    checklist: [],
  })
}

const normalizeRestoredInspectionTypeForm = (form = {}) => {
  const normalized = normalizeInspectionForm(form)
  if (
    String(normalized.inspectionType || '').trim() !== FIRE_EXTINGUISHER_INSPECTION_TYPE ||
    String(normalized.fireExtinguisherEntryMode || '').trim() !== 'scan'
  ) {
    return normalized
  }

  const hasScanTarget = [
    normalized.fireExtinguisherScannedLocator,
    normalized.fire_extinguisher_scanned_locator,
    normalized.fireExtinguisherFocusedAssetKey,
    normalized.fire_extinguisher_focused_asset_key,
  ].some((value) => String(value || '').trim() !== '')

  const hasScanRows =
    Array.isArray(normalized.fireExtinguisherCatalogRows) &&
    normalized.fireExtinguisherCatalogRows.length > 0

  if (hasScanTarget || hasScanRows) return normalized

  return {
    ...normalized,
    fireExtinguisherEntryMode: '',
  }
}

const getFireExtinguisherScanLookupErrorMessage = (error) => {
  const status = Number(error?.status || 0)
  if (status === 409) {
    return 'Multiple active extinguishers use this locator. Resolve the catalog duplicate before inspection.'
  }
  if (status === 401 || status === 403) {
    return 'You do not have permission to lookup or register fire extinguishers.'
  }
  if (
    status === 0 ||
    error?.name === 'TypeError' ||
    /failed to fetch|network|offline/i.test(String(error?.message || ''))
  ) {
    return 'Connection required to lookup FE. Reconnect and try again.'
  }
  return error?.message || 'Unable to lookup fire extinguisher locator. Try again.'
}

const getInspectionTypeDraftKey = (inspectionType) =>
  String(inspectionType || '')
    .trim()
    .toLowerCase()

const stripInspectionTypeDrafts = (form = {}) => {
  const source = form && typeof form === 'object' ? form : {}
  const {
    inspectionTypeDrafts: _inspectionTypeDrafts,
    inspection_type_drafts: _inspectionTypeDraftsSnake,
    ...snapshot
  } = source
  return snapshot
}

const normalizeInspectionTypeDraftMap = (drafts = {}) => {
  if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) return {}
  return Object.entries(drafts).reduce((next, [key, draft]) => {
    const draftKey = getInspectionTypeDraftKey(key)
    if (!draftKey || !draft || typeof draft !== 'object' || Array.isArray(draft)) return next
    next[draftKey] = stripInspectionTypeDrafts(draft)
    return next
  }, {})
}

const removeInspectionTypeDraft = (drafts = {}, inspectionType = '') => {
  const draftMap = normalizeInspectionTypeDraftMap(drafts)
  const draftKey = getInspectionTypeDraftKey(inspectionType)
  if (draftKey) delete draftMap[draftKey]
  return draftMap
}

const withCurrentTypeDraftSnapshot = (nextForm = {}, currentDrafts = {}) => {
  const normalized = normalizeInspectionForm(nextForm)
  const draftKey = getInspectionTypeDraftKey(normalized.inspectionType)
  if (!draftKey) {
    return {
      ...normalized,
      inspectionTypeDrafts: normalizeInspectionTypeDraftMap(currentDrafts),
    }
  }
  const draftMap = {
    ...normalizeInspectionTypeDraftMap(currentDrafts),
    [draftKey]: stripInspectionTypeDrafts(normalized),
  }
  return {
    ...normalized,
    inspectionTypeDrafts: draftMap,
  }
}

const withClearedSetupDates = (form = {}) =>
  SETUP_RESET_INSPECTION_DATE_FIELDS.reduce(
    (next, field) => ({
      ...next,
      [field]: '',
    }),
    form,
  )

const withClearedActiveTypeWorkingState = (form = {}, selectedTypeDefinition = {}) => {
  const next = { ...form }
  const clearArrayField = (field) => {
    const key = String(field || '').trim()
    if (key) next[key] = []
  }

  clearArrayField(selectedTypeDefinition?.checksField)
  clearArrayField(selectedTypeDefinition?.equipmentRowsField)
  clearArrayField(selectedTypeDefinition?.catalogRowsField)

  switch (String(selectedTypeDefinition?.fieldRefKey || '').trim()) {
    case 'scbaChecks':
      next.scbaBackPlateChecks = []
      next.scbaCylinderChecks = []
      next.scbaFaceMaskChecks = []
      next.scbaCustomSections = []
      break
    case 'frtChecks':
      next.frtDailyChecks = []
      next.frtOneOffChecks = []
      next.frtDailyRemarks = ''
      next.frtOneOffRemarks = ''
      break
    case 'fireExtinguisherChecks':
      next.fireExtinguisherChecks = []
      next.fireExtinguisherCatalogRows = []
      next.fireExtinguisherEntryMode = ''
      next.fireExtinguisherScannedLocator = ''
      next.fireExtinguisherFocusedAssetKey = ''
      next.inspectionSessionUid = ''
      break
    default:
      break
  }

  return next
}

const InspectionForm = ({
  user,
  value,
  isUpdateMode = false,
  pushToast,
  onChange,
  onCommitDraftSnapshot,
  onRetryDraftSync,
  onSaveDraft,
  onRequestReview,
  onClearInspectionTypeDraft,
  draftStatus = '',
  draftSyncState = null,
}) => {
  const form = useMemo(() => {
    const source = value && typeof value === 'object' ? value : {}
    return normalizeInspectionForm(
      hasInspectionTimestampField(source)
        ? source
        : {
            ...source,
            inspectedAt: getDefaultInspectionDateTime(),
          },
    )
  }, [value])
  const latestFormRef = useRef(form)
  const inspectionTypeRef = useRef(null)
  const inspectedAtRef = useRef(null)
  const selectedLocationRef = useRef(null)
  const descriptionRef = useRef(null)
  const erAuxChecksRef = useRef(null)
  const hydraulicChecksRef = useRef(null)
  const fireExtinguisherChecksRef = useRef(null)
  const frtChecksRef = useRef(null)
  const highAngleChecksRef = useRef(null)
  const scbaChecksRef = useRef(null)
  const scbaCatalogInjectedRef = useRef('')
  const hseObservationRef = useRef(null)
  const photosRef = useRef(null)
  const fireExtinguisherDeepLinkAppliedRef = useRef('')
  const lookupScannedFireExtinguisherRef = useRef(null)
  const fireExtinguisherScanRequestIdRef = useRef(0)
  const selectedLocation = String(form.selectedLocation || '').trim()
  const zone = String(form.zone || '').trim()
  const mainLocation = String(form.mainLocation || '').trim()
  const subLocation = String(form.subLocation || '').trim()
  const selectedType = String(form.inspectionType || '').trim()
  const [locationDeleteTarget, setLocationDeleteTarget] = useState(null)
  const [incidentDeleteTarget, setIncidentDeleteTarget] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [validationState, setValidationState] = useState(null)
  const [isEditingType, setIsEditingType] = useState(() => !selectedType)
  const [showFireExtinguisherScanner, setShowFireExtinguisherScanner] = useState(false)
  const [confirmScanAnotherFireExtinguisher, setConfirmScanAnotherFireExtinguisher] =
    useState(false)
  const [fireExtinguisherScanStatus, setFireExtinguisherScanStatus] = useState('')
  const [fireExtinguisherScanError, setFireExtinguisherScanError] = useState('')
  const [fireExtinguisherRegistrationDraft, setFireExtinguisherRegistrationDraft] = useState(null)
  const [fireExtinguisherScanDuplicates, setFireExtinguisherScanDuplicates] = useState([])
  const [fireExtinguisherDuplicateEditDraft, setFireExtinguisherDuplicateEditDraft] = useState(null)
  const checklistChips = useMemo(() => getInspectionChecklistChips(selectedType), [selectedType])
  const selectedTypeDefinition = useMemo(
    () => getInspectionTypeDefinition(selectedType),
    [selectedType],
  )
  const isFullInspectionForm = isGeneralInspectionType(selectedType)
  const isStructuredInspectionForm = selectedTypeDefinition?.formMode === 'structured'
  const isEquipmentCatalogInspectionForm = selectedTypeDefinition?.supportsEquipmentCatalog === true
  const isFireExtinguisherCatalogInspectionForm =
    selectedTypeDefinition?.supportsFireExtinguisherCatalog === true
  const usesZoneLocationFlow = selectedTypeDefinition?.usesZoneLocationFlow === true
  const isFireTruckCatalogInspectionForm = selectedTypeDefinition?.supportsFireTruckCatalog === true
  const isScbaInspectionForm = selectedTypeDefinition?.fieldRefKey === 'scbaChecks'
  const isSubmittableInspectionForm = selectedTypeDefinition?.implemented === true
  const supportsCustomLocations = selectedTypeDefinition?.supportsCustomLocations !== false
  const supportsSubLocations = selectedTypeDefinition?.supportsSubLocations !== false
  const showComingSoonNotice = Boolean(selectedType && !isSubmittableInspectionForm)
  const equipmentRowsField = String(selectedTypeDefinition?.equipmentRowsField || '').trim()
  const catalogRowsField = String(selectedTypeDefinition?.catalogRowsField || '').trim()
  const checksField = String(selectedTypeDefinition?.checksField || '').trim()
  const valueLooksLikeSavedInspection = useMemo(() => {
    const source = value && typeof value === 'object' ? value : {}
    return Boolean(
      source.id ||
        source.reportUid ||
        source.report_uid ||
        source.draftId ||
        source.draft_id ||
        source.status ||
        source.submittedAt ||
        source.submitted_at ||
        source.createdAt ||
        source.created_at ||
        source.version,
    )
  }, [value])

  const updateForm = (nextForm, { snapshotCurrentType = true } = {}) => {
    const normalized = snapshotCurrentType
      ? withCurrentTypeDraftSnapshot(
          nextForm,
          nextForm?.inspectionTypeDrafts || latestFormRef.current?.inspectionTypeDrafts,
        )
      : normalizeInspectionForm({
          ...nextForm,
          inspectionTypeDrafts: normalizeInspectionTypeDraftMap(nextForm?.inspectionTypeDrafts),
        })
    const validationForm = applySessionInspector(normalized, user)
    latestFormRef.current = normalized
    setFieldErrors((currentErrors) => {
      if (!Object.values(currentErrors || {}).some(Boolean)) return currentErrors
      const missing = getInspectionFormMissingFields(validationForm)
      return Object.keys(currentErrors).reduce((nextErrors, field) => {
        if (currentErrors[field] && missing[field]) nextErrors[field] = true
        return nextErrors
      }, {})
    })
    setValidationState((currentValidation) =>
      currentValidation?.errorCount
        ? getInspectionFormValidationState(validationForm)
        : currentValidation,
    )
    onChange?.(normalized)
  }

  const getLatestForm = () => applySessionInspector(latestFormRef.current || effectiveForm, user)

  const {
    equipmentRows,
    fireExtinguisherAreaRows,
    fireExtinguisherRows,
    fireTruckRows,
    isLoadingEquipmentRows,
    isLoadingFireExtinguisherAreaRows,
    isLoadingFireExtinguisherRows,
    isLoadingFireTruckRows,
    isLoadingScbaCatalogSections,
    scbaCatalogSections,
    setEquipmentRows,
    setFireExtinguisherRows,
    setFireTruckRows,
    setScbaCatalogSections,
  } = useInspectionCatalogRows({
    getLatestForm,
    isEquipmentCatalogInspectionForm,
    isFireExtinguisherCatalogInspectionForm,
    isFireTruckCatalogInspectionForm,
    isScbaInspectionForm,
    mainLocation,
    normalizeScbaCustomSections,
    scbaCatalogInjectedRef,
    selectedType,
    subLocation,
    updateForm,
    valueLooksLikeSavedInspection,
    zone,
  })

  const applyScannedFireExtinguisherRow = (row, locator = '') => {
    const assetKey = getFireExtinguisherCanonicalAssetKey(row)
    const nextLocator = extractFireExtinguisherLocator(row?.barcodeNo || locator)
    const nextZone = String(row?.zone || '').trim()
    const nextMainLocation = String(row?.mainLocation || row?.location || '').trim()
    const nextSubLocation = String(row?.subLocation || '').trim()
    const latest = getLatestForm()
    const nextForm = {
      ...latest,
      inspectionType: FIRE_EXTINGUISHER_INSPECTION_TYPE,
      fireExtinguisherEntryMode: 'scan',
      fireExtinguisherScannedLocator: nextLocator,
      fireExtinguisherFocusedAssetKey: assetKey,
      selectedLocation: formatInspectionLocation({
        zone: nextZone,
        mainLocation: nextMainLocation,
        subLocation: nextSubLocation,
      }),
      zone: nextZone,
      zoneId: '',
      mainLocation: nextMainLocation,
      mainLocationId: String(row?.mainLocationId || row?.main_location_id || '').trim(),
      subLocation: nextSubLocation,
      subLocationId: String(row?.subLocationId || row?.sub_location_id || '').trim(),
      fireExtinguisherCatalogRows: [row],
    }
    setFireExtinguisherRows([row])
    setFireExtinguisherRegistrationDraft(null)
    setFireExtinguisherScanDuplicates([])
    setFireExtinguisherDuplicateEditDraft(null)
    setFireExtinguisherScanError('')
    setFireExtinguisherScanStatus('')
    updateForm(nextForm)
  }

  const updateFireExtinguisherEntryMode = (mode) => {
    const nextMode = String(mode || '').trim()
    const latest = getLatestForm()
    fireExtinguisherScanRequestIdRef.current += 1
    if (!nextMode) {
      updateForm({
        ...latest,
        fireExtinguisherEntryMode: '',
        fireExtinguisherScannedLocator: '',
        fireExtinguisherFocusedAssetKey: '',
        selectedLocation: '',
        zone: '',
        zoneId: '',
        mainLocation: '',
        mainLocationId: '',
        subLocation: '',
        subLocationId: '',
        fireExtinguisherCatalogRows: [],
      })
      setFireExtinguisherRows([])
      setFireExtinguisherRegistrationDraft(null)
      setFireExtinguisherScanDuplicates([])
      setFireExtinguisherDuplicateEditDraft(null)
      setFireExtinguisherScanStatus('')
      setFireExtinguisherScanError('')
      setShowFireExtinguisherScanner(false)
      setConfirmScanAnotherFireExtinguisher(false)
      return
    }

    if (nextMode === 'scan') {
      updateForm({
        ...latest,
        fireExtinguisherEntryMode: 'scan',
        fireExtinguisherScannedLocator: '',
        fireExtinguisherFocusedAssetKey: '',
        selectedLocation: '',
        zone: '',
        zoneId: '',
        mainLocation: '',
        mainLocationId: '',
        subLocation: '',
        subLocationId: '',
        fireExtinguisherCatalogRows: [],
      })
      setFireExtinguisherRows([])
      setFireExtinguisherRegistrationDraft(null)
      setFireExtinguisherScanDuplicates([])
      setFireExtinguisherDuplicateEditDraft(null)
      setFireExtinguisherScanStatus('')
      setFireExtinguisherScanError('')
      setShowFireExtinguisherScanner(true)
      return
    }

    updateForm({
      ...latest,
      fireExtinguisherEntryMode: 'area',
      fireExtinguisherScannedLocator: '',
      fireExtinguisherFocusedAssetKey: '',
      fireExtinguisherCatalogRows: [],
    })
    setFireExtinguisherRows([])
    setFireExtinguisherRegistrationDraft(null)
    setFireExtinguisherScanDuplicates([])
    setFireExtinguisherDuplicateEditDraft(null)
    setFireExtinguisherScanStatus('')
    setFireExtinguisherScanError('')
    setShowFireExtinguisherScanner(false)
    setConfirmScanAnotherFireExtinguisher(false)
  }

  const closeFireExtinguisherScanner = () => {
    setShowFireExtinguisherScanner(false)

    const latest = getLatestForm()
    const hasScanResult =
      String(latest.fireExtinguisherScannedLocator || '').trim() ||
      String(latest.fireExtinguisherFocusedAssetKey || '').trim() ||
      (Array.isArray(latest.fireExtinguisherCatalogRows) &&
        latest.fireExtinguisherCatalogRows.length > 0) ||
      fireExtinguisherRegistrationDraft

    if (String(latest.fireExtinguisherEntryMode || '').trim() !== 'scan' || hasScanResult) return

    updateForm({
      ...latest,
      fireExtinguisherEntryMode: '',
      fireExtinguisherScannedLocator: '',
      fireExtinguisherFocusedAssetKey: '',
      selectedLocation: '',
      zone: '',
      zoneId: '',
      mainLocation: '',
      mainLocationId: '',
      subLocation: '',
      subLocationId: '',
      fireExtinguisherCatalogRows: [],
    })
    setFireExtinguisherRows([])
    setFireExtinguisherScanDuplicates([])
    setFireExtinguisherDuplicateEditDraft(null)
    setFireExtinguisherScanStatus('')
    setFireExtinguisherScanError('')
  }

  const lookupScannedFireExtinguisher = async (rawLocator) => {
    const locator = extractFireExtinguisherLocator(rawLocator)
    if (!locator) {
      setFireExtinguisherScanError('Enter or scan a valid S/N, QR, or barcode.')
      return
    }

    const requestId = fireExtinguisherScanRequestIdRef.current + 1
    fireExtinguisherScanRequestIdRef.current = requestId
    const isCurrentScanRequest = () => fireExtinguisherScanRequestIdRef.current === requestId

    setShowFireExtinguisherScanner(false)
    updateForm({
      ...getLatestForm(),
      inspectionType: FIRE_EXTINGUISHER_INSPECTION_TYPE,
      fireExtinguisherEntryMode: 'scan',
      fireExtinguisherScannedLocator: locator,
      fireExtinguisherFocusedAssetKey: '',
    })
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setFireExtinguisherScanStatus('')
      setFireExtinguisherScanError('Connection required to lookup FE. Reconnect and try again.')
      return
    }

    setFireExtinguisherScanStatus(`Looking up ${locator}...`)
    setFireExtinguisherScanError('')
    setFireExtinguisherRegistrationDraft(null)
    setFireExtinguisherScanDuplicates([])
    setFireExtinguisherDuplicateEditDraft(null)
    try {
      const { data } = await lookupFireExtinguisherByLocator(locator)
      if (!isCurrentScanRequest()) return
      if (!data) throw new Error('Fire extinguisher locator was not found.')
      applyScannedFireExtinguisherRow(data, locator)
    } catch (error) {
      if (!isCurrentScanRequest()) return
      if (error?.status === 404) {
        setFireExtinguisherRegistrationDraft({
          zone: '',
          mainLocation: '',
          subLocation: '',
          idLocNo: '',
          barcodeNo: locator,
          feType: '',
          certificationValidity: '',
        })
        setFireExtinguisherScanStatus('')
        setFireExtinguisherScanError('')
        updateForm({
          ...getLatestForm(),
          inspectionType: FIRE_EXTINGUISHER_INSPECTION_TYPE,
          fireExtinguisherEntryMode: 'scan',
          fireExtinguisherScannedLocator: locator,
          fireExtinguisherFocusedAssetKey: '',
        })
        return
      }
      if (error?.status === 409) {
        const duplicateRows = normalizeFireExtinguisherCatalogRows(error?.payload?.data || [])
        setFireExtinguisherRegistrationDraft(null)
        setFireExtinguisherScanDuplicates(duplicateRows)
        setFireExtinguisherDuplicateEditDraft(null)
        setFireExtinguisherScanError('')
        return
      }
      setFireExtinguisherScanStatus('')
      setFireExtinguisherScanError(getFireExtinguisherScanLookupErrorMessage(error))
    }
  }

  const updateFireExtinguisherRegistrationDraft = (field, value) => {
    setFireExtinguisherRegistrationDraft((current) => ({
      ...(current || {}),
      [field]: value,
    }))
  }

  const startEditingFireExtinguisherDuplicate = (row) => {
    if (!row) return
    setFireExtinguisherDuplicateEditDraft({
      catalogId: String(row.catalogId || row.id || '').trim(),
      zone: String(row.zone || '').trim(),
      mainLocation: String(row.mainLocation || row.location || '').trim(),
      subLocation: String(row.subLocation || '').trim(),
      idLocNo: String(row.idLocNo || '').trim(),
      barcodeNo: String(row.barcodeNo || '').trim(),
      feType: String(row.feType || '').trim(),
      certificationValidity: String(row.certificationValidity || '').trim(),
    })
    setFireExtinguisherScanError('')
    setFireExtinguisherScanStatus('')
  }

  const updateFireExtinguisherDuplicateEditDraft = (field, value) => {
    setFireExtinguisherDuplicateEditDraft((current) => ({
      ...(current || {}),
      [field]: value,
    }))
  }

  const cancelFireExtinguisherDuplicateEdit = () => {
    setFireExtinguisherDuplicateEditDraft(null)
    setFireExtinguisherScanStatus('')
  }

  const registerScannedFireExtinguisher = async () => {
    if (/registering/i.test(fireExtinguisherScanStatus)) return
    const draft = fireExtinguisherRegistrationDraft || {}
    const barcodeNo = extractFireExtinguisherLocator(draft.barcodeNo)
    const payload = {
      ...draft,
      barcodeNo,
      zone: String(draft.zone || '').trim(),
      mainLocation: String(draft.mainLocation || '').trim(),
      subLocation: String(draft.subLocation || '').trim(),
      idLocNo: String(draft.idLocNo || '').trim(),
      feType: String(draft.feType || '').trim(),
      certificationValidity: String(draft.certificationValidity || '').trim(),
    }
    const missingRequired =
      !payload.barcodeNo ||
      !payload.zone ||
      !payload.mainLocation ||
      !payload.subLocation ||
      !payload.feType ||
      !payload.certificationValidity
    if (missingRequired) {
      setFireExtinguisherScanError(
        'Complete S/N / QR / Barcode, zone, main area, location, FE type, and certification validity.',
      )
      return
    }

    setFireExtinguisherScanStatus('Registering fire extinguisher...')
    setFireExtinguisherScanError('')
    try {
      const saved = await createFireExtinguisherOption(payload)
      if (!saved) throw new Error('Fire extinguisher was not saved.')
      pushToast?.('Fire extinguisher registered.', { title: 'Catalog saved', color: 'success' })
      applyScannedFireExtinguisherRow(saved, payload.barcodeNo)
    } catch (error) {
      setFireExtinguisherScanStatus('')
      setFireExtinguisherScanError(
        error?.payload?.message || error?.message || 'Unable to register fire extinguisher.',
      )
    }
  }

  const saveFireExtinguisherDuplicateEdit = async () => {
    if (/saving duplicate/i.test(fireExtinguisherScanStatus)) return
    const draft = fireExtinguisherDuplicateEditDraft || {}
    const catalogId = String(draft.catalogId || '').trim()
    const barcodeNo = extractFireExtinguisherLocator(draft.barcodeNo)
    const payload = {
      zone: String(draft.zone || '').trim(),
      mainLocation: String(draft.mainLocation || '').trim(),
      subLocation: String(draft.subLocation || '').trim(),
      idLocNo: String(draft.idLocNo || '').trim(),
      barcodeNo,
      feType: String(draft.feType || '').trim(),
      certificationValidity: String(draft.certificationValidity || '').trim(),
    }
    const missingRequired =
      !catalogId ||
      !payload.barcodeNo ||
      !payload.zone ||
      !payload.mainLocation ||
      !payload.subLocation ||
      !payload.feType ||
      !payload.certificationValidity
    if (missingRequired) {
      setFireExtinguisherScanError(
        'Complete S/N / QR / Barcode, zone, main area, location, FE type, and certification validity.',
      )
      return
    }

    setFireExtinguisherScanStatus('Saving duplicate catalog entry...')
    setFireExtinguisherScanError('')
    try {
      await updateFireExtinguisherOption(catalogId, payload)
      pushToast?.('Fire extinguisher duplicate updated. Retrying scan lookup...', {
        title: 'Catalog saved',
        color: 'success',
      })
      setFireExtinguisherDuplicateEditDraft(null)
      await lookupScannedFireExtinguisher(payload.barcodeNo || form.fireExtinguisherScannedLocator)
    } catch (error) {
      setFireExtinguisherScanStatus('')
      setFireExtinguisherScanError(
        error?.payload?.message || error?.message || 'Unable to update extinguisher.',
      )
    }
  }

  lookupScannedFireExtinguisherRef.current = lookupScannedFireExtinguisher

  const fireExtinguisherRuntime = useFireExtinguisherInspectionRuntime({
    catalogRowsField,
    equipmentRows,
    equipmentRowsField,
    fireExtinguisherRows,
    form,
    isFireExtinguisherCatalogInspectionForm,
    mainLocation,
    currentUserId: user?.id,
    pushToast,
    selectedType,
    selectedTypeDefinition,
    subLocation,
    zone,
  })
  const effectiveForm = fireExtinguisherRuntime.displayForm
  const fireExtinguisherSessionSync = fireExtinguisherRuntime.sessionSync
  const currentStructuredSummary = fireExtinguisherRuntime.summary
  const structuredDisplayForm = useMemo(() => applySessionInspector(form, user), [form, user])
  const isFireExtinguisherScanLookupLoading = /looking up/i.test(fireExtinguisherScanStatus)
  const isFireExtinguisherScanBusy = /looking up|registering/i.test(fireExtinguisherScanStatus)
  const openFireExtinguisherScannerNow = () => {
    setFireExtinguisherRegistrationDraft(null)
    setFireExtinguisherScanStatus('')
    setFireExtinguisherScanError('')
    setConfirmScanAnotherFireExtinguisher(false)
    setShowFireExtinguisherScanner(true)
  }
  const openFireExtinguisherScanner = () => {
    if (isFireExtinguisherScanBusy) return

    const latest = getLatestForm()
    const isFocusedScanMode =
      String(latest.fireExtinguisherEntryMode || '').trim() === 'scan' &&
      String(latest.fireExtinguisherFocusedAssetKey || '').trim() !== ''
    const currentRow = Array.isArray(currentStructuredSummary?.visibleChecks)
      ? currentStructuredSummary.visibleChecks[0]
      : null
    const currentScanComplete = currentRow
      ? getFireExtinguisherRowValidation(currentRow).isComplete
      : true

    if (isFocusedScanMode && !currentScanComplete) {
      setConfirmScanAnotherFireExtinguisher(true)
      return
    }

    openFireExtinguisherScannerNow()
  }
  const equipmentModalOptions = useMemo(
    () =>
      buildEquipmentManagerOptions({
        equipmentRows,
        summaryRows: currentStructuredSummary?.visibleChecks || [],
      }),
    [currentStructuredSummary, equipmentRows],
  )

  useEffect(() => {
    const nextLatestForm = isFireExtinguisherCatalogInspectionForm
      ? fireExtinguisherRuntime.displayForm
      : buildEffectiveInspectionForm({
          catalogRowsField,
          equipmentRows,
          equipmentRowsField,
          fireExtinguisherRows,
          form,
        })
    latestFormRef.current = {
      ...nextLatestForm,
      ...(isFireExtinguisherCatalogInspectionForm
        ? {
            inspectionSessionUid: String(
              fireExtinguisherSessionSync.session?.sessionUid || '',
            ).trim(),
          }
        : {}),
    }
  }, [
    catalogRowsField,
    equipmentRows,
    equipmentRowsField,
    fireExtinguisherRuntime.displayForm,
    fireExtinguisherRows,
    fireExtinguisherSessionSync.session?.sessionUid,
    form,
    isFireExtinguisherCatalogInspectionForm,
  ])

  const updateLocationField = (field, nextValue) => {
    if (!['location', 'zone', 'mainLocation', 'subLocation', 'locationSelection'].includes(field))
      return
    const latest = latestFormRef.current || form
    if (field === 'locationSelection') {
      const nextZone = String(nextValue?.zone || '').trim()
      const nextMainLocation = String(nextValue?.mainLocation || '').trim()
      const nextSubLocation = String(nextValue?.subLocation || '').trim()
      updateForm({
        ...latest,
        selectedLocation: formatInspectionLocation({
          zone: nextZone,
          mainLocation: nextMainLocation,
          subLocation: nextSubLocation,
        }),
        zone: nextZone,
        zoneId: String(nextValue?.zoneId || '').trim(),
        mainLocation: nextMainLocation,
        subLocation: nextSubLocation,
        mainLocationId: String(nextValue?.mainLocationId || '').trim(),
        subLocationId: String(nextValue?.subLocationId || '').trim(),
      })
      return
    }
    if (field === 'location') {
      const locationValue = Array.isArray(nextValue)
        ? nextValue[0] || ''
        : String(nextValue || '').trim()
      updateForm({
        ...latest,
        selectedLocation: locationValue,
      })
      return
    }
    updateForm({
      ...latest,
      [field]: String(nextValue || '').trim(),
    })
  }

  const applySetupResetForm = (nextForm, reason) => {
    const normalized = withCurrentTypeDraftSnapshot(
      nextForm,
      nextForm?.inspectionTypeDrafts || latestFormRef.current?.inspectionTypeDrafts,
    )
    updateForm(normalized, { snapshotCurrentType: false })
    onCommitDraftSnapshot?.(normalized, {
      source: 'setup-reset',
      reason,
      scope: 'all',
    })
  }

  const resetInspectionType = (nextValue) => {
    const nextType = String(nextValue || '').trim()
    const latest = withCurrentTypeDraftSnapshot(
      latestFormRef.current || form,
      latestFormRef.current?.inspectionTypeDrafts || form.inspectionTypeDrafts,
    )
    const draftMap = normalizeInspectionTypeDraftMap(latest.inspectionTypeDrafts)
    if (!nextType) {
      updateForm(
        {
          ...buildResetInspectionFormForType(''),
          inspectionTypeDrafts: draftMap,
        },
        { snapshotCurrentType: false },
      )
      return
    }
    const nextDraft = draftMap[getInspectionTypeDraftKey(nextType)]
    const nextForm = nextDraft
      ? normalizeRestoredInspectionTypeForm({
          ...nextDraft,
          inspectionType: nextType,
        })
      : buildResetInspectionFormForType(nextType)
    updateForm(
      {
        ...nextForm,
        inspectionTypeDrafts: draftMap,
      },
      { snapshotCurrentType: false },
    )
  }

  const resetCurrentInspectionTypeSelection = () => {
    const latest = getLatestForm()
    const currentType = String(latest.inspectionType || selectedType || '').trim()
    const draftMap = removeInspectionTypeDraft(
      latest.inspectionTypeDrafts || form.inspectionTypeDrafts,
      currentType,
    )
    const nextForm = normalizeInspectionForm({
      ...defaultInspectionForm,
      inspectionTypeDrafts: draftMap,
    })
    scbaCatalogInjectedRef.current = ''
    updateForm(nextForm, { snapshotCurrentType: false })
    onClearInspectionTypeDraft?.(currentType)
  }

  const updateIncidentField = (field, nextValue) => {
    if (field !== 'incidentType') return
    resetInspectionType(nextValue)
  }

  const updateInspectedAt = (nextValue) => {
    updateForm({
      ...form,
      inspectedAt: String(nextValue || '').trim(),
    })
  }

  const resetInspectionDateTime = () => {
    const latest = getLatestForm()
    applySetupResetForm(withClearedSetupDates(latest), 'setup-date-reset')
  }

  const resetInspectionLocation = (scope = 'primary') => {
    const latest = getLatestForm()
    const keepZone = scope === 'mainArea' || scope === 'subLocation'
    const keepMainLocation = scope === 'subLocation'
    const nextZone = keepZone ? String(latest.zone || '').trim() : ''
    const nextZoneId = keepZone ? String(latest.zoneId || '').trim() : ''
    const nextMainLocation = keepMainLocation ? String(latest.mainLocation || '').trim() : ''
    const nextMainLocationId = keepMainLocation ? String(latest.mainLocationId || '').trim() : ''
    const nextForm = withClearedActiveTypeWorkingState(
      {
        ...latest,
        selectedLocation: formatInspectionLocation({
          zone: nextZone,
          mainLocation: nextMainLocation,
          subLocation: '',
        }),
        zone: nextZone,
        zoneId: nextZoneId,
        mainLocation: nextMainLocation,
        mainLocationId: nextMainLocationId,
        subLocation: '',
        subLocationId: '',
        ...(scope === 'primary'
          ? {
              frtTruckId: '',
              frtTruckPlateNo: '',
              frtTruckReference: null,
            }
          : {}),
      },
      selectedTypeDefinition,
    )

    scbaCatalogInjectedRef.current = ''
    setEquipmentRows([])
    setFireExtinguisherRows([])
    setScbaCatalogSections([])
    setFireExtinguisherRegistrationDraft(null)
    setFireExtinguisherScanStatus('')
    setFireExtinguisherScanError('')
    setShowFireExtinguisherScanner(false)
    setConfirmScanAnotherFireExtinguisher(false)
    fireExtinguisherScanRequestIdRef.current += 1
    applySetupResetForm(nextForm, `setup-${scope}-location-reset`)
  }

  const selectFireTruck = (truck) => {
    const normalizedTruck = normalizeFrtTruckOption(truck)
    if (!normalizedTruck) return
    const latest = getLatestForm()
    updateForm({
      ...latest,
      mainLocation: normalizedTruck.plateNo,
      selectedLocation: normalizedTruck.plateNo,
      zone: '',
      zoneId: '',
      subLocation: '',
      mainLocationId: String(normalizedTruck.truckId || normalizedTruck.id || '').trim(),
      subLocationId: '',
      frtTruckId: String(normalizedTruck.truckId || normalizedTruck.id || '').trim(),
      frtTruckPlateNo: normalizedTruck.plateNo,
      frtTruckReference: {
        truckId: String(normalizedTruck.truckId || normalizedTruck.id || '').trim(),
        name: normalizedTruck.name || '',
        plateNo: normalizedTruck.plateNo,
        roadTaxExpiry: normalizedTruck.roadTaxExpiry || '',
        insuranceExpiry: normalizedTruck.insuranceExpiry || '',
        puspakomExpiry: normalizedTruck.puspakomExpiry || '',
      },
    })
  }

  const location = useLocationTypeManager({
    userId: user?.id,
    inspectionType: selectedType,
    zone,
    mainLocation,
    subLocation,
    updateSetupField: updateLocationField,
    pushToast,
  })
  const selectedFireTruckPlate = String(resolveSelectedFrtTruckPlate(form) || '').trim()

  const fireExtinguisherLocationContinuation = useMemo(() => {
    const continuation = getFireExtinguisherLocationContinuation({
      areaRows: fireExtinguisherAreaRows,
      enabled: isFireExtinguisherCatalogInspectionForm && isStructuredInspectionForm,
      mainLocation,
      currentSummary: currentStructuredSummary,
      completedLocations: fireExtinguisherSessionSync.meta?.completedLocations,
      sessionResults: fireExtinguisherSessionSync.results,
      subLocation,
      subLocationOptions: location.subLocationOptions,
    })

    return continuation
      ? {
          ...continuation,
          currentValue: continuation.currentLocation,
          label: 'location',
          options: continuation.locationOptions,
          parentLabel: mainLocation,
          scope: 'subLocation',
          value: continuation.currentLocation,
          onBeforeOpen: fireExtinguisherSessionSync.refreshResults,
        }
      : continuation
  }, [
    currentStructuredSummary,
    fireExtinguisherAreaRows,
    fireExtinguisherSessionSync.meta?.completedLocations,
    fireExtinguisherSessionSync.refreshResults,
    fireExtinguisherSessionSync.results,
    isStructuredInspectionForm,
    isFireExtinguisherCatalogInspectionForm,
    location.subLocationOptions,
    mainLocation,
    subLocation,
  ])
  const typeScopeContinuation = useMemo(() => {
    const typeDefinition = selectedTypeDefinition || {}
    const typeKey = String(typeDefinition.key || '').trim()
    const isExcluded =
      typeKey === 'general-inspection' || typeKey === 'health-safety-environment-inspection'
    if (!isStructuredInspectionForm || isExcluded) return null

    const context = {
      location,
      mainLocation,
      mainLocationOptions: location.mainLocationOptions,
      selectedFireTruckPlate,
      subLocation,
      subLocationOptions: location.subLocationOptions,
    }
    const configuredContinuation =
      typeof typeDefinition.buildContinuationOptions === 'function'
        ? typeDefinition.buildContinuationOptions(form, currentStructuredSummary, context)
        : null
    if (configuredContinuation) {
      return buildInspectionLocationContinuation({
        currentValue: configuredContinuation.currentValue,
        enabled: true,
        label: configuredContinuation.label || 'location',
        mainLocation,
        options: configuredContinuation.options,
        parentLabel: configuredContinuation.parentLabel || '',
        scope: configuredContinuation.scope || 'subLocation',
      })
    }

    if (typeof typeDefinition.getCompartmentOptions !== 'function') return null
    const continuationOptions = typeDefinition.getCompartmentOptions(form)
    const continuation = buildInspectionLocationContinuation({
      currentValue: subLocation,
      enabled: String(mainLocation || '').trim() && String(subLocation || '').trim(),
      label: 'compartment',
      locationOptions: continuationOptions,
      mainLocation,
      parentLabel: selectedFireTruckPlate || mainLocation,
      scope: 'subLocation',
    })
    return continuation
  }, [
    currentStructuredSummary,
    form,
    isStructuredInspectionForm,
    location,
    mainLocation,
    selectedFireTruckPlate,
    selectedTypeDefinition,
    subLocation,
  ])

  const scopeContinuation = fireExtinguisherLocationContinuation || typeScopeContinuation

  const selectNextScope = (nextLocationOption) => {
    const latest = getLatestForm()
    const option =
      nextLocationOption && typeof nextLocationOption === 'object' ? nextLocationOption : null
    const nextLocation = String(option?.value || option?.title || nextLocationOption || '').trim()
    if (!nextLocation) return

    const nextScope = String(option?.scope || scopeContinuation?.scope || 'subLocation').trim()
    if (nextScope === 'mainLocation') {
      updateLocationField('locationSelection', {
        zone: option?.zone ?? latest.zone ?? zone,
        zoneId: String(option?.zoneId || latest.zoneId || '').trim(),
        mainLocation: nextLocation,
        mainLocationId: String(option?.mainLocationId || option?.id || '').trim(),
        subLocation: '',
        subLocationId: '',
      })
      return
    }

    updateLocationField('locationSelection', {
      zone,
      zoneId: latest.zoneId,
      mainLocation,
      mainLocationId: latest.mainLocationId,
      subLocation: nextLocation,
      subLocationId: String(option?.subLocationId || option?.id || '').trim(),
    })
  }
  const selectNextLocation = (nextLocationOption) => selectNextScope(nextLocationOption)
  const selectNextFireExtinguisherLocation = (nextLocationOption) =>
    selectNextScope(nextLocationOption)
  const locationContinuation = scopeContinuation

  const incident = useIncidentTypeManager({
    userId: user?.id,
    selectedType,
    updateSetupField: updateIncidentField,
    pushToast,
  })
  const selectedTypeOption = useMemo(
    () =>
      incident.typeOptions.find(
        (option) =>
          String(option?.value || '')
            .trim()
            .toLowerCase() === selectedType.toLowerCase(),
      ),
    [incident.typeOptions, selectedType],
  )
  const SelectedTypeIcon = selectedTypeOption?.icon || resolveTypeIcon(selectedTypeOption?.iconKey)

  const fireTruckOptions = useMemo(
    () =>
      normalizeFireTruckCatalogRows(
        fireTruckRows.length > 0 ? fireTruckRows : [defaultFrtTruckOption()].filter(Boolean),
      ),
    [fireTruckRows],
  )
  const selectedFireTruckOption = useMemo(
    () =>
      fireTruckOptions.find((option) => {
        const optionId = String(option.truckId || option.id || '').trim()
        const selectedId = String(form.frtTruckId || form.mainLocationId || '').trim()
        if (selectedId && optionId === selectedId) return true
        return (
          String(option.plateNo || option.value || '')
            .trim()
            .toUpperCase() === selectedFireTruckPlate.toUpperCase()
        )
      }) || null,
    [fireTruckOptions, form.frtTruckId, form.mainLocationId, selectedFireTruckPlate],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const applyFireExtinguisherDeepLink = () => {
      const search = String(window.location.search || '')
      const params = new URLSearchParams(search)
      const mode = String(params.get('mode') || '')
        .trim()
        .toLowerCase()
      const type = String(params.get('type') || '')
        .trim()
        .toLowerCase()
      const locator = extractFireExtinguisherLocator(
        params.get('locator') ||
          params.get('code') ||
          params.get('barcode') ||
          params.get('serial') ||
          params.get('sn') ||
          '',
      )
      const isFireTypeLink =
        type === 'fire-extinguisher' ||
        type === 'fire extinguisher' ||
        type === FIRE_EXTINGUISHER_INSPECTION_TYPE.toLowerCase()
      if (mode !== 'scan' || !locator || (type && !isFireTypeLink)) return

      const deepLinkKey = `${search}|${locator}`
      if (fireExtinguisherDeepLinkAppliedRef.current === deepLinkKey) return
      fireExtinguisherDeepLinkAppliedRef.current = deepLinkKey
      lookupScannedFireExtinguisherRef.current?.(locator)
    }

    applyFireExtinguisherDeepLink()
    const applyWhenVisible = () => {
      if (document.visibilityState === 'hidden') return
      applyFireExtinguisherDeepLink()
    }
    window.addEventListener('focus', applyFireExtinguisherDeepLink)
    window.addEventListener('popstate', applyFireExtinguisherDeepLink)
    document.addEventListener('visibilitychange', applyWhenVisible)
    return () => {
      window.removeEventListener('focus', applyFireExtinguisherDeepLink)
      window.removeEventListener('popstate', applyFireExtinguisherDeepLink)
      document.removeEventListener('visibilitychange', applyWhenVisible)
    }
  }, [])

  const catalogManagers = useInspectionCatalogManagers({
    checksField,
    currentStructuredSummary,
    equipmentRows,
    equipmentRowsField,
    fireExtinguisherRows,
    fireTruckRows,
    form,
    getLatestForm,
    mainLocation,
    pushToast,
    selectFireTruck,
    selectedType,
    selectedTypeDefinition,
    setEquipmentRows,
    setFireExtinguisherRows,
    setFireTruckRows,
    subLocation,
    updateForm,
    zone,
  })

  const checkActions = useInspectionCheckActions({
    form,
    getLatestForm,
    mainLocation,
    updateForm,
    zone,
  })
  const highAngleCatalogActions = useInspectionHighAngleCatalogActions({
    getLatestForm,
    updateForm,
  })

  const saveFireExtinguisherRowDraft = (row) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return false
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.fireExtinguisherChecks)
      ? currentForm.fireExtinguisherChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = buildFireExtinguisherCheckRow(
      row,
      existing,
      row,
      FIRE_EXTINGUISHER_CHECK_FIELDS,
      { zone, mainLocation },
    )
    const nextForm = {
      ...currentForm,
      inspectionSessionUid: String(
        currentForm.inspectionSessionUid || fireExtinguisherSessionSync.session?.sessionUid || '',
      ).trim(),
      fireExtinguisherChecks: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    }
    updateForm(nextForm)
    onCommitDraftSnapshot?.(nextForm, {
      source: 'fire-extinguisher-row',
      reason: 'fire-extinguisher-row-save',
    })
    void Promise.allSettled([
      fireExtinguisherSessionSync.completeRow(nextCheck, { allowCompletedUpdate: true }),
    ]).then((results) => {
      const failed = results.some(
        (result) => result.status === 'rejected' || result.value === false,
      )
      if (failed) {
        pushToast?.('Saved locally. Backend sync will need another attempt.', {
          title: 'Save sync pending',
          color: 'warning',
        })
      }
      void fireExtinguisherSessionSync.refreshResults()
    })
    return { saved: true, synced: false, pending: true }
  }

  const saveStructuredRowDraft = (row, patchOrDraft = {}, options = {}) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return false
    const currentForm = getLatestForm()
    const source = String(options.source || checksField || '').trim()
    let nextForm = null

    if (source === 'erAuxChecks') {
      const currentChecks = Array.isArray(currentForm.erAuxChecks) ? currentForm.erAuxChecks : []
      const existing = currentChecks.find((check) => String(check.id || '') === rowId)
      const nextCheck = buildErAuxCheckRow(row, existing, patchOrDraft)
      nextForm = {
        ...currentForm,
        erAuxChecks: [
          nextCheck,
          ...currentChecks.filter((check) => String(check.id || '') !== rowId),
        ],
      }
    } else if (source === 'hydraulicChecks') {
      const currentChecks = Array.isArray(currentForm.hydraulicChecks)
        ? currentForm.hydraulicChecks
        : []
      const existing = currentChecks.find((check) => String(check.id || '') === rowId)
      const nextCheck = buildHydraulicCheckRow(row, existing, patchOrDraft, HYDRAULIC_CHECK_FIELDS)
      nextForm = {
        ...currentForm,
        hydraulicChecks: [
          nextCheck,
          ...currentChecks.filter((check) => String(check.id || '') !== rowId),
        ],
      }
    } else if (source === 'highAngleChecks') {
      const currentChecks = Array.isArray(currentForm.highAngleChecks)
        ? currentForm.highAngleChecks
        : []
      const existing = currentChecks.find((check) => String(check.id || '') === rowId)
      const nextCheck = buildHighAngleCheckRow(row, existing, patchOrDraft, { mainLocation })
      nextForm = {
        ...currentForm,
        highAngleChecks: [
          nextCheck,
          ...currentChecks.filter((check) => String(check.id || '') !== rowId),
        ],
      }
    } else if (source === 'frtChecks') {
      return saveFrtRowDraft({ ...row, ...patchOrDraft })
    } else if (source === 'fireExtinguisherChecks') {
      return saveFireExtinguisherRowDraft({ ...row, ...patchOrDraft })
    }

    if (!nextForm) return false
    updateForm(nextForm)
    onCommitDraftSnapshot?.(nextForm, {
      source,
      reason: `${source || 'structured-row'}-save`,
    })
    return { saved: true, local: true, pending: true }
  }

  const saveStructuredGroupedRowDraft = (sectionKey, row, patchOrDraft = {}) => {
    const rowId = String(row?.id || '').trim()
    const normalizedSectionKey = String(sectionKey || '').trim()
    if (!rowId || !normalizedSectionKey) return false
    const currentForm = getLatestForm()
    const checksFieldKey =
      normalizedSectionKey === 'backPlate'
        ? 'scbaBackPlateChecks'
        : normalizedSectionKey === 'cylinder'
          ? 'scbaCylinderChecks'
          : normalizedSectionKey === 'faceMask'
            ? 'scbaFaceMaskChecks'
            : ''

    let nextForm = null
    if (checksFieldKey) {
      const currentChecks = Array.isArray(currentForm[checksFieldKey])
        ? currentForm[checksFieldKey]
        : []
      const existing = currentChecks.find((check) => String(check.id || '') === rowId)
      const nextCheck = {
        ...buildScbaCheckRow(normalizedSectionKey, row, existing),
        ...(existing || {}),
        ...patchOrDraft,
      }
      nextForm = {
        ...currentForm,
        [checksFieldKey]: [
          nextCheck,
          ...currentChecks.filter((check) => String(check.id || '') !== rowId),
        ],
      }
    } else {
      nextForm = {
        ...currentForm,
        scbaCustomSections: normalizeScbaCustomSections(
          currentForm.scbaCustomSections || currentForm.scba_custom_sections,
        ).map((section) =>
          section.key === normalizedSectionKey
            ? {
                ...section,
                rows: [
                  {
                    ...((section.rows || []).find((check) => String(check.id || '') === rowId) ||
                      row),
                    ...patchOrDraft,
                  },
                  ...(section.rows || []).filter((check) => String(check.id || '') !== rowId),
                ],
              }
            : section,
        ),
      }
    }

    updateForm(nextForm)
    onCommitDraftSnapshot?.(nextForm, {
      source: 'scba-row',
      reason: 'scba-row-save',
    })
    return { saved: true, local: true, pending: true }
  }

  const saveHseObservationDraft = (nextFields = {}) => {
    const currentForm = getLatestForm()
    const nextForm = {
      ...currentForm,
      ...(nextFields && typeof nextFields === 'object' ? nextFields : {}),
    }
    updateForm(nextForm)
    onCommitDraftSnapshot?.(nextForm, {
      source: 'hse-observation',
      reason: 'hse-observation-save',
    })
    return { saved: true, local: true, pending: true }
  }

  const saveInspectionFindingDraft = (nextIssues = []) => {
    const currentForm = getLatestForm()
    const nextForm = {
      ...currentForm,
      inspectionIssues: Array.isArray(nextIssues) ? nextIssues : [],
    }
    updateForm(nextForm)
    onCommitDraftSnapshot?.(nextForm, {
      source: 'inspection-finding',
      reason: 'inspection-finding-save',
    })
    return { saved: true, local: true, pending: true }
  }

  const resetFireExtinguisherSessionCheck = async (row) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return false
    const currentForm = getLatestForm()
    const currentChecks = Array.isArray(currentForm.fireExtinguisherChecks)
      ? currentForm.fireExtinguisherChecks
      : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const resetCheck = buildFireExtinguisherCheckRow(
      row,
      existing,
      buildFireExtinguisherResetPatch(FIRE_EXTINGUISHER_CHECK_FIELDS),
      FIRE_EXTINGUISHER_CHECK_FIELDS,
      { zone, mainLocation },
    )
    const resetResult = fireExtinguisherSessionSync.enabled
      ? await fireExtinguisherSessionSync.resetRow(resetCheck)
      : { localOnly: true }
    if (!resetResult) return false

    updateForm({
      ...currentForm,
      fireExtinguisherChecks: [
        resetCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    })
    return true
  }

  const saveFrtRowDraft = (row) => {
    const rowId = String(row?.id || '').trim()
    if (!rowId) return false
    const currentForm = getLatestForm()
    const isOneOff = String(row?.checklistKind || '').trim() === 'oneOff'
    const checksKey = isOneOff ? 'frtOneOffChecks' : 'frtDailyChecks'
    const currentChecks = Array.isArray(currentForm[checksKey]) ? currentForm[checksKey] : []
    const existing = currentChecks.find((check) => String(check.id || '') === rowId)
    const nextCheck = isOneOff
      ? buildFrtOneOffCheckRow(row, existing, row)
      : buildFrtDailyCheckRow(row, existing, row)
    const nextForm = {
      ...currentForm,
      [checksKey]: [
        nextCheck,
        ...currentChecks.filter((check) => String(check.id || '') !== rowId),
      ],
    }
    updateForm(nextForm)
    onCommitDraftSnapshot?.(nextForm, {
      source: 'frt-row',
      reason: 'frt-row-save',
    })
    return { saved: true, synced: false, pending: true }
  }

  const scbaRuntime = useInspectionScbaRuntime({
    form,
    getLatestForm,
    mainLocation,
    pushToast,
    setScbaCatalogSections,
    updateForm,
    user,
  })

  const photoRuntime = useInspectionFormPhotos({
    appendInspectionText,
    createPhotoId: uid,
    defaultHighAnglePhotosKey: HIGH_ANGLE_CONDITION_FIELD.photosKey,
    form,
    getLatestForm,
    getScbaExistingCheck: scbaRuntime.getScbaExistingCheck,
    getScbaFieldEvidenceKeys,
    pushToast,
    updateErAuxCheck: checkActions.updateErAuxCheck,
    updateFireExtinguisherCheck: checkActions.updateFireExtinguisherCheck,
    updateForm,
    updateFrtCheck: checkActions.updateFrtCheck,
    updateHighAngleCheck: checkActions.updateHighAngleCheck,
    updateHydraulicCheck: checkActions.updateHydraulicCheck,
    updateScbaGroupedCheck: scbaRuntime.updateScbaGroupedCheck,
  })

  const reviewRequest = useInspectionReviewRequest({
    descriptionRef,
    erAuxChecksRef,
    fireExtinguisherChecksRef,
    frtChecksRef,
    getLatestForm,
    highAngleChecksRef,
    hseObservationRef,
    hydraulicChecksRef,
    inspectedAtRef,
    inspectionTypeRef,
    onRequestReview,
    photosRef,
    pushToast,
    scbaChecksRef,
    selectedLocationRef,
    setFieldErrors,
    setValidationState,
    validationState,
  })

  const structuredRuntime = useInspectionStructuredHandlers({
    selectedTypeDefinition,
    refs: {
      erAuxChecksRef,
      fireExtinguisherChecksRef,
      frtChecksRef,
      highAngleChecksRef,
      hseObservationRef,
      hydraulicChecksRef,
      scbaChecksRef,
    },
    handlerProps: {
      ...catalogManagers,
      ...checkActions,
      ...photoRuntime,
      ...scbaRuntime,
      ...highAngleCatalogActions,
      checksField,
      scopeContinuation,
      locationContinuation,
      fireExtinguisherLocationContinuation,
      resetFireExtinguisherCheck: resetFireExtinguisherSessionCheck,
      saveFireExtinguisherRowDraft,
      saveFrtRowDraft,
      saveHseObservationDraft,
      saveInspectionFindingDraft,
      saveStructuredGroupedRowDraft,
      saveStructuredRowDraft,
      selectNextScope,
      selectNextLocation,
      selectNextFireExtinguisherLocation,
      selectedFireTruckOption,
    },
  })

  return (
    <>
      <InspectionFormShell
        catalogManagers={{
          ...catalogManagers,
          equipmentModalOptions,
        }}
        checkActions={checkActions}
        draftStatus={draftStatus}
        fieldErrors={fieldErrors}
        fireExtinguisherAreaRows={fireExtinguisherAreaRows}
        fireExtinguisherSessionProgress={{
          completedLocations: fireExtinguisherSessionSync.meta?.completedLocations || [],
          locationProgress: fireExtinguisherSessionSync.meta?.locationProgress || [],
          isLoading: fireExtinguisherSessionSync.isHydrating,
          results: fireExtinguisherSessionSync.results || [],
        }}
        isLoadingEquipmentRows={isLoadingEquipmentRows}
        isLoadingFireExtinguisherAreaRows={
          isLoadingFireExtinguisherAreaRows || fireExtinguisherSessionSync.isHydrating
        }
        isLoadingFireExtinguisherRows={
          isLoadingFireExtinguisherRows || fireExtinguisherSessionSync.isHydrating
        }
        isLoadingFireTruckRows={isLoadingFireTruckRows}
        isLoadingScbaCatalogSections={isLoadingScbaCatalogSections}
        fireTruckOptions={fireTruckOptions}
        form={form}
        getLatestForm={getLatestForm}
        incident={incident}
        incidentDeleteTarget={incidentDeleteTarget}
        isEditingType={isEditingType}
        location={location}
        locationDeleteTarget={locationDeleteTarget}
        onSaveDraft={onSaveDraft}
        isUpdateMode={isUpdateMode}
        onRetryDraftSync={onRetryDraftSync}
        photoRuntime={photoRuntime}
        refs={{
          descriptionRef,
          inspectedAtRef,
          inspectionTypeRef,
          photosRef,
          selectedLocationRef,
        }}
        reviewRequest={reviewRequest}
        scbaRuntime={scbaRuntime}
        selectedFireTruckPlate={selectedFireTruckPlate}
        selectedTypeIcon={SelectedTypeIcon}
        setIncidentDeleteTarget={setIncidentDeleteTarget}
        setIsEditingType={setIsEditingType}
        setLocationDeleteTarget={setLocationDeleteTarget}
        setup={{
          isFireExtinguisherCatalogInspectionForm,
          isFireTruckCatalogInspectionForm,
          usesZoneLocationFlow,
          mainLocation,
          fireExtinguisherScan: {
            duplicateEditDraft: fireExtinguisherDuplicateEditDraft,
            duplicateRows: fireExtinguisherScanDuplicates,
            error: fireExtinguisherScanError,
            isLookupLoading: isFireExtinguisherScanLookupLoading,
            isScannerOpen: showFireExtinguisherScanner,
            onCancelDuplicateEdit: cancelFireExtinguisherDuplicateEdit,
            onChangeDuplicateEditDraft: updateFireExtinguisherDuplicateEditDraft,
            onChangeMode: updateFireExtinguisherEntryMode,
            onCloseScanner: closeFireExtinguisherScanner,
            onEditDuplicate: startEditingFireExtinguisherDuplicate,
            onOpenScanner: openFireExtinguisherScanner,
            onRegister: registerScannedFireExtinguisher,
            onScan: lookupScannedFireExtinguisher,
            onSaveDuplicateEdit: saveFireExtinguisherDuplicateEdit,
            registrationDraft: fireExtinguisherRegistrationDraft,
            status: fireExtinguisherScanStatus,
            updateRegistrationDraft: updateFireExtinguisherRegistrationDraft,
          },
          selectFireTruck,
          selectedType,
          selectedTypeDefinition,
          selectedTypeOption,
          subLocation,
          supportsCustomLocations,
          supportsSubLocations,
          updateForm,
          updateInspectionType: resetInspectionType,
          updateInspectedAt,
          resetInspectionTypeSelection: resetCurrentInspectionTypeSelection,
          resetInspectedAt: resetInspectionDateTime,
          resetPrimaryLocation: () => resetInspectionLocation('primary'),
          resetMainArea: () => resetInspectionLocation('mainArea'),
          resetSubLocation: () => resetInspectionLocation('subLocation'),
          zone,
        }}
        structured={{
          currentStructuredSummary,
          isFullInspectionForm,
          isStructuredInspectionForm,
          showComingSoonNotice,
          structuredDisplayForm,
          checklistChips,
          ...structuredRuntime,
          draftSyncState,
        }}
        validationState={validationState}
      />
      <ActionConfirmModal
        visible={confirmScanAnotherFireExtinguisher}
        title="Scan Another FE"
        message="Current FE is not complete. Scan another FE anyway?"
        confirmLabel="Scan another FE"
        confirmColor="primary"
        cancelLabel="Stay here"
        mobileDrawer
        onClose={() => setConfirmScanAnotherFireExtinguisher(false)}
        onConfirm={openFireExtinguisherScannerNow}
      />
    </>
  )
}

export default InspectionForm
