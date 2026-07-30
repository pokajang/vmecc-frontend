// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkflowSetupField from '../WorkflowSetupField'

afterEach(cleanup)

describe('WorkflowSetupField', () => {
  it('presents a selected value with edit and reset initiatives', () => {
    const onEdit = vi.fn()
    const onReset = vi.fn()

    render(
      <WorkflowSetupField
        label="Incident type"
        value="Fire"
        secondaryValue="Structural"
        onEdit={onEdit}
        onReset={onReset}
      />,
    )

    expect(screen.getByText('Fire')).toBeTruthy()
    expect(screen.getByText('Structural')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Incident type' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset Incident type' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('associates an active error with the editable field', () => {
    render(
      <WorkflowSetupField label="Location" value="" error="Choose a location">
        <button type="button">Choose location</button>
      </WorkflowSetupField>,
    )

    expect(screen.getByRole('alert').textContent).toContain('Choose a location')
    expect(screen.getByRole('region', { name: 'Location' }).getAttribute('aria-invalid')).toBe(
      'true',
    )
  })
})
