import { describe, expect, it } from 'vitest'
import {
  getFitnessCompletionSummary,
  getProficiencyCheckpointSummary,
  normalizeFitnessTestForm,
  resolveFitnessResult,
  resolveProficiencyResult,
} from '../fitnessFormDomain'

describe('fitness form domain', () => {
  it('calculates protocol results without user-entered pass/fail flags', () => {
    expect(
      resolveFitnessResult({ sitUps: 20, jumpingJacks: 50, pushUps: 20, testedOn: '2026-06-01' }),
    ).toBe('pass')
    expect(
      resolveFitnessResult({ sitUps: 19, jumpingJacks: 50, pushUps: 20, testedOn: '2026-06-01' }),
    ).toBe('failed')
    expect(resolveProficiencyResult({ durationSeconds: 299, testedOn: '2026-06-01' })).toBe('pass')
    expect(resolveProficiencyResult({ durationSeconds: 300, testedOn: '2026-06-01' })).toBe(
      'failed',
    )
  })

  it('requires all six checkpoints for a new proficiency result to pass', () => {
    const checkpointCompletion = {
      cp1: true,
      cp2: true,
      cp3: true,
      cp4: true,
      cp5: true,
      cp6: false,
    }
    const proficiency = {
      durationSeconds: 240,
      testedOn: '2026-06-01',
      checkpointCompletion,
    }

    expect(getProficiencyCheckpointSummary(proficiency)).toEqual(
      expect.objectContaining({ completed: 5, total: 6, allCompleted: false }),
    )
    expect(resolveProficiencyResult(proficiency)).toBe('failed')
    expect(
      resolveProficiencyResult({
        ...proficiency,
        checkpointCompletion: { ...checkpointCompletion, cp6: true },
      }),
    ).toBe('pass')
  })

  it('migrates legacy combined-time records as completed without changing their result', () => {
    const form = normalizeFitnessTestForm({
      fitnessSchemaVersion: 2,
      reportingMonth: '2026-06',
      shiftGroups: [
        {
          shift: 'Alpha',
          participants: [
            {
              name: 'Legacy Member',
              proficiency: { durationSeconds: 240, testedOn: '2026-06-01' },
            },
          ],
        },
      ],
    })
    const proficiency = form.shiftGroups[0].participants[0].proficiency

    expect(getProficiencyCheckpointSummary(proficiency).completed).toBe(6)
    expect(proficiency.result).toBe('pass')
    expect(form.fitnessSchemaVersion).toBe(3)
  })

  it('normalizes shift groups and summarizes both assessment types', () => {
    const form = normalizeFitnessTestForm({
      reportingMonth: '2026-06',
      shiftGroups: [
        {
          shift: 'Alpha',
          assessorName: 'A. Assessor',
          participants: [
            {
              name: 'Member',
              age: 30,
              fitness: { sitUps: 20, jumpingJacks: 50, pushUps: 20, testedOn: '2026-06-01' },
              proficiency: { durationSeconds: 299, testedOn: '2026-06-01' },
            },
          ],
        },
      ],
    })
    expect(getFitnessCompletionSummary(form)).toEqual(
      expect.objectContaining({ participants: 1, passedAssessments: 2, incompleteAssessments: 0 }),
    )
  })
})
