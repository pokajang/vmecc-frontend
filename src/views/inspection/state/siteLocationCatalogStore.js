import {
  archiveSiteLocationNode,
  createSiteLocationNode,
  fetchSiteLocationHierarchy,
  updateSiteLocationNode,
} from '../domain/api/inspectionSiteLocationApi'
import {
  normalizeSiteLocationHierarchy,
  removeSiteLocationNode,
  resolveSiteLocation,
  upsertSiteLocationNode,
} from '../domain/locations/siteLocationHierarchy'

const CACHE_KEY = 'inspection_site_location_catalog_cache_v1'
const listeners = new Set()
let request = null
let controller = null
let initialized = false
let mutationSequence = 0
let pendingMutations = []
let state = {
  hierarchy: [],
  isLoading: false,
  isRefreshing: false,
  isStale: false,
  error: '',
  loaded: false,
}

const readCache = () => {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(CACHE_KEY) || 'null')
    return normalizeSiteLocationHierarchy(parsed?.data || [])
  } catch {
    return []
  }
}

const writeCache = (hierarchy) => {
  try {
    window.localStorage?.setItem(
      CACHE_KEY,
      JSON.stringify({ data: hierarchy, cachedAt: new Date().toISOString() }),
    )
  } catch {
    // Cache failures must not block catalogue use.
  }
}

const initialize = () => {
  if (initialized) return
  initialized = true
  const hierarchy = readCache()
  state = { ...state, hierarchy, isStale: hierarchy.length > 0 }
}

const publish = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export const getSiteLocationCatalogSnapshot = () => {
  initialize()
  return state
}

export const subscribeToSiteLocationCatalog = (listener) => {
  initialize()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    queueMicrotask(() => {
      if (listeners.size === 0 && controller) controller.abort()
    })
  }
}

export const refreshSiteLocationCatalog = ({ force = false } = {}) => {
  initialize()
  if (request && !force) return request
  if (force && controller) controller.abort()
  const activeController = new AbortController()
  const mutationSequenceAtStart = mutationSequence
  controller = activeController
  publish({
    isLoading: state.hierarchy.length === 0,
    isRefreshing: state.hierarchy.length > 0,
    error: '',
  })
  const activeRequest = fetchSiteLocationHierarchy({ signal: activeController.signal })
    .then(({ data }) => {
      if (request !== activeRequest) return state.hierarchy

      const hierarchy = pendingMutations
        .filter((mutation) => mutation.sequence > mutationSequenceAtStart)
        .reduce(
          (current, mutation) =>
            mutation.type === 'remove'
              ? removeSiteLocationNode(current, mutation.id)
              : upsertSiteLocationNode(current, mutation.node),
          data,
        )

      pendingMutations = []
      writeCache(hierarchy)
      publish({ hierarchy, isStale: false, loaded: true, error: '' })
      return hierarchy
    })
    .catch((error) => {
      if (error?.name === 'AbortError') return state.hierarchy
      if (request !== activeRequest) return state.hierarchy
      publish({
        error: error?.message || 'Unable to load site locations.',
        isStale: state.hierarchy.length > 0,
        loaded: true,
      })
      throw error
    })
    .finally(() => {
      if (request === activeRequest) {
        request = null
        controller = null
        publish({ isLoading: false, isRefreshing: false })
      }
    })
  request = activeRequest
  return request
}

const commitNode = (node) => {
  mutationSequence += 1
  pendingMutations.push({ sequence: mutationSequence, type: 'upsert', node })
  const hierarchy = upsertSiteLocationNode(state.hierarchy, node)
  writeCache(hierarchy)
  publish({ hierarchy, isStale: false, error: '' })
  return node
}

export const createSiteLocation = async (payload) => {
  const result = await createSiteLocationNode(payload)
  commitNode(result.data)
  if (!result.created) {
    await refreshSiteLocationCatalog({ force: true })
    result.data =
      resolveSiteLocation(state.hierarchy, result.data.id, result.data.level) || result.data
  }
  return result
}

export const updateSiteLocation = async (id, payload) => {
  const result = await updateSiteLocationNode(id, payload)
  commitNode(result.data)
  if (!result.updated) {
    await refreshSiteLocationCatalog({ force: true })
    result.data =
      resolveSiteLocation(state.hierarchy, result.data.id, result.data.level) || result.data
  }
  return result
}

export const archiveSiteLocation = async (id) => {
  await archiveSiteLocationNode(id)
  mutationSequence += 1
  pendingMutations.push({ sequence: mutationSequence, type: 'remove', id })
  const hierarchy = removeSiteLocationNode(state.hierarchy, id)
  writeCache(hierarchy)
  publish({ hierarchy, isStale: false, error: '' })
  return true
}

export const resetSiteLocationCatalogStoreForTests = () => {
  if (controller) controller.abort()
  request = null
  controller = null
  initialized = false
  mutationSequence = 0
  pendingMutations = []
  state = {
    hierarchy: [],
    isLoading: false,
    isRefreshing: false,
    isStale: false,
    error: '',
    loaded: false,
  }
}
