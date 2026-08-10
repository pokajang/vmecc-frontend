// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import FormFieldError from '../FormFieldError'

afterEach(cleanup)

describe('FormFieldError', () => {
  it('renders nothing without an error message', () => {
    const { container } = render(<FormFieldError>{''}</FormFieldError>)
    expect(container.firstChild).toBeNull()
  })

  it('forwards identity and styling without announcing by default', () => {
    render(
      <FormFieldError id="example-field-error" className="mt-2">
        Complete this field.
      </FormFieldError>,
    )

    const error = screen.getByText('Complete this field.')
    expect(error.id).toBe('example-field-error')
    expect(error.className).toContain('invalid-feedback')
    expect(error.className).toContain('d-block')
    expect(error.className).toContain('mt-2')
    expect(error.getAttribute('role')).toBeNull()
  })

  it('preserves explicit alert semantics when a consumer requires announcement', () => {
    render(<FormFieldError role="alert">A required value is missing.</FormFieldError>)
    expect(screen.getByRole('alert').textContent).toBe('A required value is missing.')
  })
})
