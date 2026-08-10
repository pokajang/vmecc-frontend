// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PageState from '../PageState'

afterEach(cleanup)

describe('PageState', () => {
  it('announces loading without presenting an alert', () => {
    render(<PageState message="Loading records..." />)

    expect(screen.getByRole('status').textContent).toContain('Loading records...')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('presents an error message and consumer-owned action as an alert', () => {
    render(
      <PageState
        variant="error"
        title="Unable to load records"
        message="Please try again."
        action={<button type="button">Retry</button>}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Unable to load records')
    expect(alert.textContent).toContain('Please try again.')
    expect(screen.getByRole('button', { name: 'Retry' }).closest('[role="alert"]')).toBe(alert)
  })

  it('keeps an empty state distinct from loading and error announcements', () => {
    render(<PageState variant="empty" message="No records found." />)

    expect(screen.getByText('No records found.')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
