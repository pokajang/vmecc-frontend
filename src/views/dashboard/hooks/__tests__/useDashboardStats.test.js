// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useDashboardStats from '../useDashboardStats'

const { fetchDashboardModuleStats } = vi.hoisted(() => ({
  fetchDashboardModuleStats: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  fetchDashboardModuleStats: (...args) => fetchDashboardModuleStats(...args),
}))

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches visible dashboard modules for the selected period', async () => {
    fetchDashboardModuleStats.mockImplementation((module) =>
      Promise.resolve({ marker: `${module}-stats` }),
    )

    const { result } = renderHook(() =>
      useDashboardStats({ period: '3m', modules: ['payroll', 'leave'] }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchDashboardModuleStats).toHaveBeenCalledTimes(2)
    expect(fetchDashboardModuleStats).toHaveBeenNthCalledWith(1, 'payroll', '3m')
    expect(fetchDashboardModuleStats).toHaveBeenNthCalledWith(2, 'leave', '3m')
    expect(result.current.stats.payroll).toEqual({ marker: 'payroll-stats' })
    expect(result.current.stats.leave).toEqual({ marker: 'leave-stats' })
    expect(result.current.stats.overtime).toEqual({})
    expect(result.current.error).toBeNull()
  })

  it('refetches when the selected period changes', async () => {
    fetchDashboardModuleStats.mockResolvedValue({})

    const { rerender, result } = renderHook(
      ({ period }) => useDashboardStats({ period, modules: ['reports'] }),
      { initialProps: { period: 'this_month' } },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    rerender({ period: 'last_month' })
    await waitFor(() => expect(fetchDashboardModuleStats).toHaveBeenCalledTimes(2))

    expect(fetchDashboardModuleStats).toHaveBeenNthCalledWith(1, 'reports', 'this_month')
    expect(fetchDashboardModuleStats).toHaveBeenNthCalledWith(2, 'reports', 'last_month')
  })

  it('returns empty stats and a non-blocking error when a module fails', async () => {
    fetchDashboardModuleStats.mockImplementation((module) => {
      if (module === 'overtime') {
        return Promise.reject(new Error('Request failed'))
      }
      return Promise.resolve({ pendingApprovals: 2 })
    })

    const { result } = renderHook(() =>
      useDashboardStats({ period: 'this_month', modules: ['payroll', 'overtime'] }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats.payroll).toEqual({ pendingApprovals: 2 })
    expect(result.current.stats.overtime).toEqual({})
    expect(result.current.error?.message).toContain('overtime')
  })
})
