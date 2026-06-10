import { apiRequest } from './httpClient'

export const importOtPayrollMigrationApi = (payload) =>
  apiRequest('/migration/ot-payroll/import', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
