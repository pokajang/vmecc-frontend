// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ClaimTypeSelection from '../ClaimTypeSelection'
import { buildClaimPeriodOptions } from '../claimPeriodOptions'

afterEach(() => {
  cleanup()
})

describe('ClaimTypeSelection', () => {
  it('shows Continue but disables it until claim month is selected', () => {
    render(
      <ClaimTypeSelection
        selectedType=""
        onSelect={() => {}}
        onContinue={() => {}}
        onBack={() => {}}
        periodValue=""
        onPeriodChange={() => {}}
      />,
    )

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(continueButton.disabled).toBe(true)
  })

  it('does not allow changing claim type when type is locked', () => {
    const onSelect = vi.fn()
    render(
      <ClaimTypeSelection
        selectedType="salary"
        onSelect={onSelect}
        onContinue={() => {}}
        onBack={() => {}}
        periodValue=""
        onPeriodChange={() => {}}
        typeLocked
      />,
    )

    const expenseCard = screen.getByText('Expense Claim').closest('[role="button"]')
    fireEvent.click(expenseCard)
    fireEvent.keyDown(expenseCard, { key: 'Enter' })

    expect(expenseCard.getAttribute('aria-disabled')).toBe('true')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('allows selecting claim period when a type is chosen', () => {
    const onPeriodChange = vi.fn()
    render(
      <ClaimTypeSelection
        selectedType="salary"
        onSelect={() => {}}
        onContinue={() => {}}
        onBack={() => {}}
        periodValue=""
        onPeriodChange={onPeriodChange}
      />,
    )

    const periodDescriptions = screen.getAllByText('Claim period')
    const firstPeriodCard = periodDescriptions[0].closest('[role="button"]')
    fireEvent.click(firstPeriodCard)

    expect(onPeriodChange).toHaveBeenCalledTimes(1)
  })

  it('disables blocked salary month card and shows lock reason', () => {
    const blockedPeriod = buildClaimPeriodOptions(2)[0]?.value || ''
    const blockedReason = 'Already claimed (CLM-2026-008 • Approved)'
    render(
      <ClaimTypeSelection
        selectedType="salary"
        onSelect={() => {}}
        onContinue={() => {}}
        onBack={() => {}}
        periodValue=""
        onPeriodChange={() => {}}
        salaryPeriodLocks={{
          [blockedPeriod]: blockedReason,
        }}
      />,
    )

    const blockedCard = screen.getByTestId(`claim-period-${blockedPeriod}`)
    expect(blockedCard.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText(blockedReason)).toBeTruthy()
  })

  it('disables Continue when selected salary period is blocked', () => {
    const blockedPeriod = buildClaimPeriodOptions(2)[0]?.value || ''
    const blockedReason = 'Already claimed (CLM-2026-008 • Approved)'
    render(
      <ClaimTypeSelection
        selectedType="salary"
        onSelect={() => {}}
        onContinue={() => {}}
        onBack={() => {}}
        periodValue={blockedPeriod}
        onPeriodChange={() => {}}
        salaryPeriodLocks={{
          [blockedPeriod]: blockedReason,
        }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Continue' }).disabled).toBe(true)
  })
})
