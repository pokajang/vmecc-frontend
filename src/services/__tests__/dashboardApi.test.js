import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchDashboardActionQueue,
  fetchDashboardModuleStats,
  fetchDashboardModulesStats,
} from '../api/dashboardApi'

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

    expect(apiRequest).toHaveBeenCalledWith('/stats/payroll?period=last_month', expect.any(Object))
  })

  it('fetches multiple dashboard module stats in one request', async () => {
    await fetchDashboardModulesStats(['payroll', 'leave'], '3m')

    expect(apiRequest).toHaveBeenCalledWith(
      '/stats?period=3m&modules=payroll%2Cleave',
      expect.any(Object),
    )
  })

  it('fetches the personalized action queue independently from dashboard stats', async () => {
    await fetchDashboardActionQueue()

    expect(apiRequest).toHaveBeenCalledWith('/dashboard/action-queue', expect.any(Object))
  })
})
