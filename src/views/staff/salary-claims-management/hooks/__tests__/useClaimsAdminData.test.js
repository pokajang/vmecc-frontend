// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import useClaimsAdminData from '../useClaimsAdminData'

describe('useClaimsAdminData dashboard filters', () => {
  const claims = [
    {
      id: 'SAL-1',
      type: 'salary',
      status: 'Pending',
      submittedAt: '2026-07-01T00:00:00Z',
    },
    {
      id: 'EXP-1',
      type: 'expense',
      status: 'Pending',
      submittedAt: '2026-07-02T00:00:00Z',
    },
    {
      id: 'EXP-2',
      type: 'expense',
      status: 'Approved',
      submittedAt: '2026-07-03T00:00:00Z',
    },
  ]

  it('can show the unified pending queue including salary claims', () => {
    const { result } = renderHook(() =>
      useClaimsAdminData({
        claimRows: claims,
        includeSalaryClaims: true,
        initialStatusFilter: 'Pending',
      }),
    )

    expect(result.current.filteredClaimRows.map((row) => row.id)).toEqual(['EXP-1', 'SAL-1'])
  })

  it('applies a dashboard claim type filter on the claim records route', () => {
    const { result } = renderHook(() =>
      useClaimsAdminData({
        claimRows: claims,
        initialClaimTypeFilter: 'expense',
        initialStatusFilter: 'Pending',
      }),
    )

    expect(result.current.filteredClaimRows.map((row) => row.id)).toEqual(['EXP-1'])
  })
})
