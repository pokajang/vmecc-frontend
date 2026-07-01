import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  mergeOnboardingState,
  readOnboardingState,
  updateOnboardingEvent,
} from '../onboardingState'
import { updateOnboardingState } from 'src/services/apiClient'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('onboardingState', () => {
  it('reads versioned onboarding state from the authenticated user', () => {
    const user = {
      onboarding: {
        inspection_quick_tour_trt: {
          version: 'v1',
          completedAt: '2026-06-25T01:00:00.000Z',
        },
      },
    }

    expect(readOnboardingState(user, 'inspection_quick_tour_trt', 'v1')).toEqual(
      user.onboarding.inspection_quick_tour_trt,
    )
    expect(readOnboardingState(user, 'inspection_quick_tour_trt', 'v2')).toBeNull()
  })

  it('merges an updated onboarding state without dropping existing user data', () => {
    expect(
      mergeOnboardingState(
        { id: 7, name: 'TRT Member', onboarding: { profile_completion_trt: { version: 'v1' } } },
        'inspection_quick_tour_trt',
        { version: 'v1', completedAt: '2026-06-25T01:00:00.000Z' },
      ),
    ).toMatchObject({
      id: 7,
      name: 'TRT Member',
      onboarding: {
        profile_completion_trt: { version: 'v1' },
        inspection_quick_tour_trt: {
          version: 'v1',
          completedAt: '2026-06-25T01:00:00.000Z',
        },
      },
    })
  })

  it('persists onboarding events and patches Redux with the returned state', async () => {
    const dispatch = vi.fn()
    const nextState = { version: 'v1', completedAt: '2026-06-25T01:00:00.000Z' }
    updateOnboardingState.mockResolvedValueOnce({
      data: {
        inspection_quick_tour_trt: nextState,
      },
    })

    await expect(
      updateOnboardingEvent({
        dispatch,
        event: 'completed',
        key: 'inspection_quick_tour_trt',
        user: { id: 7, onboarding: {} },
        version: 'v1',
      }),
    ).resolves.toEqual(nextState)

    expect(updateOnboardingState).toHaveBeenCalledWith('inspection_quick_tour_trt', {
      version: 'v1',
      event: 'completed',
    })
    expect(dispatch).toHaveBeenCalledWith({
      type: 'set',
      authUser: {
        id: 7,
        onboarding: {
          inspection_quick_tour_trt: nextState,
        },
      },
    })
  })

  it('writes a fallback record when persistence fails', async () => {
    const writeFallbackRecord = vi.fn()
    updateOnboardingState.mockRejectedValueOnce(new Error('offline'))

    await expect(
      updateOnboardingEvent({
        event: 'dismissed',
        fallbackRecord: { dismissedAt: '2026-06-25T01:00:00.000Z' },
        key: 'inspection_quick_tour_trt',
        user: { id: 7 },
        version: 'v1',
        writeFallbackRecord,
      }),
    ).resolves.toBeNull()

    expect(writeFallbackRecord).toHaveBeenCalledWith(7, {
      dismissedAt: '2026-06-25T01:00:00.000Z',
    })
  })
})
