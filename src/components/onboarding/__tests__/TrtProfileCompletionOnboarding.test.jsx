// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { legacy_createStore as createStore } from 'redux'
import { MemoryRouter } from 'react-router-dom'

import TrtProfileCompletionOnboarding from '../TrtProfileCompletionOnboarding'
import { updateOnboardingState, updateProfile } from 'src/services/apiClient'
import {
  TRT_PROFILE_ONBOARDING_KEY,
  TRT_PROFILE_ONBOARDING_VERSION,
  getTrtProfileOnboardingStorageKey,
} from 'src/onboarding/trtProfileCompletion'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(),
  updateProfile: vi.fn(),
}))

const createStorageMock = () => {
  let values = {}
  return {
    getItem: vi.fn((key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
    ),
    setItem: vi.fn((key, value) => {
      values[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete values[key]
    }),
    clear: vi.fn(() => {
      values = {}
    }),
  }
}

const completeUser = {
  id: 44,
  name: 'TRT Member',
  email: 'trt@example.test',
  ic_number: '900101-01-1234',
  phone: '012 3456 789',
  address: 'Lot 1',
  state: 'Selangor',
  roles: ['Tactical Response Team'],
  emergency_contact: {
    name: 'Emergency Person',
    relationship: 'Sibling',
    phone: '013 3456 789',
  },
  medical_info: {
    noKnownCriticalMedicalInfo: true,
  },
}

const incompleteUser = {
  ...completeUser,
  name: 'Azam Amir',
  ic_number: '',
  phone: '',
  address: '',
  state: '',
  emergency_contact: null,
  medical_info: null,
}

const renderWithStore = (authUser, route = '/dashboard') => {
  const reducer = (state = { authUser }, action) => {
    if (action.type !== 'set') return state
    const { type, ...rest } = action
    return { ...state, ...rest }
  }
  const store = createStore(reducer)
  render(
    <MemoryRouter initialEntries={[route]}>
      <Provider store={store}>
        <TrtProfileCompletionOnboarding />
      </Provider>
    </MemoryRouter>,
  )
  return store
}

const findDelayedPromptButton = (name) => screen.findByRole('button', { name }, { timeout: 3500 })

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
  updateOnboardingState.mockResolvedValue({
    data: {
      [TRT_PROFILE_ONBOARDING_KEY]: {
        version: TRT_PROFILE_ONBOARDING_VERSION,
      },
    },
  })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('TrtProfileCompletionOnboarding', () => {
  it('shows the prompt for incomplete TRT users', async () => {
    renderWithStore(incompleteUser)

    expect(await screen.findByText('Welcome, Azam', {}, { timeout: 3500 })).toBeTruthy()
    expect(screen.getByText(/as part of the Tactical Response Team/i)).toBeTruthy()
  })

  it('does not show for complete TRT users', async () => {
    renderWithStore(completeUser)

    await waitFor(() => expect(screen.queryByText('Complete your operational profile')).toBeNull())
  })

  it('does not show for non-TRT users', async () => {
    renderWithStore({ ...incompleteUser, roles: ['Admin'] })

    await waitFor(() => expect(screen.queryByText('Complete your operational profile')).toBeNull())
  })

  it('does not interrupt an incomplete user on a task route', async () => {
    renderWithStore(incompleteUser, '/leave/apply')

    await new Promise((resolve) => setTimeout(resolve, 2100))
    expect(screen.queryByText('Welcome, Azam')).toBeNull()
  })

  it('uses local fallback suppression when backend state exists but is not suppressing', async () => {
    localStorage.setItem(
      getTrtProfileOnboardingStorageKey(incompleteUser.id),
      JSON.stringify({ dismissed: true, dismissedAt: '2026-06-25T01:00:00.000Z' }),
    )

    renderWithStore({
      ...incompleteUser,
      onboarding: {
        [TRT_PROFILE_ONBOARDING_KEY]: {
          version: TRT_PROFILE_ONBOARDING_VERSION,
          lastStartedAt: '2026-06-25T00:00:00.000Z',
        },
      },
    })

    await waitFor(() => expect(screen.queryByText('Welcome, Azam')).toBeNull())
  })

  it('snoozes the prompt for 24 hours when reminded later', async () => {
    renderWithStore(incompleteUser)

    fireEvent.click(await findDelayedPromptButton(/remind me later/i))

    await waitFor(() =>
      expect(updateOnboardingState).toHaveBeenCalledWith(
        TRT_PROFILE_ONBOARDING_KEY,
        expect.objectContaining({
          version: TRT_PROFILE_ONBOARDING_VERSION,
          event: 'snoozed',
          snoozedUntil: expect.any(String),
        }),
      ),
    )
    const [, payload] = updateOnboardingState.mock.calls[0]
    expect(Date.parse(payload.snoozedUntil)).toBeGreaterThan(Date.now())
    expect(localStorage.getItem(getTrtProfileOnboardingStorageKey(incompleteUser.id))).toBeNull()
  })

  it('falls back to local storage when profile onboarding persistence fails', async () => {
    updateOnboardingState.mockRejectedValueOnce(new Error('offline'))
    renderWithStore(incompleteUser)

    fireEvent.click(await findDelayedPromptButton(/remind me later/i))

    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(getTrtProfileOnboardingStorageKey(incompleteUser.id)))
          .snoozedUntil,
      ).toBeTruthy(),
    )
  })

  it('saves personal, emergency, and medical steps until profile is ready', async () => {
    const personalComplete = {
      ...incompleteUser,
      name: completeUser.name,
      ic_number: completeUser.ic_number,
      phone: completeUser.phone,
      address: completeUser.address,
      state: completeUser.state,
    }
    const emergencyComplete = {
      ...personalComplete,
      emergency_contact: completeUser.emergency_contact,
    }
    updateProfile
      .mockResolvedValueOnce({ user: personalComplete })
      .mockResolvedValueOnce({ user: emergencyComplete })
      .mockResolvedValueOnce({ user: completeUser })

    const store = renderWithStore(incompleteUser)

    fireEvent.click(await findDelayedPromptButton(/complete profile/i))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: completeUser.name } })
    fireEvent.change(screen.getByLabelText('IC number'), {
      target: { value: completeUser.ic_number },
    })
    fireEvent.change(screen.getByLabelText('Mobile number'), {
      target: { value: completeUser.phone },
    })
    fireEvent.change(screen.getByLabelText('Home address'), {
      target: { value: completeUser.address },
    })
    fireEvent.change(screen.getByLabelText('State'), { target: { value: completeUser.state } })
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        name: completeUser.name,
        ic_number: completeUser.ic_number,
        phone: completeUser.phone,
        address: completeUser.address,
        state: completeUser.state,
      }),
    )

    await screen.findByLabelText('Emergency contact name')
    fireEvent.change(screen.getByLabelText('Emergency contact name'), {
      target: { value: completeUser.emergency_contact.name },
    })
    fireEvent.change(screen.getByLabelText('Relationship'), {
      target: { value: completeUser.emergency_contact.relationship },
    })
    fireEvent.change(screen.getByLabelText('Emergency contact mobile number'), {
      target: { value: completeUser.emergency_contact.phone },
    })
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        emergency_contact: completeUser.emergency_contact,
      }),
    )

    await screen.findByLabelText('No known critical medical info')
    fireEvent.click(screen.getByLabelText('No known critical medical info'))
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        medical_info: {
          noKnownCriticalMedicalInfo: true,
          bloodType: '',
          allergies: [],
          conditions: [],
          medications: [],
          notes: '',
        },
      }),
    )
    expect(await screen.findByText('Profile ready')).toBeTruthy()
    expect(screen.getByText('Your operational profile is ready.')).toBeTruthy()
    expect(screen.getByRole('button', { name: /continue/i })).toBeTruthy()
    expect(store.getState().authUser).toEqual(completeUser)
  })

  it('closes the profile-ready state without launching extra guidance', async () => {
    const medicalComplete = {
      ...completeUser,
      medical_info: null,
    }
    updateProfile.mockResolvedValueOnce({ user: completeUser })

    renderWithStore(medicalComplete)

    fireEvent.click(await findDelayedPromptButton(/complete profile/i))
    await screen.findByLabelText('No known critical medical info')
    fireEvent.click(screen.getByLabelText('No known critical medical info'))
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))

    await screen.findByText('Profile ready')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(document.querySelector('.modal.show')).toBeNull())
    expect(localStorage.getItem(getTrtProfileOnboardingStorageKey(completeUser.id))).toBeNull()
  })
})
