// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import ResponsiveFinancialBreakdown from '../ResponsiveFinancialBreakdown'
import WorkflowDetailHeader from '../WorkflowDetailHeader'

describe('responsive workflow primitives', () => {
  it('renders structured mobile financial sections without losing the desktop view', () => {
    render(
      <ResponsiveFinancialBreakdown
        ariaLabel="Salary calculation"
        sections={[
          {
            title: 'Payable Summary',
            items: [
              { label: 'Final Payable', value: 'RM 1,250.00', emphasis: true },
              { label: 'Approved Overtime', value: 'RM 250.00' },
            ],
          },
        ]}
        desktop={<table aria-label="Desktop salary calculation" />}
      />,
    )

    expect(screen.getByLabelText('Salary calculation')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Payable Summary' })).toBeTruthy()
    expect(screen.getByText('Final Payable')).toBeTruthy()
    expect(screen.getByText('Final Payable').classList).toContain(
      'responsive-financial-breakdown__label',
    )
    const value = screen.getByText('RM 1,250.00')
    expect(value.classList).toContain('responsive-financial-breakdown__value')
    expect(value.classList).not.toContain('text-break')
    expect(screen.getByLabelText('Desktop salary calculation')).toBeTruthy()
  })

  it('provides a semantic page heading and operable back action', () => {
    const onBack = vi.fn()
    render(
      <MemoryRouter>
        <WorkflowDetailHeader
          title="Overtime Claim"
          subtitle="Overtime ID: OT-100"
          status="Pending Review"
          onBack={onBack}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Overtime Claim' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('supports a route-backed back action without requiring an imperative handler', () => {
    const LocationPath = () => <span data-testid="location-path">{useLocation().pathname}</span>

    render(
      <MemoryRouter initialEntries={['/payroll/claim/SAL-1']}>
        <WorkflowDetailHeader title="Salary Claim" backTo="/payroll" backLabel="Back to claims" />
        <LocationPath />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to claims' }))
    expect(screen.getByTestId('location-path').textContent).toBe('/payroll')
  })
})
