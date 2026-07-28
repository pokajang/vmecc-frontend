// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import TeamRoleTransferPanel from '../TeamRoleTransferPanel'

const { createTeamRoleTransfer, fetchTeamRoleTransferOptions } = vi.hoisted(() => ({
  createTeamRoleTransfer: vi.fn(),
  fetchTeamRoleTransferOptions: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  createTeamRoleTransfer: (...args) => createTeamRoleTransfer(...args),
  fetchTeamRoleTransferOptions: (...args) => fetchTeamRoleTransferOptions(...args),
}))

beforeEach(() => {
  vi.resetAllMocks()
  createTeamRoleTransfer.mockResolvedValue({ data: { handoverCount: 2 } })
  fetchTeamRoleTransferOptions.mockResolvedValue({
    data: [
      {
        userId: 7,
        userName: 'Qualified AIC',
        assignmentId: 31,
        role: 'Assistant Incident Commander',
        teamId: 10,
        teamName: 'Alpha Team',
      },
    ],
    meta: { effectiveDate: '2026-07-27' },
  })
})

afterEach(cleanup)

it('confirms and submits an atomic AIC transfer', async () => {
  const onChanged = vi.fn()
  render(
    <TeamRoleTransferPanel
      teams={[
        { id: 10, name: 'Alpha Team' },
        { id: 20, name: 'Bravo Team' },
      ]}
      onChanged={onChanged}
    />,
  )

  await waitFor(() => expect(fetchTeamRoleTransferOptions).toHaveBeenCalledTimes(1))
  fireEvent.change(screen.getByLabelText('Person and assignment'), {
    target: { value: '7:31' },
  })
  fireEvent.change(screen.getByLabelText('Destination team'), {
    target: { value: '20' },
  })
  fireEvent.change(screen.getByLabelText('Reason'), {
    target: { value: 'Permanent operational move' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Review transfer' }))

  expect(screen.getByText('Confirm permanent transfer')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Transfer assignment' }))

  await waitFor(() => expect(createTeamRoleTransfer).toHaveBeenCalledTimes(1))
  expect(createTeamRoleTransfer).toHaveBeenCalledWith(
    7,
    expect.objectContaining({
      assignment_id: 31,
      target_team_id: 20,
      effective_date: '2026-07-27',
      reason: 'Permanent operational move',
    }),
  )
  await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1))
  expect(screen.getByText(/2 pending actions were handed over/)).toBeTruthy()
})
