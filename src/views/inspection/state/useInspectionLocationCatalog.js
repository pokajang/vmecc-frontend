import { useEffect, useState } from 'react'
import { saveCustomLocationTypes } from '../domain/storage/customLocationTypesStorage'
import {
  createInspectionLocationOption,
  fetchInspectionLocationOptions,
  hasFireExtinguisherZoneHierarchy,
  isInspectionLocationMigrationComplete,
  loadCachedInspectionLocationCatalog,
  markInspectionLocationMigrationComplete,
  saveCachedInspectionLocationCatalog,
} from '../domain/api/inspectionLocationApi'
import {
  FIRE_PARENT_SEPARATOR,
  findChildLocationInRows,
  findLocationInRows,
  getOptionId,
  LOCATION_DRAFT_SUB,
  replaceMainLocationRow,
  replaceSubLocationRow,
} from './locationTypeManagerHelpers'

const deferEffectState = (callback) => {
  let active = true
  queueMicrotask(() => {
    if (active) callback()
  })
  return () => {
    active = false
  }
}

const useInspectionLocationCatalog = ({
  userId,
  inspectionType,
  isFireExtinguisherLocationFlow,
  customLocationTypes,
  setCustomLocationTypes,
}) => {
  const [backendMainLocations, setBackendMainLocations] = useState([])
  const [catalogSource, setCatalogSource] = useState('fallback')

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const cached = loadCachedInspectionLocationCatalog(inspectionType)
    const cancelCachedState = deferEffectState(() => {
      if (cached.length > 0) {
        setBackendMainLocations(cached)
        setCatalogSource('cache')
      } else {
        setBackendMainLocations([])
        setCatalogSource('fallback')
      }
    })

    fetchInspectionLocationOptions(inspectionType, { signal: controller.signal })
      .then(({ data }) => {
        if (!active) return
        if (isFireExtinguisherLocationFlow && !hasFireExtinguisherZoneHierarchy(data)) {
          setBackendMainLocations([])
          setCatalogSource('fallback')
          return
        }
        setBackendMainLocations(data)
        setCatalogSource('api')
        saveCachedInspectionLocationCatalog(inspectionType, data)
      })
      .catch((error) => {
        if (!active) return
        if (error?.name === 'AbortError') return
        setCatalogSource(cached.length > 0 ? 'cache' : 'fallback')
      })

    return () => {
      active = false
      cancelCachedState()
      controller.abort()
    }
  }, [inspectionType, isFireExtinguisherLocationFlow])

  useEffect(() => {
    if (
      catalogSource !== 'api' ||
      !userId ||
      customLocationTypes.length === 0 ||
      isInspectionLocationMigrationComplete(userId)
    ) {
      return
    }

    let active = true
    const migrate = async () => {
      let nextRows = backendMainLocations
      try {
        const mainRows = customLocationTypes.filter((row) => {
          if (row.hidden || row.kind === LOCATION_DRAFT_SUB) return false
          return !isFireExtinguisherLocationFlow || !String(row.parentValue || '').trim()
        })
        const childRows = customLocationTypes
          .filter((row) => {
            if (row.hidden) return false
            if (row.kind === LOCATION_DRAFT_SUB) return true
            return isFireExtinguisherLocationFlow && String(row.parentValue || '').trim()
          })
          .sort((left, right) =>
            left.kind === LOCATION_DRAFT_SUB && right.kind !== LOCATION_DRAFT_SUB
              ? 1
              : left.kind !== LOCATION_DRAFT_SUB && right.kind === LOCATION_DRAFT_SUB
                ? -1
                : 0,
          )

        for (const row of mainRows) {
          const value = String(row.value || row.title || '').trim()
          if (!value || findLocationInRows(nextRows, value)) continue
          const created = await createInspectionLocationOption({
            inspectionType,
            name: value,
            description: row.description || '',
            iconKey: row.iconKey || '',
          })
          if (created) nextRows = replaceMainLocationRow(nextRows, created)
        }

        for (const row of childRows) {
          const parentValue = String(row.parentValue || '').trim()
          const value = String(row.value || row.title || '').trim()
          const parent =
            isFireExtinguisherLocationFlow && row.kind === LOCATION_DRAFT_SUB
              ? findChildLocationInRows(
                  nextRows,
                  parentValue.split(FIRE_PARENT_SEPARATOR)[0],
                  parentValue.split(FIRE_PARENT_SEPARATOR).slice(1).join(FIRE_PARENT_SEPARATOR),
                )
              : findLocationInRows(nextRows, parentValue)
          if (!parent || !value) continue
          if (findLocationInRows(parent.subLocations || parent.children || [], value)) continue
          const created = await createInspectionLocationOption({
            inspectionType,
            parentId: getOptionId(parent),
            name: value,
            description: row.description || '',
          })
          if (created) nextRows = replaceSubLocationRow(nextRows, parent.value, created)
        }

        if (!active) return
        setBackendMainLocations(nextRows)
        saveCachedInspectionLocationCatalog(inspectionType, nextRows)
        markInspectionLocationMigrationComplete(userId)
        setCustomLocationTypes([])
        saveCustomLocationTypes(userId, [])
      } catch {
        // Keep local custom rows available through fallback/cache until the next successful migration.
      }
    }

    migrate()

    return () => {
      active = false
    }
  }, [
    backendMainLocations,
    catalogSource,
    customLocationTypes,
    inspectionType,
    isFireExtinguisherLocationFlow,
    setCustomLocationTypes,
    userId,
  ])

  return {
    backendMainLocations,
    setBackendMainLocations,
    catalogSource,
  }
}

export default useInspectionLocationCatalog
