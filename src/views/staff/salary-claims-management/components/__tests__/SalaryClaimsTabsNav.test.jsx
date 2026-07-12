// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SalaryClaimsTabsNav from '../SalaryClaimsTabsNav'

describe('SalaryClaimsTabsNav', () => {
  it('renders warning badge for salary contract drift count and switches tabs', () => {
    const onSwitch = vi.fn()
    const { container } = render(
      <MemoryRouter>
        <SalaryClaimsTabsNav
          activeTab="salaryRecords"
          onSwitch={onSwitch}
          group="records"
          tabMeta={{
            salaryRecords: { warningCount: 3 },
          }}
        />
      </MemoryRouter>,
    )

    expect(container.querySelector('[role="tablist"]')).toBeNull()
    expect(container.querySelector('[role="presentation"]')).toBeNull()
    expect(
      screen.getByText('Salary Records').closest('[aria-current]').getAttribute('aria-current'),
    ).toBe('page')
    expect(screen.getByText('3')).toBeTruthy()
    fireEvent.click(screen.getByText('Claim Records'))
    expect(onSwitch).toHaveBeenCalledWith('claimRecords')
  })

  it('exposes long salary settings through a labeled mobile selector', () => {
    const onSwitch = vi.fn()
    render(
      <MemoryRouter>
        <SalaryClaimsTabsNav activeTab="assignment" onSwitch={onSwitch} group="settings" />
      </MemoryRouter>,
    )

    const selector = screen.getByLabelText('Payroll configuration section')
    expect(selector.value).toBe('assignment')
    fireEvent.change(selector, { target: { value: 'companyLegal' } })
    expect(onSwitch).toHaveBeenCalledWith('companyLegal')
  })
})
