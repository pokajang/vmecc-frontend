const DEFAULT_VIEW_STATE = Object.freeze({
  search: '',
  period: 'all',
  periodFrom: '',
  periodTo: '',
  sort: 'zone-location',
  duplicateScope: 'all',
  zoneFilter: 'all',
  locationFilter: 'all',
  inspectedByFilter: 'all',
  statusFilter: 'all',
  issueFilter: 'all',
  certificationFilter: 'all',
  lifecycleFilter: 'active',
  rowsToShow: 10,
  currentPage: 1,
})

const QUERY_KEYS = Object.freeze({
  search: 'q',
  period: 'period',
  periodFrom: 'from',
  periodTo: 'to',
  sort: 'sort',
  duplicateScope: 'duplicates',
  zoneFilter: 'zone',
  locationFilter: 'location',
  inspectedByFilter: 'inspector',
  statusFilter: 'status',
  issueFilter: 'issues',
  certificationFilter: 'certification',
  lifecycleFilter: 'lifecycle',
  rowsToShow: 'perPage',
  currentPage: 'page',
})

const positiveInteger = (value, fallback) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const parseFireExtinguisherCatalogViewState = (search = '') => {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const state = { ...DEFAULT_VIEW_STATE }

  Object.entries(QUERY_KEYS).forEach(([stateKey, queryKey]) => {
    if (!params.has(queryKey)) return
    const value = params.get(queryKey) || ''
    state[stateKey] = ['rowsToShow', 'currentPage'].includes(stateKey)
      ? positiveInteger(value, DEFAULT_VIEW_STATE[stateKey])
      : value
  })

  return state
}

export const serializeFireExtinguisherCatalogViewState = (viewState = {}) => {
  const params = new URLSearchParams()
  const state = { ...DEFAULT_VIEW_STATE, ...(viewState || {}) }

  Object.entries(QUERY_KEYS).forEach(([stateKey, queryKey]) => {
    const value = state[stateKey]
    const defaultValue = DEFAULT_VIEW_STATE[stateKey]
    if (value === '' || value === defaultValue || value == null) return
    params.set(queryKey, String(value))
  })

  const query = params.toString()
  return query ? `?${query}` : ''
}

export const buildFireExtinguisherCatalogLocation = (viewState = {}) =>
  `/inspection/all-extinguishers${serializeFireExtinguisherCatalogViewState(viewState)}`

export const isSafeFireExtinguisherReturnLocation = (value) => {
  const location = String(value || '')
  return (
    location === '/inspection/all-extinguishers' ||
    location.startsWith('/inspection/all-extinguishers?')
  )
}

export { DEFAULT_VIEW_STATE as FIRE_EXTINGUISHER_CATALOG_DEFAULT_VIEW_STATE }
