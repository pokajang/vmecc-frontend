// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PayrollNav from '../PayrollNav'

afterEach(() => {
  cleanup()
})

describe('PayrollNav', () => {
  it('uses navigation semantics with aria-current for active Payroll sections', () => {
    const onNavigate = vi.fn()
    const { container } = render(
      <MemoryRouter>
        <PayrollNav activeSection="claim-detail" onNavigate={onNavigate} />
      </MemoryRouter>,
    )

    expect(container.querySelector('[role="tablist"]')).toBeNull()
    expect(container.querySelector('[role="presentation"]')).toBeNull()
    expect(screen.getByText('Claim Records').getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Payslips').getAttribute('aria-current')).toBeNull()
    expect(screen.getByText('Apply Claim').getAttribute('aria-current')).toBeNull()

    fireEvent.click(screen.getByText('Payslips'))
    fireEvent.click(screen.getByText('Apply Claim'))

    expect(onNavigate).toHaveBeenNthCalledWith(1, '/payroll/payslips')
    expect(onNavigate).toHaveBeenNthCalledWith(2, '/payroll/claims/new')
  })

  it('marks new claim routes as current', () => {
    render(
      <MemoryRouter>
        <PayrollNav activeSection="new-claim-salary" onNavigate={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Apply Claim').getAttribute('aria-current')).toBe('page')
  })
})
