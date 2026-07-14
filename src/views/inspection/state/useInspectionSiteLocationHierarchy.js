import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { getSiteLocationChildren } from '../domain/locations/siteLocationHierarchy'
import {
  archiveSiteLocation,
  createSiteLocation,
  getSiteLocationCatalogSnapshot,
  refreshSiteLocationCatalog,
  subscribeToSiteLocationCatalog,
  updateSiteLocation,
} from './siteLocationCatalogStore'

const serverSnapshot = {
  hierarchy: [],
  isLoading: true,
  isRefreshing: false,
  isStale: false,
  error: '',
  loaded: false,
}
const getServerSnapshot = () => serverSnapshot

const useInspectionSiteLocationHierarchy = ({ enabled = true } = {}) => {
  const snapshot = useSyncExternalStore(
    subscribeToSiteLocationCatalog,
    getSiteLocationCatalogSnapshot,
    getServerSnapshot,
  )

  useEffect(() => {
    if (enabled && !snapshot.loaded && !snapshot.isLoading) {
      refreshSiteLocationCatalog().catch(() => {})
    }
  }, [enabled, snapshot.isLoading, snapshot.loaded])

  const getAreas = useCallback(
    (zone) => getSiteLocationChildren(snapshot.hierarchy, zone, 'area'),
    [snapshot.hierarchy],
  )
  const getLocations = useCallback(
    (area) => getSiteLocationChildren(snapshot.hierarchy, area, 'location'),
    [snapshot.hierarchy],
  )

  return {
    ...snapshot,
    zones: snapshot.hierarchy,
    getAreas,
    getLocations,
    refresh: () => refreshSiteLocationCatalog({ force: true }),
    createZone: (payload) => createSiteLocation({ ...payload, level: 'zone', parentId: null }),
    createArea: (zoneId, payload) =>
      createSiteLocation({ ...payload, level: 'area', parentId: zoneId }),
    createLocation: (areaId, payload) =>
      createSiteLocation({ ...payload, level: 'location', parentId: areaId }),
    updateNode: updateSiteLocation,
    archiveNode: archiveSiteLocation,
  }
}

export default useInspectionSiteLocationHierarchy
