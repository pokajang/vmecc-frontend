const text = (value) => String(value || '').trim()

const pluralize = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`

const itemNoun = (count, singular, plural = `${singular}s`) => (count === 1 ? singular : plural)

const TYPE_LABELS = [
  {
    match: /fire extinguisher/i,
    groupSingular: 'location',
    itemSingular: 'fire extinguisher',
    itemPlural: 'fire extinguishers',
  },
  {
    match: /fire truck|frt/i,
    groupSingular: 'compartment',
    itemSingular: 'checklist item',
    itemPlural: 'checklist items',
  },
  {
    match: /general/i,
    groupSingular: 'location',
    itemSingular: 'finding',
    itemPlural: 'findings',
  },
  {
    match: /health safety|hse/i,
    groupSingular: 'location',
    itemSingular: 'observation',
    itemPlural: 'observations',
  },
  {
    match: /scba/i,
    groupSingular: 'section',
    itemSingular: 'SCBA item',
    itemPlural: 'SCBA items',
  },
  {
    match: /high angle|er aux|hydraulic/i,
    groupSingular: 'location',
    itemSingular: 'equipment item',
    itemPlural: 'equipment items',
  },
]

const getTypeLabels = (item = {}) => {
  const haystack = `${item.title || ''} ${item.inspectionType || ''}`
  return (
    TYPE_LABELS.find((entry) => entry.match.test(haystack)) || {
      groupSingular: 'location',
      itemSingular: 'item',
      itemPlural: 'items',
    }
  )
}

const getRowIssue = (row = {}) => {
  const status = text(row.status).toLowerCase()
  return (
    row.isIssue === true ||
    row.hasIssue === true ||
    row.hasDefect === true ||
    status === 'issue' ||
    status === 'needs attention' ||
    status === 'not good' ||
    status === 'not operational' ||
    status === 'no' ||
    status.includes('defect')
  )
}

const getRowComplete = (row = {}) => {
  const status = text(row.status).toLowerCase()
  if (!status) return true
  return !['needs attention', 'incomplete', 'pending'].includes(status)
}

const getGroupKey = (row = {}) =>
  [text(row.zone) || 'No zone', text(row.mainLocation) || 'No area', text(row.subLocation)]
    .filter(Boolean)
    .join('\u0000')

const getPhotoSourceGroupKey = (source = {}, form = {}) =>
  getGroupKey({
    zone: text(source.zone || form.zone) || 'No zone',
    mainLocation:
      text(source.mainLocation || source.main_location || source.location || form.mainLocation) ||
      'No main area',
    subLocation:
      text(
        source.subLocation ||
          source.sub_location ||
          source.selectedLocation ||
          form.subLocation ||
          form.selectedLocation ||
          form.location,
      ) || 'No location',
  })

const hasPhotoPayload = (photo = {}) =>
  Boolean(
    photo &&
      typeof photo === 'object' &&
      (text(photo.id || photo.photoId || photo.photo_id) ||
        text(photo.fileName || photo.file_name || photo.name) ||
        text(photo.url || photo.dataUrl || photo.data_url) ||
        text(photo.description || photo.caption)),
  )

const normalizePhoto = (photo = {}, index = 0) => {
  if (!hasPhotoPayload(photo)) return null
  const id = text(photo.id || photo.photoId || photo.photo_id)
  const fileName = text(photo.fileName || photo.file_name || photo.name)
  const description = text(photo.description || photo.caption)
  const url = String(photo.url || photo.dataUrl || photo.data_url || '')

  return {
    ...photo,
    id,
    key: id || `${fileName || url || description || 'photo'}:${index}`,
    fileName,
    description,
    url,
  }
}

const normalizePhotoArray = (photos = []) =>
  (Array.isArray(photos) ? photos : []).map(normalizePhoto).filter(Boolean)

const isPhotoArrayKey = (key = '') => /(^photos$|photos$|_photos$|photoEvidence$)/i.test(key)

const formatPhotoGroupTitle = (key = '', fallback = 'Inspection Photos') => {
  const label = text(key)
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()

  if (!label) return fallback
  if (/^photos$/i.test(label)) return fallback
  return label
    .split(' ')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

const getPhotoSourceLabel = (source = {}, fallback = 'Inspection item') =>
  text(
    source.idLocNo ||
      source.equipment ||
      source.description ||
      source.item ||
      source.name ||
      source.label ||
      source.serialNo ||
      source.serial_no ||
      source.id,
  ) || fallback

const getPhotoSignature = (photo = {}) =>
  [photo.id, photo.url, photo.fileName, photo.description].map(text).filter(Boolean).join('|')

const addPhotoGroup = (groupsByLocation, locationKey, title, photos) => {
  const normalizedPhotos = normalizePhotoArray(photos)
  if (normalizedPhotos.length === 0) return

  if (!groupsByLocation.has(locationKey)) {
    groupsByLocation.set(locationKey, { groups: [], signatures: new Set() })
  }

  const entry = groupsByLocation.get(locationKey)
  const uniquePhotos = normalizedPhotos.filter((photo) => {
    const signature = getPhotoSignature(photo)
    if (signature && entry.signatures.has(signature)) return false
    if (signature) entry.signatures.add(signature)
    return true
  })

  if (uniquePhotos.length === 0) return
  entry.groups.push({
    key: `${locationKey}:photos:${entry.groups.length}`,
    title,
    photos: uniquePhotos,
  })
}

const collectRowPhotoGroups = (groupsByLocation, row = {}, form = {}, fallbackLabel = '') => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return

  const locationKey = getPhotoSourceGroupKey(row, form)
  const sourceLabel = getPhotoSourceLabel(row, fallbackLabel)
  Object.entries(row).forEach(([key, value]) => {
    if (!isPhotoArrayKey(key) || normalizePhotoArray(value).length === 0) return
    const fieldLabel = formatPhotoGroupTitle(key, 'Inspection Photos')
    const title =
      fieldLabel === 'Inspection Photos' ? sourceLabel : `${sourceLabel} - ${fieldLabel}`
    addPhotoGroup(groupsByLocation, locationKey, title, value)
  })
}

const collectNestedRowPhotoGroups = (
  groupsByLocation,
  container = {},
  form = {},
  fallbackLabel,
) => {
  if (!container || typeof container !== 'object' || Array.isArray(container)) return
  ;['rows', 'visibleRows', 'checks', 'items'].forEach((key) => {
    const rows = container[key]
    if (!Array.isArray(rows)) return
    rows.forEach((row, index) =>
      collectRowPhotoGroups(
        groupsByLocation,
        row,
        form,
        text(container.title || container.label || fallbackLabel) || `Item ${index + 1}`,
      ),
    )
  })
}

const buildLocationPhotoGroups = (form = {}) => {
  const groupsByLocation = new Map()
  const formLocationKey = getPhotoSourceGroupKey(form, form)

  addPhotoGroup(groupsByLocation, formLocationKey, 'General Evidence Photos', form.photos)

  Object.entries(form || {}).forEach(([key, value]) => {
    if (!Array.isArray(value) || isPhotoArrayKey(key)) return
    value.forEach((row, index) => {
      collectRowPhotoGroups(groupsByLocation, row, form, `Item ${index + 1}`)
      collectNestedRowPhotoGroups(groupsByLocation, row, form, `Item ${index + 1}`)
    })
  })

  return groupsByLocation
}

const getZoneLabel = (zone) => {
  const value = text(zone)
  if (!value) return 'No zone'
  if (/^zone\b/i.test(value)) return value
  return /^\d+$/.test(value) ? `Zone ${value}` : value
}

const getGroupLocationParts = (row = {}) => {
  const areaLabel = text(row.mainLocation) || text(row.location) || 'Inspection group'
  const rawLocation = text(row.subLocation)
  const locationLabel = rawLocation && rawLocation !== areaLabel ? rawLocation : ''

  return {
    zoneLabel: getZoneLabel(row.zone),
    areaLabel,
    locationLabel,
    hasDistinctLocation: Boolean(locationLabel),
  }
}

const getGroupTitle = (row = {}) => {
  const mainLocation = text(row.mainLocation) || text(row.location) || 'Inspection group'
  const subLocation = text(row.subLocation)
  if (!subLocation || subLocation === mainLocation) return mainLocation
  return `${mainLocation} / ${subLocation}`
}

const getZoneSortValue = (zoneLabel = '') => {
  const value = text(zoneLabel)
  const match = value.match(/^zone\s+(\d+)/i)
  if (!match) return { group: 1, zone: value.toLowerCase() }
  return { group: 0, zone: Number(match[1]) }
}

const compareLocationGroups = (left = {}, right = {}) => {
  const leftZone = getZoneSortValue(left.zoneLabel)
  const rightZone = getZoneSortValue(right.zoneLabel)
  if (leftZone.group !== rightZone.group) return leftZone.group - rightZone.group
  if (leftZone.zone !== rightZone.zone) {
    if (typeof leftZone.zone === 'number' && typeof rightZone.zone === 'number') {
      return leftZone.zone - rightZone.zone
    }
    return String(leftZone.zone).localeCompare(String(rightZone.zone), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }
  const leftPath = [left.areaLabel, left.locationLabel].filter(Boolean).join(' ')
  const rightPath = [right.areaLabel, right.locationLabel].filter(Boolean).join(' ')
  return leftPath.localeCompare(rightPath, undefined, { numeric: true, sensitivity: 'base' })
}

const buildGroups = (item = {}) => {
  const byGroup = new Map()
  const rows = Array.isArray(item.groups) ? item.groups : []
  const photoGroupsByLocation = buildLocationPhotoGroups(item.form)

  rows.forEach((row, index) => {
    const key = getGroupKey(row) || `group-${index}`
    if (!byGroup.has(key)) {
      const locationParts = getGroupLocationParts(row)
      byGroup.set(key, {
        key,
        title: getGroupTitle(row),
        subtitle: locationParts.zoneLabel,
        ...locationParts,
        rows: [],
        issueCount: 0,
      })
    }

    const group = byGroup.get(key)
    const isIssue = getRowIssue(row)
    const isComplete = getRowComplete(row)
    const status = text(row.status) || 'Recorded'
    const title =
      text(row.label) || text(row.idLocNo) || text(row.equipment) || `Item ${group.rows.length + 1}`
    group.rows.push({
      key: `${key}:${title || index}`,
      title,
      status,
      description: text(row.description) || text(row.details) || '',
      remarks: text(row.remarks) || text(row.defectRemarks) || text(row.remark) || '',
      isIssue,
      isComplete,
    })
    if (isIssue) group.issueCount += 1
  })

  return Array.from(byGroup.values())
    .map((group) => ({
      ...group,
      photoGroups: photoGroupsByLocation.get(group.key)?.groups || [],
      itemCount: group.rows.length,
      completedCount: group.rows.filter((row) => row.isComplete).length,
      issueRows: group.rows.filter((row) => row.isIssue),
      status: group.issueCount > 0 ? `${pluralize(group.issueCount, 'issue')} reported` : 'Checked',
    }))
    .sort(compareLocationGroups)
}

export const buildInspectionReviewDashboardItem = (item = {}) => {
  const labels = getTypeLabels(item)
  const groups = buildGroups(item)
  const metrics = item.metrics || {}
  const itemCount = Number(metrics.count || groups.reduce((sum, group) => sum + group.itemCount, 0))
  const issueCount = Number(
    metrics.defectCount || groups.reduce((sum, group) => sum + group.issueCount, 0),
  )
  const groupCount = Number(metrics.groupCount || metrics.locationCount || groups.length)

  return {
    ...item,
    displayTitle: text(item.title) || text(item.inspectionType) || 'Inspection',
    groups,
    metrics: {
      ...metrics,
      groupCount,
      itemCount,
      issueCount,
    },
    labels,
    locationRows: groups.map((group) => ({
      key: group.key,
      title: group.title,
      subtitle: group.subtitle,
      zoneLabel: group.zoneLabel,
      areaLabel: group.areaLabel,
      locationLabel: group.locationLabel,
      hasDistinctLocation: group.hasDistinctLocation,
      itemCount: group.itemCount,
      completedCount: group.completedCount,
      photoGroups: group.photoGroups,
      photoCount: group.photoGroups.reduce((sum, photoGroup) => sum + photoGroup.photos.length, 0),
      itemSummary: `${group.completedCount}/${group.itemCount} ${itemNoun(
        group.itemCount,
        labels.itemSingular,
        labels.itemPlural,
      )} checked`,
    })),
    issueGroups: groups
      .filter((group) => group.issueCount > 0)
      .map((group) => ({
        key: group.key,
        title: group.title,
        subtitle: group.subtitle,
        zoneLabel: group.zoneLabel,
        areaLabel: group.areaLabel,
        locationLabel: group.locationLabel,
        hasDistinctLocation: group.hasDistinctLocation,
        issueCount: group.issueCount,
        rows: group.issueRows,
      })),
    groupSummary: `${pluralize(groupCount, labels.groupSingular)} inspected`,
    itemSummary: `Total ${pluralize(itemCount, labels.itemSingular, labels.itemPlural)}`,
    issueSummary: `Issues: ${issueCount} ${issueCount === 1 ? 'reported' : 'recorded'}`,
  }
}

export const buildInspectionReviewDashboardItems = (items = []) =>
  (Array.isArray(items) ? items : []).map(buildInspectionReviewDashboardItem)
