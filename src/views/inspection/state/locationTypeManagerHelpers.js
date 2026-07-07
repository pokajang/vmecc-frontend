import { normalizeTypeKey, resolveTypeIcon } from '../domain/utils/typeOptionUtils'

export const LOCATION_VISIBLE_LIMIT = 3
export const SUB_LOCATION_VISIBLE_LIMIT = 6
export const LOCATION_TOGGLE_VALUE = '__inspection_location_types_toggle__'

export const LOCATION_DRAFT_MAIN = 'main'
export const LOCATION_DRAFT_SUB = 'sub'
export const LOCATION_DRAFT_ZONE = 'zone'

export const FIRE_EXTINGUISHER_TYPE = 'Fire Extinguisher Inspection'
export const FIRE_PARENT_SEPARATOR = '\u001f'

export const normalizeLocationRow = (row, kind = LOCATION_DRAFT_MAIN, parentValue = '') => {
  const value = String(row?.value || row?.title || '').trim()
  if (!value) return null
  const rawKind = String(row?.kind || kind).trim()
  const resolvedKind = [LOCATION_DRAFT_ZONE, LOCATION_DRAFT_MAIN, LOCATION_DRAFT_SUB].includes(
    rawKind,
  )
    ? rawKind
    : LOCATION_DRAFT_MAIN
  const resolvedParent = String(row?.parentValue || parentValue || '').trim()
  if (resolvedKind === LOCATION_DRAFT_SUB && !resolvedParent) return null
  return {
    ...row,
    kind: resolvedKind,
    parentValue: resolvedParent,
    value,
    title: String(row?.title || value).trim(),
    description: String(row?.description || '').trim(),
    iconKey: String(row?.iconKey || '').trim(),
    icon:
      resolvedKind !== LOCATION_DRAFT_SUB
        ? row?.icon || resolveTypeIcon(row?.iconKey, 'location')
        : row?.icon || null,
    children: Array.isArray(row?.children)
      ? row.children
      : Array.isArray(row?.subLocations)
        ? row.subLocations
        : [],
    subLocations: Array.isArray(row?.subLocations)
      ? row.subLocations
      : Array.isArray(row?.children)
        ? row.children
        : [],
  }
}

export const sameKey = (left, right) => normalizeTypeKey(left) === normalizeTypeKey(right)

export const getOptionId = (row) => row?.id ?? row?.locationId ?? row?.location_id ?? ''

export const stripZonePrefix = (value) =>
  String(value || '')
    .trim()
    .replace(/^Zone\s+/i, '')
    .trim()

export const sameFireZoneKey = (left, right) =>
  normalizeTypeKey(stripZonePrefix(left)) === normalizeTypeKey(stripZonePrefix(right))

export const isNumericZoneLabel = (value) => /^\d/.test(stripZonePrefix(value))

export const formatFireZoneTitle = (row) => {
  const rawTitle = String(row?.title || row?.value || '').trim()
  if (!rawTitle) return rawTitle
  const zoneLabel = stripZonePrefix(rawTitle)
  return isNumericZoneLabel(zoneLabel) ? `Zone ${zoneLabel}` : rawTitle
}

export const compareFireZoneRows = (left, right) => {
  const leftLabel = stripZonePrefix(left?.value || left?.title)
  const rightLabel = stripZonePrefix(right?.value || right?.title)
  const leftNumber = leftLabel.match(/^(\d+(?:\.\d+)?)/)
  const rightNumber = rightLabel.match(/^(\d+(?:\.\d+)?)/)
  const leftIsNumeric = Boolean(leftNumber)
  const rightIsNumeric = Boolean(rightNumber)

  if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1
  if (leftIsNumeric && rightIsNumeric) {
    const diff = Number(leftNumber[1]) - Number(rightNumber[1])
    if (diff !== 0) return diff
  }

  return leftLabel.localeCompare(rightLabel, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export const withFireZoneDisplay = (rows = []) =>
  [...(Array.isArray(rows) ? rows : [])]
    .map((row) => ({
      ...row,
      title: formatFireZoneTitle(row),
    }))
    .sort(compareFireZoneRows)

export const findLocationInRows = (rows = [], value = '') => {
  const key = String(value || '').trim()
  if (!key) return null
  for (const row of Array.isArray(rows) ? rows : []) {
    if (sameKey(row?.value, key)) return row
    const childMatch = findLocationInRows(row?.subLocations || row?.children || [], key)
    if (childMatch) return childMatch
  }
  return null
}

export const findChildLocationInRows = (rows = [], parentValue = '', value = '') => {
  const parent = findLocationInRows(rows, parentValue)
  if (!parent) return null
  return findLocationInRows(parent.subLocations || parent.children || [], value)
}

export const withInspectionLocationDisplayLabels = (rows = [], inspectionType = '') => {
  const isHydraulic = sameKey(inspectionType, 'Hydraulic Rescue Tools Inspection')
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const value = String(row?.value || row?.title || '').trim()
    const title = isHydraulic && sameKey(value, 'FRT') ? 'Fire Rescue Tender (FRT)' : row?.title
    return {
      ...row,
      ...(title ? { title } : {}),
      subLocations: withInspectionLocationDisplayLabels(row?.subLocations || [], inspectionType),
    }
  })
}

export const mergeMainLocations = (seedRows, customRows) => {
  const byKey = new Map()
  ;(Array.isArray(seedRows) ? seedRows : []).forEach((row) => {
    const normalized = normalizeLocationRow(row)
    if (!normalized) return
    byKey.set(normalizeTypeKey(normalized.value), {
      ...normalized,
      system: true,
    })
  })
  ;(Array.isArray(customRows) ? customRows : [])
    .filter((row) => row.kind !== LOCATION_DRAFT_SUB && !String(row.parentValue || '').trim())
    .forEach((row) => {
      const normalized = normalizeLocationRow(row)
      if (!normalized) return
      const key = normalizeTypeKey(normalized.value)
      if (row.hidden) {
        byKey.delete(key)
        return
      }
      byKey.set(key, {
        ...(byKey.get(key) || {}),
        ...normalized,
        custom: true,
      })
    })

  return Array.from(byKey.values())
}

export const mergeFallbackLocationChildren = (rows = [], fallbackRows = [], depth = 0) => {
  const rowKind = depth >= 2 ? LOCATION_DRAFT_SUB : LOCATION_DRAFT_MAIN
  const fallbackByKey = new Map(
    (Array.isArray(fallbackRows) ? fallbackRows : [])
      .map((row) => {
        const normalized = normalizeLocationRow(row, rowKind)
        return normalized ? [normalizeTypeKey(normalized.value), normalized] : null
      })
      .filter(Boolean),
  )

  return (Array.isArray(rows) ? rows : []).map((row) => {
    const normalized = normalizeLocationRow(row, rowKind)
    if (!normalized) return row
    const fallback = fallbackByKey.get(normalizeTypeKey(normalized.value))
    const currentChildren = Array.isArray(normalized.subLocations)
      ? normalized.subLocations
      : normalized.children || []
    const fallbackChildren = Array.isArray(fallback?.subLocations)
      ? fallback.subLocations
      : fallback?.children || []
    const nextChildren =
      currentChildren.length > 0
        ? mergeFallbackLocationChildren(currentChildren, fallbackChildren, depth + 1)
        : mergeFallbackLocationChildren(fallbackChildren, fallbackChildren, depth + 1)

    return {
      ...normalized,
      children: nextChildren,
      subLocations: nextChildren,
    }
  })
}

export const replaceMainLocationRow = (rows, nextRow) => {
  const normalized = normalizeLocationRow(nextRow)
  if (!normalized) return Array.isArray(rows) ? rows : []
  let replaced = false
  const nextRows = (Array.isArray(rows) ? rows : []).map((row) => {
    if (String(getOptionId(row)) && String(getOptionId(row)) === String(getOptionId(normalized))) {
      replaced = true
      return { ...row, ...normalized }
    }
    if (!String(getOptionId(row)) && sameKey(row.value, normalized.value)) {
      replaced = true
      return { ...row, ...normalized }
    }
    return row
  })
  return replaced ? nextRows : [...nextRows, normalized]
}

export const replaceSubLocationRow = (rows, parentValue, nextRow) => {
  const normalized = normalizeLocationRow(nextRow, LOCATION_DRAFT_SUB, parentValue)
  if (!normalized) return Array.isArray(rows) ? rows : []
  const targetParentId = String(normalized.parentId || normalized.parent_id || '')
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const isTargetParent = targetParentId
      ? String(getOptionId(row)) === targetParentId
      : sameKey(row.value, parentValue)
    if (!isTargetParent) {
      const existingChildren = row.subLocations || row.children || []
      const children = replaceSubLocationRow(existingChildren, parentValue, nextRow)
      return children === existingChildren ? row : { ...row, children, subLocations: children }
    }
    let replaced = false
    const subLocations = (Array.isArray(row.subLocations) ? row.subLocations : []).map((sub) => {
      if (
        String(getOptionId(sub)) &&
        String(getOptionId(sub)) === String(getOptionId(normalized))
      ) {
        replaced = true
        return { ...sub, ...normalized }
      }
      if (!String(getOptionId(sub)) && sameKey(sub.value, normalized.value)) {
        replaced = true
        return { ...sub, ...normalized }
      }
      return sub
    })
    return {
      ...row,
      subLocations: replaced ? subLocations : [...subLocations, normalized],
    }
  })
}

export const removeLocationRow = (rows, targetRow, parentValue = '') => {
  const targetId = String(getOptionId(targetRow) || '')
  const targetParentValue = String(targetRow?.parentValue || parentValue || '').trim()
  if (parentValue) {
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => {
        if (targetId) return String(getOptionId(row)) !== targetId
        const rowParent = String(row.parentValue || '').trim()
        const parentMatches =
          !targetParentValue || !rowParent || sameKey(rowParent, targetParentValue)
        return !(sameKey(row.value, targetRow?.value) && parentMatches)
      })
      .map((row) => {
        const existingChildren = row.subLocations || row.children || []
        const children = removeLocationRow(existingChildren, targetRow, parentValue)
        return children === existingChildren ? row : { ...row, children, subLocations: children }
      })
  }
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    targetId ? String(getOptionId(row)) !== targetId : !sameKey(row.value, targetRow?.value),
  )
}

export const mergeChildLocations = (
  parentRow,
  parentValue,
  customRows,
  childKind = LOCATION_DRAFT_SUB,
) => {
  const byKey = new Map()
  ;(Array.isArray(parentRow?.subLocations) ? parentRow.subLocations : []).forEach((row) => {
    const normalized = normalizeLocationRow(row, childKind, parentValue)
    if (!normalized) return
    byKey.set(normalizeTypeKey(normalized.value), {
      ...normalized,
      system: true,
    })
  })
  ;(Array.isArray(customRows) ? customRows : [])
    .filter((row) => row.kind === childKind && sameKey(row.parentValue, parentValue))
    .forEach((row) => {
      const normalized = normalizeLocationRow(row, childKind, parentValue)
      if (!normalized) return
      const key = normalizeTypeKey(normalized.value)
      if (row.hidden) {
        byKey.delete(key)
        return
      }
      byKey.set(key, {
        ...(byKey.get(key) || {}),
        ...normalized,
        custom: true,
      })
    })

  return Array.from(byKey.values())
}

export const mergeSubLocations = (mainRow, parentValue, customRows) =>
  mergeChildLocations(mainRow, parentValue, customRows, LOCATION_DRAFT_SUB)
