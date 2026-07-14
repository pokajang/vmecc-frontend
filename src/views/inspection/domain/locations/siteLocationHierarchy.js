const text = (value) => String(value ?? '').trim()
const keyOf = (value) => text(value).toLocaleLowerCase().replace(/\s+/g, ' ')
const zoneKeyOf = (value) => keyOf(value).replace(/^zone\s+/, '')

export const SITE_LOCATION_LEVELS = ['zone', 'area', 'location']

export const normalizeSiteLocationNode = (row, depth = 0) => {
  const name = text(row?.name || row?.value || row?.title)
  if (!name || depth < 0 || depth > 2) return null
  const level = SITE_LOCATION_LEVELS[depth]
  const children = (
    Array.isArray(row?.children)
      ? row.children
      : Array.isArray(row?.subLocations)
        ? row.subLocations
        : row?.sub_locations || []
  )
    .map((child) => normalizeSiteLocationNode(child, depth + 1))
    .filter(Boolean)

  return {
    id: text(row?.id ?? row?.locationId ?? row?.location_id),
    parentId: text(row?.parentId ?? row?.parent_id) || null,
    level,
    name,
    displayName: text(row?.displayName || row?.title) || (level === 'zone' ? `Zone ${name}` : name),
    description: text(row?.description),
    iconKey: text(row?.iconKey || row?.icon_key),
    source: text(row?.source) || 'custom',
    permissions: {
      canEdit: row?.permissions?.canEdit ?? row?.canEdit ?? true,
      canDelete: row?.permissions?.canDelete ?? row?.canDelete ?? true,
    },
    children,
  }
}

export const normalizeSiteLocationHierarchy = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => normalizeSiteLocationNode(row)).filter(Boolean)

export const findSiteLocationById = (rows = [], id = '') => {
  const target = text(id)
  if (!target) return null
  for (const row of rows) {
    if (row.id === target) return row
    const child = findSiteLocationById(row.children, target)
    if (child) return child
  }
  return null
}

export const findSiteLocationByName = (rows = [], name = '', level = '') => {
  const target = level === 'zone' ? zoneKeyOf(name) : keyOf(name)
  if (!target) return null
  for (const row of rows) {
    const candidate = row.level === 'zone' ? zoneKeyOf(row.name) : keyOf(row.name)
    if ((!level || row.level === level) && candidate === target) return row
    const child = findSiteLocationByName(row.children, name, level)
    if (child) return child
  }
  return null
}

export const resolveSiteLocation = (rows, reference, level = '') => {
  if (!reference) return null
  if (typeof reference === 'object') {
    return (
      findSiteLocationById(rows, reference.id) ||
      findSiteLocationByName(rows, reference.name || reference.value, level)
    )
  }
  return findSiteLocationById(rows, reference) || findSiteLocationByName(rows, reference, level)
}

export const getSiteLocationChildren = (rows, parent, childLevel) =>
  resolveSiteLocation(rows, parent)?.children.filter((row) => row.level === childLevel) || []

export const upsertSiteLocationNode = (rows, nextNode) => {
  const node = normalizeSiteLocationNode(nextNode, SITE_LOCATION_LEVELS.indexOf(nextNode?.level))
  if (!node) return rows
  if (node.level === 'zone') {
    const index = rows.findIndex((row) => row.id === node.id)
    if (index < 0) return [...rows, node]
    return rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...node, children: row.children } : row,
    )
  }

  return rows.map((row) => {
    if (row.id === node.parentId) {
      const existing = row.children.findIndex((child) => child.id === node.id)
      return {
        ...row,
        children:
          existing < 0
            ? [...row.children, node]
            : row.children.map((child, index) =>
                index === existing ? { ...child, ...node, children: child.children } : child,
              ),
      }
    }
    const children = upsertSiteLocationNode(row.children, node)
    return children === row.children ? row : { ...row, children }
  })
}

export const removeSiteLocationNode = (rows, id) => {
  const target = text(id)
  return rows
    .filter((row) => row.id !== target)
    .map((row) => ({ ...row, children: removeSiteLocationNode(row.children, target) }))
}

export const toLegacySiteLocationRows = (rows = []) =>
  rows.map((row) => {
    const children = toLegacySiteLocationRows(row.children)
    return {
      id: row.id,
      parentId: row.parentId,
      value: row.name,
      title: row.displayName,
      description: row.description,
      iconKey: row.iconKey,
      source: row.source,
      custom: row.source === 'custom',
      canEdit: row.permissions.canEdit,
      canDelete: row.permissions.canDelete,
      children,
      subLocations: children,
    }
  })

export const fromLegacySiteLocationSelection = (value = {}, hierarchy = []) => ({
  zone:
    resolveSiteLocation(hierarchy, value.zoneId || value.zone, 'zone') ||
    (text(value.zone) ? { id: text(value.zoneId), name: text(value.zone) } : null),
  area:
    resolveSiteLocation(hierarchy, value.mainLocationId || value.mainLocation, 'area') ||
    (text(value.mainLocation)
      ? { id: text(value.mainLocationId), name: text(value.mainLocation) }
      : null),
  location:
    resolveSiteLocation(hierarchy, value.subLocationId || value.subLocation, 'location') ||
    (text(value.subLocation)
      ? { id: text(value.subLocationId), name: text(value.subLocation) }
      : null),
})

export const toLegacySiteLocationSelection = (selection = {}) => ({
  zone: text(selection.zone?.name),
  zoneId: text(selection.zone?.id),
  mainLocation: text(selection.area?.name),
  mainLocationId: text(selection.area?.id),
  subLocation: text(selection.location?.name),
  subLocationId: text(selection.location?.id),
})

export const validateCompleteSiteLocation = (selection = {}) => {
  const missing = []
  if (!text(selection.zone?.name)) missing.push('zone')
  if (!text(selection.area?.name)) missing.push('area')
  if (!text(selection.location?.name)) missing.push('location')
  return { valid: missing.length === 0, missing }
}

export { keyOf as normalizeSiteLocationKey, zoneKeyOf as normalizeSiteZoneKey }
