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
  findLocationInRows,
  LOCATION_DRAFT_MAIN,
  replaceMainLocationRow,
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
  enabled = true,
  userId,
  inspectionType,
  isFireExtinguisherLocationFlow,
  customLocationTypes,
  setCustomLocationTypes,
}) => {
  const [backendMainLocations, setBackendMainLocations] = useState([])
  const [catalogSource, setCatalogSource] = useState('fallback')

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

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
  }, [enabled, inspectionType, isFireExtinguisherLocationFlow])

  useEffect(() => {
    if (
      !enabled ||
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
        const mainRows = customLocationTypes.filter(
          (row) =>
            !row.hidden &&
            row.kind === LOCATION_DRAFT_MAIN &&
            !String(row.parentValue || '').trim(),
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

        if (!active) return
        const remainingRows = customLocationTypes.filter((row) => !mainRows.includes(row))
        setBackendMainLocations(nextRows)
        saveCachedInspectionLocationCatalog(inspectionType, nextRows)
        markInspectionLocationMigrationComplete(userId)
        setCustomLocationTypes(remainingRows)
        saveCustomLocationTypes(userId, remainingRows)
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
    enabled,
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
