// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FitnessTestPersonnelStep from '../FitnessTestPersonnelStep'
import { createDefaultFitnessTestForm } from '../fitnessFormDomain'

const apiMocks = vi.hoisted(() => ({ fetchTeams: vi.fn() }))
vi.mock('src/services/apiClient', () => ({
  fetchTeams: apiMocks.fetchTeams,
}))

afterEach(() => {
  cleanup()
  apiMocks.fetchTeams.mockReset()
})

const Harness = () => {
  const [form, setForm] = useState(createDefaultFitnessTestForm)
  return (
    <>
      <FitnessTestPersonnelStep
        form={form}
        setForm={setForm}
        fieldErrors={{}}
        clearError={vi.fn()}
        onBack={vi.fn()}
        onContinue={vi.fn()}
        pushToast={vi.fn()}
      />
      <output data-testid="fitness-form-state">{JSON.stringify(form)}</output>
    </>
  )
}

describe('FitnessTestPersonnelStep', () => {
  it('adds a manual participant and a new shift to the persisted form model', async () => {
    apiMocks.fetchTeams.mockResolvedValue({ data: [] })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add participant' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Name')))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'External Member' } })
    fireEvent.change(screen.getByLabelText('Role (optional)'), { target: { value: 'Medic' } })
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '34' } })
    fireEvent.change(screen.getByLabelText('Shift group'), { target: { value: '__new__' } })
    fireEvent.change(screen.getByLabelText('New shift name'), { target: { value: 'Relief' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add Participant' }))

    await waitFor(() => expect(screen.getByText('Added participants')).toBeTruthy())
    const form = JSON.parse(screen.getByTestId('fitness-form-state').textContent)
    expect(form.shiftGroups[0]).toEqual(
      expect.objectContaining({
        shift: 'Relief',
        participants: [
          expect.objectContaining({
            name: 'External Member',
            role: 'Medic',
            ageSnapshot: 34,
            source: 'manual',
          }),
        ],
      }),
    )
  })

  it('automatically includes teams in workbook order and supports member exclusions', async () => {
    apiMocks.fetchTeams.mockResolvedValue({
      data: [
        {
          id: 'delta',
          name: 'Delta',
          members: [{ id: 'd1', user_id: 'user-d1', name: 'Delta Member' }],
        },
        {
          id: 'alpha',
          name: 'Alpha',
          members: [{ id: 'a1', user_id: 'user-a1', name: 'Alpha Member' }],
        },
      ],
    })
    render(<Harness />)

    await waitFor(() => expect(screen.getByText('2 included')).toBeTruthy())
    const formAfterLoad = JSON.parse(screen.getByTestId('fitness-form-state').textContent)
    expect(formAfterLoad.shiftGroups.map((group) => group.shift)).toEqual(['Alpha', 'Delta'])

    const alphaMembers = screen.getByRole('group', { name: 'Alpha members' })
    fireEvent.click(within(alphaMembers).getByRole('button', { name: /Alpha Member/i }))
    await waitFor(() => expect(screen.getByText('1 included')).toBeTruthy())
    const formAfterExclusion = JSON.parse(screen.getByTestId('fitness-form-state').textContent)
    expect(formAfterExclusion.excludedMemberKeys).toContain('user-a1')
    expect(formAfterExclusion.shiftGroups.map((group) => group.shift)).toEqual(['Delta'])
  })

  it('retries a failed roster request and disables no-op team actions', async () => {
    apiMocks.fetchTeams.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      data: [
        {
          id: 'alpha',
          name: 'Alpha',
          members: [{ id: 'a1', user_id: 'user-a1', name: 'Alpha Member' }],
        },
      ],
    })
    render(<Harness />)

    expect(
      await screen.findByText('Unable to load team members. Retry after reconnecting.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(screen.getByText('1 included')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Include all Alpha members' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Exclude all Alpha members' }).disabled).toBe(false)
    expect(apiMocks.fetchTeams).toHaveBeenCalledTimes(2)
  })
})
