// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import TypeManagerModal from '../TypeManagerModal'

afterEach(() => {
  cleanup()
})

const baseProps = {
  visible: true,
  onClose: vi.fn(),
  editMode: true,
  onSetEditMode: vi.fn(),
  editTitle: 'Edit Drill Types',
  addTitle: 'Add Drill Type',
  options: [{ value: 'Fire Drill', title: 'Fire Drill', description: 'Evacuation drill.' }],
  onStartEdit: vi.fn(),
  onRequestDelete: vi.fn(),
  nameLabel: 'Drill Type Name',
  nameValue: '',
  onChangeName: vi.fn(),
  namePlaceholder: 'Name',
  descriptionLabel: 'Drill type details (optional)',
  descriptionValue: '',
  onChangeDescription: vi.fn(),
  descriptionPlaceholder: 'Details',
  error: '',
  editingKey: '',
  editingLabel: 'Editing type',
  editButtonLabel: 'Edit Types',
  onSave: vi.fn(),
  saveLabel: 'Save Type',
  updateLabel: 'Update Type',
}

describe('TypeManagerModal', () => {
  it('gives edit and delete icon actions accessible labels', () => {
    render(<TypeManagerModal {...baseProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit Fire Drill' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Fire Drill' }))

    expect(baseProps.onStartEdit).toHaveBeenCalledWith(baseProps.options[0])
    expect(baseProps.onRequestDelete).toHaveBeenCalledWith({
      value: 'Fire Drill',
      label: 'Fire Drill',
    })
  })

  it('renders shared badges in edit mode and shared warning copy in form mode', () => {
    const { rerender } = render(
      <TypeManagerModal
        {...baseProps}
        options={[
          {
            value: 'ASIC',
            title: 'ASIC',
            description: '1 report sub-location.',
            canEdit: true,
            canDelete: true,
          },
        ]}
        getRowBadgeLabel={() => 'Shared'}
      />,
    )

    expect(screen.getByText('Shared')).toBeTruthy()

    rerender(
      <TypeManagerModal
        {...baseProps}
        editMode={false}
        editingKey="ASIC"
        nameValue="ASIC"
        warningNotice="This item is shared across inspections. Changes will affect future inspections."
      />,
    )

    expect(
      screen.getByText(
        'This item is shared across inspections. Changes will affect future inspections.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Update Type' })).toBeTruthy()
  })

  it('renders a clear empty state when edit mode has no options', () => {
    render(<TypeManagerModal {...baseProps} options={[]} />)

    expect(screen.getByText('No items available to edit.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThan(0)
  })
})
