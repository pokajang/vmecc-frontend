// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useDashboardStats from '../useDashboardStats'

const { fetchDashboardModuleStats } = vi.hoisted(() => ({
  fetchDashboardModuleStats: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  fetchDashboardModulesStats: (...args) => fetchDashboardModuleStats(...args),
}))

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
  })

  it('fetches visible dashboard modules for the selected period', async () => {
    fetchDashboardModuleStats.mockResolvedValue({
      payroll: { marker: 'payroll-stats' },
      leave: { marker: 'leave-stats' },
    })

    const { result } = renderHook(() =>
      useDashboardStats({ period: '3m', modules: ['payroll', 'leave'] }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchDashboardModuleStats).toHaveBeenCalledTimes(1)
    expect(fetchDashboardModuleStats).toHaveBeenCalledWith(
      ['payroll', 'leave'],
      '3m',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
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

    expect(fetchDashboardModuleStats).toHaveBeenNthCalledWith(
      1,
      ['reports'],
      'this_month',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(fetchDashboardModuleStats).toHaveBeenNthCalledWith(
      2,
      ['reports'],
      'last_month',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('does not refetch when the module list identity changes but the content is the same', async () => {
    fetchDashboardModuleStats.mockResolvedValue({})

    const { rerender, result } = renderHook(
      ({ modules }) => useDashboardStats({ period: 'this_month', modules }),
      { initialProps: { modules: ['payroll', 'leave'] } },
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    rerender({ modules: ['payroll', 'leave'] })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchDashboardModuleStats).toHaveBeenCalledTimes(1)
  })

  it('returns empty stats and errors when the batch request fails', async () => {
    fetchDashboardModuleStats.mockRejectedValue(new Error('Request failed'))

    const { result } = renderHook(() =>
      useDashboardStats({ period: 'this_month', modules: ['payroll', 'overtime'] }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats.payroll).toEqual({})
    expect(result.current.stats.overtime).toEqual({})
    expect(result.current.error?.message).toContain('overtime')
    expect(result.current.moduleStats?.payroll?.loading).toBe(false)
    expect(result.current.moduleStats?.payroll?.error).toContain('Request failed')
    expect(result.current.moduleStats?.overtime?.error).toContain('Request failed')
  })

  it('marks selected modules as timed out when the batch request times out', async () => {
    fetchDashboardModuleStats.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() =>
      useDashboardStats({ period: 'this_month', modules: ['payroll', 'reports'] }),
    )

    await new Promise((resolve) => {
      setTimeout(resolve, 10_250)
    })
    expect(result.current.moduleStats?.payroll?.loading).toBe(false)
    expect(result.current.moduleStats?.reports?.loading).toBe(false)

    expect(result.current.stats.payroll).toEqual({})
    expect(result.current.moduleStats?.payroll?.error).toContain('timed out')
    expect(result.current.moduleStats?.reports?.error).toContain('timed out')
    expect(result.current.loading).toBe(false)
  }, 20_000)
})
