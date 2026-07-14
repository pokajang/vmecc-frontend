import { apiRequest } from 'src/services/apiClient'
import {
  normalizeSiteLocationHierarchy,
  normalizeSiteLocationNode,
} from '../locations/siteLocationHierarchy'

const endpoint = (id = '') =>
  `/inspection/site-locations${id === '' ? '' : `/${encodeURIComponent(String(id))}`}`

export const getSiteLocationDuplicate = (error) => {
  if (error?.status !== 409 || error?.payload?.code !== 'SITE_LOCATION_ALREADY_EXISTS') return null
  const existing = error.payload?.data?.existing
  const depth = ['zone', 'area', 'location'].indexOf(existing?.level)
  return existing ? normalizeSiteLocationNode(existing, Math.max(depth, 0)) : null
}

export const fetchSiteLocationHierarchy = async (options = {}) => {
  const response = await apiRequest(endpoint(), options)
  return { data: normalizeSiteLocationHierarchy(response?.data), meta: response?.meta || {} }
}

export const createSiteLocationNode = async (payload) => {
  try {
    const response = await apiRequest(endpoint(), {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const depth = ['zone', 'area', 'location'].indexOf(response?.data?.level)
    return { data: normalizeSiteLocationNode(response?.data, Math.max(depth, 0)), created: true }
  } catch (error) {
    const existing = getSiteLocationDuplicate({
      status: Number(error?.status ?? error?.response?.status),
      payload: error?.payload ?? error?.data ?? error?.response?.data,
    })
    if (existing) return { data: existing, created: false }
    throw error
  }
}

export const updateSiteLocationNode = async (id, payload) => {
  try {
    const response = await apiRequest(endpoint(id), {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    const depth = ['zone', 'area', 'location'].indexOf(response?.data?.level)
    return { data: normalizeSiteLocationNode(response?.data, Math.max(depth, 0)), updated: true }
  } catch (error) {
    const existing = getSiteLocationDuplicate({
      status: Number(error?.status ?? error?.response?.status),
      payload: error?.payload ?? error?.data ?? error?.response?.data,
    })
    if (existing) return { data: existing, updated: false }
    throw error
  }
}

export const archiveSiteLocationNode = async (id) => {
  await apiRequest(endpoint(id), { method: 'DELETE' })
  return true
}
