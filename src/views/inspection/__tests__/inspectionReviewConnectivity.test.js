import { describe, expect, it } from 'vitest'
import { shouldQueueInspectionReview } from '../domain/offline/inspectionReviewConnectivity'

describe('shouldQueueInspectionReview', () => {
  it('queues only when the browser is offline or submissions are already pending', () => {
    expect(shouldQueueInspectionReview({ isOnline: false })).toBe(true)
    expect(shouldQueueInspectionReview({ isOnline: true, queuedCount: 1 })).toBe(true)
    expect(shouldQueueInspectionReview({ isOnline: true, queuedCount: 0 })).toBe(false)
  })
})
