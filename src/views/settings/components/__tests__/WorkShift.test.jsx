// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import WorkShift from '../WorkShift'

vi.mock('src/services/apiClient', () => ({
  fetchShiftWindows: vi.fn(() =>
    Promise.resolve({
      data: {
        normal_start: '08:00',
        normal_end: '17:00',
        day_start: '07:00',
        day_end: '19:00',
        night_start: '19:00',
        night_end: '07:00',
      },
    }),
  ),
  saveShiftWindows: vi.fn(() => Promise.resolve({ data: {} })),
  fetchCustomShifts: vi.fn(() =>
    Promise.resolve({
      data: [{ id: 1, name: 'Evening', start: '15:00', end: '23:00' }],
    }),
  ),
  saveCustomShift: vi.fn(() => Promise.resolve({ data: {} })),
  updateCustomShift: vi.fn(() => Promise.resolve({ data: {} })),
  deleteCustomShift: vi.fn(() => Promise.resolve({ data: {} })),
}))

afterEach(() => cleanup())

it('renders custom shift mobile cards with accessible edit and delete actions', async () => {
  render(<WorkShift />)

  await waitFor(() => expect(screen.getAllByText('Evening').length).toBeGreaterThan(0))

  expect(screen.getAllByText('Start: 15:00').length).toBeGreaterThan(0)
  expect(screen.getAllByText('End: 23:00').length).toBeGreaterThan(0)
  expect(screen.getAllByRole('button', { name: 'Edit Evening' }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('button', { name: 'Delete Evening' }).length).toBeGreaterThan(0)
})
