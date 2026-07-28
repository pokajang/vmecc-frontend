// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import DutyCoveragePanel from '../DutyCoveragePanel'

const { fetchDutyCoverage, createDutyCoverage, cancelDutyCoverage } = vi.hoisted(() => ({
  fetchDutyCoverage: vi.fn(),
  createDutyCoverage: vi.fn(),
  cancelDutyCoverage: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  fetchDutyCoverage: (...args) => fetchDutyCoverage(...args),
  createDutyCoverage: (...args) => createDutyCoverage(...args),
  cancelDutyCoverage: (...args) => cancelDutyCoverage(...args),
}))

beforeEach(() => {
  vi.resetAllMocks()
  fetchDutyCoverage.mockResolvedValue({ data: [] })
  createDutyCoverage.mockResolvedValue({ data: { id: 1 } })
})

afterEach(cleanup)

it('schedules coverage using only roles held by the selected substitute', async () => {
  render(
    <DutyCoveragePanel
      teams={[
        {
          id: 10,
          name: 'Alpha',
          members: [
            {
              user_id: 3,
              name: 'Current AIC',
              role: 'Assistant Incident Commander',
            },
          ],
        },
      ]}
      memberOptions={[
        {
          id: 7,
          name: 'Qualified Substitute',
          roles: ['Assistant Incident Commander'],
        },
      ]}
    />,
  )

  await waitFor(() => expect(fetchDutyCoverage).toHaveBeenCalledTimes(1))
  fireEvent.change(screen.getByLabelText('Substitute'), { target: { value: '7' } })
  fireEvent.change(screen.getByLabelText('Acting team'), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('Acting role'), {
    target: { value: 'Assistant Incident Commander' },
  })
  fireEvent.change(screen.getByLabelText('Replacing'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add coverage' }))

  await waitFor(() => expect(createDutyCoverage).toHaveBeenCalledTimes(1))
  expect(createDutyCoverage).toHaveBeenCalledWith(
    expect.objectContaining({
      user_id: 7,
      acting_team_id: 10,
      acting_role: 'Assistant Incident Commander',
      replaces_user_id: 3,
      effective_from: expect.stringMatching(/Z$/),
      effective_until: expect.stringMatching(/Z$/),
    }),
  )
})
