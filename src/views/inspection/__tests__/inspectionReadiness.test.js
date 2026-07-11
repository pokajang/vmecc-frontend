import { describe, expect, it } from 'vitest'
import {
  buildInspectionReadiness,
  buildInspectionReadinessFromBlockers,
} from '../form/inspectionReadiness'

describe('inspection readiness', () => {
  it('blocks review while media is processing or a draft conflict exists', () => {
    const readiness = buildInspectionReadiness({
      mediaProcessingCount: 1,
      versionConflicts: 1,
    })

    expect(readiness.isReadyToReview).toBe(false)
    expect(readiness.isReadyToSubmit).toBe(false)
    expect(readiness.blockers.map((blocker) => blocker.key)).toEqual([
      'media-processing',
      'version-conflict',
    ])
  })

  it('treats pending operations as reviewable but not submittable', () => {
    const readiness = buildInspectionReadiness({ pendingOperationCount: 2 })

    expect(readiness.isReadyToReview).toBe(true)
    expect(readiness.isReadyToSubmit).toBe(false)
  })

  it('maps review blockers into the shared readiness model', () => {
    const readiness = buildInspectionReadinessFromBlockers([
      { key: 'fire-extinguisher-session-sync', retryCount: 2 },
      { key: 'draft-version-conflict' },
    ])

    expect(readiness.pendingOperationCount).toBe(2)
    expect(readiness.versionConflicts).toBe(1)
    expect(readiness.isReadyToSubmit).toBe(false)
  })

  it('blocks review when the authoritative inspection session is unavailable', () => {
    const readiness = buildInspectionReadiness({ sessionState: 'unavailable' })

    expect(readiness.isReadyToReview).toBe(false)
    expect(readiness.isReadyToSubmit).toBe(false)
    expect(readiness.blockers).toEqual([
      expect.objectContaining({
        key: 'session-state',
        message: expect.stringContaining('team assignment'),
      }),
    ])
  })
})
