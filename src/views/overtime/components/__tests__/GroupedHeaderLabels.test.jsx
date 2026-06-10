// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MonthGroupLabel, UserGroupLabel } from '../GroupedHeaderLabels'

afterEach(() => {
  cleanup()
})

describe('GroupedHeaderLabels', () => {
  it('renders month label in uppercase with record count badge', () => {
    render(<MonthGroupLabel label="April 2026" count={2} testId="month-header" />)

    expect(screen.getByTestId('month-header-month').textContent).toBe('APRIL 2026')
    expect(screen.getByText('2 records')).toBeTruthy()
  })

  it('renders user label with initials avatar and count badge', () => {
    render(<UserGroupLabel name="Jang Doe" count={3} testId="user-header" />)

    expect(screen.getByTestId('user-header-avatar').textContent).toBe('JD')
    expect(screen.getByTestId('user-header-name').textContent).toBe('Jang Doe')
    expect(screen.getByText('3 records')).toBeTruthy()
  })

  it('uses deterministic avatar colors for the same name', () => {
    const { rerender } = render(<UserGroupLabel name="Alex Lim" count={1} testId="user-header" />)
    const first = screen.getByTestId('user-header-avatar').getAttribute('style') || ''

    rerender(<UserGroupLabel name="Alex Lim" count={1} testId="user-header" />)
    const second = screen.getByTestId('user-header-avatar').getAttribute('style') || ''

    expect(first).toBe(second)
  })

  it('renders image avatar when avatarUrl is provided', () => {
    render(
      <UserGroupLabel
        name="Jang Doe"
        avatarUrl="https://example.com/avatar.jpg"
        count={1}
        testId="user-header"
      />,
    )

    const avatar = screen.getByTestId('user-header-avatar')
    expect(avatar.tagName).toBe('IMG')
  })
})
