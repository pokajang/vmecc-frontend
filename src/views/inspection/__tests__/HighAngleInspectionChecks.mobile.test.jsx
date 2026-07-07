// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
