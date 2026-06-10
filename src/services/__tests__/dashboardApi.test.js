import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDashboardModuleStats } from '../api/dashboardApi'

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
}))

vi.mock('../api/httpClient', () => ({
  apiRequest: (...args) => apiRequest(...args),
}))

describe('dashboardApi', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    apiRequest.mockResolvedValue({})
  })

  it('fetches module dashboard stats with the selected period', async () => {
    await fetchDashboardModuleStats('payroll', 'last_month')

    expect(apiRequest).toHaveBeenCalledWith('/stats/payroll?period=last_month')
  })
})
