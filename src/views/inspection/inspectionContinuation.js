import {
  getInspectionLocationDefaults,
  normalizeInspectionLocationKey,
} from './inspectionLocationDefaults'

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
    active: false,
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
    const first = String(path[0] || '').trim()
    if (first) return first
  }

  const location = String(record?.selectedLocation || record?.location || '').trim()
  if (!location) return ''
  return location.includes('>') ? location.split('>')[0].trim() : location
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
  if (!config.active || config.mode !== INSPECTION_CONTINUATION_MODES.SMALL_LOCATION_BUTTONS) {
    return null
  }

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
  inspectedAt,
} = {}) => ({
  selectedLocation: String(mainLocation || '').trim(),
  mainLocation: String(mainLocation || '').trim(),
  subLocation: '',
  mainLocationId: '',
  subLocationId: '',
  inspectionType: String(inspectionType || '').trim(),
  inspectedAt: String(inspectedAt || '').trim(),
  description: '',
  photos: [],
  checklist: [],
  hydraulicChecks: [],
})
