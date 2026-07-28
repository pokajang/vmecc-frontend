import { describe, expect, it } from 'vitest'
import { createDefaultFitnessTestForm } from '../fitnessFormDomain'
import {
  mergeFitnessTeamsIntoForm,
  normalizeFitnessTeams,
  setFitnessMembersIncluded,
} from '../fitnessTeamDomain'

const response = {
  data: [
    {
      id: 'delta',
      name: 'Delta',
      members: [{ id: 'tm-d1', user_id: 'user-d1', name: 'Delta Member', role: 'Member' }],
    },
    {
      id: 'alpha',
      name: 'Alpha',
      members: [
        { id: 'tm-a1', user_id: 'user-a1', name: 'Alpha Lead', role: 'Lead', is_primary: true },
        { id: 'tm-a2', user_id: 'user-a2', name: 'Alpha Member', role: 'Member' },
      ],
    },
  ],
}

describe('fitness team domain', () => {
  it('orders teams like the workbook and includes active members automatically', () => {
    const teams = normalizeFitnessTeams(response)
    const form = mergeFitnessTeamsIntoForm(createDefaultFitnessTestForm(), teams)
    expect(form.shiftGroups.map((group) => group.shift)).toEqual(['Alpha', 'Delta'])
    expect(form.shiftGroups[0].participants.map((participant) => participant.memberId)).toEqual([
      'user-a1',
      'user-a2',
    ])
  })

  it('preserves saved results, assessors, manual rows, and explicit exclusions on reload', () => {
    const teams = normalizeFitnessTeams(response)
    const base = createDefaultFitnessTestForm()
    const saved = {
      ...base,
      excludedMemberKeys: ['user-a2'],
      shiftGroups: [
        {
          id: 'alpha',
          shift: 'Alpha',
          assessor: { name: 'Saved Assessor' },
          participants: [
            {
              id: 'user-a1',
              memberId: 'user-a1',
              name: 'Old Name',
              source: 'roster',
              ageSnapshot: 31,
              fitness: { sitUps: 24, jumpingJacks: 55, pushUps: 22, testedOn: '2026-06-10' },
              proficiency: { durationSeconds: 240, testedOn: '2026-06-10' },
            },
            {
              id: 'manual-1',
              name: 'External Member',
              source: 'manual',
              ageSnapshot: 30,
              fitness: {},
              proficiency: {},
            },
          ],
        },
      ],
    }
    const merged = mergeFitnessTeamsIntoForm(saved, teams)
    const alpha = merged.shiftGroups[0]
    expect(alpha.assessor.name).toBe('Saved Assessor')
    expect(alpha.participants.map((participant) => participant.name)).toEqual([
      'Alpha Lead',
      'External Member',
    ])
    expect(alpha.participants[0].fitness.sitUps).toBe(24)
    expect(merged.excludedMemberKeys).toContain('user-a2')
  })

  it('supports team exclusion and does not reset results when an included team is refreshed', () => {
    const teams = normalizeFitnessTeams(response)
    let form = mergeFitnessTeamsIntoForm(createDefaultFitnessTestForm(), teams)
    form.shiftGroups[0].participants[0].fitness.sitUps = 25
    form = setFitnessMembersIncluded(
      form,
      teams[0],
      teams[0].members.map((member) => member.memberId),
      true,
    )
    expect(form.shiftGroups[0].participants[0].fitness.sitUps).toBe(25)

    form = setFitnessMembersIncluded(
      form,
      teams[0],
      teams[0].members.map((member) => member.memberId),
      false,
    )
    expect(form.excludedMemberKeys).toEqual(expect.arrayContaining(['user-a1', 'user-a2']))
    expect(form.shiftGroups.some((group) => group.shift === 'Alpha')).toBe(false)

    form = setFitnessMembersIncluded(
      form,
      teams[0],
      teams[0].members.map((member) => member.memberId),
      true,
    )
    expect(form.shiftGroups[0].participants[0].fitness.sitUps).toBe(25)
    expect(form.excludedParticipantSnapshots).toEqual([])
  })
})
