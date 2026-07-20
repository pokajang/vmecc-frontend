import { describe, expect, it, vi } from 'vitest'

import {
  buildFireExtinguisherLifecycleMenuItems,
  LIFECYCLE_ACTIONS,
} from '../records/FireExtinguisherLifecycleDialog'

const labelsFor = (lifecycleStatus, overrides = {}) =>
  buildFireExtinguisherLifecycleMenuItems({
    asset: { catalogId: 42, lifecycleStatus },
    canManage: true,
    ...overrides,
  }).map((item) => item.label)

describe('fire extinguisher lifecycle menu items', () => {
  it('offers edit, out-of-service, and retire actions for an active asset', () => {
    expect(labelsFor('active')).toEqual(['Edit asset', 'Mark out of service', 'Retire'])
  })

  it('offers return-to-service and retire actions for an out-of-service asset', () => {
    expect(labelsFor('out_of_service')).toEqual(['Edit asset', 'Return to service', 'Retire'])
  })

  it('keeps retired assets recoverable through Restore', () => {
    expect(labelsFor('retired')).toEqual(['Restore'])
    expect(LIFECYCLE_ACTIONS.restore).toMatchObject({
      lifecycleFilter: 'active',
      followUpLabel: 'View active assets',
    })
  })

  it('does not expose management actions without permission', () => {
    expect(
      buildFireExtinguisherLifecycleMenuItems({
        asset: { catalogId: 42, lifecycleStatus: 'active' },
        canManage: false,
      }),
    ).toEqual([])
  })

  it('passes the selected asset and lifecycle transition to its callbacks', () => {
    const asset = { catalogId: 42, lifecycleStatus: 'retired' }
    const onLifecycleAction = vi.fn()
    const [restore] = buildFireExtinguisherLifecycleMenuItems({
      asset,
      canManage: true,
      onLifecycleAction,
    })

    restore.onClick()

    expect(onLifecycleAction).toHaveBeenCalledWith(asset, 'restore')
  })
})
