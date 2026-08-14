// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DrillPersonnelStep from '../DrillPersonnelStep'

const apiMocks = vi.hoisted(() => ({
  teams: vi.fn(),
  rosters: vi.fn(),
  windows: vi.fn(),
}))

vi.mock('src/services/apiClient', async () => {
  const actual = await vi.importActual('src/services/apiClient')
  return {
    ...actual,
    fetchTeams: apiMocks.teams,
    fetchRosters: apiMocks.rosters,
    fetchShiftWindows: apiMocks.windows,
  }
})

const Harness = ({ initialForm }) => {
  const [form, setForm] = useState(initialForm)
  return (
    <DrillPersonnelStep
      user={{ id: 1, name: 'Reporter' }}
      form={form}
      setForm={setForm}
      onBack={vi.fn()}
      onContinue={vi.fn()}
    />
  )
}

afterEach(cleanup)

beforeEach(() => {
  apiMocks.teams.mockReset().mockResolvedValue({
    data: [{ name: 'A Team', members: [{ id: 2, name: 'Roster Member', role: 'Responder' }] }],
  })
  apiMocks.rosters.mockReset().mockResolvedValue({
    data: [{ shifts: { day: { team: 'A Team' } } }],
  })
  apiMocks.windows.mockReset().mockResolvedValue({ data: { day_start: '07:00', day_end: '19:00' } })
})

describe('DrillPersonnelStep', () => {
  it('preserves saved legacy/manual participants when roster data arrives', async () => {
    render(
      <Harness
        initialForm={{
          reportDate: '2026-07-11',
          reportTime: '09:00',
          respondingTeamName: '',
          respondingTeamShift: '',
          respondingAttendance: [
            {
              memberKey: 'legacy-commander',
              name: 'Legacy Commander',
              exerciseRole: 'SC',
              source: 'legacy',
              present: true,
            },
          ],
        }}
      />,
    )

    await waitFor(() => expect(screen.getByLabelText('Roster Member')).toBeTruthy())
    expect(screen.getByLabelText('Legacy Commander')).toBeTruthy()
    expect(screen.getByLabelText('Legacy Commander').checked).toBe(true)
  })
})
