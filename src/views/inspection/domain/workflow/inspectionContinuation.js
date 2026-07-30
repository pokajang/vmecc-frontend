import {
  getInspectionLocationDefaults,
  normalizeInspectionLocationKey,
} from '../../form/inspectionLocationDefaults'

export const INSPECTION_CONTINUATION_MODES = {
  NONE: 'none',
  SMALL_LOCATION_BUTTONS: 'small-location-buttons',
  WORKLIST_PICKER: 'worklist-picker',
}

const CONTINUATION_CONFIG_BY_TYPE = {
  'hydraulic rescue tools inspection': {
    mode: INSPECTION_CONTINUATION_MODES.SMALL_LOCATION_BUTTONS,
    active: true,
  },
  'fire extinguisher inspection': {
    mode: INSPECTION_CONTINUATION_MODES.WORKLIST_PICKER,
    active: true,
  },
}

export const getInspectionContinuationConfig = (inspectionType) => {
  const key = normalizeInspectionLocationKey(inspectionType)
  return (
    CONTINUATION_CONFIG_BY_TYPE[key] || {
      mode: INSPECTION_CONTINUATION_MODES.NONE,
      active: false,
    }
  )
}

export const makeInspectionContinuationKey = (inspectionType, mainLocation) =>
  `${normalizeInspectionLocationKey(inspectionType)}:${normalizeInspectionLocationKey(mainLocation)}`

const getRecordInspectionType = (record = {}) =>
  String(record?.incidentType || record?.inspectionType || '').trim()

const getRecordMainLocation = (record = {}) => {
  const mainLocation = String(record?.mainLocation || record?.main_location || '').trim()
  if (mainLocation) return mainLocation

  const path = Array.isArray(record?.locationPath) ? record.locationPath : record?.location_path
  if (Array.isArray(path)) {
    const mainPathPart = String((path.length >= 2 ? path[1] : path[0]) || '').trim()
    if (mainPathPart) return mainPathPart
  }

  const location = String(record?.selectedLocation || record?.location || '').trim()
  if (!location) return ''
  if (!location.includes('>')) return location
  const parts = location
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length >= 2 ? parts[1] : parts[0] || ''
}

const getRecordZone = (record = {}) => {
  const zone = String(record?.zone || record?.zone_id || '').trim()
  if (zone) return zone.replace(/^zone\s+/i, '').trim()
  const path = Array.isArray(record?.locationPath) ? record.locationPath : record?.location_path
  if (!Array.isArray(path)) return ''
  const first = String(path[0] || '').trim()
  return first.replace(/^zone\s+/i, '').trim()
}

const getRecordSubLocation = (record = {}) => {
  const subLocation = String(record?.subLocation || record?.sub_location || '').trim()
  if (subLocation) return subLocation
  const path = Array.isArray(record?.locationPath) ? record.locationPath : record?.location_path
  if (Array.isArray(path) && path.length >= 3) return String(path[2] || '').trim()
  const location = String(record?.selectedLocation || record?.location || '').trim()
  if (!location.includes('>')) return ''
  const parts = location
    .split('>')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts[parts.length - 1] || ''
}

const makeFireExtinguisherContinuationKey = (inspectionType, zone, mainLocation, subLocation) =>
  [
    normalizeInspectionLocationKey(inspectionType),
    normalizeInspectionLocationKey(zone),
    normalizeInspectionLocationKey(mainLocation),
    normalizeInspectionLocationKey(subLocation),
  ].join(':')

const buildFireExtinguisherContinuationPrompt = ({ record, completedKeys = [] } = {}) => {
  const inspectionType = getRecordInspectionType(record)
  const zone = getRecordZone(record)
  const mainLocation = getRecordMainLocation(record)
  const subLocation = getRecordSubLocation(record)
  if (!zone || !mainLocation || !subLocation) return null

  const seededZones = getInspectionLocationDefaults(inspectionType)
  const zoneRow = seededZones.find((row) => {
    const value = String(row?.value || row?.title || '').trim()
    return normalizeInspectionLocationKey(value) === normalizeInspectionLocationKey(zone)
  })
  const areas = zoneRow?.subLocations || zoneRow?.children || []
  const areaRow = areas.find((row) => {
    const value = String(row?.value || row?.title || '').trim()
    return normalizeInspectionLocationKey(value) === normalizeInspectionLocationKey(mainLocation)
  })
  const locations = areaRow?.subLocations || areaRow?.children || []
  if (!locations.length) return null

  const visitedKeys = new Set(
    (Array.isArray(completedKeys) ? completedKeys : []).map((key) => String(key || '')),
  )
  const completedKey = makeFireExtinguisherContinuationKey(
    inspectionType,
    zone,
    mainLocation,
    subLocation,
  )
  visitedKeys.add(completedKey)

  const options = locations
    .filter((row) => {
      const value = String(row?.value || row?.title || '').trim()
      if (!value) return false
      return !visitedKeys.has(
        makeFireExtinguisherContinuationKey(inspectionType, zone, mainLocation, value),
      )
    })
    .map((row) => ({
      value: String(row.value || row.title || '').trim(),
      title: String(row.title || row.value || '').trim(),
      description: String(row.description || '').trim() || `${mainLocation} location`,
      zone,
      mainLocation,
      subLocation: String(row.value || row.title || '').trim(),
    }))

  if (options.length === 0) return null

  return {
    mode: INSPECTION_CONTINUATION_MODES.WORKLIST_PICKER,
    inspectionType,
    currentLocation: subLocation,
    completedKey,
    title: 'Continue this area?',
    message: `${subLocation} saved under ${mainLocation}. Continue with another location?`,
    options,
  }
}

export const buildInspectionContinuationPrompt = ({
  record,
  completedKeys = [],
  isNewReport = true,
} = {}) => {
  if (!isNewReport) return null

  const inspectionType = getRecordInspectionType(record)
  const currentLocation = getRecordMainLocation(record)
  if (!inspectionType || !currentLocation) return null

  const config = getInspectionContinuationConfig(inspectionType)
  if (!config.active) {
    return null
  }

  if (config.mode === INSPECTION_CONTINUATION_MODES.WORKLIST_PICKER) {
    return buildFireExtinguisherContinuationPrompt({ record, completedKeys })
  }

  if (config.mode !== INSPECTION_CONTINUATION_MODES.SMALL_LOCATION_BUTTONS) return null

  const visitedKeys = new Set(
    (Array.isArray(completedKeys) ? completedKeys : []).map((key) => String(key || '')),
  )
  visitedKeys.add(makeInspectionContinuationKey(inspectionType, currentLocation))

  const seededLocations = getInspectionLocationDefaults(inspectionType)
  const currentLocationKey = makeInspectionContinuationKey(inspectionType, currentLocation)
  const currentIsSeededLocation = seededLocations.some((row) => {
    const value = String(row?.value || row?.title || '').trim()
    return value && makeInspectionContinuationKey(inspectionType, value) === currentLocationKey
  })
  if (!currentIsSeededLocation) return null

  const options = seededLocations
    .filter((row) => {
      const value = String(row?.value || row?.title || '').trim()
      if (!value) return false
      return !visitedKeys.has(makeInspectionContinuationKey(inspectionType, value))
    })
    .map((row) => ({
      value: String(row.value || row.title || '').trim(),
      title: String(row.title || row.value || '').trim(),
      description: String(row.description || '').trim(),
    }))

  if (options.length === 0) return null

  return {
    mode: config.mode,
    inspectionType,
    currentLocation,
    completedKey: makeInspectionContinuationKey(inspectionType, currentLocation),
    title: 'Inspect next location?',
    message: `${inspectionType} for ${currentLocation} submitted. Continue with another location?`,
    options,
  }
}

export const buildInspectionContinuationForm = ({
  inspectionType,
  mainLocation,
  zone,
  subLocation,
  inspectedAt,
} = {}) => {
  const normalizedInspectionType = String(inspectionType || '').trim()
  const normalizedZone = String(zone || '').trim()
  const normalizedSubLocation = String(subLocation || '').trim()
  const isFireExtinguisherContinuation =
    getInspectionContinuationConfig(normalizedInspectionType).mode ===
    INSPECTION_CONTINUATION_MODES.WORKLIST_PICKER
  const nextForm = {
    selectedLocation: [normalizedZone ? `Zone ${normalizedZone}` : '', mainLocation, subLocation]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' > '),
    mainLocation: String(mainLocation || '').trim(),
    subLocation: normalizedSubLocation,
    mainLocationId: '',
    subLocationId: '',
    inspectionType: normalizedInspectionType,
    inspectedAt: String(inspectedAt || '').trim(),
    description: '',
    reportRemarks: '',
    photos: [],
    checklist: [],
    hydraulicChecks: [],
  }

  if (normalizedZone || isFireExtinguisherContinuation) {
    nextForm.zone = normalizedZone
    nextForm.zoneId = ''
  }

  if (isFireExtinguisherContinuation) {
    nextForm.fireExtinguisherChecks = []
  }

  return nextForm
}
