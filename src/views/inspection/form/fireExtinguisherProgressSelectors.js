import { LOCATION_TOGGLE_VALUE } from 'src/views/inspection/useLocationTypeManager'
import { getFireExtinguisherRowWorkflowState } from '../types/fire-extinguisher/helpers'
import { getFireExtinguisherCanonicalAssetKey } from '../types/fire-extinguisher/identity'
import { LOADING_COUNT_LABEL, getContextCountLabel } from './inspectionCountLabels'

const normalizeCountKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

const normalizeZoneCountKey = (value) =>
  normalizeCountKey(value)
    .replace(/^zone\s+/i, '')
    .trim()

const getExtinguisherRowKey = (row = {}) =>
  getFireExtinguisherCanonicalAssetKey(row) ||
  String(row.id || row.equipmentId || row.catalogId || row.idLocNo || row.barcodeNo || '').trim()

const getProgressRows = ({ completedLocations = [], locationProgress = [] } = {}) =>
  Array.isArray(locationProgress) && locationProgress.length > 0
    ? locationProgress
    : Array.isArray(completedLocations)
      ? completedLocations
      : []

const getLocationProgressLabel = ({ inspectedCount, totalCount, isLoading = false }) => {
  if (isLoading) return LOADING_COUNT_LABEL
  if (!totalCount) return ''
  return `${inspectedCount}/${totalCount} FEs`
}

const getLocationCountLabel = ({ totalCount, isLoading = false }) =>
  getContextCountLabel({
    count: totalCount,
    singular: 'FE',
    plural: 'FEs',
    isLoading,
  })

const getLocationProgressMeta = ({ inspectedCount = 0, totalCount = 0, isLoading = false }) => {
  const metaLabel = getLocationProgressLabel({ inspectedCount, totalCount, isLoading })
  if (!metaLabel) return {}
  const isDone = !isLoading && totalCount > 0 && inspectedCount === totalCount
  return {
    metaLabel,
    metaTone: isDone ? 'success' : 'muted',
    metaIconKey: isDone ? 'check' : '',
    progress: {
      inspectedCount,
      totalCount,
      isDone,
      isLoading,
    },
  }
}

const parseLocationCountFromMeta = (option = {}) => {
  const explicitCount = Number(
    option?.locationCount ||
      option?.locationsCount ||
      option?.subLocationCount ||
      option?.subLocationsCount ||
      option?.totalLocations ||
      0,
  )
  if (Number.isFinite(explicitCount) && explicitCount > 0) return explicitCount

  const matched = String(option?.metaLabel || '').match(/\b(\d+)\s+locations?\b/i)
  const parsedCount = matched ? Number(matched[1]) : 0
  return Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 0
}

const parseAreaCountFromMeta = (option = {}) => {
  const explicitCount = Number(option?.areaCount || option?.areasCount || option?.totalAreas || 0)
  if (Number.isFinite(explicitCount) && explicitCount > 0) return explicitCount

  const matched = String(option?.metaLabel || '').match(/\b(\d+)\s+areas?\b/i)
  const parsedCount = matched ? Number(matched[1]) : 0
  return Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 0
}

const formatScopedProgressLabel = (completedCount, totalCount, singularUnit, pluralUnit) =>
  `${completedCount}/${totalCount} ${totalCount === 1 ? singularUnit : pluralUnit}`

const ensureAreaLocationGroup = ({ locationGroups, row, selectedZone }) => {
  const rowZone = normalizeZoneCountKey(row?.zone)
  if (selectedZone && rowZone && rowZone !== selectedZone) return null

  const areaKey = normalizeCountKey(row?.mainLocation || row?.main_location || row?.location)
  const subLocationKey = normalizeCountKey(row?.subLocation || row?.sub_location)
  if (!areaKey || !subLocationKey) return null

  const groupKey = `${areaKey}\u001f${subLocationKey}`
  const existing = locationGroups.get(groupKey)
  if (existing) return existing

  const nextGroup = {
    areaKey,
    subLocationKey,
    totalAssetKeys: new Set(),
    completedAssetKeys: new Set(),
    expectedCount: 0,
    completedCount: 0,
    hasServerProgress: false,
    forceCompleted: false,
  }
  locationGroups.set(groupKey, nextGroup)
  return nextGroup
}

const buildAreaLocationProgressCounts = ({
  completedLocations = [],
  extinguisherRows = [],
  locationProgress = [],
  sessionResults = [],
  zone = '',
}) => {
  const selectedZone = normalizeZoneCountKey(zone)
  const locationGroups = new Map()

  getProgressRows({ completedLocations, locationProgress }).forEach((row) => {
    const status = normalizeCountKey(row?.status)
    if (status !== 'completed' && status !== 'in_progress') return
    const locationGroup = ensureAreaLocationGroup({ locationGroups, row, selectedZone })
    if (!locationGroup) return
    const expectedCount = Number(row?.expectedCount || row?.expected_count || 0)
    const completedCount = Number(row?.completedCount || row?.completed_count || 0)
    locationGroup.expectedCount = Math.max(locationGroup.expectedCount, expectedCount)
    locationGroup.completedCount = Math.max(locationGroup.completedCount, completedCount)
    locationGroup.hasServerProgress = true
    if (status === 'completed') locationGroup.forceCompleted = true
  })
  ;(Array.isArray(extinguisherRows) ? extinguisherRows : []).forEach((row, index) => {
    const locationGroup = ensureAreaLocationGroup({ locationGroups, row, selectedZone })
    if (!locationGroup) return
    const assetKey = getExtinguisherRowKey(row) || `${locationGroup.subLocationKey}:row:${index}`
    locationGroup.totalAssetKeys.add(assetKey)
    if (getFireExtinguisherRowWorkflowState(row).isComplete) {
      locationGroup.completedAssetKeys.add(assetKey)
    }
  })
  ;(Array.isArray(sessionResults) ? sessionResults : []).forEach((row, index) => {
    if (normalizeCountKey(row?.status) !== 'completed') return
    const locationGroup = ensureAreaLocationGroup({ locationGroups, row, selectedZone })
    if (!locationGroup) return
    const assetKey =
      getExtinguisherRowKey(row) || `${locationGroup.subLocationKey}:session:${index}`
    locationGroup.completedAssetKeys.add(assetKey)
  })

  const areaCounts = new Map()
  locationGroups.forEach((locationGroup) => {
    const current = areaCounts.get(locationGroup.areaKey) || {
      completedCount: 0,
      knownLocationCount: 0,
      hasProgress: false,
    }
    const totalAssetCount = Math.max(locationGroup.expectedCount, locationGroup.totalAssetKeys.size)
    const completedAssetCount = Math.max(
      locationGroup.completedCount,
      locationGroup.completedAssetKeys.size,
    )
    const isLocationComplete =
      locationGroup.forceCompleted ||
      (totalAssetCount > 0 && completedAssetCount >= totalAssetCount)

    current.knownLocationCount += 1
    current.hasProgress =
      current.hasProgress ||
      locationGroup.hasServerProgress ||
      locationGroup.forceCompleted ||
      completedAssetCount > 0
    if (isLocationComplete) current.completedCount += 1
    areaCounts.set(locationGroup.areaKey, current)
  })

  return areaCounts
}

export const applyFireExtinguisherAreaCompletionProgress = ({
  completedLocations = [],
  options = [],
  extinguisherRows = [],
  locationProgress = [],
  sessionResults = [],
  showActiveProgress = false,
  zone = '',
}) => {
  if (!Array.isArray(options) || options.length === 0) return options
  if (!showActiveProgress) return options
  const progressCounts = buildAreaLocationProgressCounts({
    completedLocations,
    extinguisherRows,
    locationProgress,
    sessionResults,
    zone,
  })

  return options.map((option) => {
    if (option?.value === LOCATION_TOGGLE_VALUE) return option
    const optionKey = normalizeCountKey(option?.value || option?.title)
    const progress = progressCounts.get(optionKey)
    const totalCount = Math.max(
      parseLocationCountFromMeta(option),
      progress?.knownLocationCount || 0,
    )
    const completedCount = progress?.completedCount || 0
    if (!progress?.hasProgress || totalCount <= 0) return option
    const isDone = completedCount >= totalCount
    return {
      ...option,
      metaLabel: formatScopedProgressLabel(completedCount, totalCount, 'location', 'locations'),
      metaTone: isDone ? 'success' : 'muted',
      metaIconKey: isDone ? 'check' : '',
      progress: { completedCount, totalCount, isDone },
    }
  })
}

export const applyFireExtinguisherZoneCompletionProgress = ({
  completedLocations = [],
  locationProgress = [],
  options = [],
  showActiveProgress = false,
}) => {
  if (!Array.isArray(options) || options.length === 0) return options
  if (!showActiveProgress) return options
  const areaGroups = new Map()
  getProgressRows({ completedLocations, locationProgress }).forEach((row) => {
    const status = normalizeCountKey(row?.status)
    if (status !== 'completed' && status !== 'in_progress') return
    const zoneKey = normalizeZoneCountKey(row?.zone)
    const areaKey = normalizeCountKey(row?.mainLocation || row?.main_location)
    const subLocationKey = normalizeCountKey(row?.subLocation || row?.sub_location)
    if (!areaKey || !subLocationKey) return
    const groupKey = `${zoneKey}\u001f${areaKey}`
    const current = areaGroups.get(groupKey) || {
      zoneKey,
      totalLocations: 0,
      completedLocations: 0,
      hasProgress: false,
      seenLocations: new Set(),
    }
    if (current.seenLocations.has(subLocationKey)) return
    current.seenLocations.add(subLocationKey)
    current.totalLocations += 1
    current.hasProgress = true
    const expectedCount = Number(row?.expectedCount || row?.expected_count || 0)
    const completedCount = Number(row?.completedCount || row?.completed_count || 0)
    if (status === 'completed' || (expectedCount > 0 && completedCount >= expectedCount)) {
      current.completedLocations += 1
    }
    areaGroups.set(groupKey, current)
  })

  const zoneCounts = new Map()
  areaGroups.forEach((area) => {
    const current = zoneCounts.get(area.zoneKey) || {
      completedCount: 0,
      knownAreaCount: 0,
      hasProgress: false,
    }
    current.knownAreaCount += 1
    current.hasProgress = current.hasProgress || area.hasProgress
    if (area.totalLocations > 0 && area.completedLocations >= area.totalLocations) {
      current.completedCount += 1
    }
    zoneCounts.set(area.zoneKey, current)
  })

  return options.map((option) => {
    if (option?.value === LOCATION_TOGGLE_VALUE) return option
    const optionKey = normalizeZoneCountKey(option?.value || option?.title)
    const progress = zoneCounts.get(optionKey)
    const totalCount = Math.max(parseAreaCountFromMeta(option), progress?.knownAreaCount || 0)
    const completedCount = progress?.completedCount || 0
    if (!progress?.hasProgress || totalCount <= 0) return option
    const isDone = completedCount >= totalCount
    return {
      ...option,
      metaLabel: formatScopedProgressLabel(completedCount, totalCount, 'area', 'areas'),
      metaTone: isDone ? 'success' : 'muted',
      metaIconKey: isDone ? 'check' : '',
      progress: { completedCount, totalCount, isDone },
    }
  })
}

const buildProgressCounts = ({
  completedLocations = [],
  extinguisherRows = [],
  locationProgress = [],
  level,
  sessionResults = [],
  zone = '',
  mainLocation = '',
}) => {
  const counts = new Map()
  const countedRows = new Set()
  const selectedZone = normalizeZoneCountKey(zone)
  const selectedMainLocation = normalizeCountKey(mainLocation)

  const groupKeyFor = (row = {}) => {
    const rowZone = normalizeZoneCountKey(row?.zone)
    const rowMainLocation = normalizeCountKey(
      row?.mainLocation || row?.main_location || row?.location,
    )
    const rowSubLocation = normalizeCountKey(row?.subLocation || row?.sub_location)
    if (level === 'zone') return rowZone
    if (level === 'mainArea') {
      if (selectedZone && rowZone && rowZone !== selectedZone) return ''
      return rowMainLocation
    }
    if (selectedZone && rowZone && rowZone !== selectedZone) return ''
    if (selectedMainLocation && rowMainLocation && rowMainLocation !== selectedMainLocation) {
      return ''
    }
    return rowSubLocation
  }

  getProgressRows({ completedLocations, locationProgress }).forEach((row) => {
    const status = normalizeCountKey(row?.status)
    if (status !== 'completed' && status !== 'in_progress') return
    const groupKey = groupKeyFor(row)
    if (!groupKey) return
    const expectedCount = Number(row?.expectedCount || row?.expected_count || 0)
    const completedCount = Number(row?.completedCount || row?.completed_count || 0)
    const current = counts.get(groupKey) || {
      totalCount: 0,
      inspectedCount: 0,
      localTotalCount: 0,
      localInspectedCount: 0,
      hasServerProgress: false,
    }
    current.totalCount = Math.max(current.totalCount, expectedCount || completedCount || 1)
    current.inspectedCount = Math.max(current.inspectedCount, completedCount)
    current.hasServerProgress = true
    if (status === 'completed') current.forceCompleted = true
    counts.set(groupKey, current)
  })
  ;(Array.isArray(extinguisherRows) ? extinguisherRows : []).forEach((row, index) => {
    const groupKey = groupKeyFor(row)
    if (!groupKey) return
    const rowKey = getExtinguisherRowKey(row) || `${groupKey}:${index}`
    const countKey = `${level}:${groupKey}:${rowKey}`
    if (countedRows.has(countKey)) return
    countedRows.add(countKey)
    const current = counts.get(groupKey) || {
      totalCount: 0,
      inspectedCount: 0,
      localTotalCount: 0,
      localInspectedCount: 0,
    }
    current.localTotalCount = (current.localTotalCount || 0) + 1
    if (getFireExtinguisherRowWorkflowState(row).isComplete) {
      current.localInspectedCount = (current.localInspectedCount || 0) + 1
    }
    current.totalCount = Math.max(current.totalCount, current.localTotalCount)
    current.inspectedCount = Math.max(current.inspectedCount, current.localInspectedCount || 0)
    counts.set(groupKey, current)
  })
  ;(Array.isArray(sessionResults) ? sessionResults : []).forEach((row, index) => {
    if (normalizeCountKey(row?.status) !== 'completed') return
    const groupKey = groupKeyFor(row)
    if (!groupKey) return
    const rowKey = getExtinguisherRowKey(row) || `${groupKey}:session:${index}`
    const countKey = `${level}:${groupKey}:${rowKey}`
    if (countedRows.has(countKey)) return
    countedRows.add(countKey)
    const current = counts.get(groupKey) || {
      totalCount: 0,
      inspectedCount: 0,
      localTotalCount: 0,
      localInspectedCount: 0,
    }
    current.localTotalCount = Math.max(
      current.localTotalCount || 0,
      (current.localInspectedCount || 0) + 1,
    )
    current.localInspectedCount = (current.localInspectedCount || 0) + 1
    current.totalCount = Math.max(current.totalCount, current.localTotalCount)
    current.inspectedCount = Math.max(current.inspectedCount, current.localInspectedCount)
    counts.set(groupKey, current)
  })

  return counts
}

export const applyFireExtinguisherLocationProgress = ({
  completedLocations = [],
  options = [],
  extinguisherRows = [],
  isLoading = false,
  locationProgress = [],
  level,
  sessionResults = [],
  showActiveProgress = false,
  zone = '',
  mainLocation = '',
}) => {
  if (!Array.isArray(options) || options.length === 0) return options
  const hasReliableRows = Array.isArray(extinguisherRows) && extinguisherRows.length > 0
  const hasSessionProgress =
    (Array.isArray(sessionResults) && sessionResults.length > 0) ||
    (Array.isArray(locationProgress) && locationProgress.length > 0) ||
    (Array.isArray(completedLocations) && completedLocations.length > 0)
  const progressCounts = buildProgressCounts({
    completedLocations,
    extinguisherRows,
    locationProgress,
    level,
    sessionResults,
    zone,
    mainLocation,
  })

  return options.map((option) => {
    if (option?.value === LOCATION_TOGGLE_VALUE) return option
    const optionKey =
      level === 'zone'
        ? normalizeZoneCountKey(option?.value || option?.title)
        : normalizeCountKey(option?.value || option?.title)
    const progress = progressCounts.get(optionKey) || { totalCount: 0, inspectedCount: 0 }
    const showLoading =
      isLoading && (!hasReliableRows || (!hasSessionProgress && progress.inspectedCount === 0))
    if (!showActiveProgress) {
      return {
        ...option,
        metaLabel:
          option.metaLabel ||
          getLocationCountLabel({
            totalCount: progress.totalCount,
            isLoading: showLoading,
          }),
      }
    }
    if (progress.forceCompleted) {
      return {
        ...option,
        metaLabel: getLocationProgressLabel({
          inspectedCount: progress.inspectedCount,
          totalCount: progress.totalCount,
        }),
        metaTone: 'success',
        metaIconKey: 'check',
        progress: {
          inspectedCount: progress.inspectedCount,
          totalCount: progress.totalCount,
          isDone: true,
          isLoading: false,
        },
      }
    }
    const progressMeta = getLocationProgressMeta({
      inspectedCount: progress.inspectedCount,
      totalCount: progress.totalCount,
      isLoading: showLoading,
    })
    return {
      ...option,
      metaLabel:
        progressMeta.metaLabel ||
        option.metaLabel ||
        getLocationCountLabel({
          totalCount: progress.totalCount,
          isLoading: showLoading,
        }),
      metaTone: progressMeta.metaTone || option.metaTone,
      metaIconKey: progressMeta.metaIconKey || option.metaIconKey,
      progress: progressMeta.progress,
    }
  })
}

export const applyFireExtinguisherLocationInventoryCounts = (options = {}) =>
  applyFireExtinguisherLocationProgress({
    ...options,
    completedLocations: [],
    locationProgress: [],
    sessionResults: [],
    showActiveProgress: false,
  })
