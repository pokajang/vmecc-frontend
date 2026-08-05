// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { fetchCustomShifts } from 'src/services/apiClient'
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

beforeEach(() => {
  vi.mocked(fetchCustomShifts).mockResolvedValue({
    data: [{ id: 1, name: 'Evening', start: '15:00', end: '23:00' }],
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('renders custom shift mobile cards with accessible edit and delete actions', async () => {
  render(<WorkShift />)

  await waitFor(() => expect(screen.getAllByText('Evening').length).toBeGreaterThan(0))

  expect(document.querySelector('.list-group')).toBeTruthy()
  expect(document.querySelector('.list-group-item')).toBeTruthy()
  expect(screen.getAllByText('Start').length).toBeGreaterThan(0)
  expect(screen.getAllByText('15:00').length).toBeGreaterThan(0)
  expect(screen.getAllByText('End').length).toBeGreaterThan(0)
  expect(screen.getAllByText('23:00').length).toBeGreaterThan(0)
  expect(screen.getAllByRole('button', { name: 'Edit Evening' }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('button', { name: 'Delete Evening' }).length).toBeGreaterThan(0)
})

it('gives the custom-shift loading state precedence over empty and populated content', () => {
  vi.mocked(fetchCustomShifts).mockImplementationOnce(() => new Promise(() => {}))

  render(<WorkShift />)

  const customShiftsCard = screen.getByTestId('shift-settings-custom')
  expect(screen.getByRole('status').textContent).toContain('Loading')
  expect(customShiftsCard.querySelector('table')).toBeNull()
  expect(customShiftsCard.querySelector('.mobile-record-list')).toBeNull()
  expect(screen.queryByText('No custom shifts defined yet.')).toBeNull()
})

it('renders the exact custom-shift empty state without record collections', async () => {
  vi.mocked(fetchCustomShifts).mockResolvedValueOnce({ data: [] })

  render(<WorkShift />)

  const emptyMessage = await screen.findByText('No custom shifts defined yet.')
  expect(emptyMessage.parentElement.style.minHeight).toBe('160px')
  const customShiftsCard = screen.getByTestId('shift-settings-custom')
  expect(customShiftsCard.querySelector('table')).toBeNull()
  expect(customShiftsCard.querySelector('.mobile-record-list')).toBeNull()
})

it('preserves the load error alongside the existing empty state', async () => {
  vi.mocked(fetchCustomShifts).mockRejectedValueOnce({
    payload: { message: 'Unable to load custom shifts for this test.' },
  })

  render(<WorkShift />)

  await waitFor(() =>
    expect(screen.getByText('Unable to load custom shifts for this test.')).toBeTruthy(),
  )
  expect(screen.getByText('No custom shifts defined yet.')).toBeTruthy()
})

it('keeps the custom-shift desktop table before its mobile list in document order', async () => {
  render(<WorkShift />)

  await waitFor(() => expect(screen.getAllByText('Evening').length).toBeGreaterThan(0))
  const customShiftsCard = screen.getByTestId('shift-settings-custom')
  const desktopTable = customShiftsCard.querySelector('.d-none.d-md-block')
  const mobileList = customShiftsCard.querySelector('.mobile-record-list')

  expect(desktopTable).toBeTruthy()
  expect(mobileList).toBeTruthy()
  expect(desktopTable.compareDocumentPosition(mobileList) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
})

it('keeps custom-shift edit and delete actions connected to their existing dialogs', async () => {
  render(<WorkShift />)

  await waitFor(() => expect(screen.getAllByText('Evening').length).toBeGreaterThan(0))
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit Evening' })[0])
  expect(screen.getByText('Edit shift')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(screen.queryByText('Edit shift')).toBeNull())

  fireEvent.click(screen.getAllByRole('button', { name: 'Delete Evening' })[0])
  expect(screen.getByText('Delete Shift')).toBeTruthy()
  expect(screen.getByText(/Are you sure you want to delete/).textContent).toContain('Evening')
})
