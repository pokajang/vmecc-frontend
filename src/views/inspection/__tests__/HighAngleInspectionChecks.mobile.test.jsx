// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { HighAngleInspectionChecks } from '../form/components/InspectionFormDisplaySections'

const setMobileViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === '(max-width: 575.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

afterEach(() => {
  cleanup()
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  delete window.matchMedia
})

describe('HighAngleInspectionChecks mobile detail drawer', () => {
  it('preserves selected-compartment search, all-group count, empty and clear behavior', () => {
    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              rows: [
                { id: 'row-a1', rowNumber: '1', equipment: 'Rescue Rope' },
                { id: 'row-a2', rowNumber: '2', equipment: 'Edge Protector' },
              ],
            },
            {
              key: 'locker-b',
              title: 'Locker B',
              rows: [{ id: 'row-b1', rowNumber: '3', equipment: 'Rescue Harness' }],
            },
          ],
        }}
      />,
    )

    expect(screen.queryByRole('textbox', { name: 'Search high angle equipment rows' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Locker A 2 items/ }))

    const search = screen.getByRole('textbox', { name: 'Search high angle equipment rows' })
    expect(search.getAttribute('placeholder')).toBe('Search high angle equipment...')

    fireEvent.change(search, { target: { value: 'Edge' } })
    expect(screen.getByText('Edge Protector')).toBeTruthy()
    expect(screen.queryByText('Rescue Rope')).toBeNull()
    expect(screen.getByText('Showing 1 of 3')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'missing equipment' } })
    expect(screen.getByText('Showing 0 of 3')).toBeTruthy()
    expect(screen.getByText('No high angle equipment rows match this search.')).toBeTruthy()

    const clear = screen.getByRole('button', { name: 'Clear high angle equipment row search' })
    expect(clear.getAttribute('type')).toBe('button')
    fireEvent.click(clear)

    expect(search.value).toBe('')
    expect(screen.queryByText(/^Showing /)).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Clear high angle equipment row search' }),
    ).toBeNull()
    expect(screen.getByText('Rescue Rope')).toBeTruthy()
    expect(screen.getByText('Edge Protector')).toBeTruthy()
  })

  it('clears stale search when switching or continuing to another compartment', () => {
    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              rows: [{ id: 'row-a', equipment: 'Rescue Rope', condition: 'Good' }],
            },
            {
              key: 'locker-b',
              title: 'Locker B',
              rows: [{ id: 'row-b', equipment: 'Rescue Harness', condition: '' }],
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Locker A 1 item/ }))
    const search = screen.getByRole('textbox', { name: 'Search high angle equipment rows' })
    fireEvent.change(search, { target: { value: 'Rope' } })
    expect(search.value).toBe('Rope')

    fireEvent.click(screen.getByRole('button', { name: /Locker B 1 item/ }))
    expect(search.value).toBe('')
    expect(screen.getByText('Rescue Harness')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Locker A 1 item/ }))
    fireEvent.change(search, { target: { value: 'Rope' } })
    const lockerBButtons = screen.getAllByRole('button', { name: /Locker B/ })
    fireEvent.click(lockerBButtons.at(-1))
    expect(search.value).toBe('')
    expect(screen.getByText('Rescue Harness')).toBeTruthy()
  })

  it('renders optional additional info in read-only report rows', () => {
    const row = {
      id: 'high-angle:readonly',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '1',
      equipment: 'Rescue Rope',
      location: 'Locker A',
      subLocation: 'Top shelf',
      quantity: '2',
      condition: 'Good',
      additionalNotes: 'Stored with rope bag.',
      additionalPhotos: [
        {
          id: 'high-angle-additional-photo',
          description: 'Rope bag storage photo.',
          url: 'data:image/png;base64,AAA',
        },
      ],
    }

    render(
      <HighAngleInspectionChecks
        readOnly
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              checkedCount: 1,
              issueCount: 0,
              rows: [row],
            },
          ],
          checkedCount: 1,
          totalCount: 1,
          issueCount: 0,
        }}
      />,
    )

    expect(screen.getByText('Additional Info (optional)')).toBeTruthy()
    expect(screen.getByText('General equipment remarks')).toBeTruthy()
    expect(screen.getByText('Stored with rope bag.')).toBeTruthy()
    expect(screen.getByText('View photos')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Search high angle equipment rows' })).toBeNull()
  })

  it('renders high angle rows as standalone cards with subsection headings separate from metadata', () => {
    const row = {
      id: 'high-angle:1',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '1',
      equipment: 'Rescue Rope',
      location: 'Locker A',
      subLocation: 'Top shelf',
      quantity: '2',
    }

    const { container } = render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        onAddItem={vi.fn()}
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              checkedCount: 0,
              issueCount: 0,
              rows: [row],
            },
          ],
          checkedCount: 0,
          totalCount: 1,
          issueCount: 0,
        }}
      />,
    )

    expect(container.querySelector('.card .card')).toBeNull()
    expect(screen.getByText('Locker A')).toBeTruthy()
    expect(screen.queryByText('Row 1 - Qty 2')).toBeNull()
    fireEvent.click(screen.getByText('Locker A'))
    expect(screen.getByText('Equipment')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add item' })).toBeTruthy()
    expect(screen.queryByText('0 of 1 checked')).toBeNull()
    expect(screen.getByText('Row 1 - Qty 2')).toBeTruthy()
    expect(screen.queryByText('Row 1 - Qty 2 | Locker A')).toBeNull()
  })

  it('keeps subsection context in the mobile drawer summary', () => {
    setMobileViewport()
    const row = {
      id: 'high-angle:1',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '1',
      equipment: 'Rescue Rope',
      location: 'Locker A',
      subLocation: 'Top shelf',
      quantity: '2',
    }

    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              checkedCount: 0,
              issueCount: 0,
              rows: [row],
            },
          ],
          checkedCount: 0,
          totalCount: 1,
          issueCount: 0,
        }}
      />,
    )

    fireEvent.click(screen.getByText('Locker A'))
    fireEvent.click(screen.getByText('Rescue Rope'))

    expect(screen.getByText('Row 1 - Qty 2 | Locker A - Top shelf')).toBeTruthy()
  })

  it('treats Not Good rows as checked when issue remarks are complete and photos are omitted', () => {
    const row = {
      id: 'high-angle:issue',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '2',
      equipment: 'Rescue Pulley',
      location: 'Locker A',
      quantity: '1',
      condition: 'Not Good',
      conditionRemarks: 'Bearing is rough.',
    }

    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              checkedCount: 0,
              issueCount: 1,
              rows: [row],
            },
          ],
          checkedCount: 0,
          totalCount: 1,
          issueCount: 1,
        }}
      />,
    )

    fireEvent.click(screen.getByText('Locker A'))

    expect(screen.getByText('Checked')).toBeTruthy()
    expect(screen.queryByText('Needs evidence')).toBeNull()
  })

  it('does not show all-good helpers when condition is the only inspection criterion', () => {
    const onMarkRowOk = vi.fn()
    const onMarkAllOk = vi.fn()
    const row = {
      id: 'high-angle:quick-mark',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '3',
      equipment: 'Edge Protector',
      location: 'Locker A',
      quantity: '1',
    }

    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        onMarkRowOk={onMarkRowOk}
        onMarkAllOk={onMarkAllOk}
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              checkedCount: 0,
              issueCount: 0,
              rows: [row],
            },
          ],
          checkedCount: 0,
          totalCount: 1,
          issueCount: 0,
        }}
      />,
    )

    fireEvent.click(screen.getByText('Locker A'))

    expect(screen.queryByRole('button', { name: 'Mark all Good' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'All Good' })).toBeNull()
    expect(onMarkAllOk).not.toHaveBeenCalled()
    expect(onMarkRowOk).not.toHaveBeenCalled()
  })

  it('offers the next compartment after the selected compartment is complete', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              rows: [{ id: 'row-a', equipment: 'Rope', condition: 'Good' }],
            },
            {
              key: 'locker-b',
              title: 'Locker B',
              rows: [{ id: 'row-b', equipment: 'Harness', condition: '' }],
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByText('Locker A'))
    expect(screen.getByText('Next compartment')).toBeTruthy()
    const lockerBButtons = screen.getAllByRole('button', { name: /Locker B/ })
    fireEvent.click(lockerBButtons.at(-1))
    expect(
      screen.getByRole('button', { name: /Locker B 1 item/ }).getAttribute('aria-pressed'),
    ).toBe('true')
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    delete HTMLElement.prototype.scrollIntoView
  })

  it('wraps to an earlier incomplete compartment and skips completed compartments', () => {
    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              rows: [{ id: 'row-a', equipment: 'Rope', condition: '' }],
            },
            {
              key: 'locker-b',
              title: 'Locker B',
              rows: [{ id: 'row-b', equipment: 'Harness', condition: 'Good' }],
            },
            {
              key: 'locker-c',
              title: 'Locker C',
              rows: [{ id: 'row-c', equipment: 'Helmet', condition: 'Good' }],
            },
          ],
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Locker C 1 item/ }))

    expect(screen.getByText('Next compartment')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Locker A/ }).at(-1)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Locker B/ })).toHaveLength(1)
  })

  it('adds a compartment from the compartment selector', () => {
    setMobileViewport()
    const onAddCompartment = vi.fn()

    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [],
          checkedCount: 0,
          totalCount: 0,
          issueCount: 0,
        }}
        onAddCompartment={onAddCompartment}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add compartment' }))
    const drawer = document.querySelector('.offcanvas')
    expect(drawer).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(within(drawer).getByText('Add Compartment')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('e.g. Heavy Duty Organizer Bag'), {
      target: { value: 'Rope Bag' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g. Main Compartment'), {
      target: { value: 'Right Pocket' },
    })
    fireEvent.click(within(drawer).getByText('Save'))

    expect(onAddCompartment).toHaveBeenCalledWith({
      mainLocation: 'High Angle Rescue Kit',
      location: 'Rope Bag',
      subLocation: 'Right Pocket',
    })
  })

  it('adds an item scoped to the selected compartment', () => {
    setMobileViewport()
    const onAddItem = vi.fn()
    const group = {
      key: 'locker-a::top-shelf',
      title: 'Locker A - Top shelf',
      location: 'Locker A',
      subLocation: 'Top shelf',
      checkedCount: 0,
      issueCount: 0,
      rows: [],
    }

    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [group],
          checkedCount: 0,
          totalCount: 0,
          issueCount: 0,
        }}
        onAddItem={onAddItem}
      />,
    )

    fireEvent.click(screen.getByText('Locker A - Top shelf'))
    fireEvent.click(screen.getByText('Add item'))
    const drawer = document.querySelector('.offcanvas')
    expect(drawer).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(within(drawer).getByText('Add Item')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('e.g. Rescue Pulley'), {
      target: { value: 'Edge Protector' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g. 1'), {
      target: { value: '2' },
    })
    fireEvent.click(within(drawer).getByText('Save'))

    expect(onAddItem).toHaveBeenCalledWith({
      mainLocation: 'High Angle Rescue Kit',
      location: 'Locker A',
      subLocation: 'Top shelf',
      equipment: 'Edge Protector',
      quantity: '2',
    })
  })

  it('confirms custom item deletion in the mobile drawer', () => {
    setMobileViewport()
    const onDeleteItem = vi.fn()
    const row = {
      id: 'high-angle:custom-delete',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '3',
      equipment: 'Edge Protector',
      location: 'Locker A',
      subLocation: 'Top shelf',
      quantity: '2',
      equipmentSource: 'custom',
    }

    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a::top-shelf',
              title: 'Locker A - Top shelf',
              location: 'Locker A',
              subLocation: 'Top shelf',
              checkedCount: 0,
              issueCount: 0,
              rows: [row],
            },
          ],
          checkedCount: 0,
          totalCount: 1,
          issueCount: 0,
        }}
        onDeleteItem={onDeleteItem}
      />,
    )

    fireEvent.click(screen.getByText('Locker A - Top shelf'))
    fireEvent.click(screen.getByRole('button', { name: 'Open Edge Protector inspection details' }))
    fireEvent.click(screen.getByRole('button', { name: 'High angle actions for Edge Protector' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const drawer = document.querySelector('.offcanvas')
    expect(drawer).toBeTruthy()
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(within(drawer).getByText('Delete Item')).toBeTruthy()
    expect(onDeleteItem).not.toHaveBeenCalled()

    fireEvent.click(within(drawer).getByRole('button', { name: 'Delete' }))

    expect(onDeleteItem).toHaveBeenCalledWith(expect.objectContaining({ id: row.id }))
  })

  it('opens high angle equipment checks in a mobile drawer and saves staged changes', () => {
    setMobileViewport()
    const onUpdateCheck = vi.fn()
    const row = {
      id: 'high-angle:1',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '1',
      equipment: 'Rescue Rope',
      location: 'Locker A',
      subLocation: 'Top shelf',
      quantity: '2',
    }

    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              checkedCount: 0,
              issueCount: 0,
              rows: [row],
            },
          ],
          checkedCount: 0,
          totalCount: 1,
          issueCount: 0,
        }}
        onUpdateCheck={onUpdateCheck}
      />,
    )

    expect(screen.queryByText('Condition')).toBeNull()

    fireEvent.click(screen.getByText('Locker A'))
    fireEvent.click(screen.getByText('Rescue Rope'))

    expect(screen.getByText('Condition')).toBeTruthy()
    expect(screen.getByText('No changes')).toBeTruthy()

    fireEvent.click(screen.getByText('Good'))

    expect(onUpdateCheck).not.toHaveBeenCalled()
    expect(screen.getByText('Unsaved changes')).toBeTruthy()

    fireEvent.click(screen.getByText('Save'))

    expect(onUpdateCheck).toHaveBeenCalledWith(row, {
      condition: 'Good',
      remarks: '',
      conditionRemarks: '',
      conditionPhotos: [],
      additionalNotes: '',
      additionalPhotos: [],
    })
  })

  it('supports optional additional info in the mobile drawer without using issue evidence fields', () => {
    setMobileViewport()
    const onUpdateCheck = vi.fn()
    const onRequestIssuePhotoUpload = vi.fn()
    const row = {
      id: 'high-angle:1',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '1',
      equipment: 'Rescue Rope',
      location: 'Locker A',
      subLocation: 'Top shelf',
      quantity: '2',
      condition: 'Good',
    }

    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              checkedCount: 1,
              issueCount: 0,
              rows: [row],
            },
          ],
          checkedCount: 1,
          totalCount: 1,
          issueCount: 0,
        }}
        onUpdateCheck={onUpdateCheck}
        onRequestIssuePhotoUpload={onRequestIssuePhotoUpload}
      />,
    )

    fireEvent.click(screen.getByText('Locker A'))
    fireEvent.click(screen.getByText('Rescue Rope'))

    expect(screen.getByText('Additional Info (optional)')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remark' }))
    fireEvent.change(screen.getByPlaceholderText('General equipment remarks'), {
      target: { value: 'Stored with rope bag.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Photo' }))

    expect(onRequestIssuePhotoUpload).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'high-angle:1' }),
      expect.objectContaining({
        photosKey: 'additionalPhotos',
        onAddPhotos: expect.any(Function),
      }),
    )

    fireEvent.click(screen.getByText('Save'))

    expect(onUpdateCheck).toHaveBeenCalledWith(
      row,
      expect.objectContaining({
        condition: 'Good',
        conditionRemarks: '',
        conditionPhotos: [],
        additionalNotes: 'Stored with rope bag.',
        additionalPhotos: [],
      }),
    )
  })

  it('discards staged high angle drawer changes on cancel', () => {
    setMobileViewport()
    const onUpdateCheck = vi.fn()
    const row = {
      id: 'high-angle:1',
      mainLocation: 'High Angle Rescue Kit',
      rowNumber: '1',
      equipment: 'Rescue Rope',
      location: 'Locker A',
      subLocation: 'Top shelf',
      quantity: '2',
    }

    render(
      <HighAngleInspectionChecks
        mainLocation="High Angle Rescue Kit"
        mainLocationLabel="High Angle Rescue Kit"
        summary={{
          visibleGroups: [
            {
              key: 'locker-a',
              title: 'Locker A',
              checkedCount: 0,
              issueCount: 0,
              rows: [row],
            },
          ],
          checkedCount: 0,
          totalCount: 1,
          issueCount: 0,
        }}
        onUpdateCheck={onUpdateCheck}
      />,
    )

    fireEvent.click(screen.getByText('Locker A'))
    fireEvent.click(screen.getByText('Rescue Rope'))
    fireEvent.click(screen.getByText('Good'))
    fireEvent.click(screen.getByText('Cancel'))

    expect(onUpdateCheck).not.toHaveBeenCalled()
    expect(screen.getByText('Discard changes?')).toBeTruthy()
    expect(screen.getByText('Your high angle item changes have not been saved.')).toBeTruthy()
    expect(screen.getByText('Condition')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByText('Condition')).toBeTruthy()

    fireEvent.click(screen.getByText('Cancel'))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByText('Condition')).toBeNull()
  })

  it('preserves trailing spaces in issue remarks while typing', () => {
    setMobileViewport()

    const HighAngleHarness = () => {
      const [row, setRow] = useState({
        id: 'high-angle:1',
        mainLocation: 'High Angle Rescue Kit',
        rowNumber: '1',
        equipment: 'Rescue Rope',
        location: 'Locker A',
        subLocation: 'Top shelf',
        quantity: '2',
        condition: 'Not Good',
        conditionRemarks: '',
      })

      return (
        <HighAngleInspectionChecks
          mainLocation="High Angle Rescue Kit"
          mainLocationLabel="High Angle Rescue Kit"
          summary={{
            visibleGroups: [
              {
                key: 'locker-a',
                title: 'Locker A',
                checkedCount: 0,
                issueCount: 1,
                rows: [row],
              },
            ],
            checkedCount: 0,
            totalCount: 1,
            issueCount: 1,
          }}
          onUpdateCheck={(_row, patch) => setRow((current) => ({ ...current, ...patch }))}
        />
      )
    }

    render(<HighAngleHarness />)

    fireEvent.click(screen.getByText('Locker A'))
    fireEvent.click(screen.getByText('Rescue Rope'))
    const remarks = screen.getByPlaceholderText('Issue remarks')
    fireEvent.change(remarks, { target: { value: 'rope frayed ' } })

    expect(screen.getByPlaceholderText('Issue remarks').value).toBe('rope frayed ')

    fireEvent.click(screen.getByText('Save'))
    expect(screen.queryByText('Condition')).toBeNull()
  })
})
