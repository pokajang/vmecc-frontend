// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import SalaryClaimsTabsNav from '../SalaryClaimsTabsNav'

describe('SalaryClaimsTabsNav', () => {
  it('renders warning badge for salary contract drift count and switches tabs', () => {
    const onSwitch = vi.fn()
    render(
      <SalaryClaimsTabsNav
        activeTab="salaryRecords"
        onSwitch={onSwitch}
        group="records"
        tabMeta={{
          salaryRecords: { warningCount: 3 },
        }}
      />,
    )

    expect(screen.getByText('3')).toBeTruthy()
    fireEvent.click(screen.getByText('Claim Records'))
    expect(onSwitch).toHaveBeenCalledWith('claimRecords')
  })
})
