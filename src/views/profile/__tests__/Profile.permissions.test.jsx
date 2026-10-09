// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Profile from '../Profile'

let authUser = {
  name: 'Client Representative',
  roles: ['Representative'],
  permissions: ['self.dashboard', 'self.messages', 'teams.view'],
}

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector({ authUser }),
}))
vi.mock('../AccountSection', () => ({ default: () => <div>Account section</div> }))
vi.mock('../SecuritySection', () => ({ default: () => <div>Security section</div> }))
vi.mock('../EmergencySection', () => ({ default: () => <div>Emergency section</div> }))
vi.mock('../BankingSection', () => ({ default: () => <div>Banking section</div> }))
vi.mock('../StatutorySection', () => ({ default: () => <div>Statutory section</div> }))
vi.mock('../MedicalSection', () => ({ default: () => <div>Medical section</div> }))

afterEach(() => {
  cleanup()
  authUser = {
    name: 'Client Representative',
    roles: ['Representative'],
    permissions: ['self.dashboard', 'self.messages', 'teams.view'],
  }
})

it('hides profile sections whose explicit permissions are withheld', () => {
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Profile />
    </MemoryRouter>,
  )

  expect(screen.getByTestId('profile-personal')).toBeTruthy()
  expect(screen.getByTestId('profile-statutory')).toBeTruthy()
  expect(screen.queryByTestId('profile-emergency')).toBeNull()
  expect(screen.queryByTestId('profile-banking')).toBeNull()
  expect(screen.queryByTestId('profile-medical')).toBeNull()
})

it('shows only the sensitive profile sections granted to the active user', () => {
  authUser.permissions = ['self.profile.emergency', 'self.profile.medical']
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Profile />
    </MemoryRouter>,
  )

  expect(screen.getByTestId('profile-emergency')).toBeTruthy()
  expect(screen.queryByTestId('profile-banking')).toBeNull()
  expect(screen.getByTestId('profile-medical')).toBeTruthy()
})
