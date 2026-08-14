// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FitnessTestFormStep from '../FitnessTestFormStep'
import { normalizeFitnessTestForm } from '../fitnessFormDomain'

afterEach(cleanup)

describe('FitnessTestFormStep', () => {
  it('presents CP1 through CP6 for each participant and updates an individual checkpoint', () => {
    const updateParticipant = vi.fn()
    const form = normalizeFitnessTestForm({
      reportingMonth: '2026-06',
      shiftGroups: [
        {
          id: 'alpha',
          shift: 'Alpha',
          participants: [
            {
              id: 'member-1',
              memberId: 'member-1',
              name: 'Member One',
              ageSnapshot: 30,
              proficiency: { checkpointCompletion: {} },
            },
          ],
        },
      ],
    })

    render(
      <FitnessTestFormStep
        form={form}
        setForm={vi.fn()}
        fieldErrors={{}}
        clearError={vi.fn()}
        updateParticipant={updateParticipant}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Upload fitness-test report photos')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Proficiency' }))
    expect(screen.getAllByText('0/6 CP').length).toBeGreaterThan(0)

    fireEvent.click(
      screen.getByRole('button', {
        name: /CP1 Don bunker suit and SCBA for Member One: not completed/i,
      }),
    )

    expect(updateParticipant).toHaveBeenCalledWith('alpha', 'member-1', {
      proficiency: { checkpointCompletion: { cp1: true } },
    })
  })

  it('supports participant checkpoint completion and shift-wide blank test dates', () => {
    const updateParticipant = vi.fn()
    const applyShiftTestDate = vi.fn()
    const form = normalizeFitnessTestForm({
      reportingMonth: '2026-06',
      shiftGroups: [
        {
          id: 'alpha',
          shift: 'Alpha',
          participants: [{ id: 'member-1', name: 'Member One', ageSnapshot: 30 }],
        },
      ],
    })

    render(
      <FitnessTestFormStep
        form={form}
        setForm={vi.fn()}
        fieldErrors={{}}
        clearError={vi.fn()}
        updateParticipant={updateParticipant}
        applyShiftTestDate={applyShiftTestDate}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    )

    fireEvent.change(screen.getAllByLabelText('fitness date to fill for Alpha')[0], {
      target: { value: '2026-06-20' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Fill blank dates' })[0])
    expect(applyShiftTestDate).toHaveBeenCalledWith('alpha', 'fitness', '2026-06-20')

    fireEvent.click(screen.getByRole('button', { name: 'Proficiency' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mark all 6 complete' }))
    expect(updateParticipant).toHaveBeenCalledWith('alpha', 'member-1', {
      proficiency: {
        checkpointCompletion: {
          cp1: true,
          cp2: true,
          cp3: true,
          cp4: true,
          cp5: true,
          cp6: true,
        },
      },
    })
  })
})
