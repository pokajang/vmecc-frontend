const text = (value) => String(value || '').trim()
const normalizeKey = (value) =>
  text(value).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

const getTypeKey = (source = {}) =>
  [source?.key, source?.fieldRefKey, source?.inspectionType, source?.title]
    .map(normalizeKey)
    .filter(Boolean)
    .join(' ')

const isType = (source, pattern) => pattern.test(getTypeKey(source))

const isMeaningfulHighAngleScope = (value) => {
  const normalized = normalizeKey(value)
  return Boolean(normalized && normalized !== 'n/a' && normalized !== 'not applicable')
}

const CONFIGS = [
  {
    match: (source) => isType(source, /fire extinguisher/),
    groupSingular: 'location',
    groupPlural: 'locations',
  },
  {
    match: (source) => isType(source, /frt|fire truck/),
    groupSingular: 'compartment',
    groupPlural: 'compartments',
  },
  {
    match: (source) => isType(source, /high angle/),
    groupSingular: 'compartment',
    groupPlural: 'compartments',
  },
  {
    match: (source) => isType(source, /general/),
    groupSingular: 'location',
    groupPlural: 'locations',
  },
  {
    match: (source) => isType(source, /health safety|hse/),
    groupSingular: 'location',
    groupPlural: 'locations',
  },
  {
    match: (source) => isType(source, /scba/),
    groupSingular: 'location',
    groupPlural: 'locations',
  },
  {
    match: (source) => isType(source, /er aux|hydraulic/),
    groupSingular: 'location',
    groupPlural: 'locations',
  },
]

const DEFAULT_CONFIG = {
  groupSingular: 'location',
  groupPlural: 'locations',
}

export const getInspectionHierarchyLabels = (source = {}) =>
  CONFIGS.find((config) => config.match(source)) || DEFAULT_CONFIG

const getDefaultHierarchy = (row = {}, form = {}) => {
  const rowMainLocation = text(row.mainLocation || row.main_location)
  const rowLocation = text(row.location)
  const formMainLocation = text(form.mainLocation || form.main_location)
  const mainLocation =
    rowMainLocation ||
    rowLocation ||
    formMainLocation ||
    text(form.location || form.selectedLocation) ||
    'Unassigned location'
  const rowSubLocation = text(row.subLocation || row.sub_location)
  const rowLocationAsSubLocation =
    rowMainLocation && rowLocation && normalizeKey(rowLocation) !== normalizeKey(rowMainLocation)
      ? rowLocation
      : ''

  return {
    zone: text(row.zone || form.zone),
    zoneId: text(row.zoneId || row.zone_id || form.zoneId || form.zone_id),
    mainLocation,
    mainLocationId: text(
      row.mainLocationId ||
        row.main_location_id ||
        (normalizeKey(mainLocation) === normalizeKey(formMainLocation)
          ? form.mainLocationId || form.main_location_id
          : ''),
    ),
    subLocation:
      rowSubLocation || rowLocationAsSubLocation || text(form.subLocation || form.sub_location),
    subLocationId: text(
      row.subLocationId || row.sub_location_id || form.subLocationId || form.sub_location_id,
    ),
  }
}

export const resolveInspectionHierarchy = ({ source = {}, row = {}, form = {} } = {}) => {
  if (isType(source, /frt|fire truck/)) {
    return {
      zone: '',
      zoneId: '',
      mainLocation:
        text(form.frtTruckPlateNo || form.frt_truck_plate_no || form.mainLocation) || 'Fire truck',
      mainLocationId: text(form.frtTruckId || form.frt_truck_id || form.mainLocationId),
      subLocation:
        text(row.compartment || row.location || row.subLocation || row.sub_location) ||
        'Unassigned compartment',
      subLocationId: text(row.compartmentId || row.compartment_id || row.subLocationId),
    }
  }

  if (isType(source, /high angle/)) {
    const storageLocation = text(row.location)
    const compartment = text(row.subLocation || row.sub_location)
    const scopeParts = [storageLocation, compartment].filter(isMeaningfulHighAngleScope)
    return {
      zone: '',
      zoneId: '',
      mainLocation:
        text(row.mainLocation || row.main_location || form.mainLocation) || 'Rescue kit',
      mainLocationId: text(row.mainLocationId || row.main_location_id || form.mainLocationId),
      subLocation: scopeParts.join(' > ') || 'General kit items',
      subLocationId: text(row.subLocationId || row.sub_location_id),
    }
  }

  return getDefaultHierarchy(row, form)
}

const keySegment = (id, label, fallback) => {
  const normalizedId = normalizeKey(id)
  const normalizedLabel = normalizeKey(label)
  return [normalizedId, normalizedLabel].filter(Boolean).join('|') || fallback
}

export const getInspectionHierarchyGroupKey = (hierarchy = {}) =>
  [
    keySegment(hierarchy.zoneId, hierarchy.zone, 'no-zone'),
    keySegment(hierarchy.mainLocationId, hierarchy.mainLocation, 'unassigned-location'),
    keySegment(hierarchy.subLocationId, hierarchy.subLocation, 'no-sub-location'),
  ].join('\u0000')
