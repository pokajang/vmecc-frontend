import { apiRequest } from './httpClient'

export const fetchDrillEnvironmentOptions = () => apiRequest('/reports/drill/environment-options')

export const replaceDrillEnvironmentOptions = (options) =>
  apiRequest('/reports/drill/environment-options', {
    method: 'PUT',
    body: JSON.stringify({ options: Array.isArray(options) ? options : [] }),
  })
