import { useEffect, useRef } from 'react'

import {
  resolveSiteLocation,
  upsertSiteLocationNode,
} from '../domain/locations/siteLocationHierarchy'
import { saveCustomLocationTypes } from '../domain/storage/customLocationTypesStorage'

const MARKER_PREFIX = 'inspection_site_location_catalog_migrated_v1_user_'
const FIRE_PARENT_SEPARATOR = '\u001f'
const inFlightByUser = new Map()
const text = (value) => String(value || '').trim()

const markerKey = (userId) => `${MARKER_PREFIX}${userId || 'anonymous'}`
const isComplete = (userId) => {
  try {
    return window.localStorage?.getItem(markerKey(userId)) === '1'
  } catch {
    return false
  }
}
const markComplete = (userId) => {
  try {
    window.localStorage?.setItem(markerKey(userId), '1')
  } catch {
    // A storage failure may cause a harmless retry next time.
  }
}

export const migrateLegacySiteLocations = async ({ userId, rows, catalog }) => {
  if (!userId || isComplete(userId)) return { migrated: 0, remaining: rows }
  if (inFlightByUser.has(userId)) return inFlightByUser.get(userId)

  const migration = (async () => {
    let hierarchy = catalog.hierarchy
    const migratedIndexes = new Set()
    const activeRows = rows.map((row, index) => ({ row, index })).filter(({ row }) => !row.hidden)

    for (const { row, index } of activeRows.filter(({ row }) => row.kind === 'zone')) {
      const name = text(row.value || row.title)
      let node = resolveSiteLocation(hierarchy, name, 'zone')
      if (!node && name) {
        const result = await catalog.createZone({
          name,
          description: text(row.description),
          iconKey: text(row.iconKey),
        })
        node = result.data
        hierarchy = upsertSiteLocationNode(hierarchy, node)
      }
      if (node) migratedIndexes.add(index)
    }

    for (const { row, index } of activeRows.filter(
      ({ row }) => row.kind === 'main' && text(row.parentValue),
    )) {
      const zoneName = text(row.parentValue).split(FIRE_PARENT_SEPARATOR)[0]
      const zone = resolveSiteLocation(hierarchy, zoneName, 'zone')
      const name = text(row.value || row.title)
      if (!zone || !name) continue
      let node = resolveSiteLocation(zone.children, name, 'area')
      if (!node) {
        const result = await catalog.createArea(zone.id, {
          name,
          description: text(row.description),
          iconKey: text(row.iconKey),
        })
        node = result.data
        hierarchy = upsertSiteLocationNode(hierarchy, node)
      }
      if (node) migratedIndexes.add(index)
    }

    for (const { row, index } of activeRows.filter(({ row }) => row.kind === 'sub')) {
      const [zoneName, ...areaParts] = text(row.parentValue).split(FIRE_PARENT_SEPARATOR)
      const zone = resolveSiteLocation(hierarchy, zoneName, 'zone')
      const area = resolveSiteLocation(
        zone?.children || [],
        areaParts.join(FIRE_PARENT_SEPARATOR),
        'area',
      )
      const name = text(row.value || row.title)
      if (!area || !name) continue
      let node = resolveSiteLocation(area.children, name, 'location')
      if (!node) {
        const result = await catalog.createLocation(area.id, {
          name,
          description: text(row.description),
        })
        node = result.data
        hierarchy = upsertSiteLocationNode(hierarchy, node)
      }
      if (node) migratedIndexes.add(index)
    }

    const remaining = rows.filter((_, index) => !migratedIndexes.has(index))
    saveCustomLocationTypes(userId, remaining)
    const hasUnmappedSiteRows = remaining.some(
      (row) =>
        !row.hidden &&
        (row.kind === 'zone' ||
          row.kind === 'sub' ||
          (row.kind === 'main' && text(row.parentValue))),
    )
    if (!hasUnmappedSiteRows) markComplete(userId)
    return { migrated: migratedIndexes.size, remaining }
  })().finally(() => inFlightByUser.delete(userId))

  inFlightByUser.set(userId, migration)
  return migration
}

const useLegacySiteLocationMigration = ({
  enabled,
  userId,
  rows,
  rowsLoaded = true,
  catalog,
  onMigrated,
}) => {
  const attemptedForUser = useRef('')

  useEffect(() => {
    if (
      !enabled ||
      !userId ||
      !rowsLoaded ||
      !catalog.loaded ||
      attemptedForUser.current === userId
    )
      return
    attemptedForUser.current = userId
    migrateLegacySiteLocations({ userId, rows, catalog })
      .then(({ remaining }) => onMigrated?.(remaining))
      .catch(() => {
        attemptedForUser.current = ''
      })
  }, [catalog, enabled, onMigrated, rows, rowsLoaded, userId])
}

export default useLegacySiteLocationMigration
