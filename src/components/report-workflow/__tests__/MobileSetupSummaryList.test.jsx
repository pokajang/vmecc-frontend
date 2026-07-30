// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MobileSetupSummaryList from '../MobileSetupSummaryList'

afterEach(cleanup)

describe('MobileSetupSummaryList', () => {
  it('renders visible setup values as one bordered list with accessible edit actions', () => {
    const onEditType = vi.fn()
    render(
      <MobileSetupSummaryList
        ariaLabel="Report setup summary"
        items={[
          {
            key: 'type',
            label: 'Type',
            value: 'Fire Drill',
            editLabel: 'Edit Type',
            onEdit: onEditType,
          },
          {
            key: 'datetime',
            label: 'Date & Time',
            value: '2026-07-29',
            secondaryValue: '18:12',
          },
          { key: 'empty', label: 'Location', value: '' },
        ]}
      />,
    )

    const list = screen.getByLabelText('Report setup summary')
    expect(list.classList.contains('mobile-setup-summary-list')).toBe(true)
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(within(list).getByText('18:12')).toBeTruthy()
    expect(within(list).queryByText('Location')).toBeNull()

    fireEvent.click(within(list).getByRole('button', { name: 'Edit Type' }))
    expect(onEditType).toHaveBeenCalledTimes(1)
  })

  it('keeps optional extra actions separate from the row edit button', () => {
    const onEdit = vi.fn()
    const onExtra = vi.fn()
    render(
      <MobileSetupSummaryList
        items={[
          {
            label: 'Inspection mode',
            value: 'By area',
            onEdit,
            extraAction: (
              <button type="button" onClick={onExtra}>
                Scan
              </button>
            ),
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Scan' }))
    expect(onExtra).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
  })
})
