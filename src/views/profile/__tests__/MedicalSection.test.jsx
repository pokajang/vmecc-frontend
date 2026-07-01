// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MedicalSection from '../MedicalSection'
import { updateProfile } from 'src/services/apiClient'

const dispatch = vi.fn()

vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
}))

vi.mock('src/services/apiClient', () => ({
  updateProfile: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MedicalSection', () => {
  it('renders empty state when medical info is null', () => {
    render(<MedicalSection medical={null} />)

    expect(screen.getByText('Blood type')).toBeTruthy()
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(5)
  })

  it('renders empty edit fields when medical info is undefined', () => {
    render(<MedicalSection />)

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))

    expect(screen.getByPlaceholderText('e.g., A+, O-, AB').value).toBe('')
    expect(screen.getByPlaceholderText('e.g., peanuts, penicillin').value).toBe('')
    expect(
      screen.getByPlaceholderText('Additional details that may help in emergencies').value,
    ).toBe('')
  })

  it('saves normalized medical payload from comma-separated fields', async () => {
    updateProfile.mockResolvedValueOnce({
      user: {
        id: 1,
        medical_info: {
          bloodType: 'O+',
          allergies: ['peanuts', 'penicillin'],
          conditions: [],
          medications: ['metformin'],
          notes: 'Carry card',
        },
      },
    })

    render(<MedicalSection medical={null} />)

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    fireEvent.change(screen.getByPlaceholderText('e.g., A+, O-, AB'), {
      target: { value: 'O+' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g., peanuts, penicillin'), {
      target: { value: 'peanuts, penicillin' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g., ibuprofen, metformin'), {
      target: { value: 'metformin' },
    })
    fireEvent.change(
      screen.getByPlaceholderText('Additional details that may help in emergencies'),
      {
        target: { value: 'Carry card' },
      },
    )
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1))
    expect(updateProfile).toHaveBeenCalledWith({
      medical_info: {
        noKnownCriticalMedicalInfo: false,
        bloodType: 'O+',
        allergies: ['peanuts', 'penicillin'],
        conditions: [],
        medications: ['metformin'],
        notes: 'Carry card',
      },
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'set',
      authUser: expect.objectContaining({ id: 1 }),
    })
  })
})
