// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { legacy_createStore as createStore } from 'redux'
import { MemoryRouter } from 'react-router-dom'
import TeamDetails from '../TeamDetails'

const {
  fetchTeams,
  fetchTeamMemberOptions,
  fetchShiftWindows,
  fetchRosters,
  fetchDutyCoverage,
  createDutyCoverage,
  cancelDutyCoverage,
  createTeam,
} = vi.hoisted(() => ({
  fetchTeams: vi.fn(),
  fetchTeamMemberOptions: vi.fn(),
  fetchShiftWindows: vi.fn(),
  fetchRosters: vi.fn(),
  fetchDutyCoverage: vi.fn(),
  createDutyCoverage: vi.fn(),
  cancelDutyCoverage: vi.fn(),
  createTeam: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  fetchTeams: (...args) => fetchTeams(...args),
  fetchTeamMemberOptions: (...args) => fetchTeamMemberOptions(...args),
  fetchShiftWindows: (...args) => fetchShiftWindows(...args),
  fetchRosters: (...args) => fetchRosters(...args),
  fetchDutyCoverage: (...args) => fetchDutyCoverage(...args),
  createDutyCoverage: (...args) => createDutyCoverage(...args),
  cancelDutyCoverage: (...args) => cancelDutyCoverage(...args),
  createTeam: (...args) => createTeam(...args),
}))

const renderTeamDetails = (authUser) => {
  const store = createStore((state = { authUser }, action) =>
    action.type === 'set' ? { ...state, ...action } : state,
  )

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <TeamDetails />
      </MemoryRouter>
    </Provider>,
  )
}

describe('TeamDetails member option loading', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fetchTeams.mockResolvedValue({ data: [] })
    fetchShiftWindows.mockResolvedValue({ data: {} })
    fetchRosters.mockResolvedValue({ data: [] })
    fetchDutyCoverage.mockResolvedValue({ data: [] })
    fetchTeamMemberOptions.mockResolvedValue({ data: [] })
  })

  afterEach(() => cleanup())

  it('does not call management member options for team view-only users', async () => {
    renderTeamDetails({ permissions: ['teams.view'] })

    await waitFor(() => expect(fetchTeams).toHaveBeenCalledTimes(1))

    expect(fetchTeamMemberOptions).not.toHaveBeenCalled()
  })

  it('loads management member options for team managers', async () => {
    renderTeamDetails({ permissions: ['teams.view', 'teams.manage'] })

    await waitFor(() => expect(fetchTeamMemberOptions).toHaveBeenCalledTimes(1))
  })
})
