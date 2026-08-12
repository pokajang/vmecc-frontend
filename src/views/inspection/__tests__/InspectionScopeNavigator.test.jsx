// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionScopeNavigator from '../form/components/InspectionScopeNavigator'

afterEach(cleanup)

const options = [
  { key: 'front', title: 'Front Locker', checkedCount: 2, totalCount: 4, issueCount: 1 },
  { key: 'rear', title: 'Rear Locker', checkedCount: 4, totalCount: 4, issueCount: 0 },
]

describe('InspectionScopeNavigator', () => {
  it('presents consistent scope counts, progress, issues and next guidance', () => {
    const onSelect = vi.fn()
    render(
      <InspectionScopeNavigator
        label="Compartment"
        options={options}
        value=""
        nextIncompleteValue="front"
        onSelect={onSelect}
      />,
    )

    expect(screen.getByText('Choose Compartment')).toBeTruthy()
    expect(screen.getByText('1 issue')).toBeTruthy()
    expect(screen.getByText('Next')).toBeTruthy()
    expect(screen.queryByText('Complete')).toBeNull()
    expect(screen.queryByText(/issue\(s\)|missing/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Front Locker 4 items 2\/4 checked/ }))
    expect(onSelect).toHaveBeenCalledWith('front', expect.objectContaining({ key: 'front' }))
  })

  it('collapses a selected mobile scope while retaining progress and change actions', () => {
    const onEdit = vi.fn()
    const onReset = vi.fn()
    render(
      <InspectionScopeNavigator
        label="Group"
        options={options}
        value="front"
        isCompactViewport
        onEditSelected={onEdit}
        onResetSelected={onReset}
      />,
    )

    expect(screen.getByText('Front Locker')).toBeTruthy()
    expect(screen.getByText('2/4 checked • 1 issue')).toBeTruthy()
    expect(screen.queryByText('Rear Locker')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Change group' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset group' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('renders an explicit empty state', () => {
    render(
      <InspectionScopeNavigator
        label="Group"
        options={[]}
        emptyMessage="No SCBA groups have items for this main location."
      />,
    )
    expect(screen.getByText('No SCBA groups have items for this main location.')).toBeTruthy()
  })

  it('moves focus to the selected scope content after selection', async () => {
    const Fixture = () => {
      const [value, setValue] = useState('')
      return (
        <>
          <InspectionScopeNavigator
            label="Compartment"
            options={options}
            value={value}
            onSelect={setValue}
            getFocusTarget={() => document.querySelector('[data-scope-content]')}
          />
          {value ? (
            <h2 data-scope-content tabIndex={-1}>
              Active checklist
            </h2>
          ) : null}
        </>
      )
    }

    render(<Fixture />)
    fireEvent.click(screen.getByRole('button', { name: /Front Locker 4 items/ }))

    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('Active checklist')))
  })

  it('prevents selection in read-only mode', () => {
    const onSelect = vi.fn()
    render(
      <InspectionScopeNavigator label="Group" options={options} onSelect={onSelect} readOnly />,
    )

    const option = screen.getByRole('button', { name: /Front Locker 4 items/ })
    expect(option.disabled).toBe(true)
    fireEvent.click(option)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
